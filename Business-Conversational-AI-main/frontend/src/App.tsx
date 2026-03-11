import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Search, Sparkles, AlertCircle, LayoutGrid, Upload, FileCheck, Database, ArrowLeft, Table as TableIcon, ChevronDown, ChevronUp, Filter, MessageSquare, Clock, Plus } from 'lucide-react';
import DashboardChart from './components/DashboardChart';
import FloatingLines from './components/FloatingLines';
import ElectricBorder from './components/ElectricBorder';
import './index.css';

interface DashboardItem {
  id: string;
  sql: string;
  chartType: string;
  title: string;
  prompt?: string;
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
  const [history, setHistory] = useState<DashboardItem[]>([]);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [rawData, setRawData] = useState<any[]>([]);
  const [showRawData, setShowRawData] = useState(false);
  const [fetchingRaw, setFetchingRaw] = useState(false);
  const [insightFilter, setInsightFilter] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.title = "Custom Data Intelligence Mode";
    fetchRawData(); 
  }, []);

  const fetchRawData = async () => {
    setFetchingRaw(true);
    try {
      const response = await axios.get("http://localhost:8001/raw_data");
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

  const handleSearch = async (e?: React.FormEvent, overridePrompt?: string) => {
    if (e) e.preventDefault();
    const query = overridePrompt || prompt;
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setActiveHistoryId(null);
    try {
      const response = await axios.post("http://localhost:8001/chat", { prompt: query });
      const newItem: DashboardItem = {
        ...response.data,
        id: Date.now().toString(),
        prompt: query
      };
      setDashboards([newItem]);
      setHistory(prev => [newItem, ...prev]);
      setPrompt("");
    } catch (err: any) {
      console.error("Dashboard generation error:", err);
      const msg = err.response?.data?.detail || err.message || "Unknown Network Error";
      setError(`Error: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);
    setError(null);
    setUploadedFileName(null);

    try {
      const resp = await axios.post("http://localhost:8001/upload", formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUploadedFileName(file.name);
      setDashboards([]); 
      setHistory([]);
      await fetchRawData();
      setShowRawData(true);
      
      // Auto-generate dashboard
      await handleSearch(undefined, "Generate a comprehensive executive summary of this entire dataset including key growth metrics, category trends, and top performance indicators.");
      
      alert(resp.data.message + " Initial dashboard generated automatically.");
    } catch (err: any) {
      console.error("Upload error:", err);
      const msg = err.response?.data?.detail || err.message || "Unknown Network Error";
      setError(`Upload Failed: ${msg}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const filteredInsights = (insights: any[]) => {
    if (!insightFilter) return insights;
    return insights.filter(i => 
      i.label.toLowerCase().includes(insightFilter.toLowerCase()) || 
      i.value.toString().toLowerCase().includes(insightFilter.toLowerCase())
    );
  };

  const loadHistoryItem = (item: DashboardItem) => {
    setDashboards([item]);
    setActiveHistoryId(item.id);
  };

  const startNewChat = () => {
    setDashboards([]);
    setActiveHistoryId(null);
    setPrompt("");
  };

  return (
    <>
      <MemoizedBackground />

      {/* Sidebar */}
      <div style={{
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          width: '280px',
          background: 'rgba(10, 10, 15, 0.8)',
          backdropFilter: 'blur(20px)',
          borderRight: '1px solid rgba(255,255,255,0.05)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          padding: '1.5rem 1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '2.5rem', paddingLeft: '0.5rem' }}>
          <div style={{ width: '32px', height: '32px', background: 'var(--primary)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
             <Sparkles size={20} color="white" />
          </div>
          <h2 style={{ color: 'white', fontSize: '1.1rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Neural Analytics</h2>
        </div>

        <button 
          onClick={startNewChat}
          style={{
            width: '100%',
            padding: '0.8rem',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: '0.8rem',
            cursor: 'pointer',
            marginBottom: '2rem',
            transition: 'all 0.2s',
            fontSize: '0.9rem',
            fontWeight: 600
          }}
          onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
          onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
        >
          <Plus size={18} />
          Latest Visualization
        </button>

        <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0 0.5rem 0.8rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <Clock size={14} />
            Recent Insights
          </div>
          
          {history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'rgba(255,255,255,0.2)', fontSize: '0.85rem' }}>
              No recent queries
            </div>
          ) : (
            history.map((item) => (
              <button
                key={item.id}
                onClick={() => loadHistoryItem(item)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '0.75rem 0.8rem',
                  borderRadius: '10px',
                  background: activeHistoryId === item.id ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                  border: 'none',
                  color: activeHistoryId === item.id ? 'white' : 'rgba(255,255,255,0.6)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.8rem',
                  transition: 'all 0.2s',
                  fontSize: '0.85rem'
                }}
                onMouseOver={(e) => {
                  if (activeHistoryId !== item.id) e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                }}
                onMouseOut={(e) => {
                  if (activeHistoryId !== item.id) e.currentTarget.style.background = 'transparent';
                }}
              >
                <MessageSquare size={16} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.prompt || item.title}
                </span>
              </button>
            ))
          )}
        </div>

        <div style={{ marginTop: 'auto', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <button 
             onClick={() => window.location.href = 'http://localhost:5173'}
             style={{ 
               width: '100%',
               padding: '0.75rem', 
               display: 'flex', 
               alignItems: 'center', 
               gap: '0.6rem', 
               cursor: 'pointer', 
               color: 'rgba(255,255,255,0.7)', 
               background: 'transparent',
               border: 'none',
               fontSize: '0.85rem', 
               fontWeight: 600,
               transition: 'color 0.2s'
             }}
             onMouseOver={(e) => e.currentTarget.style.color = 'white'}
             onMouseOut={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
          >
            <ArrowLeft size={18} />
            Back to Dashboard
          </button>
        </div>
      </div>

      <div className="dashboard-container" style={{ marginLeft: '280px', maxWidth: 'calc(100vw - 320px)', width: '100%' }}>
        <header>
          <h1 className="header-title">Data Intelligence Hub</h1>
          <p className="header-subtitle">Private dataset analysis with deep memory and cross-reference logic.</p>
          
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem', gap: '1rem' }}>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="glass-card"
              style={{ padding: '1rem 2rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '100px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 700, transition: 'transform 0.2s' }}
              disabled={uploading}
              onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              {uploading ? "Parsing Data..." : "Upload New Dataset"}
              <Upload size={20} />
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} accept=".csv,.xlsx,.xls" />
          </div>

          {uploadedFileName && (
            <div style={{ marginTop: '1.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 1rem', background: 'rgba(124, 255, 103, 0.1)', border: '1px solid rgba(124, 255, 103, 0.2)', borderRadius: '100px', color: '#7cff67', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              <FileCheck size={14} />
              Active: {uploadedFileName}
            </div>
          )}
        </header>

        <div className="search-container">
          <form onSubmit={handleSearch}>
            <input
              type="text"
              className="search-input"
              placeholder="Query any field in your private dataset..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={loading || uploading}
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
            <Database size={64} style={{ opacity: 0.15, marginBottom: '2rem' }} />
            <h2 style={{ color: 'var(--text-main)', fontSize: '1.5rem', fontWeight: 600 }}>Awaiting Input</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1rem', opacity: 0.7, marginTop: '0.75rem', textAlign: 'center', maxWidth: '400px' }}>Upload a dataset above or start querying your latest uploaded data.</p>
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

              {/* Insight Filter UI */}
              <div style={{ marginTop: '3rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Filter size={20} color="var(--primary)" />
                <input 
                  type="text" 
                  placeholder="Filter Categorical Insights..." 
                  value={insightFilter} 
                  onChange={(e) => setInsightFilter(e.target.value)}
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '0.5rem 1rem', color: 'white', width: '300px', fontSize: '0.9rem' }}
                />
              </div>

              <div className="insights-masonry">
                {[0, 1, 2].map((colIdx) => (
                  <div key={colIdx} className="insights-column">
                    {filteredInsights(item.richInsights).filter((_, idx) => idx % 3 === colIdx).map((insight, idx) => (
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
      </div>
    </>
  );
}

export default App;
