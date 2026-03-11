import re
import pandas as pd
import sqlite3
import os
import io

csv_path = r'c:\Users\hrush\Documents\GFG-Kmit\Nykaa Digital Marketing.csv'
db_path = r'c:\Users\hrush\Documents\GFG-Kmit\backend\nykaa_data.db'

# The file appears to be a bplist containing an HTML payload which has a <pre> tag with CSV data
try:
    with open(csv_path, 'rb') as f:
        content = f.read()
    
    # Try to find text within <pre> tags
    # We might need to handle binary content if there is a lot of junk
    # Let's try to extract any string like data
    # Looking for the first instance of Campaign_ID
    
    start_str = b'Campaign_ID'
    start_pos = content.find(start_str)
    
    if start_pos != -1:
        # Finding the end of the text block - looking for </pre>
        end_pos = content.find(b'</pre>', start_pos)
        if end_pos == -1:
            end_pos = len(content)
        
        csv_text = content[start_pos:end_pos].decode('utf-8', errors='ignore')
        
        # Load into DataFrame
        df = pd.read_csv(io.StringIO(csv_text))
        
        # Save to SQLite
        conn = sqlite3.connect(db_path)
        df.to_sql('marketing_campaigns', conn, if_exists='replace', index=False)
        
        # Get schema Info
        schema_info = "Table Name: marketing_campaigns\n"
        for column in df.columns:
            schema_info += f"- {column} ({df[column].dtype}): {df[column].nunique()} unique values. Example: {df[column].iloc[0]}\n"
        
        print("--- SCHEMA START ---")
        print(schema_info)
        print("--- SCHEMA END ---")
        conn.close()
    else:
        print("Could not find CSV data in the file.")

except Exception as e:
    print(f"Error: {e}")
