import sqlite3
import pandas as pd
import numpy as np

def analyze_data():
    db_path = 'nykaa_data.db'
    conn = sqlite3.connect(db_path)
    df = pd.read_sql('SELECT * FROM marketing_campaigns', conn)
    
    print(f"Total Rows: {len(df)}")
    
    metrics = ['Engagement_Score', 'ROI', 'Revenue', 'Clicks', 'Conversions', 'Impressions']
    
    print("\n--- Summary Statistics (Global) ---")
    print(df[metrics].agg(['mean', 'std', 'min', 'max']).T)
    
    dims = ['Target_Audience', 'Campaign_Type', 'Customer_Segment']
    
    for dim in dims:
        print(f"\n--- Averages by {dim} ---")
        grouped = df.groupby(dim)[metrics].mean()
        print(grouped)
        
        # Check variance between groups
        variance = grouped.std() / grouped.mean() # Coefficient of variation between groups
        print(f"\nCoV between groups for {dim}:")
        print(variance)

    print("\n--- Check for Round Values / Patterns ---")
    # See if values are too "clean" (multiples of 10, etc)
    for metric in metrics:
        if df[metric].dtype in [np.int64, np.float64]:
            unique_vals = sorted(df[metric].dropna().unique())[:10]
            print(f"Sample of unique values in {metric}: {unique_vals}")

    conn.close()

if __name__ == "__main__":
    analyze_data()
