import requests
import json

try:
    r = requests.post('http://localhost:8000/chat', 
                      json={'prompt': 'revenue by campaign type'}, 
                      timeout=30)
    print(f"Status Code: {r.status_code}")
    print(f"Response: {r.text}")
except Exception as e:
    print(f"Error connecting: {e}")
