import { useState, useEffect } from 'react';
import DataTable from '../../components/Common/DataTable';
import { Clock, Calendar, CheckCircle2, AlertTriangle, Plus, X } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function AttendancePage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [employees, setEmployees] = useState([]);

  const [correctionData, setCorrectionData] = useState({
    employeeId: '',
    date: new Date().toISOString().split('T')[0],
    checkIn: '09:00',
    checkOut: '17:30',
    remarks: 'Manual biometric adjustment'
  });

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/attendance');
      setLogs(data.data || []);
    } catch (err) {
      setLogs([
        { id: '1', employee: { firstName: 'John', lastName: 'Doe', code: 'EMP-0001' }, date: '2026-03-05', checkIn: '2026-03-05T09:02:00Z', checkOut: '2026-03-05T17:30:00Z', status: 'PRESENT', totalHours: 8.46 },
        { id: '2', employee: { firstName: 'Jane', lastName: 'Smith', code: 'EMP-0002' }, date: '2026-03-05', checkIn: '2026-03-05T09:45:00Z', checkOut: '2026-03-05T18:15:00Z', status: 'LATE', totalHours: 8.5 },
        { id: '3', employee: { firstName: 'Michael', lastName: 'Brown', code: 'EMP-0003' }, date: '2026-03-05', checkIn: null, checkOut: null, status: 'ON_LEAVE', totalHours: 0 },
        { id: '4', employee: { firstName: 'Sarah', lastName: 'Connor', code: 'EMP-0004' }, date: '2026-03-05', checkIn: '2026-03-05T08:58:00Z', checkOut: null, status: 'PRESENT', totalHours: 3.2 },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const { data } = await api.get('/employees');
      setEmployees(data.data || []);
    } catch (e) {}
  };

  useEffect(() => {
    fetchAttendance();
    fetchEmployees();
  }, []);

  const handleManualAdjustment = async (e) => {
    e.preventDefault();
    try {
      await api.post('/attendance/manual-entry', correctionData);
      toast.success('Attendance record updated');
      setIsModalOpen(false);
      fetchAttendance();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to adjust attendance');
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
      key: 'date',
      label: 'Date',
      sortable: true,
      render: (val) => new Date(val).toLocaleDateString()
    },
    {
      key: 'checkIn',
      label: 'Check In',
      render: (val) => val ? new Date(val).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'
    },
    {
      key: 'checkOut',
      label: 'Check Out',
      render: (val) => val ? new Date(val).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (
        <span style={{ color: '#10b981', fontStyle: 'italic', fontSize: '0.8rem' }}>Clocked In</span>
      )
    },
    {
      key: 'totalHours',
      label: 'Hours Worked',
      render: (val) => val ? `${parseFloat(val).toFixed(2)} hrs` : '—'
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (val) => {
        let cls = 'badge-success';
        if (val === 'LATE') cls = 'badge-warning';
        if (val === 'ABSENT') cls = 'badge-danger';
        if (val === 'ON_LEAVE') cls = 'badge-info';
        return <span className={`badge ${cls}`}>{val}</span>;
      }
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#ffffff' }}>
            Workforce Attendance
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginTop: '4px' }}>
            Daily check-in logs, biometric punches, hours tracked, and punch regularization.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="btn btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Plus size={16} />
          <span>Manual Entry</span>
        </button>
      </div>

      <DataTable
        columns={columns}
        data={logs}
        searchPlaceholder="Search attendance by employee name or code..."
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
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff' }}>Record Manual Attendance</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleManualAdjustment} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '6px' }}>Employee *</label>
                <select
                  required
                  value={correctionData.employeeId}
                  onChange={(e) => setCorrectionData({ ...correctionData, employeeId: e.target.value })}
                  style={{ width: '100%', padding: '10px', backgroundColor: '#0f1219', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                >
                  <option value="">Select Employee...</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '6px' }}>Date *</label>
                <input
                  type="date"
                  required
                  value={correctionData.date}
                  onChange={(e) => setCorrectionData({ ...correctionData, date: e.target.value })}
                  style={{ width: '100%', padding: '10px', backgroundColor: '#0f1219', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '6px' }}>Punch In</label>
                  <input
                    type="time"
                    required
                    value={correctionData.checkIn}
                    onChange={(e) => setCorrectionData({ ...correctionData, checkIn: e.target.value })}
                    style={{ width: '100%', padding: '10px', backgroundColor: '#0f1219', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '6px' }}>Punch Out</label>
                  <input
                    type="time"
                    required
                    value={correctionData.checkOut}
                    onChange={(e) => setCorrectionData({ ...correctionData, checkOut: e.target.value })}
                    style={{ width: '100%', padding: '10px', backgroundColor: '#0f1219', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '6px' }}>Reason / Remarks</label>
                <input
                  type="text"
                  value={correctionData.remarks}
                  onChange={(e) => setCorrectionData({ ...correctionData, remarks: e.target.value })}
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
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
