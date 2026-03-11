import google.generativeai as genai
import json
import os
from typing import Dict, Any

from dotenv import load_dotenv

load_dotenv()

# Configure Gemini
api_key = os.getenv("GOOGLE_API_KEY")
genai.configure(api_key=api_key)

class GeminiSQLAgent:
    def __init__(self, schema_description: str):
        self.schema = schema_description
        self.model = genai.GenerativeModel('gemini-2.5-flash-lite')

    def update_schema(self, schema_description: str):
        self.schema = schema_description

    def generate_db_query(self, user_query: str, schema: str = None, chat_history: list = None) -> Dict[str, Any]:
        active_schema = schema if schema else self.schema
        
        history_context = ""
        if chat_history and len(chat_history) > 0:
            history_context = "### Prior Chat Context (Use this to understand follow-up questions like 'what about last 4 months'):\n"
            for msg in chat_history[-3:]: # Keep last 3 exchanges to avoid overflowing context
                if msg["role"] == "user":
                    history_context += f"User: {msg['content']}\n"
                elif msg["role"] == "assistant":
                    history_context += f"Generated SQL: {msg['content']}\n"
            history_context += "###\n\n"

        prompt = f"""
        You are a SQL and Data Visualization Expert.
        
        The database contains the following tables and schemas:
        {active_schema}
        
        {history_context}
        User Query: "{user_query}"
        
        Task:
        1. Generate exactly one valid SQLite query. Choose the appropriate table(s) to answer the user's question.
        2. !! CRITICAL DATES !!: NEVER use DATE('now') for "recent" or "last X months" queries, because the data might be older. INSTEAD, use a subquery to find the MAX(Date) in the table, and subtract from that.
        3. !! CRITICAL !!: The FIRST column in your SELECT must be the Dimension (e.g., Date, Campaign_Type, Audience) which will be on the X-axis.
        4. All subsequent columns must be numerical Metrics (e.g., Revenue, Clicks) which will be the Y-axis/Values.
        5. Use human-friendly aliases for columns (e.g., SELECT Campaign_Type AS "Campaign Type", ...).
        6. !! CLARITY RULE !!: If a dimension has many categories (like >10 Channels or Audiences), apply a 'ORDER BY [Metric] DESC LIMIT 10' to show the top performers and keep the chart clean.
        7. Pick the most suitable chart type: "bar", "line", "pie", "area".
        8. Identify 2-3 key summary metrics (KPIs) for the top of the chart.
        9. Identify "Rich Insights" based on query scope:
           - !! MINIMUM !!: Always provide at least 8-10 distinct rich insights.
           - Broad Scope (e.g., "total performance", "full report"): 10-15 insights.
           - !! CATEGORY FOCUS !!: If the dataset has many categories, your insights MUST highlight the top 3 and bottom 3 categories by performance.
           - !! TREND DETECTION !!: Identify any growth or decline cycles in the metrics.
           - !! STRICT RULE !!: ALWAYS provide final, human-readable values. 
             NEVER include raw SQL like 'SELECT...' or placeholders like 'X', '$A.B', or 'Varies'. 
             NEVER prefix values with 'Calculated:' or include the logic in the label. 
             Provide realistic insights or actual top-level stats based on the data.
           - For 'Conversions' or 'Revenue', include a 'subDetail' (e.g., "Main Driver: Youth Segment").
           - For 'Channels', provide a 'ranking' list if possible.
           - Every insight should have a 'type' (metric, ranking, detail).
        
        Return your answer ONLY in JSON format like this:
        {{
            "sql": "SELECT ...",
            "chartType": "bar",
            "title": "...",
            "explanation": "...",
            "summaryMetrics": [{{"label": "Total ...", "value": "..."}}],
            "richInsights": [
                {{
                    "type": "metric",
                    "label": "Total Conversions",
                    "value": "2.4k",
                    "subDetail": "Top Audience: College Students"
                }},
                {{
                    "type": "ranking",
                    "label": "Channel Performance",
                    "value": "YouTube",
                    "list": ["1. YouTube", "2. WhatsApp", "3. Google"]
                }},
                {{
                    "type": "detail",
                    "label": "Engagement Leader",
                    "value": "88%",
                    "subDetail": "Customer Segment: Tier 2 Cities"
                }}
            ]
        }}
        """
        
        response = self.model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(response_mime_type="application/json")
        )
        
        return json.loads(response.text)

def get_schema_summary():
    return """
    Table: marketing_campaigns
    - Campaign_ID (TEXT): Unique ID for each campaign.
    - Campaign_Type (TEXT): Social Media, Paid Ads, etc.
    - Target_Audience (TEXT): College Students, Youth, etc.
    - Duration (INTEGER): Days.
    - Channel_Used (TEXT): "WhatsApp, YouTube", "YouTube", etc.
    - Impressions (INTEGER)
    - Clicks (INTEGER)
    - Leads (INTEGER)
    - Conversions (INTEGER)
    - Revenue (INTEGER)
    - Acquisition_Cost (REAL)
    - ROI (REAL)
    - Language (TEXT)
    - Engagement_Score (REAL)
    - Customer_Segment (TEXT)
    - Date (TEXT): format 'DD-MM-YYYY'
    
    IMPORTANT SQL TIPS FOR SQLITE:
    - For date aggregation, use SUBSTR(Date, 7, 4) || '-' || SUBSTR(Date, 4, 2) as YYYY_MM to sort correctly.
    - Return column names that are human readable for the chart axes.
    - Ensure your SQL follows SQLite syntax strictly.
    """
