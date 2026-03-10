import google.generativeai as genai
import os

genai.configure(api_key="AIzaSyDOLzVa_2E-uDok39DMAr2fHHdVnFkCM1Y")

print("Listing all models...")
try:
    for m in genai.list_models():
        print(f"Name: {m.name}, Methods: {m.supported_generation_methods}")
except Exception as e:
    print(f"Error: {e}")
