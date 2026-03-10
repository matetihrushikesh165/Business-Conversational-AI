import google.generativeai as genai
import json
import os
from typing import Dict, Any
from dotenv import load_dotenv

load_dotenv()

# Configure Gemini
api_key = os.getenv("GOOGLE_API_KEY", "")
genai.configure(api_key=api_key)

class GeminiSQLAgent:
    def __init__(self, schema_description: str = "", table_name: str = "marketing_campaigns"):
        self.schema = schema_description
        self.table_name = table_name
        self.model = genai.GenerativeModel('gemini-2.5-flash')

    def set_schema(self, schema_description: str, table_name: str):
        self.schema = schema_description
        self.table_name = table_name

    def analyze_schema(self, columns_with_types: str, sample_data: str) -> Dict[str, Any]:
        prompt = f"""
        You are an expert Data Analyst and Database Administrator.
        
        I have just loaded a new dataset into a database table.
        Here are the columns and their SQLite data types:
        {columns_with_types}
        
        Here is a small sample of the data (first 5 rows):
        {sample_data}
        
        Task:
        Analyze this dataset and provide a rich summary of what it contains, what the key dimensions (categories, dates, entities) and key metrics (numbers to calculate) are, and how they might relate to each other. This will help the user understand what insights they can get from this dataset.
        
        Return your answer ONLY in JSON format like this:
        {{
            "subject": "e.g., Marketing Campaign Performance, Sales Data, User App Activity",
            "description": "A 2-3 sentence overview of what this dataset represents.",
            "keyDimensions": ["e.g., Campaign_Type", "Target_Audience", "Date"],
            "keyMetrics": ["e.g., Revenue", "Conversions", "ROI"],
            "suggestedQuestions": [
                "What is the total revenue by campaign type?",
                "Which target audience has the highest ROI?"
            ]
        }}
        """
        
        response = self.model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(response_mime_type="application/json")
        )
        
        return json.loads(response.text)

    def generate_db_query(self, user_query: str) -> Dict[str, Any]:
        prompt = f"""
        You are a SQL and Data Visualization Expert.
        
        The database table is '{self.table_name}' with columns:
        {self.schema}
        
        User Query: "{user_query}"
        
        Task:
        1. Generate exactly one valid SQLite query.
        2. !! CRITICAL !!: The FIRST column in your SELECT must be the Dimension (e.g., Date, Campaign_Type, Audience) which will be on the X-axis.
        3. All subsequent columns must be numerical Metrics (e.g., Revenue, Clicks) which will be the Y-axis/Values.
        4. Use human-friendly aliases for columns (e.g., SELECT Campaign_Type AS "Campaign Type", ...).
        5. !! CLARITY RULE !!: If a dimension has many categories (like >10 Channels or Audiences), apply a 'ORDER BY [Metric] DESC LIMIT 10' to show the top performers and keep the chart clean.
        6. Pick the most suitable chart type: "bar", "line", "pie", "area".
        7. Identify 2-3 key summary metrics (KPIs) for the top of the chart.
        8. Identify "Rich Insights" based on query scope:
           - Narrow Scope (specific metrics/channels): 5-6 insights.
           - Broad Scope (e.g., "total performance", "full report"): 8-10 insights.
           - !! STRICT RULE !!: ALWAYS provide final, human-readable values. 
             NEVER include raw SQL like 'SELECT...' or placeholders like 'X', '$A.B', or 'Varies'. 
             NEVER prefix values with 'Calculated:' or include the logic in the label. 
             Provide realistic insights or actual top-level stats based on the query results.
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
