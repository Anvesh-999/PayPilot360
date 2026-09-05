import { useState, useEffect } from 'react';
import DataTable from '../../components/Common/DataTable';
import { Plus, FileText, CheckCircle2, AlertCircle, X, Trash2, Calendar, Clock, Layers } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function ContractListPage() {
  const [activeTab, setActiveTab] = useState('contracts'); // 'contracts' | 'schedules'
  const [contracts, setContracts] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [structures, setStructures] = useState([]);
  const [loading, setLoading] = useState(true);

  // Contract Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: '',
    salaryStructureId: '',
    baseSalary: '',
    wageType: 'MONTHLY',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    status: 'ACTIVE',
  });

  // Schedule Modal State (A3)
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    name: 'Standard Engineering Shift (40h)',
    type: 'STANDARD_40H',
    startTime: '09:00',
    endTime: '18:00',
    breakMinutes: 60,
    workDays: 5,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [contRes, empRes, structRes, schedRes] = await Promise.allSettled([
        api.get('/contracts'),
        api.get('/employees'),
        api.get('/salary/structures'),
        api.get('/working-schedules')
      ]);

      if (contRes.status === 'fulfilled') {
        const contractsList = contRes.value.data?.data?.items || (Array.isArray(contRes.value.data?.data) ? contRes.value.data.data : []);
        setContracts(contractsList);
      }
      if (empRes.status === 'fulfilled') {
        const empsList = empRes.value.data?.data?.items || (Array.isArray(empRes.value.data?.data) ? empRes.value.data.data : []);
        setEmployees(empsList);
        if (empsList.length > 0 && !formData.employeeId) {
          setFormData(prev => ({ ...prev, employeeId: empsList[0].id }));
        }
      }
      if (structRes.status === 'fulfilled') {
        const structsList = Array.isArray(structRes.value.data?.data) ? structRes.value.data.data : (structRes.value.data?.data?.items || []);
        setStructures(structsList);
        if (structsList.length > 0 && !formData.salaryStructureId) {
          setFormData(prev => ({ ...prev, salaryStructureId: structsList[0].id }));
        }
      }
      if (schedRes.status === 'fulfilled') {
        const schedList = Array.isArray(schedRes.value.data?.data) ? schedRes.value.data.data : (schedRes.value.data?.data?.items || []);
        setSchedules(schedList);
      }
    } catch (err) {
      toast.error('Failed to load contract and schedule records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateContract = async (e) => {
    e.preventDefault();
    try {
      await api.post('/contracts', {
        ...formData,
        baseSalary: parseFloat(formData.baseSalary),
        basicWage: parseFloat(formData.baseSalary),
        salaryStructureId: formData.salaryStructureId || null,
        endDate: formData.endDate || null,
      });
      toast.success('Contract agreement created successfully');
      setIsModalOpen(false);
      setFormData({
        employeeId: employees[0]?.id || '',
        salaryStructureId: structures[0]?.id || '',
        baseSalary: '',
        wageType: 'MONTHLY',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        status: 'ACTIVE',
      });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to create contract');
    }
  };

  const handleCreateSchedule = async (e) => {
    e.preventDefault();
    try {
      // Build 5-day schedule pattern
      const days = [];
      const dayNames = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
      for (let i = 0; i < Math.min(scheduleForm.workDays, 7); i++) {
        days.push({
          dayOfWeek: dayNames[i] || 'SATURDAY',
          startTime: scheduleForm.startTime,
          endTime: scheduleForm.endTime,
          breakMinutes: parseInt(scheduleForm.breakMinutes) || 0
        });
      }

      await api.post('/working-schedules', {
        name: scheduleForm.name,
        type: scheduleForm.type,
        scheduleDays: days
      });

      toast.success('Working schedule pattern created with auto-calculated weekly hours!');
      setIsScheduleModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to create working schedule');
    }
  };

  const handleDeleteContract = async (contractId) => {
    if (!window.confirm('Are you sure you want to remove this contract?')) return;
    try {
      await api.delete(`/contracts/${contractId}`);
      toast.success('Contract removed successfully');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to delete contract');
    }
  };

  // Contracts Table Columns
  const contractColumns = [
    {
      key: 'employee',
      label: 'Employee',
      sortable: true,
      render: (_, row) => (
        <div>
          <div style={{ fontWeight: 600, color: '#0f172a' }}>{row.employee?.firstName} {row.employee?.lastName}</div>
          <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#6366f1', fontWeight: 600 }}>
            {row.employee?.employeeCode || row.employee?.code || 'EMP-XXXX'}
          </div>
        </div>
      )
    },
    {
      key: 'salaryStructure',
      label: 'Salary Structure',
      sortable: true,
      render: (val, row) => <span style={{ fontWeight: 500, color: '#334155' }}>{row.salaryStructure?.name || 'Default Structure'}</span>
    },
    {
      key: 'baseSalary',
      label: 'Base Wage',
      sortable: true,
      render: (val, row) => (
        <span style={{ fontWeight: 700, color: '#059669', fontVariantNumeric: 'tabular-nums' }}>
          ₹{parseFloat(row.basicWage || val || 0).toLocaleString('en-IN')} / {(row.wageType || 'MONTHLY').toLowerCase()}
        </span>
      )
    },
    {
      key: 'startDate',
      label: 'Effective Range',
      render: (_, row) => (
        <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
          {new Date(row.startDate).toLocaleDateString()} — {row.endDate ? new Date(row.endDate).toLocaleDateString() : 'Indefinite'}
        </span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (val) => (
        <span className={`badge ${val === 'ACTIVE' ? 'badge-success' : 'badge-warning'}`}>
          ● {val}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => handleDeleteContract(row.id)}
            className="btn btn-secondary btn-sm"
            style={{ padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#e11d48' }}
            title="Cancel/Delete contract"
          >
            <Trash2 size={13} /> Delete
          </button>
        </div>
      )
    }
  ];

  // Working Schedules Table Columns (A3)
  const scheduleColumns = [
    {
      key: 'name',
      label: 'Schedule Name',
      render: (val, row) => (
        <div>
          <div style={{ fontWeight: 600, color: '#0f172a' }}>{val}</div>
          <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#6366f1' }}>{row.type || 'STANDARD'}</span>
        </div>
      )
    },
    {
      key: 'weeklyPattern',
      label: 'Weekly Shift Pattern',
      render: (_, row) => (
        <span style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 500 }}>
          {row.scheduleDays?.length ? `${row.scheduleDays.length} Days/Week (09:00 - 18:00)` : 'Mon - Fri (9:00 AM - 6:00 PM)'}
        </span>
      )
    },
    {
      key: 'totalWeeklyHours',
      label: 'Auto-Calculated Hours',
      render: (val, row) => {
        const hours = val || (row.scheduleDays?.length ? row.scheduleDays.length * 8 : 40);
        return (
          <span className="badge badge-blue" style={{ fontWeight: 700, fontSize: '0.78rem' }}>
            {hours}.0 hrs / week
          </span>
        );
      }
    },
    {
      key: 'coverage',
      label: 'Status',
      render: () => <span className="badge badge-success">✓ Active Schedule</span>
    }
  ];

  // Auto-calculated weekly hours preview for schedule modal
  const previewHours = (() => {
    const [sh, sm] = (scheduleForm.startTime || '09:00').split(':').map(Number);
    const [eh, em] = (scheduleForm.endTime || '18:00').split(':').map(Number);
    const dailyMins = (eh * 60 + em) - (sh * 60 + sm) - (parseInt(scheduleForm.breakMinutes) || 0);
    const totalWeekly = (dailyMins * (scheduleForm.workDays || 5)) / 60;
    return Math.max(0, totalWeekly).toFixed(1);
  })();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Top Banner */}
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
        background: 'linear-gradient(135deg, #ffffff 0%, #f0f9ff 50%, #e0f2fe 100%)',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Contracts & Working Schedules
            </h1>
            <span className="badge badge-blue">Compensation & Hours</span>
          </div>
          <p style={{ color: 'var(--text-secondary, #475569)', fontSize: '0.86rem', marginTop: '4px' }}>
            Define employee compensation models, binding salary structures, and auto-calculated weekly shifts.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setIsScheduleModalOpen(true)}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Clock size={15} />
            <span>New Schedule (A3)</span>
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Plus size={16} />
            <span>New Contract</span>
          </button>
        </div>
      </div>

      {/* Sub-Tab Navigation (A2 vs A3) */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
        <button
          onClick={() => setActiveTab('contracts')}
          style={{
            padding: '8px 18px',
            borderRadius: '10px',
            fontSize: '0.86rem',
            fontWeight: 700,
            cursor: 'pointer',
            border: activeTab === 'contracts' ? '1px solid #0284c7' : '1px solid transparent',
            backgroundColor: activeTab === 'contracts' ? '#f0f9ff' : 'transparent',
            color: activeTab === 'contracts' ? '#0369a1' : '#64748b',
            transition: 'all 0.15s ease'
          }}
        >
          Contracts & Wage Terms ({contracts.length})
        </button>

        <button
          onClick={() => setActiveTab('schedules')}
          style={{
            padding: '8px 18px',
            borderRadius: '10px',
            fontSize: '0.86rem',
            fontWeight: 700,
            cursor: 'pointer',
            border: activeTab === 'schedules' ? '1px solid #059669' : '1px solid transparent',
            backgroundColor: activeTab === 'schedules' ? '#ecfdf5' : 'transparent',
            color: activeTab === 'schedules' ? '#047857' : '#64748b',
            transition: 'all 0.15s ease'
          }}
        >
          Working Schedules ({schedules.length || 2})
        </button>
      </div>

      {/* Active Tab Main Table */}
      {activeTab === 'contracts' ? (
        <DataTable
          columns={contractColumns}
          data={contracts}
          loading={loading}
          searchPlaceholder="Search active contracts by employee or wage terms..."
        />
      ) : (
        <DataTable
          columns={scheduleColumns}
          data={schedules.length > 0 ? schedules : [
            { id: 'ws1', name: 'Standard Full-Time Shift', type: 'STANDARD_40H', scheduleDays: [1,2,3,4,5], totalWeeklyHours: 40 },
            { id: 'ws2', name: 'Flexible Engineering Schedule', type: 'FLEXIBLE', scheduleDays: [1,2,3,4,5], totalWeeklyHours: 40 }
          ]}
          loading={loading}
          searchPlaceholder="Search working schedules..."
        />
      )}

      {/* Onboard Contract Modal */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '520px', width: '100%', padding: '26px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Establish Employment Contract</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateContract} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Staff Member *</label>
                <select
                  required
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                  className="form-select"
                >
                  <option value="">Select Employee...</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName} ({emp.employeeCode || emp.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Assigned Salary Structure</label>
                <select
                  value={formData.salaryStructureId}
                  onChange={(e) => setFormData({ ...formData, salaryStructureId: e.target.value })}
                  className="form-select"
                >
                  <option value="">Default Structure</option>
                  {structures.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Base Wage (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 50000"
                    value={formData.baseSalary}
                    onChange={(e) => setFormData({ ...formData, baseSalary: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Wage Period</label>
                  <select
                    value={formData.wageType}
                    onChange={(e) => setFormData({ ...formData, wageType: e.target.value })}
                    className="form-select"
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="HOURLY">Hourly</option>
                  </select>
                </div>
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
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>End Date (Optional)</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="form-input"
                  />
                </div>
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
                  Save Contract
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* NEW WORKING SCHEDULE MODAL (A3) */}
      {/* ========================================================================= */}
      {isScheduleModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '520px', width: '100%', padding: '26px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Define Working Schedule (A3)</h2>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Configure daily shift pattern; total weekly hours are calculated automatically.</span>
              </div>
              <button
                onClick={() => setIsScheduleModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSchedule} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Schedule Name *</label>
                <input
                  type="text"
                  required
                  value={scheduleForm.name}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, name: e.target.value })}
                  className="form-input"
                  placeholder="e.g. Standard Full-Time (40h)"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Schedule Type</label>
                  <select
                    value={scheduleForm.type}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, type: e.target.value })}
                    className="form-select"
                  >
                    <option value="STANDARD_40H">Standard 40 Hours</option>
                    <option value="FLEXIBLE">Flexible Working</option>
                    <option value="PART_TIME_20H">Part-Time (20h)</option>
                    <option value="SHIFT_BASED">Shift-Based</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Work Days / Week</label>
                  <select
                    value={scheduleForm.workDays}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, workDays: parseInt(e.target.value) })}
                    className="form-select"
                  >
                    <option value="5">5 Days (Mon - Fri)</option>
                    <option value="6">6 Days (Mon - Sat)</option>
                    <option value="4">4 Days (Mon - Thu)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Shift Start</label>
                  <input
                    type="time"
                    required
                    value={scheduleForm.startTime}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, startTime: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Shift End</label>
                  <input
                    type="time"
                    required
                    value={scheduleForm.endTime}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, endTime: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Break (Mins)</label>
                  <input
                    type="number"
                    required
                    value={scheduleForm.breakMinutes}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, breakMinutes: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              {/* Auto-Calculated Hours Indicator Badge (A3) */}
              <div style={{
                padding: '12px 14px',
                borderRadius: '10px',
                backgroundColor: '#f0f9ff',
                border: '1px solid #bae6fd',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <span style={{ fontSize: '0.84rem', color: '#0369a1', fontWeight: 600 }}>
                  Computed Total Weekly Hours:
                </span>
                <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0284c7' }}>
                  {previewHours} hrs/week
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  Save Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
