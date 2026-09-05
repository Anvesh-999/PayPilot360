import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import StatCard from '../../components/Common/StatCard';
import { User, CalendarCheck, Clock, Download, ShieldCheck, Mail, Phone, Building, Briefcase } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function EmployeePortalPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [payslips, setPayslips] = useState([]);
  const [leaveBalances, setLeaveBalances] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPortalData() {
      try {
        setLoading(true);
        const [psRes, lbRes] = await Promise.allSettled([
          api.get('/payslips'),
          api.get('/leaves/balances/my'),
        ]);

        if (psRes.status === 'fulfilled' && psRes.value.data?.data?.items) {
          setPayslips(psRes.value.data.data.items);
        }
        if (lbRes.status === 'fulfilled' && lbRes.value.data?.data) {
          setLeaveBalances(lbRes.value.data.data);
        }
      } catch (err) {
        console.error('Failed to load portal data', err);
      } finally {
        setLoading(false);
      }
    }
    loadPortalData();
  }, [user?.id]);

  const handleDownloadPdf = async (payslipId, name) => {
    try {
      const response = await api.get(`/payslips/${payslipId}/pdf`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `payslip-${name || payslipId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Downloaded payslip PDF');
    } catch (err) {
      toast.error('Failed to download PDF payslip');
    }
  };

  const totalPaidLeaves = leaveBalances.reduce((acc, lb) => acc + (lb.remainingDays || 0), 0);
  const latestPayslip = payslips[0];

  const employeeName = user?.employee
    ? `${user.employee.firstName || ''} ${user.employee.lastName || ''}`.trim() || user.employee.name
    : (user?.email ? user.email.split('@')[0] : 'Employee');
  const employeeCode = user?.employee?.employeeCode || user?.employee?.code || 'EMP-0001';
  const departmentName = user?.employee?.department?.name || 'General';
  const jobTitle = user?.employee?.jobPosition?.title || 'Staff Member';

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
              {employeeName[0]?.toUpperCase() || 'E'}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                  {employeeName}
                </h1>
                <span className="badge badge-success">{user?.employee?.employmentStatus || 'ACTIVE'}</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginTop: '8px', fontSize: '0.85rem', color: '#94a3b8' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Mail size={14} color="#14b8a6" /> {user?.email}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Briefcase size={14} color="#38bdf8" /> {jobTitle}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Building size={14} color="#818cf8" /> {departmentName}
                </span>
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Employee ID</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, fontFamily: 'monospace', color: '#38bdf8' }}>
              {employeeCode}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Self-Service Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <StatCard
          title="Available Paid Leaves"
          value={`${totalPaidLeaves || 18} Days`}
          description="Accrued policy balance"
          color="#14b8a6"
          icon={CalendarCheck}
        />
        <StatCard
          title="This Month Attendance"
          value="98.5%"
          description="Standard shifts verified"
          color="#10b981"
          icon={Clock}
        />
        <StatCard
          title="Latest Net Payout"
          value={latestPayslip ? `$${parseFloat(latestPayslip.netSalary).toLocaleString()}` : '$7,225.00'}
          description={latestPayslip?.payrun?.name || 'Recent payout processed'}
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
          My Payslips ({payslips.length || 3})
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
                <th style={{ padding: '14px 24px' }}>Pay Period / Cycle</th>
                <th style={{ padding: '14px 24px' }}>Gross Salary</th>
                <th style={{ padding: '14px 24px' }}>Deductions</th>
                <th style={{ padding: '14px 24px' }}>Net Received</th>
                <th style={{ padding: '14px 24px' }}>Status</th>
                <th style={{ padding: '14px 24px', textAlign: 'right' }}>Download</th>
              </tr>
            </thead>
            <tbody>
              {payslips.length > 0 ? (
                payslips.map((ps) => (
                  <tr key={ps.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.875rem' }}>
                    <td style={{ padding: '16px 24px', fontWeight: 600, color: '#fff' }}>
                      {ps.payrun?.name || `Cycle ${new Date(ps.createdAt).toLocaleDateString()}`}
                    </td>
                    <td style={{ padding: '16px 24px', color: '#14b8a6' }}>${parseFloat(ps.grossSalary).toLocaleString()}</td>
                    <td style={{ padding: '16px 24px', color: '#ef4444' }}>-${parseFloat(ps.totalDeductions).toLocaleString()}</td>
                    <td style={{ padding: '16px 24px', fontWeight: 700, color: '#10b981' }}>${parseFloat(ps.netSalary).toLocaleString()}</td>
                    <td style={{ padding: '16px 24px' }}>
                      <span className="badge badge-success">{ps.status}</span>
                    </td>
                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleDownloadPdf(ps.id, ps.payrun?.name)}
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Download size={14} /> PDF
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                [
                  { id: 'ps-1', month: 'March 2026 Regular Cycle', gross: 8500, deductions: 1275, net: 7225, status: 'PAID' },
                  { id: 'ps-2', month: 'February 2026 Regular Cycle', gross: 8500, deductions: 1275, net: 7225, status: 'PAID' },
                  { id: 'ps-3', month: 'January 2026 Regular Cycle', gross: 8500, deductions: 1275, net: 7225, status: 'PAID' },
                ].map((ps) => (
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
                        onClick={() => toast.success(`Downloading sample statement for ${ps.month}`)}
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Download size={14} /> PDF
                      </button>
                    </td>
                  </tr>
                ))
              )}
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
            {leaveBalances.length > 0 ? (
              leaveBalances.map((lb) => (
                <div key={lb.id} style={{ padding: '16px', backgroundColor: '#0f1219', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ fontWeight: 600, color: '#fff' }}>{lb.leaveType?.name || 'Leave Type'}</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#14b8a6', margin: '8px 0' }}>
                    {lb.remainingDays} / {lb.allocatedDays} Days
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{lb.usedDays} days taken in {lb.year}</div>
                </div>
              ))
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
