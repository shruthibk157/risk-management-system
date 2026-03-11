import React, { useState } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, LineChart, Line, AreaChart, Area
} from 'recharts';
import {
    Target, TrendingUp, CheckCircle, AlertCircle,
    ArrowUpRight, ArrowDownRight, Award, Zap
} from 'lucide-react';

const data = [
    { name: 'Jan', performance: 85, target: 80, compliance: 90 },
    { name: 'Feb', performance: 88, target: 80, compliance: 92 },
    { name: 'Mar', performance: 82, target: 80, compliance: 85 },
    { name: 'Apr', performance: 90, target: 80, compliance: 94 },
    { name: 'May', performance: 94, target: 80, compliance: 96 },
    { name: 'Jun', performance: 92, target: 80, compliance: 95 },
];

const PerformanceMonitoring = () => {
    const StatCard = ({ title, value, icon: Icon, color, trend, subtitle }) => (
        <div className="perf-card">
            <div className="perf-card-header">
                <div className="icon-wrap" style={{ backgroundColor: `${color}15`, color }}>
                    <Icon size={20} />
                </div>
                {trend && (
                    <div className={`trend-tag ${trend.startsWith('+') ? 'up' : 'down'}`}>
                        {trend}
                    </div>
                )}
            </div>
            <div className="perf-card-body">
                <span className="label">{title}</span>
                <h2 className="value">{value}</h2>
                <p className="subtitle">{subtitle}</p>
            </div>
        </div>
    );

    return (
        <div className="performance-page">
            <div className="perf-header">
                <div className="header-text">
                    <h1>Performance Monitoring</h1>
                    <p>Track organizational KPIs and compliance metrics in real-time.</p>
                </div>
                <div className="header-actions">
                    <button className="btn-export">Export Report</button>
                </div>
            </div>

            <div className="perf-grid">
                <StatCard
                    title="Overall Performance"
                    value="92.4%"
                    icon={Target}
                    color="#2563EB"
                    trend="+2.5%"
                    subtitle="Above quarterly target"
                />
                <StatCard
                    title="Compliance Score"
                    value="95.8%"
                    icon={Award}
                    color="#10B981"
                    trend="+1.2%"
                    subtitle="Highest in 6 months"
                />
                <StatCard
                    title="Operational Efficiency"
                    value="88.1%"
                    icon={Zap}
                    color="#8B5CF6"
                    trend="-0.5%"
                    subtitle="Resource optimization focus"
                />
                <StatCard
                    title="Risk Mitigation Rate"
                    value="74.2%"
                    icon={CheckCircle}
                    color="#F59E0B"
                    trend="+4.8%"
                    subtitle="18 risks mitigated this month"
                />
            </div>

            <div className="charts-container">
                <div className="chart-box main-chart">
                    <div className="chart-header">
                        <h3>Performance vs Target</h3>
                        <div className="chart-legend">
                            <span className="legend-item"><span className="dot perf"></span> Performance</span>
                            <span className="legend-item"><span className="dot target"></span> Target</span>
                        </div>
                    </div>
                    <div className="chart-body">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data}>
                                <defs>
                                    <linearGradient id="colorPerf" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#2563EB" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dx={-10} />
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Area type="monotone" dataKey="performance" stroke="#2563EB" strokeWidth={2} fillOpacity={1} fill="url(#colorPerf)" />
                                <Line type="monotone" dataKey="target" stroke="#94a3b8" strokeDasharray="5 5" dot={false} strokeWidth={1} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="chart-box">
                    <div className="chart-header">
                        <h3>Departmental Efficiency</h3>
                    </div>
                    <div className="chart-body">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={[
                                { name: 'Ops', val: 92 },
                                { name: 'Finance', val: 85 },
                                { name: 'IT', val: 94 },
                                { name: 'HR', val: 88 },
                            ]}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Bar dataKey="val" fill="#2563EB" radius={[4, 4, 0, 0]} barSize={32} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <style>{`
        .performance-page {
          padding: 2.5rem;
          background: var(--bg-app);
          min-height: calc(100vh - 70px);
          font-family: var(--font-body);
        }

        .perf-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2.5rem;
        }

        .header-text h1 {
          font-family: var(--font-heading);
          font-size: 2rem;
          font-weight: 800;
          color: var(--text-dark);
          margin-bottom: 0.25rem;
        }
        .header-text p { color: var(--text-muted); font-size: 1rem; }

        .btn-export {
          background: white;
          border: 1px solid var(--border-card);
          padding: 0.625rem 1.25rem;
          border-radius: 8px;
          font-weight: 600;
          color: var(--text-dark);
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-export:hover { border-color: var(--accent-blue); color: var(--accent-blue); }

        .perf-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2.5rem;
        }

        .perf-card {
          background: white;
          padding: 1.5rem;
          border-radius: 12px;
          border: 1px solid var(--border-card);
          box-shadow: var(--shadow-card);
        }

        .perf-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.25rem;
        }

        .icon-wrap {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .trend-tag {
          font-size: 0.75rem;
          font-weight: 700;
          padding: 0.25rem 0.625rem;
          border-radius: 999px;
        }
        .trend-tag.up { background: #ecfdf5; color: #10b981; }
        .trend-tag.down { background: #fef2f2; color: #ef4444; }

        .label { color: var(--text-muted); font-size: 0.875rem; font-weight: 600; display: block; margin-bottom: 0.5rem; }
        .value { font-family: var(--font-numeric); font-size: 1.75rem; font-weight: 800; color: var(--text-dark); margin: 0; }
        .subtitle { color: var(--text-muted); font-size: 0.75rem; margin-top: 0.5rem; }

        .charts-container {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 1.5rem;
        }

        .chart-box {
          background: white;
          border-radius: 12px;
          border: 1px solid var(--border-card);
          box-shadow: var(--shadow-card);
          padding: 1.5rem;
        }

        .chart-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .chart-header h3 {
          font-family: var(--font-heading);
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--text-dark);
          margin: 0;
        }

        .chart-body { height: 320px; }

        .chart-legend { display: flex; gap: 1rem; }
        .legend-item { display: flex; align-items: center; gap: 0.5rem; font-size: 0.75rem; color: var(--text-muted); font-weight: 600; }
        .dot { width: 8px; height: 8px; border-radius: 50%; }
        .dot.perf { background: #2563EB; }
        .dot.target { background: #94a3b8; }

        @media (max-width: 1024px) {
          .charts-container { grid-template-columns: 1fr; }
        }
      `}</style>
        </div>
    );
};

export default PerformanceMonitoring;
