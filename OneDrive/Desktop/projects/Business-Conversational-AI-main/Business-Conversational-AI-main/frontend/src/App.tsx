import React, { useState } from 'react';
import axios from 'axios';
import { Search, Sparkles, AlertCircle, LayoutGrid, Upload } from 'lucide-react';
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
  
  // New States for Upload
  const [uploading, setUploading] = useState(false);
  const [datasetLoaded, setDatasetLoaded] = useState(false);
  const [columns, setColumns] = useState<string[]>([]);
  const [datasetSummary, setDatasetSummary] = useState<any>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post("http://localhost:8000/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setDatasetLoaded(true);
      setColumns(response.data.columns || []);
      setDatasetSummary(response.data.datasetSummary || null);
      setDashboards([]); // clear old dashboards when new dataset arrives
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(`Upload Error: ${err.response?.data?.detail || err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const response = await axios.post("http://localhost:8000/chat", { prompt });
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
        <p className="header-subtitle">Upload your CSV dataset and ask anything to get instant visualizations.</p>
      </header>

      {error && (
        <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '1rem', color: '#ef4444', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {!datasetLoaded ? (
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', borderStyle: 'dashed', cursor: 'pointer', position: 'relative' }}>
          <Upload size={48} color="var(--primary)" style={{ marginBottom: '1.5rem' }} />
          <h2 style={{ color: 'white', fontSize: '1.25rem', marginBottom: '0.5rem' }}>
            {uploading ? "Analyzing Dataset..." : "Upload Dataset (CSV)"}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', opacity: 0.7 }}>
            Select a CSV file to automatically extract structure and enable AI insights.
          </p>
          <input 
            type="file" 
            accept=".csv"
            onChange={handleFileUpload}
            disabled={uploading}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
          />
        </div>
      ) : (
        <>
          <div style={{ marginBottom: '2rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
            {columns.slice(0, 8).map(col => (
              <span key={col} style={{ background: 'rgba(255,255,255,0.05)', padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                {col}
              </span>
            ))}
            {columns.length > 8 && <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>+{columns.length - 8} more</span>}
          </div>
          <div className="search-container">
            <form onSubmit={handleSearch}>
              <Search className="search-icon" size={24} />
              <input 
                type="text" 
                className="search-input"
                placeholder="e.g., Show me monthly trends... or What are my top categories?" 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={loading}
              />
            </form>
          {(loading || uploading) && (
              <div className="loading-dots">
                <div className="dot"></div>
                <div className="dot"></div>
                <div className="dot"></div>
              </div>
            )}
          </div>

          {datasetSummary && dashboards.length === 0 && !loading && (
            <div className="glass-card" style={{ padding: '2rem', marginTop: '2rem', border: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', color: 'var(--primary)' }}>
                <Sparkles size={24} />
                <h2 style={{ fontSize: '1.25rem', margin: 0 }}>AI Dataset Analysis</h2>
              </div>
              
              <h3 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'white', marginBottom: '0.5rem' }}>{datasetSummary.subject}</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: 1.6 }}>{datasetSummary.description}</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border)' }}>
                  <h4 style={{ color: 'white', marginBottom: '1rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Key Dimensions</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {datasetSummary.keyDimensions?.map((dim: string, i: number) => (
                      <span key={i} style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.8rem' }}>{dim}</span>
                    ))}
                  </div>
                </div>
                
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border)' }}>
                  <h4 style={{ color: 'white', marginBottom: '1rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Key Metrics</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {datasetSummary.keyMetrics?.map((met: string, i: number) => (
                      <span key={i} style={{ background: 'rgba(52, 211, 153, 0.1)', color: '#34d399', padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.8rem' }}>{met}</span>
                    ))}
                  </div>
                </div>
              </div>

              {datasetSummary.suggestedQuestions && datasetSummary.suggestedQuestions.length > 0 && (
                <div>
                  <h4 style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Suggested Questions to Ask</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {datasetSummary.suggestedQuestions.map((q: string, i: number) => (
                      <button 
                        key={i} 
                        onClick={() => setPrompt(q)}
                        style={{ 
                          textAlign: 'left', 
                          padding: '1rem', 
                          background: 'rgba(255,255,255,0.03)', 
                          border: '1px solid var(--border)', 
                          borderRadius: '0.75rem',
                          color: 'white',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                          e.currentTarget.style.borderColor = 'var(--primary)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                          e.currentTarget.style.borderColor = 'var(--border)';
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <Search size={16} color="var(--primary)" />
                          <span>{q}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {!datasetSummary && dashboards.length === 0 && !loading && (
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', borderStyle: 'dashed', marginTop: '2rem' }}>
              <LayoutGrid size={48} color="var(--text-muted)" style={{ opacity: 0.3, marginBottom: '1.5rem' }} />
              <h2 style={{ color: 'var(--text-muted)', fontSize: '1.25rem' }}>Dataset Ready!</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', opacity: 0.7, marginTop: '0.5rem' }}>Ask your first question above.</p>
            </div>
          )}
        </>
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
