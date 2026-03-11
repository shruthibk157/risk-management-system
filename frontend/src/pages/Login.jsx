import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Shield, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import CompanyLogo from '../components/CompanyLogo';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const isAdmin = username.toLowerCase().includes('admin');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err) {
      setError('Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-split-page">
      {/* Left Panel */}
      <div className={`login-left-panel ${isAdmin ? 'admin-bg' : 'user-bg'}`}>
        <div className="login-overlay-card">
          <h2 className="info-title">Risk Management System</h2>
          <p className="info-desc">
            This system helps departments identify, assess, and manage operational risks while supporting ISO 9001:2015 risk-based thinking across the organization.
          </p>
          <ul className="info-bullets">
            <li>Identify and document operational risks</li>
            <li>Evaluate risk severity, occurrence, and detection</li>
            <li>Monitor mitigation actions and control effectiveness</li>
            <li>Maintain audit-ready compliance records</li>
          </ul>
          <div className="info-footer">
            ISO 9001:2015 Aligned Risk Monitoring System
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="login-right-panel">
        <div className="login-form-container">
          <div className="login-header">
            <div className="logo-section" style={{ marginBottom: '0.5rem' }}>
              <CompanyLogo size={64} theme="light" />
            </div>


            <h1 className="login-title">
              {isAdmin ? 'SYSTEM ADMINISTRATOR LOGIN' : 'Secure Access to the Risk Management System'}
            </h1>
            <p className="login-subtitle">
              {isAdmin
                ? 'Secure access to administrative governance & infrastructure control.'
                : "Log in to review, assess, and manage departmental risks."}
            </p>
          </div>

          {error && (
            <div className="error-box">
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="username">Email</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your email"
                className="custom-input"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="password-input-wrapper">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="custom-input"
                  required
                />
                <button
                  type="button"
                  className="eye-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-actions-row">
              <label className="remember-me">
                <input type="checkbox" />
                <span>Remember me</span>
              </label>
              <a href="#forgot" className="forgot-link">Forgot your password?</a>
            </div>

            <button type="submit" className="login-submit-btn" disabled={loading}>
              {loading
                ? 'Logging in...'
                : (isAdmin ? 'Login — Access Admin Dashboard' : 'Sign In to Risk Dashboard')}
            </button>
          </form>

          <p className="iso-note">This system supports structured risk identification, assessment, and monitoring in alignment with ISO 9001:2015 risk-based thinking.</p>

          <div className="divider">
            <span>Or</span>
          </div>

          <div className="secondary-options">
            <button className="social-login-btn">
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" width={18} />
              Sign in with Google
            </button>
            <button className="social-login-btn">
              <img src="https://www.svgrepo.com/show/475661/microsoft-color.svg" alt="Microsoft" width={18} />
              Sign in with Microsoft
            </button>
          </div>

          {/* Hidden toggle tools for testing */}
          <div className="quick-access-tools">
            <button type="button" onClick={() => setUsername('admin')}>Set Admin</button>
            <button type="button" onClick={() => setUsername('user')}>Set User</button>
          </div>
        </div>
      </div>

      <style>{`
        .login-split-page {
          min-height: 100vh;
          display: flex;
          font-family: var(--font-body);
        }

        /* LEFT PANEL */
        .login-left-panel {
          width: 50%;
          position: relative;
          display: flex;
          align-items: center;
          padding: 3rem 4rem;
          transition: background 0.5s ease;
        }

        .login-left-panel.admin-bg {
          background: linear-gradient(135deg, #0D2818 0%, #1A4731 50%, #2D6A4F 100%);
        }

        .login-left-panel.user-bg {
          background: linear-gradient(135deg, #1A3A2A 0%, #2D6A4F 100%);
        }

        .login-overlay-card {
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          padding: 3rem;
          color: white;
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
        }

        .info-title {
          font-family: var(--font-heading);
          font-size: 2.25rem;
          font-weight: 800;
          line-height: 1.2;
          letter-spacing: -0.02em;
          margin: 0;
        }

        .info-desc {
          font-size: 1.05rem;
          line-height: 1.6;
          color: rgba(255, 255, 255, 0.9);
          margin: 0;
        }

        .info-bullets {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .info-bullets li {
          font-size: 1rem;
          color: rgba(255, 255, 255, 0.85);
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        
        .info-bullets li::before {
          content: '•';
          color: #74C69D;
          font-size: 1.5rem;
          line-height: 0;
          display: inline-block;
          transform: translateY(1px);
        }

        .info-footer {
          margin-top: 1rem;
          padding-top: 1.5rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          font-size: 0.85rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.6);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        /* RIGHT PANEL */
        .login-right-panel {
          width: 50%;
          background: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 60px;
        }

        .login-form-container {
          width: 100%;
          max-width: 480px;
        }

        .login-header {
          margin-bottom: 2.5rem;
        }

        .logo-section {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
        }

        .logo-circle {
          width: 36px;
          height: 36px;
          background: #2D6A4F;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .logo-icon-svg {
          color: white;
        }

        .logo-text {
          font-family: var(--font-heading);
          font-weight: 800;
          font-size: 1.25rem;
          color: #1A1A2E;
        }

        .role-badge {
          display: inline-block;
          background: rgba(82, 183, 136, 0.15);
          color: #2D6A4F;
          padding: 4px 12px;
          border-radius: 999px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 1rem;
        }

        .login-title {
          font-family: var(--font-heading);
          font-size: 2rem;
          font-weight: 800;
          color: #1A1A2E;
          margin: 0 0 0.5rem 0;
          line-height: 1.2;
        }

        .login-subtitle {
          font-size: 0.95rem;
          color: #6B7280;
          margin: 0;
        }

        .error-box {
          background: #fef2f2;
          color: #e63946;
          padding: 0.875rem 1rem;
          border-radius: 10px;
          margin-bottom: 1.5rem;
          font-size: 0.875rem;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          border: 1px solid rgba(230, 57, 70, 0.2);
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .form-group label {
          display: block;
          font-size: 0.875rem;
          font-weight: 600;
          color: #1A1A2E;
          margin-bottom: 0.5rem;
        }

        .custom-input {
          width: 100%;
          border: 1.5px solid #E5E7EB;
          border-radius: 10px;
          padding: 14px 16px;
          font-size: 0.95rem;
          transition: border-color 0.2s, box-shadow 0.2s;
          outline: none;
          color: #1A1A2E;
        }

        .custom-input::placeholder {
          color: #9CA3AF;
        }

        .custom-input:focus {
          border-color: #2D6A4F;
          box-shadow: 0 0 0 3px rgba(45,106,79,0.12);
        }

        .password-input-wrapper {
          position: relative;
        }

        .eye-toggle {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #9CA3AF;
          cursor: pointer;
          padding: 0;
          display: flex;
        }

        .eye-toggle:hover {
          color: #6B7280;
        }

        .form-actions-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 0.25rem;
        }

        .remember-me {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          color: #4B5563;
          font-weight: 500;
          cursor: pointer;
        }

        .remember-me input {
          accent-color: #2D6A4F;
          width: 16px;
          height: 16px;
          border-radius: 4px;
        }

        .forgot-link {
          font-size: 0.875rem;
          color: #2D6A4F;
          text-decoration: none;
          font-weight: 600;
        }

        .login-submit-btn {
          width: 100%;
          background: #1A4731;
          color: white;
          padding: 16px;
          border: none;
          border-radius: 10px;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          margin-top: 0.5rem;
        }

        .login-submit-btn:hover:not(:disabled) {
          background: #2D6A4F;
          box-shadow: 0 4px 12px rgba(45,106,79,0.2);
        }

        .login-submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .iso-note {
          text-align: center;
          font-size: 0.75rem;
          color: #9CA3AF;
          margin-top: 1rem;
          margin-bottom: -0.5rem;
        }

        .divider {
          display: flex;
          align-items: center;
          text-align: center;
          color: #9CA3AF;
          font-size: 0.875rem;
          margin: 1.5rem 0;
        }

        .divider::before, .divider::after {
          content: '';
          flex: 1;
          border-bottom: 1px solid #E5E7EB;
        }

        .divider span {
          padding: 0 1rem;
          font-weight: 500;
        }

        .secondary-options {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .social-login-btn {
          width: 100%;
          background: white;
          border: 1.5px solid #E5E7EB;
          border-radius: 10px;
          padding: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          font-size: 0.95rem;
          font-weight: 600;
          color: #1A1A2E;
          cursor: pointer;
          transition: all 0.2s;
        }

        .social-login-btn:hover {
          background: #F9FAFB;
          border-color: #D1D5DB;
        }

        .quick-access-tools {
           margin-top: 2.5rem;
           display: flex;
           gap: 1rem;
           justify-content: center;
           opacity: 0.5;
        }
        .quick-access-tools button {
           font-size: 0.75rem;
           color: #9CA3AF;
           background: none;
           border: 1px dashed #E5E7EB;
           padding: 4px 8px;
           border-radius: 4px;
           cursor: pointer;
        }

        @media (max-width: 900px) {
          .login-split-page {
            flex-direction: column;
          }
          .login-left-panel, .login-right-panel {
            width: 100%;
          }
          .login-left-panel {
            min-height: 40vh;
            padding: 2rem;
          }
          .login-right-panel {
            padding: 2rem;
          }
          .login-overlay-card {
            font-size: 1.75rem;
            padding: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
};

export default Login;
