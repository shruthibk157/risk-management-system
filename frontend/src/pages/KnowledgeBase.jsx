import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { documentsAPI } from '../services/api';
import { FileText, Trash2, Upload, Search, Loader2, AlertCircle, Plus } from 'lucide-react';

const KnowledgeBase = () => {
  const { user, selectedDepartment } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [selectedDepartment]);

  const fetchDepartments = async () => {
    try {
      const { dashboardAPI } = await import('../services/api');
      const response = await dashboardAPI.getDepartments();
      setDepartments(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    }
  };

  const fetchDocuments = async () => {
    if (!selectedDepartment) {
      setDocuments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await documentsAPI.getAll({ department_id: selectedDepartment });
      if (response.data && Array.isArray(response.data)) {
        setDocuments(response.data);
      } else {
        setDocuments([]);
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    formData.append('department_id', selectedDepartment);

    try {
      await documentsAPI.upload(formData);
      fetchDocuments();
    } catch (error) {
      console.error('Upload failed', error);
      alert('Failed to upload document. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      await documentsAPI.delete(id);
      setDocuments(prev => prev.filter(d => d.id !== id));
    } catch (error) {
      console.error('Delete failed', error);
      alert('Failed to delete document.');
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const filteredDocs = documents.filter(doc =>
    doc.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.filename?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getDepartmentName = () => {
    if (!selectedDepartment) return 'All Departments';
    if (departments.length === 0) return 'Loading...';
    const dept = departments.find(d => String(d.id) === String(selectedDepartment));
    return dept ? dept.name : 'Unknown Department';
  };

  return (
    <div className="knowledge-base-page animate-fade-in">
      {/* Search & Actions Row */}
      <div className="search-section-refined">
        <div className="search-group">
          <div className="search-box-knowledge">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search by filename or title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="doc-stats">
            <span className="stat-number">{documents.length}</span>
            <span className="stat-label">items</span>
          </div>
        </div>

        <div className="action-group">
          <button
            className="btn btn-primary upload-btn-refined"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || !selectedDepartment}
          >
            {uploading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Upload size={16} />
            )}
            Upload Document
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            multiple
            hidden
            accept=".pdf,.docx,.txt,.json,.md"
          />
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        {loading ? (
          <div className="loading-state">
            <Loader2 size={24} className="animate-spin" />
            <span>Loading documents...</span>
          </div>
        ) : !selectedDepartment ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <AlertCircle size={32} />
            </div>
            <h3>Select a Department</h3>
            <p>Please select a department from the sidebar to view its knowledge base.</p>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <FileText size={32} />
            </div>
            <h3>No documents found</h3>
            <p>Upload policies, SOPs, or guides to enhance AI accuracy.</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>File Name</th>
                <th>Department</th>
                <th>Upload Date</th>
                <th>Size</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocs.map((doc) => (
                <tr key={doc.id} className="doc-row">
                  <td className="doc-cell">
                    <div className="file-info">
                      <div className="file-icon">
                        <FileText size={20} />
                      </div>
                      <span className="file-name">{doc.name || doc.filename}</span>
                    </div>
                  </td>
                  <td className="dept-cell">
                    <span className="dept-badge">
                      {getDepartmentName()}
                    </span>
                  </td>
                  <td className="date-cell">
                    {formatDate(doc.uploaded_at || doc.uploadedAt || doc.created_at)}
                  </td>
                  <td className="size-cell">
                    {formatFileSize(doc.size)}
                  </td>
                  <td className="actions-cell">
                    <button
                      className="action-btn delete"
                      onClick={() => handleDelete(doc.id)}
                      title="Delete document"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <style>{`
        .knowledge-base-page {
          max-width: 1200px;
          margin: 0 auto;
          animation: slideUp 0.5s ease-out;
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .search-section-refined {
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

        .search-group {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          flex: 1;
        }

        .search-box-knowledge {
          flex: 1;
          max-width: 400px;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 0.75rem 1.25rem;
          transition: all 0.2s;
        }

        .search-box-knowledge:focus-within {
          border-color: #3b82f6;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
        }

        .search-box-knowledge svg { color: #64748b; }
        .search-box-knowledge input {
          flex: 1;
          background: transparent;
          border: none;
          color: #f1f5f9;
          font-size: 0.9rem;
          outline: none;
        }

        .doc-stats {
          display: flex;
          align-items: baseline;
          gap: 0.5rem;
          padding-left: 1.5rem;
          border-left: 1px solid rgba(255, 255, 255, 0.1);
        }

        .stat-number { font-size: 1.5rem; font-weight: 800; color: #3b82f6; }
        .stat-label { font-size: 0.75rem; font-weight: 600; color: #64748b; text-transform: uppercase; }

        .upload-btn-refined {
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
        .upload-btn-refined:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4); }
        .upload-btn-refined:disabled { opacity: 0.5; cursor: not-allowed; }

        .table-container {
          background: rgba(30, 41, 59, 0.3);
          backdrop-filter: blur(16px);
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
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
        .doc-row:hover { background: rgba(255, 255, 255, 0.02); }
        
        .file-info { display: flex; align-items: center; gap: 1rem; }
        .file-icon {
          width: 44px;
          height: 44px;
          background: rgba(59, 130, 246, 0.1);
          color: #3b82f6;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .file-name { font-weight: 600; font-size: 0.95rem; color: #f8fafc; }

        .dept-badge {
          background: rgba(148, 163, 184, 0.1);
          color: #94a3b8;
          padding: 0.25rem 0.625rem;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .action-btn.delete {
          width: 36px;
          height: 36px;
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border: none;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .action-btn.delete:hover { background: #ef4444; color: white; transform: scale(1.1); }

        .loading-state, .empty-state {
          padding: 5rem 2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
          color: #64748b;
        }
        .empty-state-icon { color: #334155; opacity: 0.5; }
        .empty-state h3 { color: #f1f5f9; margin: 0; font-size: 1.25rem; }
        .empty-state p { color: #64748b; margin: 0; max-width: 300px; text-align: center; font-size: 0.9rem; line-height: 1.6; }

        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        @media (max-width: 768px) {
          .search-section-refined { flex-direction: column; align-items: stretch; }
          .search-group { flex-direction: column; align-items: stretch; border-bottom: 1px solid rgba(255, 255, 255, 0.05); padding-bottom: 1rem; }
          .doc-stats { border-left: none; padding-left: 0; }
          .table-container { overflow-x: auto; }
          .table { min-width: 800px; }
        }
      `}</style>
    </div>
  );
};

export default KnowledgeBase;
