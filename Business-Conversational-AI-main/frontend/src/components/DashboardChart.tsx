import React from 'react';
import {
  BarChart, Bar,
  LineChart, Line,
  PieChart, Pie, Cell,
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { AlertCircle } from 'lucide-react';

interface ChartProps {
  type: string;
  data: any[];
  title: string;
  explanation: string;
  summaryMetrics?: { label: string; value: string }[];
}

const COLORS = ['#7cff67', '#5227FF', '#00d2ff', '#ec4899', '#f59e0b', '#8b5cf6'];

const formatNumber = (num: number) => {
  if (num === null || num === undefined) return '0';
  const val = Math.abs(num);
  if (val >= 10000000) return (num / 1000000).toFixed(1) + 'M';
  if (val >= 1000000) return (num / 1000000).toFixed(2) + 'M';
  if (val >= 10000) return (num / 1000).toFixed(1) + 'K';
  if (val >= 1000) return (num / 1000).toFixed(2) + 'K';
  return num.toLocaleString();
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip" style={{ background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(10px)', border: '1px solid var(--border)', padding: '1rem', borderRadius: '1rem' }}>
        <p className="label" style={{ fontWeight: 700, color: '#fff', marginBottom: '0.5rem', fontSize: '0.9rem' }}>{label}</p>
        {payload.map((item: any, index: number) => (
          <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color || item.fill }}></div>
            <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.85rem' }}>
              {item.name}: <span style={{ fontWeight: 600 }}>{typeof item.value === 'number' ? item.value.toLocaleString() : item.value}</span>
            </p>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const DashboardChart: React.FC<ChartProps> = ({ 
  type, data, title, explanation, summaryMetrics = [] 
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="glass-card" style={{ padding: '4rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
          <AlertCircle size={32} />
        </div>
        <h3 style={{ color: '#fff', fontSize: '1.25rem' }}>No Data Points Found</h3>
        <p style={{ color: 'var(--text-muted)', maxWidth: '300px' }}>The query ran successfully but returned no records in the current period.</p>
      </div>
    );
  }

  const keys = Object.keys(data[0]);
  const xAxisKey = keys[0];
  const yAxisKeys = keys.slice(1).filter((k: string) => {
    // Check if at least one value is numeric
    return data.some((d: any) => typeof d[k] === 'number');
  });

  // Pre-process data for multi-value dimensions (e.g., "WhatsApp, YouTube")
  const processedData = React.useMemo(() => {
    const isMultiValue = data.some(d => String(d[xAxisKey]).includes(','));
    if (!isMultiValue) return data;

    const aggregated: Record<string, any> = {};
    data.forEach(item => {
      const rawVal = String(item[xAxisKey]);
      const labels = rawVal.split(',').map(s => s.trim()).filter(s => s.length > 0);
      
      labels.forEach(label => {
        if (!aggregated[label]) {
          aggregated[label] = { [xAxisKey]: label };
          yAxisKeys.forEach(k => aggregated[label][k] = 0);
          aggregated[label]._count = 0;
        }
        yAxisKeys.forEach(k => {
          if (typeof item[k] === 'number') {
            aggregated[label][k] += item[k];
          }
        });
        aggregated[label]._count += 1;
      });
    });

    return Object.values(aggregated).map((d: any) => {
      const newD = { ...d };
      yAxisKeys.forEach((k: string) => {
        const lowerK = k.toLowerCase();
        if (lowerK.includes('score') || lowerK.includes('roi') || lowerK.includes('rate') || lowerK.includes('avg')) {
          newD[k] = Number((newD[k] / newD._count).toFixed(2));
        }
      });
      delete newD._count;
      return newD;
    }).sort((a: any, b: any) => (b[yAxisKeys[0]] || 0) - (a[yAxisKeys[0]] || 0));
  }, [data, xAxisKey, yAxisKeys]);

  const commonXAxisProps: any = {
    dataKey: xAxisKey,
    tick: { fill: '#94a3b8', fontSize: 11 },
    axisLine: false,
    tickLine: false,
    interval: 0,
    angle: data.length > 5 ? -25 : 0,
    textAnchor: data.length > 5 ? 'end' : 'middle',
    height: data.length > 5 ? 70 : 40,
    tickFormatter: (val: any) => {
      if (!val) return '';
      const s = String(val);
      return s.length > 15 ? s.substring(0, 12) + '...' : s;
    }
  };

  const commonYAxisProps: any = {
    tick: { fill: '#94a3b8', fontSize: 11 },
    axisLine: false,
    tickLine: false,
    tickFormatter: formatNumber,
    width: 65
  };

  const renderChart = () => {
    switch (type.toLowerCase()) {
      case 'line':
        return (
          <LineChart data={processedData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
            <XAxis {...commonXAxisProps} />
            <YAxis {...commonYAxisProps} />
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px' }} />
            {yAxisKeys.map((key, i) => (
              <Line key={key} type="monotone" dataKey={key} stroke={COLORS[i % COLORS.length]} strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#0a0a0c' }} activeDot={{ r: 6, strokeWidth: 0 }} />
            ))}
          </LineChart>
        );
      case 'pie':
        return (
          <PieChart>
            <Pie
              data={processedData}
              innerRadius={0}
              outerRadius="80%"
              paddingAngle={2}
              dataKey={yAxisKeys[0] || keys[1]}
              nameKey={xAxisKey}
              stroke="rgba(0,0,0,0.5)"
              strokeWidth={2}
            >
              {processedData.map((_: any, index: number) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="bottom" height={36} iconType="circle" />
          </PieChart>
        );
      case 'area':
        return (
          <AreaChart data={processedData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
            <defs>
              <linearGradient id="colorArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS[0]} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={COLORS[0]} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
            <XAxis {...commonXAxisProps} />
            <YAxis {...commonYAxisProps} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey={yAxisKeys[0] || keys[1]} stroke={COLORS[0]} strokeWidth={3} fillOpacity={1} fill="url(#colorArea)" />
          </AreaChart>
        );
      case 'bar':
      default:
        return (
          <BarChart data={processedData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
            <XAxis {...commonXAxisProps} />
            <YAxis {...commonYAxisProps} />
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px' }} />
            {yAxisKeys.map((key, i) => (
              <Bar key={key} dataKey={key} fill={COLORS[i % COLORS.length]} radius={[6, 6, 0, 0]} barSize={40} />
            ))}
          </BarChart>
        );
    }
  };

  return (
    <div style={{ padding: '1rem 0' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>{title}</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '1rem', lineHeight: 1.6, maxWidth: '800px' }}>{explanation}</p>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
        {summaryMetrics.map((metric: any, i: number) => (
          <div key={i} style={{ 
            padding: '1.25rem 1.75rem', 
            background: 'rgba(255,255,255,0.03)', 
            borderRadius: '1.25rem', 
            border: '1px solid rgba(255,255,255,0.05)', 
            flex: '1 1 200px',
            minWidth: '220px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
          }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>{metric.label}</div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#fff', marginTop: '0.75rem', display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
              {metric.value}
            </div>
          </div>
        ))}
      </div>

      <div style={{ 
        width: '100%', 
        height: 400, 
        background: 'rgba(255,255,255,0.01)', 
        borderRadius: '1.5rem', 
        padding: '1.5rem', 
        border: '1px solid rgba(255,255,255,0.03)' 
      }}>
        <ResponsiveContainer>
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default DashboardChart;
