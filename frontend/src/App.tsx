import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Sparkles, AlertCircle, LayoutGrid } from 'lucide-react';
import DashboardChart from './components/DashboardChart';
import FloatingLines from './components/FloatingLines';
import ElectricBorder from './components/ElectricBorder';
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

const BACKGROUND_GRADIENT = ['#08d1ff', '#3b7bd5', '#8f2de2', '#f100ff'];

const MemoizedBackground = React.memo(() => (
  <FloatingLines
    linesGradient={BACKGROUND_GRADIENT}
    enabledWaves={['top', 'middle', 'bottom']}
    interactive={true}
    animationSpeed={0.3}
  />
));

function App() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dashboards, setDashboards] = useState<DashboardItem[]>([]);

  useEffect(() => {
    document.title = "Business Conversational AI";
  }, []);

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
      // setPrompt(""); // Keep prompt for context or clear? User didn't specify, but often preferred to stay or clear. I'll clear but state issues might cause flash.
    } catch (err: any) {
      console.error("Dashboard generation error:", err);
      const msg = err.response?.data?.detail || err.message || "Unknown Network Error";
      setError(`Error: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <MemoizedBackground />
      <div className="dashboard-container">
        <header>
          <h1 className="header-title">Business Conversational AI</h1>
          <p className="header-subtitle"> No query? No worry. All it takes is one simple line. </p>
        </header>

        <div className="search-container">
          <form onSubmit={handleSearch}>
            <input
              type="text"
              className="search-input"
              placeholder="Search your business data with neural accuracy..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={loading}
            />
            <Search className="search-icon" size={22} />
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
          <div style={{ padding: '1.25rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '1.25rem', color: '#ef4444', marginBottom: '3rem', display: 'flex', alignItems: 'center', gap: '1rem', backdropFilter: 'blur(10px)' }}>
            <AlertCircle size={24} />
            <span style={{ fontWeight: 500 }}>{error}</span>
          </div>
        )}

        {dashboards.length === 0 && !loading && (
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '6rem 2rem', borderStyle: 'dashed', background: 'rgba(255,255,255,0.02)' }}>
            <LayoutGrid size={64} color="var(--text-muted)" style={{ opacity: 0.15, marginBottom: '2rem' }} />
            <h2 style={{ color: 'var(--text-main)', fontSize: '1.5rem', fontWeight: 600 }}>System Ready for Input</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1rem', opacity: 0.7, marginTop: '0.75rem', textAlign: 'center', maxWidth: '400px' }}>Initiate a query to generate multi-dimensional visualizations and neural insights.</p>
          </div>
        )}

        <div className="dashboard-content">
          {dashboards.map((item) => (
            <React.Fragment key={item.id}>
              <div className="main-chart-row">
                <ElectricBorder color="#7cff67" speed={0.8} chaos={0.15} borderRadius={24}>
                  <div style={{ padding: '1.5rem' }}>
                    <DashboardChart
                      type={item.chartType}
                      data={item.data}
                      title={item.title}
                      explanation={item.explanation}
                      summaryMetrics={item.summaryMetrics}
                    />
                  </div>
                </ElectricBorder>
              </div>

              <div className="insights-masonry">
                {[0, 1, 2].map((colIdx) => (
                  <div key={colIdx} className="insights-column">
                    {item.richInsights.filter((_, idx) => idx % 3 === colIdx).map((insight, idx) => (
                      <div key={idx} className="insight-card-wrapper">
                        <ElectricBorder color="#5227FF" speed={1.2} chaos={0.2} borderRadius={20}>
                          <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--primary)' }}>
                              <Sparkles size={18} />
                              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{insight.label}</span>
                            </div>

                            <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'white', letterSpacing: '-0.03em' }}>
                              {insight.value}
                            </div>

                            {insight.subDetail && (
                              <div style={{ padding: '0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.8rem', border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.95rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                                {insight.subDetail}
                              </div>
                            )}

                            {insight.list && (
                              <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                {insight.list.map((li: string, i: number) => (
                                  <div key={i} style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)', padding: '0.5rem 0', borderBottom: i < insight.list.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <div style={{ width: '4px', height: '4px', background: 'var(--primary)', borderRadius: '50%' }}></div>
                                    {li}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </ElectricBorder>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </React.Fragment>
          ))}
        </div>

        <footer style={{ marginTop: '6rem', padding: '3rem', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center', opacity: 0.4 }}>
          <p style={{ letterSpacing: '0.1em', fontSize: '0.75rem', fontWeight: 600 }}>© 2026 BUSINESS CONVERSATIONAL AI | NEURAL ENGINE DATA-HUB</p>
        </footer>
      </div>
    </>
  );
}

export default App;
