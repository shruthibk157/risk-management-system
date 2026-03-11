import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { risksAPI } from '../services/api';
import {
  FileText, Search, Edit, Trash2, Eye,
  AlertTriangle, Shield, RefreshCw, Plus, Filter, ChevronRight, MoreHorizontal
} from 'lucide-react';

const RiskList = () => {
  const { selectedDepartment, user } = useAuth();
  const navigate = useNavigate();
  const [risks, setRisks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchRisks = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    else setLoading(true);

    try {
      const params = {
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
        ...(selectedDepartment ? { department_id: selectedDepartment } : {}),
        ...(statusFilter ? { status: statusFilter } : {})
      };
      const response = await risksAPI.getAll(params);
      setRisks(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to fetch risks:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [debouncedSearch, selectedDepartment, statusFilter]);

  useEffect(() => { fetchRisks(); }, [fetchRisks]);

  const handleDelete = async (id, riskId) => {
    if (window.confirm(`Are you sure you want to delete risk ${riskId}?`)) {
      try {
        await risksAPI.delete(id);
        fetchRisks();
      } catch (error) {
        console.error('Delete failed:', error);
      }
    }
  };

  const StatusBadge = ({ status }) => {
    const statusLower = status?.toLowerCase() || 'open';
    const className = statusLower.replace(' ', '-');
    return <span className={`status-pill ${className}`}>{status}</span>;
  };

  const RiskLevelBadge = ({ rpn }) => {
    let level = 'low';
    if (rpn > 75) level = 'critical';
    else if (rpn > 50) level = 'high';
    else if (rpn > 25) level = 'medium';

    return <span className={`risk-pill ${level}`}>{level.charAt(0).toUpperCase() + level.slice(1)}</span>;
  };

  const RiskStats = () => (
    <div className="risk-stats-row">
      <div className="risk-mini-card">
        <div className="mini-card-icon open"><AlertTriangle size={18} /></div>
        <div className="mini-card-info">
          <span className="mini-label">Open Issues</span>
          <span className="mini-value">{risks.filter(r => r.status === 'Open').length}</span>
        </div>
      </div>
      <div className="risk-mini-card">
        <div className="mini-card-icon progress"><RefreshCw size={18} /></div>
        <div className="mini-card-info">
          <span className="mini-label">In Progress</span>
          <span className="mini-value">{risks.filter(r => r.status === 'Under Treatment').length}</span>
        </div>
      </div>
      <div className="risk-mini-card">
        <div className="mini-card-icon mitigated"><Shield size={18} /></div>
        <div className="mini-card-info">
          <span className="mini-label">Mitigated</span>
          <span className="mini-value">{risks.filter(r => r.status === 'Mitigated').length}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="risk-list-page">
      <div className="risk-list-header">
        <div className="header-left">
          <h1>Risk Register</h1>
          <p>Total {risks.length} active risks found</p>
        </div>
        <div className="header-right">
          <button className="btn-add-risk" onClick={() => navigate('/risks/new')}>
            <Plus size={18} />
            Add New Risk
          </button>
        </div>
      </div>

      <RiskStats />

      <div className="risk-table-container">
        <div className="table-controls">
          <div className="search-box">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search risks, owners, or IDs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="filter-group">
            <button className="btn-filter">
              <Filter size={18} />
              Filters
            </button>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="risk-table">
            <thead>
              <tr>
                <th>Risk ID</th>
                <th>Description</th>
                <th>Department</th>
                <th>Owner</th>
                <th>Level</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="loading-row">
                    <RefreshCw className="animate-spin" />
                    <span>Loading risk data...</span>
                  </td>
                </tr>
              ) : risks.length === 0 ? (
                <tr>
                  <td colSpan="7" className="empty-row">No risks found matching your criteria.</td>
                </tr>
              ) : (
                risks.map((risk) => (
                  <tr key={risk.id} className="risk-row">
                    <td className="risk-id-cell">#{risk.risk_id}</td>
                    <td className="risk-desc-cell">
                      <div className="risk-desc-text">{risk.risk_description}</div>
                      <div className="requirement-tag">{risk.requirement_process_area}</div>
                    </td>
                    <td>{risk.Department?.name}</td>
                    <td className="owner-cell">
                      <div className="avatar">{risk.User?.name?.charAt(0)}</div>
                      <span>{risk.User?.name}</span>
                    </td>
                    <td><RiskLevelBadge rpn={risk.rpn} /></td>
                    <td><StatusBadge status={risk.status} /></td>
                    <td className="actions-cell">
                      <div className="action-btns">
                        <button title="View" onClick={() => navigate(`/risks/${risk.id}`)}><Eye size={16} /></button>
                        <button title="Edit" onClick={() => navigate(`/risks/edit/${risk.id}`)}><Edit size={16} /></button>
                        <button title="Delete" className="delete" onClick={() => handleDelete(risk.id, risk.risk_id)}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        .risk-list-page {
          padding: 2.5rem;
          background: var(--bg-app);
          min-height: calc(100vh - 70px);
        }

        .risk-list-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .header-left h1 {
          font-family: var(--font-heading);
          font-size: 2rem;
          font-weight: 800;
          color: var(--text-dark);
          margin-bottom: 0.25rem;
        }

        .header-left p { color: var(--text-muted); font-size: 1rem; }

        .btn-add-risk {
          background: var(--accent-blue);
          color: white;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          border: none;
          transition: transform 0.2s, opacity 0.2s;
        }

        .btn-add-risk:hover { transform: translateY(-2px); opacity: 0.9; }

        /* Risk Mini Cards */
        .risk-stats-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
          margin-bottom: 2.5rem;
        }

        .risk-mini-card {
          background: white;
          padding: 1.25rem;
          border-radius: 12px;
          border: 1px solid var(--border-card);
          display: flex;
          align-items: center;
          gap: 1.25rem;
          box-shadow: var(--shadow-card);
        }

        .mini-card-icon {
          width: 48px;
          height: 48px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .mini-card-icon.open { background: #fef2f2; color: #ef4444; }
        .mini-card-icon.progress { background: #fffbeb; color: #f59e0b; }
        .mini-card-icon.mitigated { background: #ecfdf5; color: #10b981; }

        .mini-label { display: block; color: var(--text-muted); font-size: 0.875rem; font-weight: 600; }
        .mini-value { display: block; font-size: 1.5rem; font-weight: 800; color: var(--text-dark); }

        /* Table Container */
        .risk-table-container {
          background: white;
          border-radius: 12px;
          border: 1px solid var(--border-card);
          box-shadow: var(--shadow-card);
          overflow: hidden;
        }

        .table-controls {
          padding: 1.25rem 1.5rem;
          display: flex;
          justify-content: space-between;
          border-bottom: 1px solid var(--border-card);
          background: #fcfcfd;
        }

        .search-box {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: white;
          border: 1px solid var(--border-card);
          padding: 0.5rem 1rem;
          border-radius: 8px;
          width: 320px;
          color: var(--text-muted);
        }

        .search-box input {
          border: none;
          outline: none;
          width: 100%;
          font-size: 0.875rem;
        }

        .btn-filter {
          background: white;
          border: 1px solid var(--border-card);
          padding: 0.5rem 1rem;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--text-dark);
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
        }

        /* Risk Table */
        .risk-table { width: 100%; border-collapse: collapse; }
        .risk-table th {
          text-align: left;
          padding: 1rem 1.5rem;
          background: #f9fafb;
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          border-bottom: 1px solid var(--border-card);
        }

        .risk-row td { padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border-card); vertical-align: middle; }
        .risk-row:hover { background: #fcfcfd; }

        .risk-id-cell { font-family: var(--font-numeric); font-weight: 700; color: var(--accent-blue); }
        .risk-desc-cell { max-width: 400px; }
        .risk-desc-text { font-weight: 600; color: var(--text-dark); margin-bottom: 0.25rem; font-size: 0.9375rem; }
        .requirement-tag { font-size: 0.75rem; color: var(--text-muted); }

        .owner-cell { display: flex; align-items: center; gap: 0.75rem; }
        .avatar {
          width: 28px;
          height: 28px;
          background: #e5e7eb;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-muted);
        }

        .risk-pill { padding: 4px 12px; border-radius: 999px; font-size: 0.75rem; font-weight: 700; }
        .risk-pill.critical { background: #fee2e2; color: #ef4444; }
        .risk-pill.high { background: #ffedd5; color: #f97316; }
        .risk-pill.medium { background: #fef3c7; color: #f59e0b; }
        .risk-pill.low { background: #d1fae5; color: #10b981; }

        .status-pill { padding: 4px 12px; border-radius: 999px; font-size: 0.75rem; font-weight: 600; }
        .status-pill.mitigated { background: #ecfdf5; color: #059669; }
        .status-pill.under-treatment { background: #fffbeb; color: #d97706; }
        .status-pill.open { background: #fef2f2; color: #dc2626; }
        .status-pill.closed { background: #f3f4f6; color: #4b5563; }

        .action-btns { display: flex; gap: 0.5rem; }
        .action-btns button {
          width: 32px;
          height: 32px;
          border-radius: 6px;
          border: 1px solid var(--border-card);
          background: white;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .action-btns button:hover { border-color: var(--accent-blue); color: var(--accent-blue); background: #f0f7ff; }
        .action-btns button.delete:hover { border-color: #ef4444; color: #ef4444; background: #fef2f2; }

        .loading-row { text-align: center; padding: 4rem !important; color: var(--text-muted); font-weight: 600; }
        .animate-spin { animation: spin 1s linear infinite; margin-right: 0.75rem; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        .empty-row { text-align: center; padding: 4rem !important; color: var(--text-muted); font-style: italic; }
      `}</style>
    </div>
  );
};

export default RiskList;
