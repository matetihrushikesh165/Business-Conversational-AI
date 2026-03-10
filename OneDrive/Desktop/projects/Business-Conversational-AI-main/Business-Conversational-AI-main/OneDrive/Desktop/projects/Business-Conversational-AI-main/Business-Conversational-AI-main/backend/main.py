from fastapi import FastAPI, HTTPException
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
