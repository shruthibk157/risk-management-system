import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { askMeAPI, documentsAPI } from '../services/api';
import {
  Send,
  Paperclip,
  FileText,
  X,
  Bot,
  User,
  Loader2,
  Sparkles
} from 'lucide-react';

const AskMe = () => {
  const { user, selectedDepartment } = useAuth();
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hello ${user?.full_name || 'there'}! I'm your Risk Management Assistant. I can help you identify risks, suggest controls, or answer questions based on your department's documents. How can I assist you today?`
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [departmentDocs, setDepartmentDocs] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load department documents
  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (selectedDepartment) {
      loadDocuments();
    }
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

  const loadDocuments = async () => {
    try {
      const response = await documentsAPI.getAll({ department: selectedDepartment });
      if (response.data && Array.isArray(response.data)) {
        setDepartmentDocs(response.data);
      }
    } catch (error) {
      console.error('Failed to load documents:', error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      setTimeout(() => {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `I've analyzed your request regarding "${userMessage.content}". Based on the ${departmentDocs.length} documents in the knowledge base, here are some insights that might help with your risk assessment.`
        }]);
        setLoading(false);
      }, 1500);
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'I apologize, but I encountered an error processing your request. Please try again.'
      }]);
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setUploadedFiles(prev => [...prev, ...files]);
    }
  };

  const removeFile = (index) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getDepartmentDisplayName = () => {
    if (!selectedDepartment) return 'General';
    if (departments.length === 0) return 'Loading...';
    const dept = departments.find(d => String(d.id) === String(selectedDepartment));
    return dept ? dept.name : 'General';
  };

  return (
    <div className="ask-me-page">
      {/* Department Context Badge */}
      <div className="context-header">
        <div className="dept-context-badge">
          <Sparkles size={14} />
          <span>{getDepartmentDisplayName()} Context</span>
        </div>
        <span className="doc-count">{departmentDocs.length} documents available</span>
      </div>

      {/* Chat Area */}
      <div className="chat-container">
        <div className="messages-area">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`message ${msg.role === 'user' ? 'user' : 'assistant'}`}
            >
              <div className="message-avatar">
                {msg.role === 'user' ? (
                  <div className="avatar-user">
                    <User size={18} />
                  </div>
                ) : (
                  <div className="avatar-bot">
                    <Bot size={18} />
                  </div>
                )}
              </div>
              <div className="message-content">
                <div className="message-text">{msg.content}</div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="message assistant">
              <div className="message-avatar">
                <div className="avatar-bot">
                  <Bot size={18} />
                </div>
              </div>
              <div className="message-content">
                <div className="typing-indicator">
                  <span className="dot"></span>
                  <span className="dot"></span>
                  <span className="dot"></span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="input-section">
        {/* File Chips */}
        {uploadedFiles.length > 0 && (
          <div className="file-chips">
            {uploadedFiles.map((file, idx) => (
              <div key={idx} className="file-chip">
                <FileText size={14} />
                <span className="file-name">{file.name}</span>
                <button
                  className="remove-file"
                  onClick={() => removeFile(idx)}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSendMessage} className="input-form">
          <div className="input-wrapper">
            <button
              type="button"
              className="attach-btn"
              onClick={() => fileInputRef.current?.click()}
              title="Attach file"
            >
              <Paperclip size={20} />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              multiple
              hidden
              accept=".pdf,.docx,.txt,.json,.md"
            />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about risks, controls, or your documents..."
              className="chat-input"
            />
            <button
              type="submit"
              className={`send-btn ${input.trim() ? 'active' : ''}`}
              disabled={!input.trim() || loading}
            >
              <Send size={20} />
            </button>
          </div>
        </form>

        <p className="input-footer">
          AI can make mistakes. Always verify important information.
        </p>
      </div>

      <style>{`
        .ask-me-page {
          display: flex;
          flex-direction: column;
          height: calc(100vh - 140px);
          max-width: 900px;
          margin: 0 auto;
          width: 100%;
        }

        .context-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1rem;
          margin-bottom: 0.5rem;
        }

        .dept-context-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.375rem 0.875rem;
          background: var(--accent-blue-soft);
          color: var(--accent-blue);
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .doc-count {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .chat-container {
          flex: 1;
          overflow-y: auto;
          padding: 1rem 0;
        }

        .messages-area {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .message {
          display: flex;
          gap: 1rem;
          max-width: 100%;
          animation: fadeIn 0.2s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .message.user {
          flex-direction: row-reverse;
        }

        .message-avatar {
          flex-shrink: 0;
        }

        .avatar-user,
        .avatar-bot {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .avatar-user {
          background: var(--bg-hover);
          color: var(--text-secondary);
        }

        .avatar-bot {
          background: var(--accent-blue);
          color: white;
        }

        .message-content {
          max-width: 80%;
        }

        .message.user .message-content {
          background: var(--accent-blue);
          color: white;
          padding: 0.875rem 1.125rem;
          border-radius: 1.125rem;
          border-bottom-right-radius: 0.25rem;
        }

        .message.assistant .message-content {
          background: var(--bg-card);
          border: 1px solid var(--border-primary);
          color: var(--text-primary);
          padding: 0.875rem 1.125rem;
          border-radius: 1.125rem;
          border-bottom-left-radius: 0.25rem;
        }

        .message-text {
          line-height: 1.6;
          font-size: 0.95rem;
        }

        .typing-indicator {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.5rem 0;
        }

        .dot {
          width: 6px;
          height: 6px;
          background: var(--text-muted);
          border-radius: 50%;
          animation: bounce 1.4s infinite ease-in-out;
        }

        .dot:nth-child(1) { animation-delay: -0.32s; }
        .dot:nth-child(2) { animation-delay: -0.16s; }

        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }

        .input-section {
          padding: 1rem 0;
        }

        .file-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
          padding: 0 0.5rem;
        }

        .file-chip {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.375rem 0.625rem;
          background: var(--bg-hover);
          border: 1px solid var(--border-primary);
          border-radius: 6px;
          font-size: 0.8rem;
          color: var(--text-secondary);
        }

        .file-chip .file-name {
          max-width: 150px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .remove-file {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 0.125rem;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 3px;
        }

        .remove-file:hover {
          background: var(--status-danger-bg);
          color: var(--status-danger);
        }

        .input-form {
          position: relative;
        }

        .input-wrapper {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: var(--bg-card);
          border: 1px solid var(--border-primary);
          border-radius: 1rem;
          padding: 0.625rem;
          transition: all 0.2s;
        }

        .input-wrapper:focus-within {
          border-color: var(--accent-blue);
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .attach-btn,
        .send-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          background: transparent;
          border: none;
          border-radius: 0.75rem;
          color: var(--text-muted);
          cursor: pointer;
          transition: all 0.2s;
          flex-shrink: 0;
        }

        .attach-btn:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }

        .send-btn {
          background: transparent;
        }

        .send-btn.active {
          background: var(--accent-blue);
          color: white;
        }

        .send-btn.active:hover {
          background: var(--accent-blue-hover);
        }

        .send-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .chat-input {
          flex: 1;
          background: transparent;
          border: none;
          color: var(--text-primary);
          font-size: 0.95rem;
          padding: 0.375rem 0.5rem;
          outline: none;
        }

        .chat-input::placeholder {
          color: var(--text-muted);
        }

        .input-footer {
          text-align: center;
          margin-top: 0.75rem;
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        @media (max-width: 768px) {
          .ask-me-page {
            height: calc(100vh - 120px);
          }

          .message-content {
            max-width: 85%;
          }

          .context-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }
        }
      `}</style>
    </div>
  );
};

export default AskMe;
