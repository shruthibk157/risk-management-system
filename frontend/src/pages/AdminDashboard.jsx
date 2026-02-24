import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { dashboardAPI } from '../services/api';
import {
  Building2, Users, Shield, UserX,
  RefreshCw, CheckCircle2, XCircle, BarChart as BarChartIcon
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAdminStats = async () => {
    try {
      const response = await dashboardAPI.getAdminStats();
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch admin stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminStats();
  }, []);

  const StatCard = ({ title, value, icon: Icon, color, subtitle }) => (
    <div className="stat-card">
      <div className="stat-icon" style={{ backgroundColor: `${color}15`, color }}>
        <Icon size={24} />
      </div>
      <div className="stat-info">
        <p className="stat-label">{title}</p>
        <p className="stat-value">{value}</p>
        {subtitle && <p className="stat-subtitle">{subtitle}</p>}
      </div>
    </div>
  );

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{label}</p>
          <p className="tooltip-value" style={{ color: payload[0].color }}>
            {payload[0].name}: {payload[0].value}
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="loading-state" style={{ height: '60vh' }}>
        <RefreshCw size={32} className="animate-spin" />
        <span>Initializing System Overview...</span>
      </div>
    );
  }

  // Colors for charts
  const CHART_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4'];

  return (
    <div className="admin-dashboard animate-fade-in">
      <div className="dashboard-header-row">
        <div>
          <h2 className="page-title">System Overview</h2>
          <p className="page-subtitle">Administrative Governance & Infrastructure Control</p>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard
          title="Total Departments"
          value={stats?.totalDepartments || 0}
          icon={Building2}
          color="#3b82f6"
        />
        <StatCard
          title="Total Users"
          value={stats?.totalUsers || 0}
          icon={Users}
          color="#8b5cf6"
        />
        <StatCard
          title="Active Risks"
          value={stats?.activeRisks || 0}
          icon={Shield}
          color="#10b981"
          subtitle="System-wide summary"
        />
        <StatCard
          title="Inactive Users"
          value={stats?.inactiveUsers || 0}
          icon={UserX}
          color="#ef4444"
        />
      </div>

      <div className="dashboard-section">
        <div className="section-header">
          <h3>Department Summary</h3>
        </div>
        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Department</th>
                <th>Head</th>
                <th>Users</th>
                <th>Active Risks</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {stats?.departmentSummary?.map((dept) => (
                <tr key={dept.id}>
                  <td><span className="dept-name-cell">{dept.name}</span></td>
                  <td>
                    <span className="head-name-cell">
                      {dept.head_name || <span className="unassigned">Unassigned</span>}
                    </span>
                  </td>
                  <td><span className="count-cell">{dept.total_users}</span></td>
                  <td><span className="count-cell">{dept.active_risks}</span></td>
                  <td>
                    {dept.is_active ? (
                      <span className="status-badge active">
                        <CheckCircle2 size={12} /> Active
                      </span>
                    ) : (
                      <span className="status-badge inactive">
                        <XCircle size={12} /> Deactivated
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {stats?.departmentSummary?.length > 0 && (
        <div className="charts-grid">
          <div className="dashboard-section chart-container">
            <div className="section-header">
              <div className="header-with-icon">
                <Shield size={16} />
                <h3>Active Risks by Department</h3>
              </div>
            </div>
            <div className="chart-body">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.departmentSummary}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                  <Bar dataKey="active_risks" name="Active Risks" radius={[4, 4, 0, 0]}>
                    {stats.departmentSummary.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="dashboard-section chart-container">
            <div className="section-header">
              <div className="header-with-icon">
                <Users size={16} />
                <h3>Users by Department</h3>
              </div>
            </div>
            <div className="chart-body">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.departmentSummary}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                  <Bar dataKey="total_users" name="Total Users" radius={[4, 4, 0, 0]}>
                    {stats.departmentSummary.map((entry, index) => (
                      <Cell key={`cell-u-${index}`} fill={CHART_COLORS[(index + 2) % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .admin-dashboard {
          max-width: 1400px;
          margin: 0 auto;
          padding-bottom: 3rem;
        }

        .dashboard-header-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 2rem;
        }

        .page-title {
          font-size: 1.875rem;
          font-weight: 800;
          color: #f8fafc;
          margin: 0;
          letter-spacing: -0.02em;
        }

        .page-subtitle {
          color: #64748b;
          font-size: 0.875rem;
          margin-top: 0.25rem;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2.5rem;
        }

        .stat-card {
          background: rgba(30, 41, 59, 0.3);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 20px;
          padding: 1.5rem;
          display: flex;
          align-items: center;
          gap: 1.25rem;
        }

        .stat-icon {
          width: 52px;
          height: 52px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .stat-label {
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          color: #64748b;
          margin: 0;
          letter-spacing: 0.05em;
        }

        .stat-value {
          font-size: 1.75rem;
          font-weight: 800;
          color: #f8fafc;
          margin: 0.125rem 0;
        }

        .stat-subtitle {
          font-size: 0.7rem;
          color: #475569;
          margin: 0;
        }

        .dashboard-section {
          background: rgba(30, 41, 59, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 24px;
          overflow: hidden;
          margin-bottom: 2rem;
        }

        .section-header {
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          background: rgba(15, 23, 42, 0.2);
        }

        .section-header h3 {
          margin: 0;
          font-size: 0.875rem;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .header-with-icon {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          color: #64748b;
        }

        .charts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
          gap: 1.5rem;
        }

        .chart-body {
          padding: 1.5rem;
        }

        .custom-tooltip {
          background: #0f172a;
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 0.75rem;
          border-radius: 8px;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }

        .tooltip-label {
          color: #f8fafc;
          font-weight: 700;
          font-size: 0.875rem;
          margin-bottom: 0.25rem;
        }

        .tooltip-value {
          font-size: 0.875rem;
          font-weight: 600;
        }

        .table-container {
          overflow-x: auto;
        }

        .admin-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .admin-table th {
          padding: 1rem 1.5rem;
          font-size: 0.7rem;
          font-weight: 700;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .admin-table td {
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.02);
          color: #cbd5e1;
          font-size: 0.875rem;
        }

        .dept-name-cell {
          font-weight: 700;
          color: #f1f5f9;
        }

        .head-name-cell {
          color: #94a3b8;
        }

        .unassigned {
          color: #475569;
          font-style: italic;
          font-size: 0.8rem;
        }

        .count-cell {
          font-family: 'JetBrains Mono', monospace;
          color: #3b82f6;
          font-weight: 600;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.25rem 0.625rem;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 700;
        }

        .status-badge.active {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
        }

        .status-badge.inactive {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
        }

        .animate-spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .animate-fade-in {
          animation: fadeIn 0.5s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          color: #64748b;
        }
      `}</style>
    </div>
  );
};

export default AdminDashboard;
