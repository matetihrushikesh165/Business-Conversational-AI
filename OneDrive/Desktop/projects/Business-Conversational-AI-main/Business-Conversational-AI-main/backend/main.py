from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import sqlite3
import pandas as pd
from gemini_agent import GeminiSQLAgent, get_schema_summary
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
import sqlite3

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
DB_PATH = os.path.join(BASE_DIR, "dynamic_data.db") # Changed to a generic database name

# Initially empty dataset context
agent = GeminiSQLAgent(schema_description="No dataset loaded yet. Please upload a dataset.", table_name="none")

class QueryRequest(BaseModel):
    prompt: str
    session_id: Optional[str] = "default"

class QueryResponse(BaseModel):
    sql: str
    chartType: str
    title: str
    data: List[Dict[str, Any]]
    explanation: str
    summaryMetrics: List[Dict[str, str]] = []
    richInsights: List[Dict[str, Any]] = []

@app.get("/")
def read_root():
    return {"status": "ok", "app": "Nykaa BI Dashboard Backend"}

@app.post("/upload")
async def upload_dataset(file: UploadFile = File(...)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")
    
    try:
        # Read the CSV file into a pandas DataFrame
        df = pd.read_csv(file.file)
        
        # Save it to SQLite database
        table_name = "uploaded_data"
        conn = sqlite3.connect(DB_PATH)
        df.to_sql(table_name, conn, if_exists="replace", index=False)
        conn.close()

        # Generate schema description dynamically
        schema_lines = [f"Table: {table_name}"]
        columns_with_types_list = []
        for col_name, dtype in zip(df.columns, df.dtypes):
            type_str = "TEXT"
            if pd.api.types.is_numeric_dtype(dtype):
                type_str = "REAL" if pd.api.types.is_float_dtype(dtype) else "INTEGER"
            
            col_def = f"- {col_name} ({type_str})"
            schema_lines.append(col_def)
            columns_with_types_list.append(col_def)
            
        columns_with_types = "\n".join(columns_with_types_list)
        
        # Extract a small sample of the dataframe
        sample_data = df.head(5).to_csv(index=False)
        
        # Analyze the dataset structure
        print("Analyzing dataset schema...")
        dataset_analysis = agent.analyze_schema(columns_with_types, sample_data)
        
        # Add the semantic description to the agent's schema
        schema_lines.append("")
        schema_lines.append("DATASET CONTEXT:")
        schema_lines.append(f"Subject: {dataset_analysis.get('subject', 'Unknown')}")
        schema_lines.append(f"Description: {dataset_analysis.get('description', '')}")
        schema_lines.append(f"Key Dimensions: {', '.join(dataset_analysis.get('keyDimensions', []))}")
        schema_lines.append(f"Key Metrics: {', '.join(dataset_analysis.get('keyMetrics', []))}")
        
        # Include old tips
        schema_lines.append("")
        schema_lines.append("IMPORTANT SQL TIPS FOR SQLITE:")
        schema_lines.append("- For date aggregation, use SUBSTR(Date, 7, 4) || '-' || SUBSTR(Date, 4, 2) as YYYY_MM to sort correctly if a Date column exists in format DD-MM-YYYY.")
        schema_lines.append("- Return column names that are human readable for the chart axes.")
        schema_lines.append("- Ensure your SQL follows SQLite syntax strictly.")
        
        dynamic_schema = "\n".join(schema_lines)
        
        # Update the agent with the new schema
        agent.set_schema(schema_description=dynamic_schema, table_name=table_name)
        
        print("Schema loaded:")
        print(dynamic_schema)

        return {
            "status": "success", 
            "message": "Dataset uploaded and schema analyzed successfully", 
            "columns": list(df.columns),
            "datasetSummary": dataset_analysis
        }
    
    except Exception as e:
        print(f"Error processing upload: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/chat", response_model=QueryResponse)
async def chat(request: QueryRequest):
    try:
        print(f"User Request: {request.prompt}")
        
        # 1. Ask Gemini to generate SQL and visualization info
        result = agent.generate_db_query(request.prompt)
        print(f"Generated SQL: {result['sql']}")
        print(f"Chart Type: {result['chartType']}")
        
        # 2. Execute SQL
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
    uvicorn.run(app, host="0.0.0.0", port=8000)
