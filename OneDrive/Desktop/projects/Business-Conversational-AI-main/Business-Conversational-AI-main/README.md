# Quick Start: AI-Powered BI Dashboard

This prototype allows non-technical users to generate dashboards using natural language.

## Prerequisites
1. **Google Gemini API Key**: [Get one here](https://aistudio.google.com/app/apikey)
2. **Setup your API Key**:
   - Create a `.env` file in the `backend/` folder and add:
     ```
     GOOGLE_API_KEY=your_key_here
     ```

## How to Run

### 1. Start the Backend
```bash
cd backend
# Make sure you have the database prepared
python prepare_data.py
# Run the FastAPI server
python main.py
```

### 2. Start the Frontend
```bash
cd frontend
# Install dependencies (already done)
npm run dev
```

## Features
- **Natural Language to SQL**: Gemini 1.5 Flash generates precise SQLite queries based on the Nykaa dataset.
- **Auto Chart Selection**: The system automatically decides the best way to visualize your requested data.
- **Glassmorphic UI**: High-end aesthetic with dark mode and smooth animations.
- **Interactive Dashboards**: Hover over charts to see detailed tooltips.
