import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { dashboardAPI } from '../services/api';
import {
  Activity, Shield, FileText, MessageSquare, LogOut, Menu,
  ChevronDown, ChevronLeft, ChevronRight, Target, Building2, Users,
  Search, Bell, Command, LayoutDashboard
} from 'lucide-react';
import CompanyLogo from './CompanyLogo';

const Tooltip = ({ content, disabled, children, wrapperStyle }) => {
  const [show, setShow] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const handleMouseEnter = (e) => {
    if (disabled) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setCoords({
      top: rect.top + rect.height / 2,
      left: 68
    });
    setShow(true);
  };

  return (
    <div
      className="tooltip-wrapper"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setShow(false)}
      style={{ display: 'flex', width: '100%', justifyContent: 'center', ...wrapperStyle }}
    >
      {children}
      {show && !disabled && (
        <div className="sidebar-tooltip" style={{
          top: coords.top,
          left: coords.left,
        }}>
          {content}
        </div>
      )}
    </div>
  );
};

const Layout = ({ children }) => {
  const { user, logout, selectedDepartment, setSelectedDepartment } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  const isAdmin = user?.role?.toLowerCase() === 'admin';

  const mainNavigation = isAdmin
    ? [
      { name: 'Dashboard', href: '/admin/dashboard', icon: Activity },
      { name: 'Departments', href: '/admin/departments', icon: Building2 },
      { name: 'Users', href: '/admin/users', icon: Users },
    ]
    : [
      { name: 'Dashboard', href: '/dashboard', icon: Activity },
      { name: 'Risk Register', href: '/risks', icon: Shield },
      { name: 'Monitoring', href: '/monitoring', icon: Target },
      { name: 'Ask Me', href: '/ask-me', icon: MessageSquare },
    ];

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header" style={{ position: 'relative' }}>
          <div className={`logo-area ${collapsed ? 'collapsed' : ''}`}>
            <CompanyLogo size={collapsed ? 36 : 42} iconOnly={collapsed} />
          </div>
          <button
            className="collapse-btn-top"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        <nav className="sidebar-nav">
          {!collapsed && <div className="nav-section-label">MAIN</div>}
          <ul className="nav-list">
            {mainNavigation.map((item) => {
              const isActive = location.pathname.startsWith(item.href) ||
                (item.href === '/dashboard' && location.pathname === '/');
              return (
                <li key={item.href}>
                  <Tooltip content={item.name} disabled={!collapsed}>
                    <Link
                      to={item.href}
                      className={`nav-link ${isActive ? 'active' : ''}`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <item.icon className="nav-icon" />
                      {!collapsed && <span className="nav-label">{item.name}</span>}
                    </Link>
                  </Tooltip>
                </li>
              );
            })}
          </ul>

          {/* Department Selector */}
          {(isAdmin || user?.department_id) && (
            <div className="department-section">
              {!collapsed && <div className="nav-section-label">DEPARTMENTS</div>}
              <ul className="dept-list">
                {isAdmin && (
                  <li>
                    <Tooltip content="All (Admin View)" disabled={!collapsed}>
                      <button
                        className={`dept-btn ${!selectedDepartment ? 'active' : ''}`}
                        onClick={() => { setSelectedDepartment(null); setMobileMenuOpen(false); }}
                      >
                        {collapsed ? (
                          <div className={`dept-dot ${!selectedDepartment ? 'active' : ''}`} style={{ background: !selectedDepartment ? '#2D6A4F' : '#D1D5DB' }} />
                        ) : (
                          <>
                            <Shield className="dept-icon-admin" />
                            <span className="dept-name">All (Admin View)</span>
                          </>
                        )}
                      </button>
                    </Tooltip>
                  </li>
                )}
                {departmentList.map(dept => {
                  if (!isAdmin && dept.id !== user?.department_id) return null;
                  const isActive = String(selectedDepartment) === String(dept.id);
                  return (
                    <li key={dept.id}>
                      <Tooltip content={dept.name} disabled={!collapsed}>
                        <button
                          className={`dept-btn ${isActive ? 'active' : ''}`}
                          onClick={() => { setSelectedDepartment(dept.id); setMobileMenuOpen(false); }}
                        >
                          <span className={`dept-dot ${isActive ? 'active' : ''}`} style={{ background: dept.color }} />
                          {!collapsed && <span className="dept-name">{dept.name}</span>}
                        </button>
                      </Tooltip>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </nav>

        <div className="sidebar-bottom">
          <div className={`user-area ${collapsed ? 'collapsed' : ''}`}>
            <Tooltip
              content={`${user?.full_name || user?.name || user?.username || 'User'} — ${isAdmin ? 'Admin' : 'User'}`}
              disabled={!collapsed}
              wrapperStyle={{ width: 'auto', flexShrink: 0 }}
            >
              <div className="avatar">
                {user?.full_name?.charAt(0) || user?.name?.charAt(0) || user?.username?.charAt(0) || 'U'}
              </div>
            </Tooltip>
            {!collapsed && (
              <div className="user-info">
                <span className="user-name" title={user?.full_name || user?.name || user?.username || 'System Administrator'}>
                  {user?.full_name || user?.name || user?.username || 'System Administrator'}
                </span>
                <span className="user-role" title={isAdmin ? 'System Administrator / Admin' : `${user?.full_name || user?.name || user?.username} / Department_user`}>
                  {isAdmin ? 'System Administrator / Admin' : `${user?.full_name || user?.name || user?.username} / Department_user`}
                </span>
              </div>
            )}
            {!collapsed && (
              <LogOut size={16} className="logout-icon" onClick={handleLogout} style={{ cursor: 'pointer', marginLeft: 'auto' }} />
            )}
          </div>
        </div>

      </aside>

      {mobileMenuOpen && <div className="mobile-overlay" onClick={() => setMobileMenuOpen(false)} />}

      {/* Main Content */}
      <div className={`main-wrapper ${collapsed ? 'expanded' : ''}`}>
        <header className="app-header">
          <div className="header-left">
            <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(true)}>
              <Menu size={24} />
            </button>
          </div>

          <div className="header-center">
            <div className="search-bar">
              <Search size={16} className="search-icon" />
              <input type="text" placeholder="Search departments, users, risks..." className="search-input" />
              <div className="search-shortcut">
                <Command size={12} />
                <span>F</span>
              </div>
            </div>
          </div>

          <div className="header-right">
            <button className="icon-btn" title="Messages">
              <MessageSquare size={18} />
            </button>
            <button className="icon-btn" title="Notifications">
              <Bell size={18} />
            </button>
          </div>
        </header>

        <main className="main-content">
          {children}
        </main>
      </div>

      <style>{`
        .app-layout {
          display: flex;
          min-height: 100vh;
          background: #F5F5F5;
          font-family: var(--font-body);
        }

        /* Sidebar wrapper */
        .sidebar {
          width: 240px;
          background: #1A4731;
          border-right: 1px solid rgba(255,255,255,0.08);
          display: flex;
          flex-direction: column;
          position: fixed;
          top: 0;
          left: 0;
          height: 100vh;
          z-index: 50;
          transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          overflow: hidden;
          white-space: nowrap;
        }

        .sidebar.collapsed { width: 64px; }

        /* Tooltip component CSS */
        .sidebar-tooltip {
          position: fixed;
          transform: translateY(-50%);
          background: #1A4731;
          color: #FFFFFF;
          border: 1px solid rgba(255,255,255,0.15);
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 0.78rem;
          font-weight: 500;
          white-space: nowrap;
          box-shadow: 0 4px 20px rgba(0,0,0,0.2);
          z-index: 100000;
          pointer-events: none;
        }

        /* Logo Area */
        .sidebar-header {
          height: 70px;
          display: flex;
          align-items: center;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          padding: 0 14px;
        }

        .sidebar.collapsed .sidebar-header {
          padding: 0;
          justify-content: center;
        }

        .logo-area {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
        }

        .logo-area.collapsed {
          justify-content: center;
        }

        .logo-icon {
          width: 36px; height: 36px;
          border-radius: 10px;
          background: linear-gradient(135deg, #2D6A4F, #40916C);
          color: white;
          font-weight: 800;
          font-size: 16px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(45,106,79,0.3);
        }

        .logo-text {
          display: flex;
          flex-direction: column;
          opacity: 1;
          width: auto;
          overflow: hidden;
          transition: opacity 0.2s, width 0.25s;
        }

        .logo-area.collapsed .logo-text, .sidebar.collapsed .logo-text {
          opacity: 0;
          width: 0;
        }

        .logo-title {
          font-family: var(--font-heading, 'Inter', sans-serif);
          font-weight: 800;
          font-size: 1rem;
          color: #1A4731;
          letter-spacing: 1px;
        }

        .logo-sub {
          font-size: 0.65rem;
          color: #6B7280;
        }

        /* Nav Items */
        .sidebar-nav {
          flex: 1;
          padding: 1.5rem 12px;
          overflow-y: auto;
          overflow-x: hidden;
        }

        .sidebar.collapsed .sidebar-nav {
          padding: 1.5rem 8px;
        }

        .nav-section-label {
          font-size: 0.6rem;
          letter-spacing: 0.18em;
          color: rgba(255,255,255,0.4);
          text-transform: uppercase;
          font-weight: 700;
          margin-bottom: 0.75rem;
          padding-left: 0.5rem;
        }

        .sidebar.collapsed .nav-section-label {
          display: none;
        }

        .nav-list {
          list-style: none;
          padding: 0;
          margin: 0 0 1.5rem 0;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .nav-link {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 12px;
          justify-content: flex-start;
          color: rgba(255,255,255,0.65);
          text-decoration: none;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .sidebar.collapsed .nav-link {
          gap: 0;
          padding: 10px;
          justify-content: center;
        }

        .nav-link:hover {
          color: #FFFFFF;
          background: rgba(255,255,255,0.08);
        }

        .nav-link.active {
          background: #FFFFFF;
          color: #1A4731;
          font-weight: 700;
          border-radius: 10px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.2);
          border-left: none;
        }

        .nav-link.active .nav-icon {
          color: #1A4731;
        }

        .nav-icon {
          width: 20px; height: 20px;
          flex-shrink: 0;
          stroke-width: 1.8;
          color: rgba(255,255,255,0.5);
        }

        .nav-label {
          font-size: 0.85rem;
          font-weight: 500;
          overflow: hidden;
          white-space: nowrap;
          transition: opacity 0.15s;
        }

        /* Departments Section */
        .department-section {
          display: flex;
          flex-direction: column;
        }

        .dept-list { list-style: none; padding: 0; margin: 0; }

        .dept-btn {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 6px 12px;
          justify-content: flex-start;
          background: none;
          border: none;
          color: rgba(255,255,255,0.65);
          cursor: pointer;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .sidebar.collapsed .dept-btn {
          justify-content: center;
          padding: 6px;
          gap: 0;
        }

        .dept-btn:hover { background: rgba(255,255,255,0.08); color: #FFFFFF; }

        .dept-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          background: rgba(255,255,255,0.3);
          flex-shrink: 0;
        }

        .dept-dot.active {
          background: #52B788;
          box-shadow: 0 0 10px rgba(82,183,136,0.6);
        }

        .dept-name {
          font-size: 0.85rem;
          font-weight: 500;
          white-space: nowrap;
          color: rgba(255,255,255,0.6);
        }

        .dept-btn.active .dept-name {
          color: #FFFFFF;
          font-weight: 600;
        }

        .dept-icon-admin { color: rgba(255,255,255,0.65); width: 16px; height: 16px; flex-shrink: 0; }

        /* User Area and Bottom Action */
        .sidebar-bottom {
          margin-top: auto;
          border-top: 1px solid rgba(255,255,255,0.08);
          padding: 16px;
          display: flex;
          flex-direction: column;
        }

        .sidebar.collapsed .sidebar-bottom {
          padding: 16px 8px;
          align-items: center;
        }

        .user-area {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
        }

        .user-area.collapsed {
          justify-content: center;
        }

        .avatar {
          width: 34px; height: 34px;
          border-radius: 9px;
          background: rgba(255,255,255,0.15);
          border: 1.5px solid rgba(255,255,255,0.25);
          color: white;
          font-weight: 700;
          font-size: 14px;
          flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
        }

        .user-info {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-width: 0;
          overflow: hidden;
        }

        .sidebar.collapsed .user-info {
          display: none;
        }

        .user-name {
          font-weight: 600;
          font-size: 0.85rem;
          color: #FFFFFF;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .user-role {
          font-size: 0.72rem;
          color: rgba(255,255,255,0.5);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .logout-icon {
          color: rgba(255,255,255,0.4);
          flex-shrink: 0;
          transition: color 0.2s;
        }

        .logout-icon:hover {
          color: #FFFFFF;
        }

        .sidebar.collapsed .logout-icon {
          display: none;
        }

        .collapse-btn-top {
          position: absolute;
          right: -13px;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(255, 255, 255, 0.1);
          border: 1.5px solid rgba(255, 255, 255, 0.15);
          border-radius: 50%;
          color: rgba(255, 255, 255, 0.7);
          cursor: pointer;
          display: flex;
          justify-content: center;
          align-items: center;
          width: 26px;
          height: 26px;
          padding: 0;
          transition: all 0.2s;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
          z-index: 60;
        }

        .collapse-btn-top:hover {
          background: rgba(255, 255, 255, 0.2);
          color: #FFFFFF;
          border-color: rgba(255, 255, 255, 0.25);
        }

                .sidebar.collapsed .nav-icon,
        .sidebar.collapsed .dept-icon-admin,
        .sidebar.collapsed .logout-icon,
        .sidebar.collapsed .collapse-btn-top {
          color: rgba(255,255,255,0.7);
        }
        
        .sidebar.collapsed .nav-link:hover .nav-icon,
        .sidebar.collapsed .dept-btn:hover .dept-icon-admin,
        .sidebar.collapsed .logout-icon:hover,
        .sidebar.collapsed .collapse-btn-top:hover {
          color: #FFFFFF;
        }
        
        /* Main Wrapper */
        .main-wrapper {
          flex: 1;
          margin-left: 240px;
          min-width: 0;
          display: flex;
          flex-direction: column;
          transition: margin-left 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .main-wrapper.expanded { 
          margin-left: 64px; 
        }

        /* Header */
        .app-header {
          height: 70px;
          background: #FFFFFF;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 2rem;
          position: sticky;
          top: 0;
          z-index: 40;
        }

        .header-left { width: 220px; }

        .header-center {
          flex: 1;
          display: flex;
          justify-content: center;
        }

        .search-bar {
          display: flex;
          align-items: center;
          background: #F8FAFB;
          border: 1.5px solid #E2E8F0;
          border-radius: 10px;
          padding: 0.5rem 1rem;
          width: 100%;
          max-width: 480px;
          transition: all 0.2s;
        }

        .search-bar:focus-within {
          border-color: #2D6A4F;
          box-shadow: 0 0 0 3px rgba(45,106,79,0.12);
          background: #FFFFFF;
        }

        .search-icon { color: #9CA3AF; margin-right: 0.5rem; }

        .search-input {
          border: none;
          background: transparent;
          outline: none;
          flex: 1;
          font-size: 0.875rem;
          color: #1A1A2E;
        }

        .search-input::placeholder { color: #9CA3AF; }

        .search-shortcut {
          display: flex;
          align-items: center;
          gap: 2px;
          background: #F3F4F6;
          border: 1px solid #E2E8F0;
          border-radius: 5px;
          padding: 2px 6px;
          font-size: 0.7rem;
          color: #9CA3AF;
          font-weight: 600;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 1rem;
          width: 280px;
          justify-content: flex-end;
        }

        .icon-btn {
          background: none;
          border: none;
          color: #9CA3AF;
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s, color 0.2s;
        }
        
        .icon-btn:hover { background: #F3F4F6; color: #2D6A4F; }

        .mobile-menu-btn { display: none; background: none; border: none; color: #1A1A2E; cursor: pointer; }

        /* Mobile Responsive */
        @media (max-width: 768px) {
          .sidebar { transform: translateX(-100%); }
          .sidebar.mobile-open { transform: translateX(0); }
          .main-wrapper { margin-left: 0 !important; }
          .mobile-menu-btn { display: block; }
          .app-header { padding: 0 1rem; gap: 1rem; }
          .header-left { width: auto; }
          .header-center { display: none; }
          .header-right { width: auto; }
          .mobile-overlay {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.5);
            z-index: 40;
          }
        }
      `}</style>
    </div>
  );
};

export default Layout;
