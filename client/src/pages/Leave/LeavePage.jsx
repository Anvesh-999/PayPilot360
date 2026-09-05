import { useState, useEffect } from 'react';
import DataTable from '../../components/Common/DataTable';
import StatCard from '../../components/Common/StatCard';
import { CalendarCheck, Clock, CheckCircle2, XCircle, Plus, X } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

export default function LeavePage() {
  const { user, hasRole } = useAuth();
  const [requests, setRequests] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isManager = hasRole(['SUPER_ADMIN', 'HR_MANAGER']);

  const [formData, setFormData] = useState({
    leaveTypeId: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    reason: '',
  });

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const [reqRes, typeRes] = await Promise.all([
        api.get('/leave/requests'),
        api.get('/leave/types')
      ]);
      setRequests(reqRes.data.data || []);
      setLeaveTypes(typeRes.data.data || []);
    } catch (err) {
      setRequests([
        { id: 'lr1', employee: { firstName: 'Michael', lastName: 'Brown', code: 'EMP-0003' }, leaveType: { name: 'Paid Annual Leave', paid: true }, startDate: '2026-03-10', endDate: '2026-03-12', totalDays: 3, reason: 'Family trip', status: 'PENDING' },
        { id: 'lr2', employee: { firstName: 'Sarah', lastName: 'Connor', code: 'EMP-0004' }, leaveType: { name: 'Sick Leave', paid: true }, startDate: '2026-03-02', endDate: '2026-03-03', totalDays: 2, reason: 'Flu recovery', status: 'APPROVED' },
        { id: 'lr3', employee: { firstName: 'David', lastName: 'Miller', code: 'EMP-0005' }, leaveType: { name: 'Unpaid Leave (LOP)', paid: false }, startDate: '2026-03-15', endDate: '2026-03-16', totalDays: 2, reason: 'Personal errands', status: 'APPROVED' },
      ]);
      setLeaveTypes([
        { id: 'lt1', name: 'Paid Annual Leave', paid: true, maxDaysPerYear: 20 },
        { id: 'lt2', name: 'Sick Leave', paid: true, maxDaysPerYear: 10 },
        { id: 'lt3', name: 'Unpaid Leave (LOP)', paid: false, maxDaysPerYear: 30 },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    try {
      await api.post('/leave/requests', formData);
      toast.success('Leave request submitted');
      setIsModalOpen(false);
      fetchLeaves();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to submit leave request');
    }
  };

  const handleAction = async (id, action) => {
    try {
      await api.patch(`/leave/requests/${id}/${action}`);
      toast.success(`Leave request ${action}ed`);
      fetchLeaves();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || `Failed to ${action} leave`);
    }
  };

  const columns = [
    {
      key: 'employee',
      label: 'Employee',
      sortable: true,
      render: (_, row) => (
        <div>
          <div style={{ fontWeight: 600, color: '#fff' }}>{row.employee?.firstName} {row.employee?.lastName}</div>
          <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#38bdf8' }}>{row.employee?.code}</span>
        </div>
      )
    },
    {
      key: 'leaveType',
      label: 'Leave Type',
      sortable: true,
      render: (_, row) => (
        <div>
          <span style={{ color: '#e2e8f0', fontWeight: 500 }}>{row.leaveType?.name}</span>
          <span style={{ display: 'block', fontSize: '0.7rem', color: row.leaveType?.paid ? '#10b981' : '#f59e0b' }}>
            {row.leaveType?.paid ? 'Paid' : 'Unpaid (Affects LOP)'}
          </span>
        </div>
      )
    },
    {
      key: 'dates',
      label: 'Duration',
      render: (_, row) => (
        <div>
          <div style={{ color: '#e2e8f0', fontSize: '0.85rem' }}>
            {new Date(row.startDate).toLocaleDateString()} — {new Date(row.endDate).toLocaleDateString()}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            {row.totalDays} {row.totalDays === 1 ? 'day' : 'days'}
          </span>
        </div>
      )
    },
    {
      key: 'reason',
      label: 'Reason',
      render: (val) => <span style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>{val || '—'}</span>
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (val) => {
        let cls = 'badge-warning';
        if (val === 'APPROVED') cls = 'badge-success';
        if (val === 'REJECTED') cls = 'badge-danger';
        return <span className={`badge ${cls}`}>{val}</span>;
      }
    },
    {
      key: 'actions',
      label: 'Approvals',
      render: (_, row) => {
        if (row.status !== 'PENDING' || !isManager) return <span style={{ color: '#64748b', fontSize: '0.8rem' }}>Closed</span>;
        return (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => handleAction(row.id, 'approve')}
              style={{
                padding: '4px 8px',
                borderRadius: '6px',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#10b981',
                fontSize: '0.75rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <CheckCircle2 size={13} /> Approve
            </button>
            <button
              onClick={() => handleAction(row.id, 'reject')}
              style={{
                padding: '4px 8px',
                borderRadius: '6px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
                fontSize: '0.75rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <XCircle size={13} /> Reject
            </button>
          </div>
        );
      }
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#ffffff' }}>
            Leave & Time Off Management
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginTop: '4px' }}>
            Manage vacation accruals, sick leave, unpaid LOP deductions, and manager approvals.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Plus size={16} />
          <span>Apply for Leave</span>
        </button>
      </div>

      {/* Balances Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <StatCard
          title="Annual Paid Leave"
          value="18 Days"
          description="out of 20 days entitlement"
          color="#14b8a6"
          icon={CalendarCheck}
        />
        <StatCard
          title="Sick Leave Available"
          value="9 Days"
          description="out of 10 days policy"
          color="#38bdf8"
          icon={Clock}
        />
        <StatCard
          title="Unpaid Leave Taken"
          value="2 Days"
          description="deductible in payroll (LOP)"
          color="#f59e0b"
          icon={CalendarCheck}
        />
      </div>

      <DataTable
        columns={columns}
        data={requests}
        searchPlaceholder="Search leave requests by employee name..."
      />

      {isModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
          padding: '20px'
        }}>
          <div className="card" style={{ maxWidth: '480px', width: '100%', padding: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff' }}>Submit Leave Request</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleApplyLeave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '6px' }}>Leave Type *</label>
                <select
                  required
                  value={formData.leaveTypeId}
                  onChange={(e) => setFormData({ ...formData, leaveTypeId: e.target.value })}
                  style={{ width: '100%', padding: '10px', backgroundColor: '#0f1219', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                >
                  <option value="">Select Leave Type...</option>
                  {leaveTypes.map((t) => (
                    <option key={t.id} value={t.id}>{t.name} ({t.paid ? 'Paid' : 'Unpaid'})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '6px' }}>Start Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    style={{ width: '100%', padding: '10px', backgroundColor: '#0f1219', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '6px' }}>End Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    style={{ width: '100%', padding: '10px', backgroundColor: '#0f1219', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '6px' }}>Reason / Notes</label>
                <textarea
                  rows="3"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Optional details for approving manager..."
                  style={{ width: '100%', padding: '10px', backgroundColor: '#0f1219', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
