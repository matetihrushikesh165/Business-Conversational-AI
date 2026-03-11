import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Sparkles, AlertCircle, LayoutGrid, Upload, Table as TableIcon, Database, ChevronDown, ChevronUp, Filter } from 'lucide-react';
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
  const [rawData, setRawData] = useState<any[]>([]);
  const [showRawData, setShowRawData] = useState(false);
  const [fetchingRaw, setFetchingRaw] = useState(false);
  const [insightFilter, setInsightFilter] = useState("");

  useEffect(() => {
    document.title = "Business Conversational AI";
    fetchRawData(); // Initial load
  }, []);

  const fetchRawData = async () => {
    setFetchingRaw(true);
    try {
      const response = await axios.get("http://localhost:8000/raw_data");
      setRawData(response.data);
    } catch (err) {
      console.error("Failed to fetch raw data");
    } finally {
      setFetchingRaw(false);
    }
  };

  const toggleRawData = () => {
    if (!showRawData) fetchRawData();
    setShowRawData(!showRawData);
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
    } catch (err: any) {
      console.error("Dashboard generation error:", err);
      const msg = err.response?.data?.detail || err.message || "Unknown Network Error";
      setError(`Error: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredInsights = (insights: any[]) => {
    if (!insightFilter) return insights;
    return insights.filter(i => 
      i.label.toLowerCase().includes(insightFilter.toLowerCase()) || 
      i.value.toString().toLowerCase().includes(insightFilter.toLowerCase())
    );
  };

  return (
    <>
      <MemoizedBackground />
      <div className="dashboard-container">
        <header>
          <h1 className="header-title">Business Conversational AI</h1>
          <p className="header-subtitle"> No query? No worry. All it takes is one simple line. </p>
        </header>

        <div className="search-container" style={{ position: 'relative' }}>
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

        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1.5rem', marginBottom: '2rem' }}>
          <button 
            onClick={toggleRawData}
            style={{ 
              background: showRawData ? 'rgba(255,255,255,0.1)' : 'transparent', 
              color: 'var(--text-main)', 
              border: '1px solid var(--border)', 
              padding: '0.6rem 1.2rem', 
              borderRadius: '100px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: 600
            }}
          >
            <TableIcon size={18} />
            {showRawData ? 'Hide Dataset' : 'Show Dataset'}
            {showRawData ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
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
          {dashboards.map((item: DashboardItem) => (
            <React.Fragment key={item.id}>
              {/* Main row */}
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

              {/* Insight Filter UI */}
              <div style={{ marginTop: '3rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Filter size={20} color="var(--primary)" />
                <input 
                  type="text" 
                  placeholder="Review Category Insights..." 
                  value={insightFilter} 
                  onChange={(e) => setInsightFilter(e.target.value)}
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '0.5rem 1rem', color: 'white', width: '300px', fontSize: '0.9rem' }}
                />
              </div>

              {/* Insights */}
              <div className="insights-masonry">
                {[0, 1, 2].map((colIdx) => (
                  <div key={colIdx} className="insights-column">
                    {filteredInsights(item.richInsights).filter((_, idx) => idx % 3 === colIdx).map((insight: any, idx) => (
                      <div key={idx} className="insight-card-wrapper">
                        <ElectricBorder color="#5227FF" speed={1.2} chaos={0.2} borderRadius={20}>
                          <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--primary)' }}>
                              <Sparkles size={18} />
                              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{insight.label}</span>
                            </div>
                            <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'white', letterSpacing: '-0.03em' }}>{insight.value}</div>
                            {insight.subDetail && (
                              <div style={{ padding: '0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.8rem', border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.95rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{insight.subDetail}</div>
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

        {showRawData && (
          <div style={{ marginTop: '4rem', opacity: 1, animation: 'fadeIn 0.5s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', paddingLeft: '1rem' }}>
              <Database size={24} color="var(--primary)" />
              <h3 style={{ color: 'white', fontSize: '1.5rem', fontWeight: 700 }}>Dataset Explorer (Preview)</h3>
              {fetchingRaw && <div className="dot" style={{ width: 8, height: 8 }}></div>}
            </div>
            
            <ElectricBorder color="rgba(255,255,255,0.1)" speed={0.5} chaos={0} borderRadius={20}>
              <div style={{ maxHeight: '500px', overflow: 'auto', background: 'rgba(0,0,0,0.2)', padding: '1px' }}>
                {rawData.length > 0 ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                    <thead style={{ position: 'sticky', top: 0, background: 'rgba(30,30,40,0.95)', backdropFilter: 'blur(10px)', zIndex: 10 }}>
                      <tr>
                        {Object.keys(rawData[0]).map(key => (
                          <th key={key} style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--primary)', fontWeight: 700 }}>{key}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rawData.map((row: any, i: number) => (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                          {Object.values(row).map((val: any, j) => (
                            <td key={j} style={{ padding: '1rem', color: 'rgba(255,255,255,0.7)' }}>{String(val)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    {fetchingRaw ? 'Loading data stream...' : 'No raw data available to display.'}
                  </div>
                )}
              </div>
            </ElectricBorder>
          </div>
        )}

        <footer style={{ marginTop: '6rem', padding: '3rem', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem' }}>
          <button 
            onClick={() => window.location.href = 'http://localhost:5174'}
            className="glass-card"
            style={{ 
              padding: '1rem 2.5rem', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.8rem', 
              cursor: 'pointer', 
              color: 'white', 
              border: '1px solid var(--primary)', 
              background: 'rgba(99, 102, 241, 0.1)',
              fontSize: '1rem',
              fontWeight: 700,
              boxShadow: '0 0 30px rgba(99, 102, 241, 0.2)',
              borderRadius: '100px',
              transition: 'all 0.3s'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <Upload size={20} />
            Analyze Your Own Dataset
          </button>
          
          <div style={{ opacity: 0.4 }}>
            <p style={{ letterSpacing: '0.1em', fontSize: '0.75rem', fontWeight: 600 }}>© 2026 NYKAA DASHBOARD | NEURAL ENGINE DATA-HUB</p>
          </div>
        </footer>
      </div>
    </>
  );
}

export default App;
