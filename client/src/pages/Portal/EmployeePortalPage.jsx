import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import StatCard from '../../components/Common/StatCard';
import { User, CalendarCheck, Clock, Download, ShieldCheck, Mail, Phone, Building, Briefcase } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function EmployeePortalPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  const myPayslips = [
    { id: 'ps-1', month: 'March 2026', gross: 8500, deductions: 1275, net: 7225, status: 'PAID' },
    { id: 'ps-2', month: 'February 2026', gross: 8500, deductions: 1275, net: 7225, status: 'PAID' },
    { id: 'ps-3', month: 'January 2026', gross: 8500, deductions: 1275, net: 7225, status: 'PAID' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Employee Profile Hero Card */}
      <div className="card" style={{
        padding: '28px',
        background: 'linear-gradient(135deg, #161b26 0%, #1c2233 100%)',
        borderLeft: '4px solid #14b8a6'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #14b8a6, #3b82f6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '28px',
              fontWeight: 800,
              boxShadow: '0 0 20px rgba(20, 184, 166, 0.3)'
            }}>
              {user?.name ? user.name[0].toUpperCase() : 'E'}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                  {user?.name || 'Employee Profile'}
                </h1>
                <span className="badge badge-success">Active Full-Time</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginTop: '8px', fontSize: '0.85rem', color: '#94a3b8' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Mail size={14} color="#14b8a6" /> {user?.email}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Briefcase size={14} color="#38bdf8" /> {user?.employee?.jobPosition?.title || 'Senior Software Engineer'}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Building size={14} color="#818cf8" /> {user?.employee?.department?.name || 'Engineering'}
                </span>
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Employee ID</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, fontFamily: 'monospace', color: '#38bdf8' }}>
              {user?.employee?.code || 'EMP-0001'}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Self-Service Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <StatCard
          title="Available Paid Leaves"
          value="18 Days"
          description="Annual leave balance"
          color="#14b8a6"
          icon={CalendarCheck}
        />
        <StatCard
          title="This Month Attendance"
          value="98.5%"
          description="19 / 20 days present"
          color="#10b981"
          icon={Clock}
        />
        <StatCard
          title="Latest Net Payout"
          value="$7,225.00"
          description="Paid on Mar 31, 2026"
          color="#38bdf8"
          icon={ShieldCheck}
        />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
        <button
          onClick={() => setActiveTab('overview')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            background: activeTab === 'overview' ? 'rgba(20, 184, 166, 0.15)' : 'transparent',
            border: activeTab === 'overview' ? '1px solid rgba(20, 184, 166, 0.4)' : 'none',
            color: activeTab === 'overview' ? '#14b8a6' : '#94a3b8',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}
        >
          My Payslips
        </button>
        <button
          onClick={() => setActiveTab('leave')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            background: activeTab === 'leave' ? 'rgba(20, 184, 166, 0.15)' : 'transparent',
            border: activeTab === 'leave' ? '1px solid rgba(20, 184, 166, 0.4)' : 'none',
            color: activeTab === 'leave' ? '#14b8a6' : '#94a3b8',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}
        >
          Leave Balances
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#fff', margin: 0 }}>
              Recent Salary Statements
            </h3>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '14px 24px' }}>Pay Period</th>
                <th style={{ padding: '14px 24px' }}>Gross Salary</th>
                <th style={{ padding: '14px 24px' }}>Deductions</th>
                <th style={{ padding: '14px 24px' }}>Net Received</th>
                <th style={{ padding: '14px 24px' }}>Status</th>
                <th style={{ padding: '14px 24px', textAlign: 'right' }}>Download</th>
              </tr>
            </thead>
            <tbody>
              {myPayslips.map((ps) => (
                <tr key={ps.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.875rem' }}>
                  <td style={{ padding: '16px 24px', fontWeight: 600, color: '#fff' }}>{ps.month}</td>
                  <td style={{ padding: '16px 24px', color: '#14b8a6' }}>${ps.gross.toLocaleString()}</td>
                  <td style={{ padding: '16px 24px', color: '#ef4444' }}>-${ps.deductions.toLocaleString()}</td>
                  <td style={{ padding: '16px 24px', fontWeight: 700, color: '#10b981' }}>${ps.net.toLocaleString()}</td>
                  <td style={{ padding: '16px 24px' }}>
                    <span className="badge badge-success">{ps.status}</span>
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                    <button
                      onClick={() => toast.success(`Downloading payslip for ${ps.month}`)}
                      className="btn btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Download size={14} /> PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'leave' && (
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#fff', marginBottom: '16px' }}>
            Accrued Leave Policy Quota
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <div style={{ padding: '16px', backgroundColor: '#0f1219', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontWeight: 600, color: '#fff' }}>Paid Annual Leave</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#14b8a6', margin: '8px 0' }}>18 / 20 Days</div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>2 days used in 2026 calendar year</div>
            </div>
            <div style={{ padding: '16px', backgroundColor: '#0f1219', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontWeight: 600, color: '#fff' }}>Sick / Medical Leave</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#38bdf8', margin: '8px 0' }}>9 / 10 Days</div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>1 day used for medical emergency</div>
            </div>
            <div style={{ padding: '16px', backgroundColor: '#0f1219', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontWeight: 600, color: '#fff' }}>Unpaid Leave (LOP)</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b', margin: '8px 0' }}>0 Days</div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>No salary deductions applied</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
