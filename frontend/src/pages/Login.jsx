import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Shield, Lock, User, AlertTriangle, ArrowRight } from 'lucide-react';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

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
    <div className="login-page">
      <div className="login-background">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
      </div>

      <div className="login-container">
        <div className="login-card">
          {/* Logo Section */}
          <div className="login-header">
            <div className="logo">
              <Shield size={32} />
            </div>
            <h1>ISO 9001:2015</h1>
            <p className="subtitle">Risk Management System</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="error-alert">
              <AlertTriangle size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="username">
                <User size={14} />
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="input-field"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">
                <Lock size={14} />
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="input-field"
                required
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary login-btn"
              disabled={loading}
            >
              {loading ? (
                <span className="loading-text">Signing in...</span>
              ) : (
                <>
                  Sign In
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Demo Credentials */}
          <div className="demo-credentials">
            <p className="demo-title">Demo Credentials</p>
            <div className="credential-row">
              <span className="role">Admin:</span>
              <code>admin / admin123</code>
            </div>
            <div className="credential-row">
              <span className="role">User:</span>
              <code>finance_user / password123</code>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="login-footer">
          <p>© 2024 Enterprise Risk Management. All rights reserved.</p>
        </div>
      </div>

      <style>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-primary);
          position: relative;
          overflow: hidden;
          padding: 1rem;
        }

        .login-background {
          position: absolute;
          inset: 0;
          overflow: hidden;
          z-index: 0;
        }

        .gradient-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.15;
        }

        .orb-1 {
          width: 600px;
          height: 600px;
          background: var(--accent-blue);
          top: -200px;
          right: -200px;
        }

        .orb-2 {
          width: 500px;
          height: 500px;
          background: var(--accent-blue);
          bottom: -150px;
          left: -150px;
        }

        .login-container {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 420px;
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .login-card {
          background: var(--bg-card);
          border: 1px solid var(--border-primary);
          border-radius: 16px;
          padding: 2.5rem;
          box-shadow: var(--card-shadow-lg);
        }

        .login-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .logo {
          width: 64px;
          height: 64px;
          background: var(--accent-blue);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1.5rem;
          color: white;
        }

        .login-header h1 {
          margin: 0 0 0.5rem 0;
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .subtitle {
          margin: 0;
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        .error-alert {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.875rem 1rem;
          background: var(--status-danger-bg);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 8px;
          color: var(--status-danger);
          font-size: 0.875rem;
          margin-bottom: 1.5rem;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-group label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--text-secondary);
        }

        .login-btn {
          margin-top: 0.5rem;
          width: 100%;
          padding: 0.875rem;
          font-size: 0.95rem;
        }

        .loading-text {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .loading-text::after {
          content: '';
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .demo-credentials {
          margin-top: 2rem;
          padding-top: 1.5rem;
          border-top: 1px solid var(--border-primary);
        }

        .demo-title {
          margin: 0 0 0.75rem 0;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
        }

        .credential-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.8rem;
          margin-bottom: 0.5rem;
        }

        .credential-row:last-child {
          margin-bottom: 0;
        }

        .role {
          color: var(--text-muted);
          min-width: 50px;
        }

        code {
          background: var(--bg-secondary);
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          color: var(--accent-blue);
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.75rem;
        }

        .login-footer {
          text-align: center;
        }

        .login-footer p {
          margin: 0;
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        @media (max-width: 480px) {
          .login-card {
            padding: 1.5rem;
          }
          
          .login-header h1 {
            font-size: 1.25rem;
          }
        }
      `}</style>
    </div>
  );
};

export default Login;
