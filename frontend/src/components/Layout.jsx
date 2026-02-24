import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { dashboardAPI } from '../services/api';
import {
  LayoutDashboard,
  FileText,
  LogOut,
  Shield,
  Menu,
  X,
  MessageSquare,
  Book,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Users,
  Building2,
  Bell,
  Search,
  Plus,
  UploadCloud,
  Cpu,
  Zap
} from 'lucide-react';
import CompanyLogo from './CompanyLogo';

const Layout = ({ children }) => {
  const { user, logout, selectedDepartment, setSelectedDepartment } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [departmentsExpanded, setDepartmentsExpanded] = useState(true);
  const [departmentList, setDepartmentList] = useState([]);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await dashboardAPI.getDepartments();
      setDepartmentList(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (href) => {
    return location.pathname === href || (href !== '/' && location.pathname.startsWith(href));
  };

  const handleDepartmentSelect = (deptId) => {
    setSelectedDepartment(deptId);
    if (window.innerWidth < 768) {
      setMobileMenuOpen(false);
    }
  };

  const mainNavigation = user?.role?.toLowerCase() === 'admin'
    ? [
      { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
      { name: 'Departments', href: '/admin/departments', icon: Building2 },
      { name: 'Users', href: '/admin/users', icon: Users },
    ]
    : [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Risk Register', href: '/risks', icon: FileText },
      { name: 'Knowledge Base', href: '/knowledge-base', icon: Book },
      { name: 'Neural Chat', href: '/ask-me', icon: Cpu },
    ];

  return (
    <div className="layout-root">
      {/* Sidebar - Glassmorphic Neural Design */}
      <aside className={`sidebar glass-sidebar ${collapsed ? 'collapsed' : ''} ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-inner">
          {/* Brand Area */}
          <div className="sidebar-header">
            <div className="brand">
              <CompanyLogo size={32} />
              {!collapsed && (
                <div className="brand-info-sidebar">
                  <h1 className="brand-title-sidebar">Risk Management System</h1>
                  <span className="brand-subtext-sidebar">Access Automation Pvt. Ltd.</span>
                </div>
              )}
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="sidebar-nav">
            <div className="nav-group">
              {mainNavigation.map((item) => (
                <button
                  key={item.name}
                  onClick={() => { navigate(item.href); setMobileMenuOpen(false); }}
                  className={`nav-item-new ${isActive(item.href) ? 'active' : ''}`}
                  title={collapsed ? item.name : ''}
                >
                  <div className="nav-icon-new"><item.icon size={18} /></div>
                  {!collapsed && <span className="nav-text-new">{item.name}</span>}
                  {isActive(item.href) && <div className="active-glow" />}
                </button>
              ))}
            </div>

            {/* Departments Neural Section */}
            {(user?.role?.toLowerCase() === 'admin' || user?.department_id) && (
              <div className="nav-group">
                {!collapsed && (
                  <button className="nav-label-btn" onClick={() => setDepartmentsExpanded(!departmentsExpanded)}>
                    Node Context
                    <ChevronDown size={14} className={`expand-icon ${departmentsExpanded ? 'expanded' : ''}`} />
                  </button>
                )}
                {departmentsExpanded && !collapsed && (
                  <div className="dept-grid">
                    {user?.role === 'admin' && (
                      <button onClick={() => handleDepartmentSelect(null)} className={`dept-node ${!selectedDepartment ? 'active' : ''}`}>
                        <Shield size={10} className="node-icon" />
                        <span>Admin</span>
                      </button>
                    )}
                    {departmentList.map((dept) => {
                      if (user?.role?.toLowerCase() !== 'admin' && dept.id !== user?.department_id) return null;
                      return (
                        <button key={dept.id} onClick={() => handleDepartmentSelect(dept.id)} className={`dept-node ${selectedDepartment === dept.id ? 'active' : ''}`}>
                          <div className="node-status" />
                          <span>{dept.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Admin Systems - Restricted Settings - DELETED */}
          </nav>

          {/* Sidebar Footer */}
          <div className="sidebar-footer">
            <div className="user-profile-v2">
              <div className="avatar-v2 neural-gradient">
                {user?.full_name?.charAt(0) || 'U'}
              </div>
              {!collapsed && (
                <div className="user-info-v2">
                  <p className="user-name-v2">{user?.full_name || user?.username}</p>
                  <p className="user-status-v2"><span className="online-dot" /> Verified Identity</p>
                </div>
              )}
            </div>
            <button className="logout-icon-btn" onClick={handleLogout} title="Terminate Session">
              <LogOut size={16} />
            </button>
          </div>
        </div>
        <button className="sidebar-toggle" onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </aside>

      {/* Main Content Area */}
      <div className={`main-wrapper-v2 ${collapsed ? 'expanded' : ''}`}>
        <header className="neural-header">
          <div className="header-left">
            <button className="mobile-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              <Menu size={20} />
            </button>
            <div className="header-meta">
              <h2 className="header-current-page">
                {mainNavigation.find(n => isActive(n.href))?.name || 'Overview'}
              </h2>
              {user?.role !== 'admin' && (
                <div className="neural-breadcrumb">
                  <span className="breadcrumb-root">Risk Engine</span>
                  <span className="breadcrumb-sep">/</span>
                  <span className="breadcrumb-active">{selectedDepartment ? departmentList.find(d => d.id === selectedDepartment)?.name : 'Central Node'}</span>
                </div>
              )}
            </div>
          </div>

          <div className="header-actions">
            {/* Show search and add risk for everyone if they have operational roles (already filtered by Route) */}
            <>
              <div className="neural-search">
                <Search size={14} className="search-icon" />
                <input type="text" placeholder="Neural Search..." />
                <div className="search-shortcut">/</div>
              </div>
              <button className="header-action-btn neural-gradient" onClick={() => navigate('/add-risk')}>
                <Plus size={16} />
                <span>Add Risk</span>
              </button>
            </>
          </div>
        </header>

        <main className="main-content-scroll">
          {children}
        </main>
      </div>

      {mobileMenuOpen && <div className="neural-overlay" onClick={() => setMobileMenuOpen(false)} />}

      <style>{`
        .layout-root {
          display: flex;
          min-height: 100vh;
          background: #020617;
          color: #f1f5f9;
          font-family: 'Inter', system-ui, sans-serif;
        }

        /* Glass Sidebar */
        .sidebar {
          width: 260px;
          height: 100vh;
          position: fixed;
          top: 0;
          left: 0;
          z-index: 100;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          background: rgba(15, 23, 42, 0.8);
          backdrop-filter: blur(16px);
          border-right: 1px solid rgba(255, 255, 255, 0.05);
          display: flex;
          flex-direction: column;
        }

        .sidebar.collapsed { width: 72px; }

        .sidebar-inner {
          display: flex;
          flex-direction: column;
          height: 100%;
          padding: 1.5rem 0.75rem;
        }

        .sidebar-header { margin-bottom: 2rem; padding: 0 0.5rem; }

        .brand { display: flex; align-items: center; gap: 0.75rem; }

        .brand-logo {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          position: relative;
        }

        .neural-gradient {
          background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
          box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
        }

        .neural-ping {
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 10px;
          border: 2px solid #3b82f6;
          animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        }

        @keyframes ping {
          75%, 100% { transform: scale(1.4); opacity: 0; }
        }

        .brand-info-sidebar {
          display: flex;
          flex-direction: column;
          line-height: 1.1;
        }

        .brand-title-sidebar {
          font-size: 0.9rem;
          font-weight: 700;
          color: #f1f5f9;
          margin: 0;
          letter-spacing: -0.01em;
        }

        .brand-subtext-sidebar {
          font-size: 10.5px;
          font-weight: 500;
          color: #94a3b8;
          opacity: 0.9;
        }

        .sidebar-nav { flex: 1; display: flex; flex-direction: column; gap: 1.5rem; overflow-y: auto; scrollbar-width: none; }
        .sidebar-nav::-webkit-scrollbar { display: none; }

        .nav-label {
          font-size: 0.65rem;
          font-weight: 700;
          text-transform: uppercase;
          color: #475569;
          letter-spacing: 0.1em;
          margin-bottom: 0.5rem;
          padding-left: 0.5rem;
        }

        .nav-label-btn {
          width: 100%;
          background: none;
          border: none;
          font-size: 0.65rem;
          font-weight: 700;
          text-transform: uppercase;
          color: #475569;
          letter-spacing: 0.1em;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.5rem;
          cursor: pointer;
        }

        .nav-item-new {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          border: none;
          background: transparent;
          border-radius: 12px;
          color: #94a3b8;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
        }

        .nav-item-new:hover { background: rgba(255, 255, 255, 0.03); color: #f1f5f9; }

        .nav-item-new.active {
          background: rgba(59, 130, 246, 0.1);
          color: #3b82f6;
        }

        .active-glow {
          position: absolute;
          right: 8px;
          width: 4px;
          height: 4px;
          background: #3b82f6;
          border-radius: 50%;
          box-shadow: 0 0 10px #3b82f6;
        }

        .dept-grid { display: grid; grid-template-columns: 1fr; gap: 0.25rem; margin-top: 0.5rem; }

        .dept-node {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          padding: 0.5rem 0.75rem;
          background: transparent;
          border: none;
          border-radius: 8px;
          color: #64748b;
          font-size: 0.75rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
        }

        .dept-node:hover { background: rgba(59, 130, 246, 0.05); color: #94a3b8; }
        .dept-node.active { color: #3b82f6; background: rgba(59, 130, 246, 0.05); }

        .node-status { width: 4px; height: 4px; border-radius: 50%; background: #334155; }
        .dept-node.active .node-status { background: #3b82f6; box-shadow: 0 0 8px #3b82f6; }

        .sidebar-footer {
          margin-top: auto;
          padding: 1rem 0.5rem;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .user-profile-v2 { display: flex; align-items: center; gap: 0.75rem; overflow: hidden; }

        .avatar-v2 {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.75rem;
          color: white;
        }

        .user-info-v2 p { margin: 0; white-space: nowrap; }
        .user-name-v2 { font-size: 0.75rem; font-weight: 600; }
        .user-status-v2 { font-size: 0.6rem; color: #64748b; display: flex; align-items: center; gap: 0.25rem; }
        .online-dot { width: 4px; height: 4px; background: #10b981; border-radius: 50%; box-shadow: 0 0 5px #10b981; }

        .sidebar-toggle {
          position: absolute;
          right: -12px;
          top: 32px;
          width: 24px;
          height: 24px;
          background: #1e293b;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #94a3b8;
          cursor: pointer;
          z-index: 101;
        }

        /* Header */
        .main-wrapper-v2 { flex: 1; margin-left: 260px; transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); display: flex; flex-direction: column; }
        .main-wrapper-v2.expanded { margin-left: 72px; }

        .neural-header {
          height: 64px;
          padding: 0 2rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(2, 6, 23, 0.7);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          position: sticky;
          top: 0;
          z-index: 90;
        }

        .header-left { display: flex; align-items: center; gap: 1.5rem; }
        .header-current-page { font-size: 1rem; font-weight: 700; margin: 0; }

        .neural-breadcrumb { display: flex; align-items: center; gap: 0.5rem; font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
        .breadcrumb-root { color: #64748b; }
        .breadcrumb-sep { color: #334155; }
        .breadcrumb-active { color: #3b82f6; }

        .header-actions { display: flex; align-items: center; gap: 1rem; }

        .neural-search {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          padding: 0.4rem 0.75rem;
          border-radius: 10px;
          width: 240px;
        }

        .search-icon { color: #475569; }
        .neural-search input { background: none; border: none; color: white; font-size: 0.75rem; outline: none; width: 100%; }
        .search-shortcut { font-size: 0.6rem; background: #1e293b; padding: 2px 6px; border-radius: 4px; color: #64748b; }

        .header-action-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 10px;
          font-size: 0.75rem;
          font-weight: 700;
          color: white;
          cursor: pointer;
        }

        .main-content-scroll { flex: 1; padding: 2rem; overflow-y: auto; }

        @media (max-width: 1024px) {
          .neural-search { display: none; }
        }

        @media (max-width: 768px) {
          .sidebar { transform: translateX(-100%); }
          .sidebar.mobile-open { transform: translateX(0); }
          .main-wrapper-v2 { margin-left: 0 !important; }
          .header-meta { display: none; }
        }
      `}</style>
    </div>
  );
};

export default Layout;
