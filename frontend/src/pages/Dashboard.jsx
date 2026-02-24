import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import {
  AlertTriangle, CheckCircle, Activity,
  Shield, RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI } from '../services/api';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, selectedDepartment } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    if (user && user.role !== 'admin' && user.department_id) {
      // Non-admin users are restricted to their department
    }
  }, [user]);

  const fetchStats = useCallback(async () => {
    try {
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
    return dept?.name || selectedDepartment.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const StatCard = ({ title, value, icon: Icon, color, subtitle }) => (
    <div className="stat-card card-hover">
      <div className="stat-icon" style={{ backgroundColor: `${color}15`, color }}>
        <Icon size={22} />
      </div>
      <div className="stat-info">
        <p className="stat-label">{title}</p>
        <p className="stat-value">{value}</p>
        {subtitle && <p className="stat-subtitle">{subtitle}</p>}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="loading-state" style={{ height: '60vh' }}>
        <RefreshCw size={32} className="animate-spin" />
        <span>Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div className="dashboard-page overflow-animate">
      <div className="dashboard-controls-row">
        <h2 className="section-headline">Institutional Overview</h2>
        <div className="action-cluster">
          <button
            className="btn btn-ghost refresh-btn-alt"
            onClick={() => { setRefreshing(true); fetchStats(); }}
            disabled={refreshing}
            title="Refresh Data"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <StatCard
          title="Total Risks"
          value={stats?.totalRisks || 0}
          icon={Shield}
          color="#3b82f6"
        />
        <StatCard
          title="Significant Risks"
          value={stats?.highRisks || 0}
          icon={AlertTriangle}
          color="#ef4444"
          subtitle="RPN ≥ 27"
        />
        <StatCard
          title="Under Treatment"
          value={stats?.actionStats?.find(s => s.status === 'Under Treatment')?.count || 0}
          icon={Activity}
          color="#f59e0b"
        />
        <StatCard
          title="Mitigated"
          value={stats?.actionStats?.find(s => s.status === 'Mitigated')?.count || 0}
          icon={CheckCircle}
          color="#10b981"
        />
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">
        <div className="chart-card full-width">
          <div className="chart-header">
            <h3>Risk Profile Trend</h3>
          </div>
          <div className="chart-body">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={stats?.rpnTrend || []}>
                <defs>
                  <linearGradient id="colorRPN" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                <XAxis dataKey="month" stroke="var(--text-secondary)" fontSize={12} />
                <YAxis stroke="var(--text-secondary)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: '8px'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="avg_rpn"
                  stroke="#3b82f6"
                  fillOpacity={1}
                  fill="url(#colorRPN)"
                  name="Average RPN"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <h3>Risk Distribution</h3>
          </div>
          <div className="chart-body">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats?.riskClassifications || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="count"
                  nameKey="risk_classification"
                >
                  {stats?.riskClassifications?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: '8px'
                  }}
                />
                <Legend verticalAlign="bottom" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <h3>Treatment Status</h3>
          </div>
          <div className="chart-body">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats?.actionStats || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                <XAxis dataKey="status" stroke="var(--text-secondary)" fontSize={12} />
                <YAxis stroke="var(--text-secondary)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} name="Actions" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>


      <style>{`
        .dashboard-page {
          max-width: 1400px;
          margin: 0 auto;
          animation: slideUp 0.5s ease-out;
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .dashboard-controls-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 2rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .section-headline {
          font-size: 1.5rem;
          font-weight: 800;
          color: #f8fafc;
          margin: 0;
          letter-spacing: -0.02em;
        }

        .refresh-btn-alt {
          padding: 0.6rem;
          background: rgba(15, 23, 42, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          color: #94a3b8;
          cursor: pointer;
          transition: all 0.2s;
        }

        .refresh-btn-alt:hover {
          color: #3b82f6;
          border-color: #3b82f6;
          background: rgba(59, 130, 246, 0.1);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .stat-card {
          background: rgba(30, 41, 59, 0.4);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 20px;
          padding: 1.5rem;
          display: flex;
          align-items: center;
          gap: 1.25rem;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
          overflow: hidden;
          position: relative;
        }

        .stat-card:hover {
          transform: translateY(-5px);
          border-color: rgba(59, 130, 246, 0.3);
          box-shadow: var(--neural-glow);
        }

        .stat-icon {
          width: 56px;
          height: 56px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          position: relative;
          z-index: 1;
        }

        .stat-info {
          display: flex;
          flex-direction: column;
          z-index: 1;
        }

        .stat-label {
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          color: #64748b;
          margin: 0;
          letter-spacing: 0.1em;
        }

        .stat-value {
          font-size: 2rem;
          font-weight: 800;
          color: #f8fafc;
          margin: 0.25rem 0;
          letter-spacing: -0.01em;
        }

        .stat-subtitle {
          font-size: 0.75rem;
          color: #475569;
          margin: 0;
        }

        .charts-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .chart-card {
          background: rgba(30, 41, 59, 0.3);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2);
        }

        .chart-card.full-width {
          grid-column: span 2;
        }

        .chart-header {
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          background: rgba(15, 23, 42, 0.2);
        }

        .chart-header h3 {
          margin: 0;
          font-size: 1rem;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .chart-body {
          padding: 1.5rem;
        }

        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1.5rem;
          color: #64748b;
        }

        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        @media (max-width: 1024px) {
          .charts-grid { grid-template-columns: 1fr; }
          .chart-card.full-width { grid-column: span 1; }
      `}</style>
    </div>
  );
};

export default Dashboard;
