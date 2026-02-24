import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { Building2, Plus, Edit2, Trash2, X, AlertTriangle, Loader2 } from 'lucide-react';

const DepartmentManagement = () => {
  const { user } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    head_user_id: '',
    is_active: true
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (user?.role === 'admin') {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [deptRes, userRes] = await Promise.all([
        api.get('/departments'),
        api.get('/users')
      ]);
      setDepartments(deptRes.data);
      setUsers(userRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Department name is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      if (editingDept) {
        await api.put(`/departments/${editingDept.id}`, formData);
      } else {
        await api.post('/departments', formData);
      }

      setShowModal(false);
      setEditingDept(null);
      setFormData({ name: '', description: '', head_user_id: '', is_active: true });
      loadData();
    } catch (error) {
      if (error.response?.data?.error) {
        setErrors({ general: error.response.data.error });
      } else {
        setErrors({ general: 'An error occurred while saving the department' });
      }
    }
  };

  const handleEdit = (dept) => {
    setEditingDept(dept);
    setFormData({
      name: dept.name,
      description: dept.description || '',
      head_user_id: dept.head_user_id || '',
      is_active: dept.is_active === 1 || dept.is_active === true
    });
    setShowModal(true);
  };

  const handleDelete = async (deptId, deptName) => {
    if (!window.confirm(`Are you sure you want to delete the "${deptName}" department?`)) {
      return;
    }

    try {
      await api.delete(`/departments/${deptId}`);
      loadData();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to delete department');
    }
  };

  const openCreateModal = () => {
    setEditingDept(null);
    setFormData({ name: '', description: '', head_user_id: '', is_active: true });
    setErrors({});
    setShowModal(true);
  };

  if (user?.role !== 'admin') {
    return (
      <div className="access-denied">
        <AlertTriangle size={48} />
        <h2>Access Denied</h2>
        <p>You need administrator privileges to access this page.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="loading-state" style={{ height: '60vh' }}>
        <Loader2 size={32} className="animate-spin" />
        <span>Loading departments...</span>
      </div>
    );
  }

  return (
    <div className="department-management-page animate-fade-in">
      {/* section header */}
      <div className="section-header-row">
        <h2 className="section-title">Organizational Departments</h2>
        <button className="btn btn-primary add-dept-btn-refined" onClick={openCreateModal}>
          <Plus size={18} />
          Add Department
        </button>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Department Name</th>
              <th>Head of Department</th>
              <th>Description</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {departments.map((dept) => (
              <tr key={dept.id}>
                <td>
                  <span className="dept-name">{dept.name}</span>
                </td>
                <td>
                  <span className="dept-head">
                    {users.find(u => u.id === dept.head_user_id)?.full_name || 'Unassigned'}
                  </span>
                </td>
                <td>
                  <span className="dept-desc">
                    {dept.description || 'No description'}
                  </span>
                </td>
                <td>
                  <span className={`status-pill ${dept.is_active ? 'active' : 'inactive'}`}>
                    {dept.is_active ? 'Active' : 'Disabled'}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button
                      className="action-btn edit"
                      onClick={() => handleEdit(dept)}
                      title="Edit department"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      className="action-btn delete"
                      onClick={() => handleDelete(dept.id, dept.name)}
                      title="Delete department"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingDept ? 'Edit Department' : 'Add New Department'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              {errors.general && (
                <div className="error-alert">
                  <AlertTriangle size={16} />
                  {errors.general}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Department Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="e.g., Information Technology"
                  required
                />
                {errors.name && <span className="error-text">{errors.name}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Department Head</label>
                <select
                  name="head_user_id"
                  value={formData.head_user_id}
                  onChange={handleInputChange}
                  className="input-field"
                >
                  <option value="">Select a head...</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.full_name} ({u.role})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="input-field"
                  rows={3}
                  placeholder="Brief description of the department's role and responsibilities..."
                />
              </div>

              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleInputChange}
                  />
                  <span>Department Active</span>
                </label>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingDept ? 'Update Department' : 'Create Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .department-management-page {
          max-width: 1200px;
          margin: 0 auto;
          animation: slideUp 0.5s ease-out;
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .section-header-row {
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

        .add-dept-btn-refined {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1.5rem;
          background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
          border: none;
          border-radius: 12px;
          color: white;
          font-weight: 700;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
        }

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

        .table td { padding: 1.25rem 1.5rem; border-bottom: 1px solid rgba(255, 255, 255, 0.03); color: #cbd5e1; }
        
        .dept-name { font-weight: 700; color: #f8fafc; font-size: 1rem; }
        .dept-desc { color: #64748b; font-size: 0.9rem; }
        .date-text { color: #475569; font-size: 0.85rem; font-family: 'JetBrains Mono', monospace; }

        .action-buttons { display: flex; align-items: center; gap: 0.5rem; }
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
        .action-btn.edit:hover { color: #3b82f6; border-color: #3b82f6; }
        .action-btn.delete:hover { color: #ef4444; border-color: #ef4444; }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.8);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1.5rem;
        }

        .modal-content {
          background: #1e293b;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 24px;
          width: 100%;
          max-width: 500px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          animation: slideUp 0.4s ease-out;
        }

        .modal-header {
          padding: 1.5rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .modal-header h3 { font-size: 1.25rem; font-weight: 800; color: #f8fafc; margin: 0; }
        .modal-close { background: none; border: none; color: #64748b; cursor: pointer; transition: color 0.2s; }
        .modal-close:hover { color: #f1f5f9; }

        .modal-form { padding: 1.5rem; }
        .form-group { margin-bottom: 1.5rem; }
        .form-label { display: block; font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 0.5rem; letter-spacing: 0.05em; }
        
        .input-field {
          width: 100%;
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 0.75rem 1rem;
          color: #f1f5f9;
          font-size: 0.9rem;
          transition: all 0.2s;
        }
        .input-field:focus { border-color: #3b82f6; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1); outline: none; }

        .modal-footer {
          margin-top: 2rem;
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
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

        .access-denied {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 60vh;
          text-align: center;
          gap: 1.5rem;
        }
        .access-denied h2 { font-size: 2rem; font-weight: 800; color: #ef4444; margin: 0; }
        .access-denied p { color: #64748b; font-size: 1.125rem; }
      `}</style>
    </div>
  );
};

export default DepartmentManagement;
