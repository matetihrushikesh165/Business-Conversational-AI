import React, { useState } from 'react';
import axios from 'axios';
import { Search, Sparkles, AlertCircle, LayoutGrid } from 'lucide-react';
import DashboardChart from './components/DashboardChart';
import './index.css';

interface DashboardItem {
  id: string;
  sql: string;
  chartType: string;
  title: string;
  data: any[];
  explanation: string;
  summaryMetrics: { label: string; value: string }[];
  richInsights: any[];
}

function App() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dashboards, setDashboards] = useState<DashboardItem[]>([]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const response = await axios.post("https://business-conversational-ai.onrender.com", { prompt });
      const newItem: DashboardItem = {
        ...response.data,
        id: Date.now().toString()
      };
      setDashboards([newItem]);
      setPrompt("");
    } catch (err: any) {
      console.error("Dashboard generation error:", err);
      const msg = err.response?.data?.detail || err.message || "Unknown Network Error";
      setError(`Error: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-container">
      <header>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', background: 'var(--glass)', padding: '0.5rem 1rem', borderRadius: '1rem', border: '1px solid var(--border)' }}>
          <Sparkles size={16} color="var(--primary)" />
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--primary)' }}>AI Powered Insights</span>
        </div>
        <h1 className="header-title">Instant Business Intelligence</h1>
        <p className="header-subtitle">Ask anything about your marketing campaigns and get instant visualizations.</p>
      </header>

      <div className="search-container">
        <form onSubmit={handleSearch}>
          <Search className="search-icon" size={24} />
          <input 
            type="text" 
            className="search-input"
            placeholder="e.g., Show me monthly revenue trends for the last quarter..." 
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={loading}
          />
        </form>
        {loading && (
          <div className="loading-dots">
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
          </div>
        )}
      </div>

      {error && (
        <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '1rem', color: '#ef4444', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {dashboards.length === 0 && !loading && (
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', borderStyle: 'dashed' }}>
          <LayoutGrid size={48} color="var(--text-muted)" style={{ opacity: 0.3, marginBottom: '1.5rem' }} />
          <h2 style={{ color: 'var(--text-muted)', fontSize: '1.25rem' }}>No visualizations yet.</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', opacity: 0.7, marginTop: '0.5rem' }}>Try asking for "revenue by campaign type" or "average ROI by language".</p>
        </div>
      )}

      <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr' }}>
        {dashboards.map((item) => (
          <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <DashboardChart 
              type={item.chartType}
              data={item.data}
              title={item.title}
              explanation={item.explanation}
              summaryMetrics={item.summaryMetrics}
            />
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {item.richInsights.map((insight, idx) => (
                <div key={idx} className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)' }}>
                    <Sparkles size={18} />
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase' }}>{insight.label}</span>
                  </div>
                  
                  <div style={{ fontSize: '2rem', fontWeight: 700, color: 'white' }}>
                    {insight.value}
                  </div>
                  
                  {insight.subDetail && (
                    <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.75rem', border: '1px solid var(--border)', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                      {insight.subDetail}
                    </div>
                  )}
                  
                  {insight.list && (
                    <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {insight.list.map((li: string, i: number) => (
                        <div key={i} style={{ fontSize: '0.875rem', color: 'var(--text-main)', padding: '0.4rem 0', borderBottom: i < insight.list.length - 1 ? '1px solid var(--border)' : 'none' }}>
                          {li}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <footer style={{ marginTop: '4rem', padding: '2rem', borderTop: '1px solid var(--border)', textAlign: 'center', opacity: 0.3 }}>
        <p>© 2026 AI-Dashboard Prototype | Powered by Google Gemini 2.5 Flash</p>
      </footer>
    </div>
  );
}

export default App;
