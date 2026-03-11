from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import sqlite3
import pandas as pd
from gemini_agent import GeminiSQLAgent, get_schema_summary
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
from dotenv import load_dotenv

load_dotenv()

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

# Global state
chat_history = []
custom_schema = None
active_table = "marketing_campaigns"

class QueryRequest(BaseModel):
    prompt: str
    session_id: Optional[str] = "default"
    mode: Optional[str] = "nykaa"

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
    return {"status": "ok", "app": "Nykaa BI Dashboard Backend", "active_table": active_table}

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    global custom_schema, active_table
    try:
        # Read the file
        if file.filename.endswith('.csv'):
            df = pd.read_csv(file.file)
        elif file.filename.endswith(('.xls', '.xlsx')):
            df = pd.read_excel(file.file)
        else:
            raise HTTPException(status_code=400, detail="Invalid format. Use CSV or Excel.")
            
        # Clean column names
        df.columns = [c.replace(' ', '_').replace('.', '').replace('-', '_') for c in df.columns]
        
        table_name = "custom_data"
        conn = sqlite3.connect(DB_PATH)
        df.to_sql(table_name, conn, if_exists='replace', index=False)
        conn.close()
        
        # Build schema summary
        schema_lines = [f"Table: {table_name}"]
        for col, dtype in df.dtypes.items():
            sql_type = "REAL" if "float" in str(dtype) else "INTEGER" if "int" in str(dtype) else "TEXT"
            schema_lines.append(f"    - {col} ({sql_type})")
        
        custom_schema = "\n".join(schema_lines) + "\n\nIMPORTANT: Use only the 'custom_data' table."
        agent.update_schema(custom_schema)
        active_table = table_name
        
        return {"status": "success", "message": f"Uploaded {file.filename}.", "columns": list(df.columns)}
    except Exception as e:
        print(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/clear_history")
async def clear_history():
    global chat_history, custom_schema, active_table
    chat_history = []
    custom_schema = None
    active_table = "marketing_campaigns"
    agent.update_schema(get_schema_summary())
    return {"status": "cleared"}

@app.get("/raw_data")
async def get_raw_data():
    try:
        conn = sqlite3.connect(DB_PATH)
        df = pd.read_sql_query(f"SELECT * FROM {active_table} LIMIT 100", conn)
        conn.close()
        return df.to_dict(orient='records')
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat", response_model=QueryResponse)
async def chat(request: QueryRequest):
    global chat_history
    try:
        print(f"User Request: {request.prompt}")
        
        # 1. Ask Gemini to generate SQL and visualization info (using history)
        result = agent.generate_db_query(request.prompt, chat_history=chat_history)
        print(f"Generated SQL: {result['sql']}")
        print(f"Chart Type: {result['chartType']}")
        
        # 2. Execute SQL
        conn = sqlite3.connect(DB_PATH)
        try:
            df = pd.read_sql_query(result['sql'], conn)
            print(f"Rows found: {len(df)}")
            
            # !! ROBUSTNESS FALLBACK !!
            if len(df) == 0 and "WHERE" in result['sql']:
                print("No data found. Attempting relaxation...")
                # ... (keep relaxation logic)
                sql = result['sql']
                where_start = sql.find("WHERE")
                candidates = []
                for keyword in ["GROUP BY", "ORDER BY", "LIMIT"]:
                    pos = sql.find(keyword)
                    if pos > where_start:
                        candidates.append(pos)
                end_pos = min(candidates) if candidates else len(sql)
                relaxed_sql = sql[:where_start] + sql[end_pos:]
                df = pd.read_sql_query(relaxed_sql, conn)
                result['title'] += " (Expanded View)"
            
            data_json = df.to_dict(orient='records')
            
            # 3. Add to history
            chat_history.append({"role": "user", "content": request.prompt})
            chat_history.append({"role": "assistant", "content": result['sql']})
            if len(chat_history) > 6:
                chat_history = chat_history[-6:]
                
        finally:
            conn.close()
        
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
    uvicorn.run(app, host="0.0.0.0", port=8000)
