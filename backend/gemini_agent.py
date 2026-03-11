import google.generativeai as genai
import json
import os
from typing import Dict, Any
from dotenv import load_dotenv

load_dotenv()

# Configure Gemini
# Ensure to have GOOGLE_API_KEY environment variable.
api_key = os.getenv("GOOGLE_API_KEY")
genai.configure(api_key=api_key)

class GeminiSQLAgent:
    def __init__(self, schema_description: str):
        self.schema = schema_description
        self.model = genai.GenerativeModel('gemini-2.5-flash-lite')

    def update_schema(self, schema_description: str):
        self.schema = schema_description

    def generate_db_query(self, user_query: str, chat_history: list = None) -> Dict[str, Any]:
        history_context = ""
        if chat_history and len(chat_history) > 0:
            history_context = "### Prior Chat Context (Last 3 exchanges):\n"
            for msg in chat_history[-3:]:
                role = "User" if msg["role"] == "user" else "Assistant SQL"
                history_context += f"{role}: {msg['content']}\n"
            history_context += "###\n\n"

        prompt = f"""
        You are a SQL and Data Visualization Expert.
        
        The database schema is as follows:
        {self.schema}
        
        {history_context}
        User Query: "{user_query}"
        
        Task:
        1. Generate exactly one valid SQLite query.
        2. !! CRITICAL !!: The FIRST column in your SELECT must be the Dimension (e.g., Date, Campaign_Type, Audience) which will be on the X-axis.
        3. All subsequent columns must be numerical Metrics (e.g., Revenue, Clicks) which will be the Y-axis/Values.
        4. Use human-friendly aliases for columns (e.g., SELECT Campaign_Type AS "Campaign Type", ...).
        5. !! CLARITY RULE !!: If a dimension has many categories (like >10 Channels or Audiences), apply a 'ORDER BY [Metric] DESC LIMIT 10' to show the top performers and keep the chart clean.
        6. Pick the most suitable chart type: "bar", "line", "pie", "area".
        6.1.!! ZERO-ROW SAFETY !!: If the user asks for a very specific date/month that might not have data, YOUR SQL should include a `UNION ALL` or a fallback to show the closest available data (e.g., the whole year of 2025) rather than 0 rows.
        7. !! TIME FLEXIBILITY !!: Prioritize the user's specific duration (e.g., if they ask for "3 months", show exactly 3 months). If data for the specific recent window is missing, query the most recent available window of the EQUAL size (e.g., instead of crashing on "last 3 months" in 2026, show Oct-Dec 2025).
        8. !! TIME FORMATTING !!: NEVER use `STRFTIME`. For date comparisons, use `SUBSTR(Date, 7, 4) || '-' || SUBSTR(Date, 4, 2) || '-' || SUBSTR(Date, 1, 2)`.
        9. !! AUDIENCE MATCH !!: If the user says "youth", match against 'Youth'. If the user says "engagement", always include `AVG(Engagement_Score)`.
        10. Identify 2-3 key summary metrics (KPIs) for the top of the chart.
        11. Identify "Rich Insights" based on query scope:
           - !! MINIMUM !!: Always provide at least 8-10 distinct rich insights.
           - Broad Scope (e.g., "full report", "trends"): 10-15 insights.
           - !! CATEGORY FOCUS !!: If the dataset has many categories, your insights MUST highlight the top 3 and bottom 3 categories by performance.
           - !! TREND DETECTION !!: Identify any growth or decline cycles in the metrics.
           - !! STRICT RULE !!: ALWAYS provide final, human-readable values. 
             NEVER include raw SQL like 'SELECT...' or placeholders. 
             NEVER prefix values with 'Calculated:'.
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
    - Campaign_Type (TEXT): ['Social Media', 'Paid Ads', 'Email Marketing', 'Influencer', 'SEO']
    - Target_Audience (TEXT): ['College Students', 'Youth', 'Working Women', 'Professionals']
    - Channel_Used (TEXT): Multi-value strings like "WhatsApp, YouTube" or single like "YouTube".
    - Impressions, Clicks, Leads, Conversions, Revenue (INTEGER)
    - ROI, Engagement_Score (REAL)
    - Date (TEXT): format 'DD-MM-YYYY' (e.g., '15-05-2025')
    
    IMPORTANT SQL TIPS FOR SQLITE:
    - !! ANCHOR DATE !!: TODAY is March 2026. DATA exists ONLY for 2024 and 2025.
    - !! RELATIVE TIME !!: If a user asks for "last 3 months", they mean the last 3 months of available data (Oct, Nov, Dec 2025). Do not show 12 months.
    - !! YEAR-MONTH FOR LINE CHARTS !!: Use `SUBSTR(Date, 7, 4) || '-' || SUBSTR(Date, 4, 2) || '-' || SUBSTR(Date, 1, 2) AS "Year-Month"` for the X-axis.
    - !! DATE RANGE TEMPLATE !!: To filter last 2 years, use `SUBSTR(Date, 7, 4) IN ('2024', '2025')`.
    - !! FORBIDDEN !!: NEVER use `STRFTIME` or `DATE()` functions; they fail on 'DD-MM-YYYY'. Use `SUBSTR`.
    - !! 2026 FALLBACK !!: If a user asks for "this year", query 2025.
    - !! ROBUSTNESS !!: Use `LIKE '%Youth%'` for audience if 'Youth' alone fails, but prefer exact matches for categories.
    - Ensure your SQL follows SQLite syntax strictly.
    """
