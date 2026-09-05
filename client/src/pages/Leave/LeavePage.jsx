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
      const reqItems = reqRes.data.data?.items || (Array.isArray(reqRes.data.data) ? reqRes.data.data : []);
      const typeItems = Array.isArray(typeRes.data.data) ? typeRes.data.data : (typeRes.data.data?.items || []);
      setRequests(reqItems);
      setLeaveTypes(typeItems);
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
          <div style={{ fontWeight: 600, color: '#0f172a' }}>{row.employee?.firstName} {row.employee?.lastName}</div>
          <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#6366f1', fontWeight: 600 }}>{row.employee?.code}</span>
        </div>
      )
    },
    {
      key: 'leaveType',
      label: 'Leave Type',
      sortable: true,
      render: (_, row) => (
        <div>
          <span style={{ color: '#0f172a', fontWeight: 600 }}>{row.leaveType?.name}</span>
          <span style={{ display: 'block', fontSize: '0.74rem', color: row.leaveType?.paid ? '#059669' : '#d97706', fontWeight: 500 }}>
            {row.leaveType?.paid ? '● Paid' : '● Unpaid (Affects LOP)'}
          </span>
        </div>
      )
    },
    {
      key: 'dates',
      label: 'Duration',
      render: (_, row) => (
        <div>
          <div style={{ color: '#334155', fontSize: '0.86rem', fontWeight: 500 }}>
            {new Date(row.startDate).toLocaleDateString()} — {new Date(row.endDate).toLocaleDateString()}
          </div>
          <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
            {row.totalDays} {row.totalDays === 1 ? 'day' : 'days'}
          </span>
        </div>
      )
    },
    {
      key: 'reason',
      label: 'Reason',
      render: (val) => <span style={{ color: '#64748b', fontSize: '0.85rem' }}>{val || '—'}</span>
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
        if (row.status !== 'PENDING' || !isManager) return <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Closed</span>;
        return (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => handleAction(row.id, 'approve')}
              style={{
                padding: '4px 10px',
                borderRadius: '8px',
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                color: '#065f46',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.15s ease'
              }}
            >
              <CheckCircle2 size={13} /> Approve
            </button>
            <button
              onClick={() => handleAction(row.id, 'reject')}
              style={{
                padding: '4px 10px',
                borderRadius: '8px',
                background: '#fff1f2',
                border: '1px solid #fecdd3',
                color: '#9f1239',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.15s ease'
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
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        padding: '22px 26px',
        backgroundColor: '#ffffff',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        background: 'linear-gradient(135deg, #ffffff 0%, #fffbeb 50%, #eff6ff 100%)',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Leave & Time Off Management
            </h1>
            <span className="badge badge-warning">Policies Active</span>
          </div>
          <p style={{ color: '#475569', fontSize: '0.88rem', marginTop: '4px' }}>
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
          color="#10b981"
          icon={CalendarCheck}
          badgeText="Accrued"
        />
        <StatCard
          title="Sick Leave Available"
          value="9 Days"
          description="out of 10 days policy"
          color="#0ea5e9"
          icon={Clock}
          badgeText="Medical"
        />
        <StatCard
          title="Unpaid Leave Taken"
          value="2 Days"
          description="deductible in payroll (LOP)"
          color="#f59e0b"
          icon={CalendarCheck}
          badgeText="LOP Penalty"
        />
      </div>

      <DataTable
        columns={columns}
        data={requests}
        searchPlaceholder="Search leave requests by employee name..."
      />

      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '480px', width: '100%', padding: '26px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Submit Leave Request</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleApplyLeave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Leave Type *</label>
                <select
                  required
                  value={formData.leaveTypeId}
                  onChange={(e) => setFormData({ ...formData, leaveTypeId: e.target.value })}
                  className="form-select"
                >
                  <option value="">Select Leave Type...</option>
                  {leaveTypes.map((t) => (
                    <option key={t.id} value={t.id}>{t.name} ({t.paid ? 'Paid' : 'Unpaid'})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Start Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>End Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Reason / Notes</label>
                <textarea
                  rows="3"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Optional details for approving manager..."
                  className="form-textarea"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '14px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
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
