from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import sqlite3
import pandas as pd
from gemini_agent import GeminiSQLAgent, get_schema_summary
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os

app = FastAPI()

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "nykaa_data.db")
agent = GeminiSQLAgent(get_schema_summary())

# Track the active schemas to query against.
active_schema = get_schema_summary()
additional_schemas = []

# Global memory for follow-up conversational queries
chat_history = []

class QueryRequest(BaseModel):
    prompt: str
    session_id: Optional[str] = "default"

class QueryResponse(BaseModel):
    sql: str
    chartType: str
    title: str
    data: List[Dict[str, Any]]
    explanation: str
    summaryMetrics: List[Dict[str, Any]] = []
    richInsights: List[Dict[str, Any]] = []

@app.get("/")
def read_root():
    return {"status": "ok", "app": "Nykaa BI Dashboard Backend"}

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    global active_schema, additional_schemas, agent, chat_history
    try:
        # Clear previous history to prevent context mixing
        chat_history = []
        # Read the file based on extension
        if file.filename.endswith('.csv'):
            df = pd.read_csv(file.file)
        elif file.filename.endswith(('.xls', '.xlsx')):
            df = pd.read_excel(file.file)
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format. Please upload a CSV or Excel file.")
            
        # Clean column names for SQLite compatibility
        df.columns = [c.replace(' ', '_').replace('.', '').replace('-', '_') for c in df.columns]
        
        table_name = "uploaded_data_temp"
        
        # Save to SQLite
        conn = sqlite3.connect(DB_PATH)
        df.to_sql(table_name, conn, if_exists='replace', index=False)
        conn.close()
        
        # Generate new schema summary
        schema_lines = [f"Table: {table_name}"]
        for col, dtype in df.dtypes.items():
            sql_type = "REAL" if "float" in str(dtype) else "INTEGER" if "int" in str(dtype) else "TEXT"
            schema_lines.append(f"    - {col} ({sql_type})")
        
        new_schema = "\n".join(schema_lines)
        
        # Update global state to use ONLY the new schema. 
        # This prevents the AI from getting confused with the default Nykaa data.
        active_schema = f"""
### ACTIVE CUSTOM DATASET ###
{new_schema}

INSTRUCTIONS:
1. The user has uploaded a custom dataset. 
2. Use ONLY the 'uploaded_data_temp' table.
3. Ignore any previous knowledge about 'marketing_campaigns' or 'Nykaa'.
4. Perform your analysis strictly on the columns defined above.
        """
        agent.update_schema(active_schema)
        
        return {"status": "success", "message": f"Successfully uploaded {file.filename} and created table {table_name} with {len(df)} rows.", "columns": list(df.columns)}
    except Exception as e:
        print(f"Error uploading file: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/raw_data")
async def get_raw_data():
    try:
        conn = sqlite3.connect(DB_PATH)
        # Try custom table first, then fallback
        table = "uploaded_data_temp"
        # Check if table exists
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='uploaded_data_temp'")
        if not cursor.fetchone():
            table = "marketing_campaigns"
        
        df = pd.read_sql_query(f"SELECT * FROM {table} LIMIT 100", conn)
        conn.close()
        return df.to_dict(orient='records')
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
@app.post("/chat", response_model=QueryResponse)
async def chat(request: QueryRequest):
    global chat_history
    try:
        print(f"User Request: {request.prompt}")
        
        # 1. Ask Gemini to generate SQL and visualization info
        result = agent.generate_db_query(request.prompt, active_schema, chat_history)
        print(f"Generated SQL: {result['sql']}")
        print(f"Chart Type: {result['chartType']}")
        
        # 2. Add to chat history (User query + Assistant SQL)
        chat_history.append({"role": "user", "content": request.prompt})
        chat_history.append({"role": "assistant", "content": result['sql']})
        
        # 3. Execute SQL
        conn = sqlite3.connect(DB_PATH)
        try:
            df = pd.read_sql_query(result['sql'], conn)
            print(f"Rows found: {len(df)}")
            data_json = df.to_dict(orient='records')
        finally:
            conn.close()
        
        # 3. Return combined response
        return QueryResponse(
            sql=result['sql'],
            chartType=result['chartType'],
            title=result['title'],
            data=data_json,
            explanation=result['explanation'],
            summaryMetrics=result.get('summaryMetrics', []),
            richInsights=result.get('richInsights', [])
        )
    except Exception as e:
        print(f"Error in chat endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
