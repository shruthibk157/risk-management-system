import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { dashboardAPI } from '../services/api';
import {
  Building2, Users, Shield, UserX,
  RefreshCw, CheckCircle2, XCircle, ArrowUpRight
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

// Animated CountUp Component
const CountUp = ({ end, duration = 1000 }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime = null;
    const animate = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      // easeOutExpo
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCount(Math.floor(easeProgress * end));
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [end, duration]);

  return <span>{count}</span>;
};

const AdminDashboard = () => {
  const { user, selectedDepartment } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState([]);

  const fetchAdminStats = async () => {
    try {
      const params = selectedDepartment ? { department_id: selectedDepartment } : {};
      const response = await dashboardAPI.getAdminStats(params);
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch admin stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const res = await dashboardAPI.getDepartments();
        setDepartments(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error('Failed to fetch departments:', err);
      }
    };
    fetchDepts();
  }, []);

  useEffect(() => {
    fetchAdminStats();
  }, [selectedDepartment]);

  const getContextName = () => {
    if (!selectedDepartment) return 'System-wide summary';
    const dept = departments.find(d => String(d.id) === String(selectedDepartment));
    return `Context: ${dept?.name || 'Selected Department'}`;
  };

  const DonezoStatCard = ({ title, value, isHero, subtitle, rightIcon }) => (
    <div className={`donezo-stat-card ${isHero ? 'hero' : 'standard'}`}>
      <div className="card-top">
        <p className="card-label">{title}</p>
        <button className="card-icon-btn">
          <ArrowUpRight size={16} />
        </button>
      </div>
      <div className="card-middle">
        <p className="card-value"><CountUp end={value} duration={1500} /></p>
      </div>
      <div className="card-bottom">
        <p className="card-sub">{subtitle}</p>
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

  const CHART_COLORS = ['#2D6A4F', '#40916C', '#52B788', '#74C69D', '#95D5B2', '#B7E4C7'];

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header-row">
        <div>
          <h2 className="page-title">SYSTEM OVERVIEW</h2>
          <p className="page-subtitle">ADMINISTRATIVE GOVERNANCE & INFRASTRUCTURE CONTROL</p>
        </div>
      </div>

      <div className="kpi-grid">
        <DonezoStatCard
          title="Total Departments"
          value={stats?.totalDepartments || 0}
          isHero={true}
          subtitle="↑ Active across organization"
        />
        <DonezoStatCard
          title="Total Users"
          value={stats?.totalUsers || 0}
          isHero={false}
          subtitle="↑ Increased from last month"
        />
        <DonezoStatCard
          title="Active Risks"
          value={stats?.activeRisks || 0}
          isHero={false}
          subtitle={getContextName()}
        />
        <DonezoStatCard
          title="Inactive Users"
          value={stats?.inactiveUsers || 0}
          isHero={false}
          subtitle="On Review"
        />
      </div>

      <div className="dashboard-section table-section">
        <div className="section-header-bar">
          <span>DEPARTMENT SUMMARY</span>
        </div>
        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>DEPARTMENT</th>
                <th>HEAD</th>
                <th>USERS</th>
                <th>ACTIVE RISKS</th>
                <th>STATUS</th>
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
                  <td><span className="count-cell users-count">{dept.total_users}</span></td>
                  <td><span className="count-cell risks-count">{dept.active_risks}</span></td>
                  <td>
                    {dept.is_active ? (
                      <span className="status-badge active">
                        <CheckCircle2 size={12} strokeWidth={3} /> ACTIVE
                      </span>
                    ) : (
                      <span className="status-badge inactive">
                        <XCircle size={12} strokeWidth={3} /> INACTIVE
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
            <div className="section-header-bar" style={{ background: '#FFFFFF', borderBottom: '1px solid #F0F0F0' }}>
              <div className="header-with-icon" style={{ color: '#1A4731' }}>
                <Shield size={16} />
                <span style={{ fontSize: '0.65rem', letterSpacing: '0.18em', fontWeight: 700 }}>Active Risks by Department</span>
              </div>
            </div>
            <div className="chart-body">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.departmentSummary}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
                  <XAxis dataKey="name" stroke="#6B7280" fontSize={11} tickLine={false} axisLine={false} interval={0} />
                  <YAxis stroke="#6B7280" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F9FAFB' }} />
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
            <div className="section-header-bar" style={{ background: '#FFFFFF', borderBottom: '1px solid #F0F0F0' }}>
              <div className="header-with-icon" style={{ color: '#1A4731' }}>
                <Users size={16} />
                <span style={{ fontSize: '0.65rem', letterSpacing: '0.18em', fontWeight: 700 }}>Users by Department</span>
              </div>
            </div>
            <div className="chart-body">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.departmentSummary}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
                  <XAxis dataKey="name" stroke="#6B7280" fontSize={11} tickLine={false} axisLine={false} interval={0} />
                  <YAxis stroke="#6B7280" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F9FAFB' }} />
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
          padding: 2.5rem;
        }

        .dashboard-header-row {
          margin-bottom: 3rem;
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
          font-size: 0.75rem;
          letter-spacing: 0.1em;
          color: #6B7280;
          margin: 0;
          text-transform: uppercase;
          font-weight: 500;
        }

        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1.5rem;
          margin-bottom: 3rem;
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

        .card-icon-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .hero .card-icon-btn {
          background: transparent;
          border: 1px solid rgba(255,255,255,0.3);
          color: white;
        }

        .standard .card-icon-btn {
          background: transparent;
          border: 1px solid #E5E7EB;
          color: #9CA3AF;
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

        .dashboard-section {
          background: #FFFFFF;
          border-radius: 16px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.04);
          border: 1px solid #F0F0F0;
          margin-bottom: 2.5rem;
          overflow: hidden;
        }

        .section-header-bar {
          background: #F9FAFB;
          padding: 12px 20px;
          font-size: 0.65rem;
          letter-spacing: 0.18em;
          color: #9CA3AF;
          text-transform: uppercase;
          font-weight: 700;
          border-bottom: 1px solid #F0F0F0;
        }

        .header-with-icon {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .table-container {
          overflow-x: auto;
          background: white;
        }

        .admin-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .admin-table th {
          padding: 1rem 1.5rem;
          color: #9CA3AF;
          font-size: 0.65rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          font-weight: 700;
          border-bottom: 1px solid #F0F0F0;
          background: white;
        }

        .admin-table td {
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid #F9FAFB;
          font-size: 0.875rem;
          transition: background 0.2s;
        }

        .admin-table tbody tr:hover td {
          background: #F9FAFB;
        }

        .dept-name-cell { color: #1A1A2E; font-weight: 700; }
        .unassigned { color: #9CA3AF; font-style: italic; }
        .count-cell { font-family: var(--font-numeric); font-size: 1rem; }
        .users-count { color: #2D6A4F; font-weight: 700; }
        .risks-count { color: #6B7280; font-weight: 600; }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          padding: 4px 14px;
          border-radius: 20px;
          font-size: 0.65rem;
          letter-spacing: 0.1em;
          font-weight: 700;
          text-transform: uppercase;
        }

        .status-badge.active {
          background: rgba(45,106,79,0.08);
          color: #2D6A4F;
          border: 1.5px solid rgba(45,106,79,0.25);
        }

        .status-badge.inactive {
          background: rgba(230,57,70,0.08);
          color: #E63946;
          border: 1.5px solid rgba(230,57,70,0.25);
        }

        .charts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
          gap: 1.5rem;
        }

        .chart-body { padding: 1.5rem; background: white; }

        .custom-tooltip {
          background: #FFFFFF;
          border: 1px solid #E5E7EB;
          padding: 1rem;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        }

        .tooltip-label {
          color: #6B7280;
          font-weight: 700;
          font-size: 0.75rem;
          margin: 0 0 0.25rem 0;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .tooltip-value {
          font-size: 1.25rem;
          font-weight: 800;
          font-family: var(--font-numeric);
          margin: 0;
        }

        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          color: #6B7280;
        }
        
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default AdminDashboard;
