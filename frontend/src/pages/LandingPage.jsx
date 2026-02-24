import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Shield, ArrowRight, CheckCircle, Target, FileText, Lock } from 'lucide-react';
import CompanyLogo from '../components/CompanyLogo';

const LandingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const features = [
    {
      icon: FileText,
      title: 'Risk Register',
      description: 'Comprehensive FMEA-based risk tracking with RPN calculations and audit trails.'
    },
    {
      icon: Target,
      title: 'ISO 9001:2015',
      description: 'Full compliance with ISO 9001:2015 standards for quality management systems.'
    },
    {
      icon: CheckCircle,
      title: 'AI Assistant',
      description: 'Smart risk identification and control suggestions powered by your documents.'
    }
  ];

  return (
    <div className="landing-page">
      {/* Background */}
      <div className="landing-bg">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
      </div>

      {/* Navigation */}
      <nav className="landing-nav">
        <div className="nav-brand">
          <CompanyLogo size={36} />
          <div className="brand-info">
            <span className="brand-text">Risk Management System</span>
            <span className="brand-subtext">Access Automation Pvt. Ltd.</span>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <main className="landing-main">
        <div className="hero-section">
          <div className="hero-content">
            <div className="hero-badge">
              <Lock size={14} />
              ISO 9001:2015 Compliant
            </div>
            <h1 className="hero-title">
              Risk
              <br />
              <span className="gradient-text">Management System</span>
            </h1>
            <p className="hero-description">
              A professional, enterprise-grade platform for ISO 9001:2015 compliant risk management.
              Track, assess, and mitigate risks across your organization with AI-powered insights.
            </p>
            <div className="hero-actions">
              {user ? (
                <button className="btn btn-primary btn-large" onClick={() => navigate('/dashboard')}>
                  Access Dashboard
                  <ArrowRight size={18} />
                </button>
              ) : (
                <button className="btn btn-primary btn-large" onClick={() => navigate('/login')}>
                  Get Started
                  <ArrowRight size={18} />
                </button>
              )}
            </div>
          </div>

          {/* Features */}
          <div className="features-grid">
            {features.map((feature, idx) => (
              <div key={idx} className="feature-card">
                <div className="feature-icon">
                  <feature.icon size={24} />
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <CompanyLogo size={32} />
            <div className="footer-brand-info">
              <span className="footer-company-name">Access Automation Pvt. Ltd.</span>
              <span className="footer-slogan">Enterprise Risk & Automation Solutions</span>
            </div>
          </div>
          <div className="footer-copyright">
            <p>© 2026 Access Automation Pvt. Ltd. All Rights Reserved.</p>
          </div>
        </div>
      </footer>

      <style>{`
        .landing-page {
          min-height: 100vh;
          background: var(--bg-primary);
          color: var(--text-primary);
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .landing-bg {
          position: absolute;
          inset: 0;
          overflow: hidden;
          z-index: 0;
        }

        .gradient-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(100px);
          opacity: 0.15;
        }

        .orb-1 {
          width: 800px;
          height: 800px;
          background: var(--accent-blue);
          top: -400px;
          right: -200px;
        }

        .orb-2 {
          width: 600px;
          height: 600px;
          background: var(--accent-blue);
          bottom: -300px;
          left: -200px;
        }

        .landing-nav {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.5rem 2rem;
          border-bottom: 1px solid var(--border-primary);
        }

        .nav-brand {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .brand-info {
          display: flex;
          flex-direction: column;
          line-height: 1.1;
        }

        .brand-text {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .brand-subtext {
          font-size: 13.5px;
          font-weight: 500;
          color: var(--text-secondary);
          opacity: 0.95;
          letter-spacing: 0.01em;
          text-transform: none;
        }

        .nav-actions {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .landing-main {
          position: relative;
          z-index: 1;
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 4rem 2rem;
        }

        .hero-section {
          max-width: 1200px;
          margin: 0 auto;
          width: 100%;
        }

        .hero-content {
          text-align: center;
          max-width: 800px;
          margin: 0 auto 4rem;
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: var(--accent-blue-soft);
          color: var(--accent-blue);
          border-radius: 9999px;
          font-size: 0.875rem;
          font-weight: 500;
          margin-bottom: 1.5rem;
        }

        .hero-title {
          font-size: 3.5rem;
          font-weight: 800;
          line-height: 1.1;
          margin: 0 0 1.5rem 0;
          color: var(--text-primary);
        }

        .gradient-text {
          background: linear-gradient(135deg, var(--accent-blue) 0%, #60a5fa 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .hero-description {
          font-size: 1.125rem;
          color: var(--text-secondary);
          line-height: 1.7;
          margin: 0 0 2rem 0;
        }

        .hero-actions {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
        }

        .btn-large {
          padding: 0.875rem 2rem;
          font-size: 1rem;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
        }

        .feature-card {
          background: var(--bg-card);
          border: 1px solid var(--border-primary);
          border-radius: 16px;
          padding: 1.5rem;
          transition: all 0.2s;
        }

        .feature-card:hover {
          border-color: var(--border-secondary);
          transform: translateY(-2px);
        }

        .feature-icon {
          width: 48px;
          height: 48px;
          background: var(--accent-blue-soft);
          color: var(--accent-blue);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1rem;
        }

        .feature-card h3 {
          margin: 0 0 0.5rem 0;
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .feature-card p {
          margin: 0;
          font-size: 0.875rem;
          color: var(--text-secondary);
          line-height: 1.6;
        }

        .landing-footer {
          position: relative;
          z-index: 1;
          padding: 3rem 2rem;
          border-top: 1px solid var(--border-primary);
          background: rgba(15, 23, 42, 0.3);
        }

        .footer-content {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
        }

        .footer-brand {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .footer-brand-info {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          text-align: left;
        }

        .footer-company-name {
          font-size: 1rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .footer-slogan {
          font-size: 0.75rem;
          color: var(--text-muted);
          font-weight: 500;
        }

        .footer-copyright {
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          width: 100%;
          padding-top: 1.5rem;
          text-align: center;
        }

        .footer-copyright p {
          margin: 0;
          font-size: 0.75rem;
          color: var(--text-muted);
          opacity: 0.6;
        }

        @media (max-width: 1024px) {
          .features-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 768px) {
          .hero-title {
            font-size: 2.5rem;
          }

          .features-grid {
            grid-template-columns: 1fr;
          }

          .landing-nav {
            padding: 1rem;
          }

          .landing-main {
            padding: 2rem 1rem;
          }
        }

        @media (max-width: 480px) {
          .hero-title {
            font-size: 2rem;
          }

          .hero-description {
            font-size: 1rem;
          }
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
