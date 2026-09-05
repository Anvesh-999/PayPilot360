import { useState, useEffect, useMemo } from 'react';
import DataTable from '../../components/Common/DataTable';
import { Plus, User, Mail, Building, Briefcase, Eye, CheckCircle2, X, Search, Filter, Phone, Calendar } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

// Curated avatar gradient palette for realistic human feel
const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #3b82f6, #1d4ed8)',
  'linear-gradient(135deg, #8b5cf6, #6d28d9)',
  'linear-gradient(135deg, #10b981, #047857)',
  'linear-gradient(135deg, #f59e0b, #b45309)',
  'linear-gradient(135deg, #ec4899, #be185d)',
  'linear-gradient(135deg, #06b6d4, #0e7490)',
  'linear-gradient(135deg, #6366f1, #4338ca)',
];

function getAvatarGradient(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[index];
}

export default function EmployeeListPage() {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    departmentId: '',
    jobPositionId: '',
    joiningDate: new Date().toISOString().split('T')[0],
    status: 'ACTIVE',
  });

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/employees');
      const items = Array.isArray(data.data) ? data.data : (data.data?.data || []);
      setEmployees(items);
    } catch (err) {
      setEmployees([
        { id: '1', employeeCode: 'EMP-0001', firstName: 'Aisha', lastName: 'Verma', email: 'aisha.verma@peoplepay360.com', department: { name: 'Engineering' }, jobPosition: { title: 'Senior Software Engineer' }, employmentStatus: 'ACTIVE', joiningDate: '2025-01-15' },
        { id: '2', employeeCode: 'EMP-0002', firstName: 'Rohan', lastName: 'Sharma', email: 'rohan.sharma@peoplepay360.com', department: { name: 'Engineering' }, jobPosition: { title: 'Software Engineer' }, employmentStatus: 'ACTIVE', joiningDate: '2025-03-01' },
        { id: '3', employeeCode: 'EMP-0003', firstName: 'Priya', lastName: 'Nair', email: 'priya.nair@peoplepay360.com', department: { name: 'Engineering' }, jobPosition: { title: 'Tech Lead' }, employmentStatus: 'ACTIVE', joiningDate: '2025-06-10' },
        { id: '4', employeeCode: 'EMP-0004', firstName: 'Vikram', lastName: 'Singh', email: 'vikram.singh@peoplepay360.com', department: { name: 'Sales' }, jobPosition: { title: 'Sales Manager' }, employmentStatus: 'ACTIVE', joiningDate: '2025-02-01' },
        { id: '5', employeeCode: 'EMP-0005', firstName: 'Kavya', lastName: 'Iyer', email: 'kavya.iyer@peoplepay360.com', department: { name: 'HR & Admin' }, jobPosition: { title: 'HR Executive' }, employmentStatus: 'ACTIVE', joiningDate: '2025-04-15' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMeta = async () => {
    try {
      const [deptRes, posRes] = await Promise.all([
        api.get('/departments'),
        api.get('/job-positions')
      ]);
      const depts = Array.isArray(deptRes.data.data) ? deptRes.data.data : (deptRes.data.data?.data || []);
      const poses = Array.isArray(posRes.data.data) ? posRes.data.data : (posRes.data.data?.data || []);
      setDepartments(depts);
      setPositions(poses);
    } catch (e) {
      setDepartments([
        { id: 'd1', name: 'Engineering' },
        { id: 'd2', name: 'Sales' },
        { id: 'd3', name: 'HR & Admin' },
      ]);
      setPositions([
        { id: 'p1', title: 'Senior Software Engineer' },
        { id: 'p2', title: 'Software Engineer' },
        { id: 'p3', title: 'Sales Manager' },
        { id: 'p4', title: 'HR Executive' },
      ]);
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchMeta();
  }, []);

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/employees', formData);
      toast.success('Employee onboarded successfully');
      setIsModalOpen(false);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        departmentId: '',
        jobPositionId: '',
        joiningDate: new Date().toISOString().split('T')[0],
        status: 'ACTIVE',
      });
      fetchEmployees();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to create employee');
    }
  };

  // Filter employees by department
  const filteredEmployees = useMemo(() => {
    if (selectedDept === 'ALL') return employees;
    return employees.filter(emp => emp.department?.name === selectedDept);
  }, [employees, selectedDept]);

  const columns = [
    {
      key: 'name',
      label: 'Employee Name & Email',
      sortable: true,
      render: (_, row) => {
        const fullName = `${row.firstName || ''} ${row.lastName || ''}`.trim();
        const initials = `${row.firstName?.[0] || ''}${row.lastName?.[0] || ''}`.toUpperCase();
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '9px',
              background: getAvatarGradient(fullName),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 700,
              fontSize: '13px',
              flexShrink: 0,
              boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
            }}>
              {initials || 'EM'}
            </div>
            <div>
              <div style={{ fontWeight: 600, color: '#ffffff', fontSize: '0.9rem' }}>
                {fullName}
              </div>
              <div style={{ fontSize: '0.76rem', color: '#94a3b8' }}>
                {row.email}
              </div>
            </div>
          </div>
        );
      }
    },
    {
      key: 'employeeCode',
      label: 'Staff ID',
      sortable: true,
      render: (val, row) => (
        <span style={{
          fontFamily: 'monospace',
          color: '#38bdf8',
          fontSize: '0.8rem',
          backgroundColor: 'rgba(56, 189, 248, 0.08)',
          border: '1px solid rgba(56, 189, 248, 0.2)',
          padding: '2px 8px',
          borderRadius: '5px'
        }}>
          {val || row.code || 'EMP-XXXX'}
        </span>
      )
    },
    {
      key: 'department',
      label: 'Department',
      sortable: true,
      render: (val, row) => {
        const deptName = row.department?.name || 'General';
        let badgeClass = 'badge-blue';
        if (deptName.includes('Sales')) badgeClass = 'badge-success';
        if (deptName.includes('HR')) badgeClass = 'badge-purple';
        return <span className={`badge ${badgeClass}`}>{deptName}</span>;
      }
    },
    {
      key: 'jobPosition',
      label: 'Designation',
      sortable: true,
      render: (val, row) => row.jobPosition?.title || 'Staff Member'
    },
    {
      key: 'employmentStatus',
      label: 'Status',
      sortable: true,
      render: (val, row) => {
        const status = val || row.status || 'ACTIVE';
        let badgeCls = 'badge-success';
        if (status === 'ON_LEAVE') badgeCls = 'badge-warning';
        if (status === 'TERMINATED' || status === 'SUSPENDED') badgeCls = 'badge-danger';
        return (
          <span className={`badge ${badgeCls}`}>
            ● {status}
          </span>
        );
      }
    },
    {
      key: 'joiningDate',
      label: 'Start Date',
      sortable: true,
      render: (val) => (
        <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
          {val ? new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => { setSelectedEmployee(row); setIsDetailOpen(true); }}
            className="btn btn-secondary btn-sm"
            style={{ padding: '5px 9px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
            title="Inspect profile"
          >
            <Eye size={14} /> Profile
          </button>
        </div>
      )
    }
  ];

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
        background: 'linear-gradient(135deg, #ffffff 0%, #f5f3ff 50%, #eff6ff 100%)',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Staff & Workforce Directory
            </h1>
            <span className="badge badge-purple">{employees.length} Personnel</span>
          </div>
          <p style={{ color: 'var(--text-secondary, #475569)', fontSize: '0.86rem', marginTop: '4px' }}>
            Manage staff profiles, departmental allocations, compensation terms, and records.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Plus size={16} />
          <span>Onboard New Employee</span>
        </button>
      </div>

      {/* Department Filter Chips */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, marginRight: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Filter Unit:
        </span>
        <button
          onClick={() => setSelectedDept('ALL')}
          style={{
            padding: '6px 14px',
            borderRadius: '999px',
            fontSize: '0.82rem',
            fontWeight: 600,
            cursor: 'pointer',
            backgroundColor: selectedDept === 'ALL' ? '#6366f1' : '#ffffff',
            color: selectedDept === 'ALL' ? '#ffffff' : '#475569',
            border: selectedDept === 'ALL' ? '1px solid #6366f1' : '1px solid var(--border-color)',
            boxShadow: selectedDept === 'ALL' ? '0 3px 10px rgba(99, 102, 241, 0.3)' : 'var(--shadow-xs)',
            transition: 'all 0.15s ease'
          }}
        >
          All Units ({employees.length})
        </button>
        {departments.map((dept) => {
          const count = employees.filter(e => e.department?.name === dept.name).length;
          const isSelected = selectedDept === dept.name;
          return (
            <button
              key={dept.id}
              onClick={() => setSelectedDept(dept.name)}
              style={{
                padding: '6px 14px',
                borderRadius: '999px',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                backgroundColor: isSelected ? '#8b5cf6' : '#ffffff',
                color: isSelected ? '#ffffff' : '#475569',
                border: isSelected ? '1px solid #8b5cf6' : '1px solid var(--border-color)',
                boxShadow: isSelected ? '0 3px 10px rgba(139, 92, 246, 0.3)' : 'var(--shadow-xs)',
                transition: 'all 0.15s ease'
              }}
            >
              {dept.name} ({count})
            </button>
          );
        })}
      </div>

      {/* Main Table */}
      <DataTable
        columns={columns}
        data={filteredEmployees}
        searchPlaceholder="Filter employees by name, staff ID, or email..."
      />

      {/* Create Employee Modal */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '600px', width: '100%', padding: '26px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Onboard New Employee</h2>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Fill in personal and organizational details</span>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateEmployee} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>First Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="form-input"
                    placeholder="e.g. Liam"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Last Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="form-input"
                    placeholder="e.g. Vance"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Work Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="form-input"
                    placeholder="name@peoplepay360.com"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Phone Contact</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91-9876543210"
                    className="form-input"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Department</label>
                  <select
                    value={formData.departmentId}
                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                    className="form-select"
                  >
                    <option value="">Select Department...</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Job Position</label>
                  <select
                    value={formData.jobPositionId}
                    onChange={(e) => setFormData({ ...formData, jobPositionId: e.target.value })}
                    className="form-select"
                  >
                    <option value="">Select Position...</option>
                    {positions.map((p) => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Start Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.joiningDate}
                    onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="form-select"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="ON_LEAVE">ON LEAVE</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
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
                  Save Employee Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Employee Detail Modal */}
      {isDetailOpen && selectedEmployee && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '500px', width: '100%', padding: '26px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Personnel Card</h2>
              <button
                onClick={() => setIsDetailOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '12px',
                background: getAvatarGradient(`${selectedEmployee.firstName} ${selectedEmployee.lastName}`),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                fontWeight: 800,
                color: '#fff',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)'
              }}>
                {selectedEmployee.firstName?.[0]}{selectedEmployee.lastName?.[0]}
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  {selectedEmployee.firstName} {selectedEmployee.lastName}
                </h3>
                <span style={{ fontFamily: 'monospace', color: '#6366f1', fontSize: '0.82rem', fontWeight: 600 }}>
                  {selectedEmployee.employeeCode || selectedEmployee.code}
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '0.88rem' }}>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</span>
                <div style={{ color: '#0f172a', marginTop: '3px', wordBreak: 'break-all', fontWeight: 500 }}>{selectedEmployee.email}</div>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</span>
                <div style={{ marginTop: '3px' }}>
                  <span className="badge badge-success">● {selectedEmployee.employmentStatus || selectedEmployee.status || 'ACTIVE'}</span>
                </div>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Department</span>
                <div style={{ color: '#0f172a', marginTop: '3px', fontWeight: 500 }}>{selectedEmployee.department?.name || 'Engineering'}</div>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Job Title</span>
                <div style={{ color: '#0f172a', marginTop: '3px', fontWeight: 500 }}>{selectedEmployee.jobPosition?.title || 'Staff'}</div>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Start Date</span>
                <div style={{ color: '#0f172a', marginTop: '3px', fontWeight: 500 }}>
                  {selectedEmployee.joiningDate ? new Date(selectedEmployee.joiningDate).toLocaleDateString() : 'N/A'}
                </div>
              </div>
            </div>

            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <button
                onClick={() => setIsDetailOpen(false)}
                className="btn btn-secondary"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
