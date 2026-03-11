import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { Users, Plus, Edit2, Trash2, X, AlertTriangle, Loader2 } from 'lucide-react';

const UserManagement = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    email: '',
    password: '',
    role: 'risk_owner',
    departmentId: '',
    isActive: true
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
      const [usersResponse, departmentsResponse] = await Promise.all([
        api.get('/users'),
        api.get('/departments')
      ]);
      setUsers(usersResponse.data);
      setDepartments(departmentsResponse.data);
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
    if (!formData.username.trim()) newErrors.username = 'Username is required';
    if (!formData.full_name.trim()) newErrors.full_name = 'Full name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!editingUser && !formData.password) newErrors.password = 'Password is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const submitData = { ...formData };
      if (!submitData.password) delete submitData.password;

      if (editingUser) {
        await api.put(`/users/${editingUser.id}`, submitData);
      } else {
        await api.post('/users', submitData);
      }

      setShowModal(false);
      setEditingUser(null);
      setFormData({
        username: '',
        full_name: '',
        email: '',
        password: '',
        role: 'risk_owner',
        departmentId: '',
        isActive: true
      });
      loadData();
    } catch (error) {
      if (error.response?.data?.error) {
        setErrors({ general: error.response.data.error });
      } else {
        setErrors({ general: 'An error occurred while saving the user' });
      }
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      full_name: user.full_name || '',
      email: user.email,
      password: '',
      role: user.role,
      departmentId: user.department_id || '',
      isActive: user.is_active === 1 || user.is_active === true
    });
    setShowModal(true);
  };

  const handleDelete = async (userId, username) => {
    if (!window.confirm(`Are you sure you want to delete user "${username}"?`)) {
      return;
    }

    try {
      await api.delete(`/users/${userId}`);
      loadData();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to delete user');
    }
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      email: '',
      password: '',
      role: 'user',
      departmentId: '',
      isActive: true
    });
    setErrors({});
    setShowModal(true);
  };

  const getRoleBadge = (role) => {
    return (
      <span className={`badge ${role === 'admin' ? 'badge-blue' : 'badge-green'}`}>
        {role}
      </span>
    );
  };

  const getStatusBadge = (isActive) => {
    return (
      <span className={`badge ${isActive ? 'badge-green' : 'badge-secondary'}`}>
        {isActive ? 'Active' : 'Inactive'}
      </span>
    );
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
        <span>Loading users...</span>
      </div>
    );
  }

  return (
    <div className="user-management-page animate-fade-in">
      {/* section header */}
      <div className="section-header-row">
        <h2 className="section-title">System Users</h2>
        <button className="btn btn-primary add-user-btn-refined" onClick={openCreateModal}>
          <Plus size={18} />
          Add User
        </button>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Department</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  <div className="user-info-cell">
                    <div className="user-avatar">
                      {u.full_name?.charAt(0).toUpperCase() || u.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="user-name">{u.full_name}</div>
                      <div className="user-email">{u.email}</div>
                      <div className="user-username">@{u.username}</div>
                    </div>
                  </div>
                </td>
                <td>{getRoleBadge(u.role)}</td>
                <td>
                  <span className="dept-text">
                    {u.department_name || 'Not assigned'}
                  </span>
                </td>
                <td>{getStatusBadge(u.is_active)}</td>
                <td>
                  <div className="action-buttons">
                    <button
                      className="action-btn edit"
                      onClick={() => handleEdit(u)}
                      title="Edit user"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      className="action-btn delete"
                      onClick={() => handleDelete(u.id, u.username)}
                      title="Delete user"
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
              <h3>{editingUser ? 'Edit User' : 'Add New User'}</h3>
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
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="e.g., John Doe"
                  required
                />
                {errors.full_name && <span className="error-text">{errors.full_name}</span>}
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Username *</label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    className="input-field"
                    required
                  />
                  {errors.username && <span className="error-text">{errors.username}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="input-field"
                    required
                  />
                  {errors.email && <span className="error-text">{errors.email}</span>}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">{editingUser ? 'New Password (Optional)' : 'Password *'}</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder={editingUser ? 'Leave blank to keep current' : ''}
                  required={!editingUser}
                />
                {errors.password && <span className="error-text">{errors.password}</span>}
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Role *</label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className="input-field"
                  >
                    <option value="risk_owner">Risk Owner</option>
                    <option value="department_head">Department Head</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Department</label>
                  <select
                    name="departmentId"
                    value={formData.departmentId}
                    onChange={handleInputChange}
                    className="input-field"
                  >
                    <option value="">Not assigned</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleInputChange}
                  />
                  <span>Active user</span>
                </label>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingUser ? 'Update User' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .user-management-page {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2.5rem;
          background: #F5F5F5;
          min-height: 100vh;
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
          background: linear-gradient(135deg, #1A4731 0%, #2D6A4F 60%, #40916C 100%);
          border-radius: 16px;
          padding: 28px 32px;
          box-shadow: 0 8px 32px rgba(26,71,49,0.25);
        }

        .section-title {
          font-family: 'DM Sans', sans-serif;
          font-size: 1.6rem;
          font-weight: 800;
          color: #FFFFFF;
          margin: 0;
        }

        .add-user-btn-refined {
          display: flex;
          align-items: center;
          background: #FFFFFF;
          color: #1A4731;
          border: none;
          border-radius: 10px;
          padding: 12px 24px;
          font-weight: 700;
          font-size: 0.85rem;
          letter-spacing: 0.03em;
          box-shadow: 0 4px 16px rgba(0,0,0,0.15);
          transition: all 0.2s;
          cursor: pointer;
        }
        .add-user-btn-refined:hover {
          background: #F0FDF4;
          box-shadow: 0 6px 24px rgba(0,0,0,0.2);
        }
        .add-user-btn-refined svg {
          color: #2D6A4F;
          font-weight: 800;
          margin-right: 6px;
        }

        .table-container {
          background: #FFFFFF;
          border: 1px solid #E5E7EB;
          border-radius: 16px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.06);
          overflow: hidden;
          margin-top: 20px;
        }

        .table { width: 100%; border-collapse: collapse; text-align: left; }
        .table th {
          background: #F8FAFB;
          border-bottom: 2px solid #E5E7EB;
          padding: 14px 24px;
          color: #6B7280;
          font-size: 0.65rem;
          font-weight: 600;
          letter-spacing: 0.15em;
          text-transform: uppercase;
        }

        .table td { 
          background: #FFFFFF;
          border-bottom: 1px solid #F3F4F6;
          padding: 18px 24px;
          transition: background 0.15s ease;
          color: #374151; vertical-align: middle; 
        }
        
        .table tbody tr:hover td {
          background: #F0FDF4;
        }
        
        .user-info-cell { display: flex; align-items: center; gap: 1rem; }
        .user-avatar {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #1A4731 0%, #2D6A4F 100%);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          color: white;
          font-size: 1rem;
        }
        .user-name { font-weight: 600; color: #1A1A2E; font-size: 0.92rem; font-family: 'DM Sans', sans-serif;}
        .user-email { color: #6B7280; font-size: 0.85rem; }
        .user-username { color: #9CA3AF; font-size: 0.8rem; }

        .dept-text { color: #6B7280; font-size: 0.88rem; }

        .badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: capitalize;
        }
        .badge-blue { background: rgba(59, 130, 246, 0.08); color: #2563EB; border: 1.5px solid rgba(59, 130, 246, 0.2); }
        .badge-green { background: rgba(16, 185, 129, 0.08); color: #059669; border: 1.5px solid rgba(16, 185, 129, 0.2); }
        
        .badge-green::before { content: '●'; font-size: 7px; color: #10B981; }
        .badge-secondary { background: rgba(239, 68, 68, 0.08); color: #DC2626; border: 1.5px solid rgba(239, 68, 68, 0.2); }
        .badge-secondary::before { content: '○'; font-size: 7px; }

        .action-buttons { display: flex; align-items: center; gap: 0.5rem; }
        .action-btn {
          width: 32px; height: 32px;
          border-radius: 8px;
          border: 1.5px solid #E2E8F0;
          background: #FFFFFF;
          color: #6B7280;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: all 0.15s;
        }
        .action-btn.edit:hover {
          border-color: #2D6A4F;
          background: rgba(45,106,79,0.06);
          color: #2D6A4F;
        }
        .action-btn.delete:hover {
          border-color: #EF4444;
          background: rgba(239,68,68,0.06);
          color: #EF4444;
        }

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
          background: #FFFFFF;
          border: 1px solid rgba(0, 0, 0, 0.1);
          border-radius: 24px;
          width: 100%;
          max-width: 500px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.2);
          animation: slideUp 0.4s ease-out;
        }

        .modal-header {
          padding: 1.5rem;
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .modal-header h3 { font-size: 1.25rem; font-weight: 800; color: #0F172A; margin: 0; }
        .modal-close { background: none; border: none; color: #64748B; cursor: pointer; transition: color 0.2s; }
        .modal-close:hover { color: #1A1A2E; }

        .modal-form { padding: 1.5rem; }
        .form-group { margin-bottom: 1.25rem; }
        .form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .form-label { display: block; font-size: 0.75rem; font-weight: 700; color: #64748B; text-transform: uppercase; margin-bottom: 0.5rem; letter-spacing: 0.05em; }
        
        .input-field {
          width: 100%;
          background: #F9FAFB;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          padding: 0.75rem 1rem;
          color: #1A1A2E;
          font-size: 0.9rem;
          transition: all 0.2s;
        }
        .input-field:focus { border-color: #2D6A4F; box-shadow: 0 0 0 4px rgba(45, 106, 79, 0.1); outline: none; background: #FFFFFF; }

        .checkbox-group { margin-top: 0.5rem; }
        .checkbox-label { display: flex; align-items: center; gap: 0.75rem; color: #475569; font-size: 0.9rem; cursor: pointer; }
        .checkbox-label input { width: 18px; height: 18px; border-radius: 4px; background: #FFFFFF; border: 1px solid #CBD5E1; }

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

export default UserManagement;
