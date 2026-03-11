import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { RefreshCw, ArrowUpRight, ArrowDownRight, Maximize2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI } from '../services/api';

const AnimatedNumber = ({ value, duration = 1000 }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      setCount(Math.floor(progress * value));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }, [value, duration]);

  return <>{count}</>;
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, selectedDepartment } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [departments, setDepartments] = useState([]);

  const fetchStats = useCallback(async () => {
    try {
      setRefreshing(true);
      const params = selectedDepartment ? { department_id: selectedDepartment } : {};
      const response = await dashboardAPI.getStats(params);
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedDepartment]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    const fetchDepts = async () => {
      const res = await dashboardAPI.getDepartments();
      setDepartments(Array.isArray(res.data) ? res.data : []);
    };
    fetchDepts();
  }, []);

  const getDepartmentName = () => {
    if (!selectedDepartment) return 'All Departments';
    const dept = departments.find(d => String(d.id) === String(selectedDepartment));
    return dept?.name || selectedDepartment;
  };

  const DonezoStatCard = ({ title, value, isHero, trend, trendType, subtitle }) => (
    <div className={`donezo-stat-card ${isHero ? 'hero' : 'standard'}`}>
      <div className="card-top">
        <p className="card-label">{title}</p>
        {trend && (
          <div className={`trend-pill ${trendType}`}>
            {trend.startsWith('+') ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {trend}
          </div>
        )}
      </div>
      <div className="card-middle">
        <p className="card-value">
          <AnimatedNumber value={parseFloat(String(value).replace(/[^0-9.]/g, '')) || 0} />
          {String(value).includes('%') ? '%' : ''}
        </p>
      </div>
      <div className="card-bottom">
        <p className="card-sub">{subtitle}</p>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="loading-container">
        <RefreshCw className="animate-spin" size={32} />
        <p>Loading Dashboard...</p>
      </div>
    );
  }

  // Distribution chart Data formatting
  const pieData = stats?.riskClassifications?.length > 0
    ? stats.riskClassifications.map(item => ({
      name: item.risk_classification,
      value: parseInt(item.count, 10)
    }))
    : [
      { name: 'Completed', value: 40 },
      { name: 'In Review', value: 30 },
      { name: 'Pending', value: 30 }
    ];

  const PIE_COLORS = ['#2D6A4F', '#1A4731', '#E5E7EB'];

  const CustomPieLegend = () => (
    <div className="pie-legend">
      <div className="legend-item"><span className="dot dot-completed"></span>Completed</div>
      <div className="legend-item"><span className="dot dot-review"></span>In Review</div>
      <div className="legend-item"><span className="dot dot-pending hatched"></span>Pending</div>
    </div>
  );

  return (
    <div className="user-dashboard">
      <div className="dashboard-header">
        <div className="header-info">
          <h1 className="page-title">Risk Overview</h1>
          <p className="page-subtitle">Real-time insights for {getDepartmentName()}</p>
        </div>
        <button className="btn-refresh" onClick={fetchStats} disabled={refreshing}>
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} style={{ marginRight: '6px' }} />
          Refresh Data
        </button>
      </div>

      <div className="kpi-grid">
        <DonezoStatCard
          title="Total Risks"
          value={stats?.totalRisks || 1}
          isHero={true}
          trend="+3.1%"
          trendType="positive-hero"
          subtitle="Since last month"
        />
        <DonezoStatCard
          title="Mitigated"
          value={stats?.mitigatedRisks || 0}
          trend="+5.2%"
          trendType="positive"
          subtitle="12 actions completed"
        />
        <DonezoStatCard
          title="Critical"
          value={stats?.criticalRisks || 0}
          trend="-2.4%"
          trendType="negative"
          subtitle="Awaiting review"
        />
        <DonezoStatCard
          title="Compliance"
          value={stats?.complianceScore || '94%'}
          subtitle="Target: 98%"
        />
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-header">
            <h3>Risk Profile Trend</h3>
            <button className="expand-btn"><Maximize2 size={14} /></button>
          </div>
          <div className="chart-body">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={stats?.rpnTrend || []}>
                <defs>
                  <linearGradient id="colorGreen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2D6A4F" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#2D6A4F" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} dx={-10} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px', color: '#1A1A2E' }}
                />
                <Area type="monotone" dataKey="avg_rpn" stroke="#2D6A4F" strokeWidth={3} fillOpacity={1} fill="url(#colorGreen)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <h3>Risk Distribution</h3>
          </div>
          <div className="chart-body donut-chart-body">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={pieData}
                  innerRadius={65}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="donut-center-label">
              <span className="donut-pct">100%</span>
              <span className="donut-text">Total Risks</span>
            </div>
            <CustomPieLegend />
          </div>
        </div>
      </div>

      <style>{`
        .user-dashboard {
          max-width: 1400px;
          margin: 0 auto;
          padding: 2.5rem;
          font-family: var(--font-body);
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2.5rem;
        }

        .page-title {
          font-family: var(--font-heading);
          font-size: 2.2rem;
          font-weight: 800;
          color: #1A1A2E;
          margin: 0 0 0.5rem 0;
          line-height: 1.1;
        }

        .page-subtitle {
          font-size: 0.95rem;
          color: #6B7280;
          margin: 0;
        }

        .btn-refresh {
          display: flex;
          align-items: center;
          background: transparent;
          border: 1.5px solid #2D6A4F;
          color: #2D6A4F;
          border-radius: 8px;
          font-size: 0.875rem;
          padding: 8px 16px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-refresh:hover { 
          background: rgba(45,106,79,0.05);
        }

        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2.5rem;
        }

        .donezo-stat-card {
          border-radius: 20px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .donezo-stat-card:hover {
          transform: translateY(-4px);
        }

        .donezo-stat-card.hero {
          background: #1A4731;
          color: white;
          box-shadow: 0 8px 32px rgba(26,71,49,0.3);
          border: none;
        }

        .donezo-stat-card.standard {
          background: #FFFFFF;
          color: #1A1A2E;
          border: 1px solid #F0F0F0;
          box-shadow: 0 2px 12px rgba(0,0,0,0.06);
        }

        .card-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .hero .card-label { color: white; }
        .standard .card-label { color: #6B7280; }
        
        .card-label {
          font-weight: 600;
          font-size: 0.9rem;
          margin: 0;
        }

        .trend-pill {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 2px 10px;
          border-radius: 999px;
          font-size: 0.75rem;
          font-weight: 700;
        }

        .positive-hero {
          background: rgba(82, 183, 136, 0.2);
          color: #52B788;
        }
        
        .positive {
          background: rgba(82, 183, 136, 0.15);
          color: #2D6A4F;
        }

        .negative {
          background: rgba(230, 57, 70, 0.1);
          color: #E63946;
        }

        .card-value {
          font-family: var(--font-numeric);
          font-size: 3.5rem;
          font-weight: 800;
          margin: 0;
          line-height: 1;
        }

        .hero .card-value { color: white; }
        .standard .card-value { color: #1A1A2E; }

        .card-sub {
          font-size: 0.8rem;
          font-weight: 600;
          margin: 0;
        }

        .hero .card-sub { color: #74C69D; }
        .standard .card-sub { color: #6B7280; }

        .charts-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 1.5rem;
        }

        .chart-card {
          background: #FFFFFF;
          border-radius: 16px;
          border: 1px solid #F0F0F0;
          box-shadow: 0 4px 24px rgba(0,0,0,0.04);
          overflow: hidden;
        }

        .chart-header {
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid #F0F0F0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #F9FAFB;
        }

        .chart-header h3 { 
          color: #9CA3AF; 
          font-size: 0.65rem; 
          letter-spacing: 0.18em; 
          text-transform: uppercase;
          margin: 0; 
          font-weight: 700;
        }
        
        .expand-btn {
          background: transparent;
          border: 1px solid #E5E7EB;
          border-radius: 50%;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #6B7280;
          cursor: pointer;
        }
        .expand-btn:hover { background: #F3F4F6; }

        .chart-body { padding: 1.5rem; background: #FFFFFF; position: relative; }

        .donut-chart-body {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .donut-center-label {
          position: absolute;
          top: 130px;
          left: 50%;
          transform: translate(-50%, -50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          pointer-events: none;
        }

        .donut-pct {
          font-size: 1.75rem;
          font-weight: 800;
          color: #1A1A2E;
        }
        .donut-text {
          font-size: 0.75rem;
          color: #6B7280;
          font-weight: 600;
        }

        .pie-legend {
          display: flex;
          gap: 1rem;
          justify-content: center;
          margin-top: 1rem;
        }
        .legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.75rem;
          color: #6B7280;
          font-weight: 500;
        }
        .dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          display: inline-block;
        }
        .dot-completed { background: #2D6A4F; }
        .dot-review { background: #1A4731; }
        .dot-pending { 
          background: #E5E7EB; 
          background-image: repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px);
        }

        .loading-container {
          height: calc(100vh - 100px);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          color: #6B7280;
        }

        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        @media (max-width: 1024px) {
          .charts-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
