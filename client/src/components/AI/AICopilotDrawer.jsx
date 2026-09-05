import { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send, Bot, User, Copy, Check, ChevronRight, AlertTriangle, ShieldCheck, FileText, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../services/api';

export default function AICopilotDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const navigate = useNavigate();

  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `### 👋 Hello! I'm PayPilot AI Copilot
I'm your intelligent workforce and payroll copilot. I continuously monitor cycle expenditures, flag financial and compliance outliers, and answer questions about company compensation.

**How can I assist you today?**`,
      suggestedActions: [
        { label: '💰 Total Monthly Spend', query: 'What is our total payroll expenditure this month?' },
        { label: '🛡️ Audit Anomalies & Outliers', query: 'Detect payroll anomalies and wage spikes' },
        { label: '🏢 Dept Cost Breakdown', query: 'Show department-wise compensation breakdown' },
        { label: '🌟 Top 5 Highest Earners', query: 'Who are the top 5 highest earners?' },
        { label: '📑 Executive Briefing Memo', query: 'Generate executive summary for leadership' },
      ],
    },
  ]);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (queryText) => {
    const textToSend = queryText || input;
    if (!textToSend.trim() || loading) return;

    const userMessage = { role: 'user', content: textToSend };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const { data } = await api.post('/ai/ask', { prompt: textToSend });
      if (data?.success && data?.data) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: data.data.answer,
            suggestedActions: data.data.suggestedActions || [],
          },
        ]);
      } else {
        throw new Error(data?.error?.message || 'Failed to get response');
      }
    } catch (err) {
      console.error('AI Copilot Error:', err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ **Unable to process query**: ${err.response?.data?.error?.message || err.message || 'Please check connection to server.'}`,
          suggestedActions: [
            { label: 'Retry Total Spend', query: 'What is our total payroll expenditure this month?' },
            { label: 'Audit Anomaly Score', query: 'Detect payroll anomalies' },
          ],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleActionClick = (action) => {
    if (action.path) {
      navigate(action.path);
      setIsOpen(false);
    } else if (action.query) {
      handleSend(action.query);
    } else if (action.action === 'COPY') {
      const lastAssistantMsg = [...messages].reverse().find((m) => m.role === 'assistant');
      if (lastAssistantMsg) {
        navigator.clipboard.writeText(lastAssistantMsg.content);
        toast.success('Executive briefing copied to clipboard!');
      }
    }
  };

  // Basic markdown-like parser for clean rendering
  const renderFormattedContent = (content) => {
    const lines = content.split('\n');
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.88rem', lineHeight: 1.55 }}>
        {lines.map((line, idx) => {
          if (line.startsWith('### ')) {
            return (
              <h4 key={idx} style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: '4px 0 2px 0' }}>
                {line.replace('### ', '')}
              </h4>
            );
          }
          if (line.startsWith('# ')) {
            return (
              <h3 key={idx} style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: '6px 0 2px 0' }}>
                {line.replace('# ', '')}
              </h3>
            );
          }
          if (line.startsWith('---')) {
            return <hr key={idx} style={{ border: 'none', borderTop: '1px solid #e5e3ec', margin: '6px 0' }} />;
          }
          if (line.startsWith('> ')) {
            return (
              <div
                key={idx}
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#f8fafc',
                  borderLeft: '3px solid var(--primary)',
                  borderRadius: '4px',
                  color: '#334155',
                  fontSize: '0.82rem',
                }}
              >
                {line.replace('> ', '')}
              </div>
            );
          }
          if (line.startsWith('- ') || line.startsWith('• ')) {
            const clean = line.replace(/^[-•]\s+/, '');
            return (
              <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginLeft: '4px' }}>
                <span style={{ color: 'var(--primary)', fontWeight: 700 }}>•</span>
                <span dangerouslySetInnerHTML={{ __html: formatBold(clean) }} />
              </div>
            );
          }
          if (/^\d+\.\s+/.test(line)) {
            const num = line.match(/^(\d+)\.\s+/)[1];
            const clean = line.replace(/^\d+\.\s+/, '');
            return (
              <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginLeft: '4px' }}>
                <span style={{ color: 'var(--primary)', fontWeight: 700, minWidth: '16px' }}>{num}.</span>
                <span dangerouslySetInnerHTML={{ __html: formatBold(clean) }} />
              </div>
            );
          }
          if (line.startsWith('|')) {
            // simple table row
            return (
              <div key={idx} style={{ fontFamily: 'monospace', fontSize: '0.78rem', backgroundColor: '#faf9fd', padding: '3px 8px', borderRadius: '4px' }}>
                {line}
              </div>
            );
          }
          if (!line.trim()) {
            return <div key={idx} style={{ height: '4px' }} />;
          }
          return <p key={idx} style={{ margin: 0 }} dangerouslySetInnerHTML={{ __html: formatBold(line) }} />;
        })}
      </div>
    );
  };

  const formatBold = (text) => {
    return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Open AI Copilot"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '28px',
          zIndex: 90,
          display: 'flex',
          alignItems: 'center',
          gap: '9px',
          padding: '12px 20px',
          backgroundColor: '#5554aa',
          background: 'linear-gradient(135deg, #5554aa 0%, #6e6dc5 100%)',
          color: '#ffffff',
          border: 'none',
          borderRadius: '999px',
          boxShadow: '0 8px 24px rgba(85, 84, 170, 0.38)',
          cursor: 'pointer',
          fontWeight: 700,
          fontSize: '0.88rem',
          transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px) scale(1.03)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0) scale(1)')}
      >
        <span style={{ display: 'flex', alignItems: 'center' }}>
          <Sparkles size={17} style={{ animation: 'spin-slow 6s linear infinite' }} />
        </span>
        <span>Ask PayPilot AI</span>
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.3)',
            backdropFilter: 'blur(2px)',
            zIndex: 998,
            transition: 'opacity 0.2s ease',
          }}
        />
      )}

      {/* Slide-over Drawer Panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          maxWidth: '460px',
          backgroundColor: '#ffffff',
          boxShadow: '-8px 0 32px rgba(15, 23, 42, 0.12)',
          zIndex: 999,
          display: 'flex',
          flexDirection: 'column',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Drawer Header */}
        <div
          style={{
            padding: '18px 22px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #ffffff 0%, #f6f5fb 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #5554aa 0%, #7e7dcb 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(85, 84, 170, 0.25)',
              }}
            >
              <Sparkles size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '0.96rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  PayPilot AI Copilot
                </h3>
                <span
                  style={{
                    fontSize: '0.65rem',
                    padding: '1px 6px',
                    borderRadius: '999px',
                    backgroundColor: '#dcfce7',
                    color: '#15803d',
                    fontWeight: 700,
                  }}
                >
                  LIVE
                </span>
              </div>
              <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                Workforce Intelligence & Audit Guard
              </span>
            </div>
          </div>

          <button
            onClick={() => setIsOpen(false)}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              backgroundColor: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748b',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Quick Suggestion Pills */}
        <div
          style={{
            padding: '10px 18px',
            backgroundColor: '#faf9fd',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            whiteSpace: 'nowrap',
          }}
        >
          <button
            onClick={() => handleSend('What is our total payroll expenditure this month?')}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '0.74rem', padding: '4px 10px', borderRadius: '999px', flexShrink: 0 }}
          >
            💰 Total Spend
          </button>
          <button
            onClick={() => handleSend('Detect payroll anomalies and wage spikes')}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '0.74rem', padding: '4px 10px', borderRadius: '999px', flexShrink: 0 }}
          >
            🛡️ Anomaly Audit
          </button>
          <button
            onClick={() => handleSend('Show department-wise compensation breakdown')}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '0.74rem', padding: '4px 10px', borderRadius: '999px', flexShrink: 0 }}
          >
            🏢 Dept Share
          </button>
          <button
            onClick={() => handleSend('Who are the top 5 highest earners?')}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '0.74rem', padding: '4px 10px', borderRadius: '999px', flexShrink: 0 }}
          >
            🌟 Top Earners
          </button>
          <button
            onClick={() => handleSend('Generate executive summary for leadership')}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '0.74rem', padding: '4px 10px', borderRadius: '999px', flexShrink: 0 }}
          >
            📑 Exec Memo
          </button>
        </div>

        {/* Chat Messages Body */}
        <div
          style={{
            flex: 1,
            padding: '20px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            backgroundColor: '#ffffff',
          }}
        >
          {messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={index}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isUser ? 'flex-end' : 'flex-start',
                }}
              >
                <div
                  style={{
                    maxWidth: '92%',
                    padding: isUser ? '10px 16px' : '14px 18px',
                    borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    backgroundColor: isUser ? 'var(--primary)' : '#f8fafc',
                    color: isUser ? '#ffffff' : '#0f172a',
                    border: isUser ? 'none' : '1px solid var(--border-color)',
                    boxShadow: 'var(--shadow-sm)',
                    position: 'relative',
                  }}
                >
                  {isUser ? (
                    <div style={{ fontSize: '0.88rem', fontWeight: 500 }}>{msg.content}</div>
                  ) : (
                    <div>
                      {renderFormattedContent(msg.content)}

                      {/* Copy snippet button */}
                      <button
                        onClick={() => handleCopy(msg.content, index)}
                        title="Copy text"
                        style={{
                          position: 'absolute',
                          top: '10px',
                          right: '10px',
                          background: 'none',
                          border: 'none',
                          color: '#94a3b8',
                          cursor: 'pointer',
                          padding: '2px',
                        }}
                      >
                        {copiedIndex === index ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                      </button>
                    </div>
                  )}
                </div>

                {/* Optional suggested action buttons */}
                {!isUser && msg.suggestedActions?.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px', maxWidth: '92%' }}>
                    {msg.suggestedActions.map((action, aIdx) => (
                      <button
                        key={aIdx}
                        onClick={() => handleActionClick(action)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 10px',
                          fontSize: '0.74rem',
                          fontWeight: 600,
                          borderRadius: '999px',
                          backgroundColor: 'var(--primary-light)',
                          color: 'var(--primary)',
                          border: '1px solid var(--primary-border)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {action.label} <ArrowRight size={12} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', color: '#64748b' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--primary-light)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Sparkles size={16} className="spin-animation" />
              </div>
              <span style={{ fontSize: '0.82rem', fontStyle: 'italic' }}>
                Analyzing payroll data & running audit models...
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div
          style={{
            padding: '14px 18px',
            borderTop: '1px solid var(--border-color)',
            backgroundColor: '#ffffff',
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#f6f5fb',
              border: '1px solid var(--border-color)',
              borderRadius: '999px',
              padding: '6px 8px 6px 16px',
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about payroll, outliers, breakdown..."
              disabled={loading}
              style={{
                flex: 1,
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '0.86rem',
                color: '#0f172a',
              }}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: input.trim() && !loading ? 'var(--primary)' : '#cbd5e1',
                color: '#ffffff',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                transition: 'background-color 0.2s',
                flexShrink: 0,
              }}
            >
              <Send size={15} />
            </button>
          </form>
          <div style={{ textAlign: 'center', marginTop: '6px' }}>
            <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
              🔒 Powered by PeoplePay360 Real-Time Audit Engine
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
