import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { risksAPI } from '../services/api';
import {
  FileText, Search, Edit, Trash2, Eye,
  AlertTriangle, Shield, RefreshCw, Plus
} from 'lucide-react';

const RiskList = () => {
  const { selectedDepartment, setSelectedDepartment, user } = useAuth();
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

  useEffect(() => {
    fetchRisks();
  }, [fetchRisks]);

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

  const getRPNBadgeColor = (rpn) => {
    if (rpn <= 25) return 'green';
    if (rpn <= 75) return 'yellow';
    return 'red';
  };

  const getRPNLabel = (rpn) => {
    if (rpn <= 25) return 'Acceptable';
    if (rpn <= 75) return 'Moderate';
    return 'Significant';
  };

  const RPNBadge = ({ rpn }) => {
    const color = getRPNBadgeColor(rpn);
    return (
      <div className={`rpn-badge rpn-badge-${color}`}>
        <span className="rpn-number">{rpn}</span>
      </div>
    );
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'Open': { class: 'badge-blue', icon: AlertTriangle },
      'Under Treatment': { class: 'badge-yellow', icon: RefreshCw },
      'Mitigated': { class: 'badge-green', icon: Shield },
      'Closed': { class: 'badge-secondary', icon: Shield }
    };

    const config = statusConfig[status] || statusConfig['Open'];
    const Icon = config.icon;

    return (
      <span className={`badge ${config.class}`}>
        <Icon size={12} />
        {status}
      </span>
    );
  };

  return (
    <div className="risk-list-page animate-fade-in">
      <div className="list-controls-container">
        <h2 className="section-title">Active Risk Register</h2>
        <div className="list-actions">
          <div className="search-box-refined">
            <Search size={18} />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by ID, description, or owner..."
            />
          </div>
          <button
            className="btn btn-secondary icon-only refresh-btn-refined"
            onClick={() => fetchRisks(true)}
            disabled={isRefreshing}
            title="Refresh List"
          >
            <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {(statusFilter || debouncedSearch) && (
        <div className="active-filters-row animate-fade-in">
          <div className="filter-pill-container">
            {statusFilter && (
              <span className="filter-pill">
                Status: <strong>{statusFilter}</strong>
                <button onClick={() => setStatusFilter(null)} className="clear-filter">
                  <X size={14} />
                </button>
              </span>
            )}
            {debouncedSearch && (
              <span className="filter-pill">
                Search: <strong>{debouncedSearch}</strong>
                <button onClick={() => setSearchTerm('')} className="clear-filter">
                  <X size={14} />
                </button>
              </span>
            )}
            <button className="clear-all-link" onClick={() => { setStatusFilter(null); setSearchTerm(''); }}>
              Clear all
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="table-container">
        {loading ? (
          <div className="loading-state">
            <RefreshCw size={24} className="animate-spin" />
            <span>Loading risks...</span>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>SL No</th>
                <th>Description</th>
                <th>Department</th>
                <th>RPN</th>
                <th>Level</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {risks.map(risk => (
                <tr key={risk.id} className="risk-row">
                  <td className="risk-id">
                    {risk.sl_no}
                  </td>
                  <td className="risk-desc">
                    <div className="desc-main">{risk.risk_description}</div>
                    <div className="desc-sub">{risk.potential_failure_mode}</div>
                  </td>
                  <td className="risk-dept">
                    <span className="dept-name">{risk.department_name}</span>
                  </td>
                  <td className="risk-rpn">
                    <RPNBadge rpn={risk.rpn} />
                  </td>
                  <td className="risk-level">
                    <span className={`level-badge ${risk.rpn >= 27 ? 'significant' : 'acceptable'}`}>
                      {risk.rpn >= 27 ? 'S' : 'A'}
                    </span>
                  </td>
                  <td
                    className="risk-status filterable"
                    onClick={() => {
                      setStatusFilter(risk.status);
                      if (user?.role === 'admin') {
                        setSelectedDepartment(null);
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                    title={user?.role === 'admin' ? `Show all ${risk.status} risks` : `Filter by ${risk.status}`}
                  >
                    {getStatusBadge(risk.status)}
                  </td>
                  <td className="risk-actions">
                    <button
                      onClick={() => navigate(`/risks/${risk.id}/view`)}
                      className="action-btn view"
                      title="View Details"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => navigate(`/risks/${risk.id}/edit`)}
                      className="action-btn edit"
                      title="Edit"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(risk.id, risk.risk_id)}
                      className="action-btn delete"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loading && risks.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">
              <FileText size={32} />
            </div>
            <h3>No risks found</h3>
            <p>Start by adding a new risk entry to the register.</p>
            <button
              className="btn btn-primary"
              onClick={() => navigate('/risks/new')}
              style={{ marginTop: '1rem' }}
            >
              <Plus size={16} />
              Add Risk
            </button>
          </div>
        )}
      </div>

      <style>{`
        .risk-list-page {
          max-width: 1400px;
          margin: 0 auto;
          animation: slideUp 0.5s ease-out;
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .list-controls-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 2rem;
          background: rgba(30, 41, 59, 0.4);
          backdrop-filter: blur(12px);
          padding: 1.5rem;
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          gap: 1.5rem;
        }

        .section-title {
          font-size: 1.5rem;
          font-weight: 800;
          color: #f8fafc;
          margin: 0;
          letter-spacing: -0.02em;
        }

        .list-actions {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .search-box-refined {
          width: 320px;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 0.625rem 1rem;
          transition: all 0.2s;
        }

        .search-box-refined:focus-within {
          border-color: #3b82f6;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
        }

        .search-box-refined svg { color: #64748b; }
        .search-box-refined input {
          flex: 1;
          background: transparent;
          border: none;
          color: #f1f5f9;
          font-size: 0.9rem;
          outline: none;
        }

        .refresh-btn-refined {
          width: 42px;
          height: 42px;
          background: rgba(15, 23, 42, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          color: #94a3b8;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .refresh-btn-refined:hover { color: #3b82f6; border-color: #3b82f6; background: rgba(59, 130, 246, 0.1); }

        .table-container {
          background: rgba(30, 41, 59, 0.3);
          backdrop-filter: blur(16px);
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          overflow: hidden;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2);
        }

        .table { width: 100%; border-collapse: collapse; }
        .table th {
          background: rgba(15, 23, 42, 0.4);
          text-align: left;
          padding: 1.25rem 1.5rem;
          color: #94a3b8;
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .table td { padding: 1.25rem 1.5rem; border-bottom: 1px solid rgba(255, 255, 255, 0.03); color: #cbd5e1; vertical-align: middle; }
        .risk-row:hover { background: rgba(255, 255, 255, 0.02); }
        
        .mono-text { font-family: 'JetBrains Mono', monospace; font-weight: 700; color: #3b82f6; font-size: 0.8rem; background: rgba(59, 130, 246, 0.1); padding: 0.25rem 0.5rem; border-radius: 4px; }
        
        .desc-main { font-weight: 600; color: #f1f5f9; margin-bottom: 0.25rem; font-size: 0.95rem; }
        .desc-sub { font-size: 0.8rem; color: #64748b; }

        .dept-name { background: rgba(148, 163, 184, 0.1); color: #94a3b8; padding: 0.25rem 0.625rem; border-radius: 6px; font-size: 0.75rem; font-weight: 600; }

        .rpn-badge {
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          padding: 0.5rem 1rem;
          border-radius: 12px;
          min-width: 80px;
        }
        .rpn-badge-green { background: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.2); }
        .rpn-badge-yellow { background: rgba(245, 158, 11, 0.1); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.2); }
        .rpn-badge-red { background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); box-shadow: 0 0 15px rgba(239, 68, 68, 0.1); }

        .rpn-number { font-size: 1.125rem; font-weight: 800; }
        .rpn-text { font-size: 0.6rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.8; }

        .level-badge {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 0.8rem;
        }
        .level-badge.significant { background: #ef4444; color: white; box-shadow: 0 0 12px rgba(239, 68, 68, 0.4); }
        .level-badge.acceptable { background: #10b981; color: white; }

        .badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.4rem 0.75rem;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 700;
        }
        .badge-blue { background: rgba(59, 130, 246, 0.1); color: #3b82f6; border: 1px solid rgba(59, 130, 246, 0.2); }
        .badge-yellow { background: rgba(245, 158, 11, 0.1); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.2); }
        .badge-green { background: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.2); }
        .badge-secondary { background: rgba(148, 163, 184, 0.1); color: #94a3b8; border: 1px solid rgba(148, 163, 184, 0.2); }

        .risk-actions { display: flex; align-items: center; gap: 0.5rem; }
        .action-btn {
          width: 36px;
          height: 36px;
          background: rgba(15, 23, 42, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 10px;
          color: #94a3b8;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .action-btn:hover { background: rgba(255, 255, 255, 0.1); color: #f1f5f9; transform: translateY(-2px); }

        .action-btn.edit:hover { color: #f59e0b; border-color: #f59e0b; }
        .action-btn.delete:hover { color: #ef4444; border-color: #ef4444; }
        .action-btn.view:hover { color: #3b82f6; border-color: #3b82f6; }


        .loading-state, .empty-state {
          padding: 5rem 2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
          color: #64748b;
        }
        .empty-state h3 { color: #f1f5f9; margin: 0; }
        
        @media (max-width: 1024px) {
          .list-controls-container { flex-direction: column; align-items: stretch; }
          .table-container { overflow-x: auto; }
          .table { min-width: 1000px; }
        }

        .active-filters-row {
          margin-bottom: 1.5rem;
          padding: 0.5rem 0;
          animation: slideDown 0.3s ease-out;
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .filter-pill-container {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .filter-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.4rem 0.75rem;
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.2);
          border-radius: 8px;
          color: #94a3b8;
          font-size: 0.8rem;
        }

        .filter-pill strong {
          color: #3b82f6;
        }

        .clear-filter {
          background: none;
          border: none;
          color: #64748b;
          cursor: pointer;
          display: flex;
          align-items: center;
          padding: 2px;
          border-radius: 4px;
          transition: all 0.2s;
        }

        .clear-filter:hover {
          background: rgba(59, 130, 246, 0.2);
          color: #f1f5f9;
        }

        .clear-all-link {
          background: none;
          border: none;
          color: #64748b;
          font-size: 0.75rem;
          font-weight: 600;
          text-decoration: underline;
          cursor: pointer;
          padding: 0.5rem;
        }

        .clear-all-link:hover {
          color: #3b82f6;
        }

        .risk-status.filterable:hover {
          filter: brightness(1.2);
          transform: scale(1.02);
          transition: all 0.2s;
        }
      `}</style>
    </div>
  );
};

export default RiskList;
