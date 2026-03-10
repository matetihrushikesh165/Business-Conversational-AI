import React from 'react';
import {
  BarChart, Bar,
  LineChart, Line,
  PieChart, Pie, Cell,
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

interface ChartProps {
  type: string;
  data: any[];
  title: string;
  explanation: string;
  summaryMetrics?: { label: string; value: string }[];
}

const COLORS = ['#6366f1', '#ec4899', '#8b5cf6', '#10b981', '#f59e0b', '#3b82f6'];

const formatNumber = (num: number) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <p className="label" style={{ fontWeight: 600, color: '#f8fafc', marginBottom: '0.25rem' }}>{label}</p>
        {payload.map((item: any, index: number) => (
          <p key={index} style={{ color: item.color || item.fill, fontSize: '0.875rem' }}>
            {item.name}: {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const DashboardChart: React.FC<ChartProps> = ({ 
  type, data, title, explanation, summaryMetrics = [] 
}) => {
  if (!data || data.length === 0) return <div className="glass-card">No data found</div>;

  // Get keys for X and Y axis automatically from first record
  const keys = Object.keys(data[0]);
  const xAxisKey = keys[0];
  const yAxisKeys = keys.length > 1 ? keys.slice(1) : [keys[0]];

  const commonXAxisProps: any = {
    dataKey: xAxisKey,
    tick: { fill: '#94a3b8', fontSize: 10 }, // Smaller font for many cats
    axisLine: false,
    tickLine: false,
    interval: 'preserveStartEnd', 
    angle: -35,
    textAnchor: 'end',
    height: 80,
    tickFormatter: (val: string) => val.length > 20 ? val.substring(0, 17) + '...' : val
  };

  const commonYAxisProps: any = {
    tick: { fill: '#94a3b8', fontSize: 11 },
    axisLine: false,
    tickLine: false,
    tickFormatter: formatNumber,
    width: 60
  };

  const renderChart = () => {
    switch (type.toLowerCase()) {
      case 'line':
        return (
          <LineChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis {...commonXAxisProps} />
            <YAxis {...commonYAxisProps} />
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="top" align="right" iconType="circle" />
            {yAxisKeys.map((key, i) => (
              <Line key={key} type="monotone" dataKey={key} stroke={COLORS[i % COLORS.length]} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            ))}
          </LineChart>
        );
      case 'pie':
        return (
          <PieChart>
            <Pie
              data={data}
              innerRadius={60}
              outerRadius={100}
              paddingAngle={5}
              dataKey={yAxisKeys[0]}
              nameKey={xAxisKey}
              label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="bottom" height={36} />
          </PieChart>
        );
      case 'area':
        return (
          <AreaChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 40 }}>
            <defs>
              <linearGradient id="colorArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis {...commonXAxisProps} />
            <YAxis {...commonYAxisProps} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey={yAxisKeys[0]} stroke="#6366f1" fillOpacity={1} fill="url(#colorArea)" />
          </AreaChart>
        );
      case 'bar':
      default:
        return (
          <BarChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis {...commonXAxisProps} />
            <YAxis {...commonYAxisProps} />
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="top" align="right" iconType="circle" />
            {yAxisKeys.map((key, i) => (
              <Bar key={key} dataKey={key} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        );
    }
  };

  return (
    <div className="glass-card">
      <div className="chart-header">
        <h3 className="chart-title">{title}</h3>
        <p className="chart-explanation">{explanation}</p>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {summaryMetrics.map((metric, i) => (
          <div key={i} style={{ padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.04)', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.05)', minWidth: '120px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{metric.label}</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)', marginTop: '0.25rem' }}>{metric.value}</div>
          </div>
        ))}
      </div>

      <div style={{ width: '100%', height: 350, marginBottom: '1.5rem' }}>
        <ResponsiveContainer>
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default DashboardChart;
