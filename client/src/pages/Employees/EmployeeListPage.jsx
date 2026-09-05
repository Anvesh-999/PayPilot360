import { useState, useEffect } from 'react';
import DataTable from '../../components/Common/DataTable';
import { Plus, User, Mail, Building, Briefcase, Eye, Edit, CheckCircle, X, Search, Filter } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function EmployeeListPage() {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
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
      setEmployees(data.data || []);
    } catch (err) {
      // Demo mock data if server not ready
      setEmployees([
        { id: '1', code: 'EMP-0001', firstName: 'John', lastName: 'Doe', email: 'john.doe@peoplepay360.com', department: { name: 'Engineering' }, jobPosition: { title: 'Lead Architect' }, status: 'ACTIVE', joiningDate: '2023-01-15' },
        { id: '2', code: 'EMP-0002', firstName: 'Jane', lastName: 'Smith', email: 'jane.smith@peoplepay360.com', department: { name: 'Product' }, jobPosition: { title: 'Product Director' }, status: 'ACTIVE', joiningDate: '2023-03-01' },
        { id: '3', code: 'EMP-0003', firstName: 'Michael', lastName: 'Brown', email: 'michael.b@peoplepay360.com', department: { name: 'Sales' }, jobPosition: { title: 'Account Executive' }, status: 'ACTIVE', joiningDate: '2023-06-10' },
        { id: '4', code: 'EMP-0004', firstName: 'Sarah', lastName: 'Connor', email: 'sarah.c@peoplepay360.com', department: { name: 'Operations' }, jobPosition: { title: 'HR Specialist' }, status: 'ON_LEAVE', joiningDate: '2024-02-01' },
        { id: '5', code: 'EMP-0005', firstName: 'David', lastName: 'Miller', email: 'david.m@peoplepay360.com', department: { name: 'Finance' }, jobPosition: { title: 'Senior Accountant' }, status: 'ACTIVE', joiningDate: '2024-04-15' },
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
      setDepartments(deptRes.data.data || []);
      setPositions(posRes.data.data || []);
    } catch (e) {
      setDepartments([
        { id: 'd1', name: 'Engineering' },
        { id: 'd2', name: 'Product' },
        { id: 'd3', name: 'Sales' },
        { id: 'd4', name: 'Operations' },
        { id: 'd5', name: 'Finance' },
      ]);
      setPositions([
        { id: 'p1', title: 'Lead Architect' },
        { id: 'p2', title: 'Product Director' },
        { id: 'p3', title: 'Senior Accountant' },
        { id: 'p4', title: 'HR Specialist' },
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
      toast.success('Employee created successfully');
      setIsModalOpen(false);
      fetchEmployees();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to create employee');
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Employee',
      sortable: true,
      render: (_, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #14b8a6, #3b82f6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 700,
            fontSize: '13px'
          }}>
            {row.firstName?.[0]}{row.lastName?.[0]}
          </div>
          <div>
            <div style={{ fontWeight: 600, color: '#ffffff' }}>{row.firstName} {row.lastName}</div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{row.email}</div>
          </div>
        </div>
      )
    },
    {
      key: 'code',
      label: 'Employee Code',
      sortable: true,
      render: (val) => <span style={{ fontFamily: 'monospace', color: '#38bdf8' }}>{val}</span>
    },
    {
      key: 'department',
      label: 'Department',
      sortable: true,
      render: (val, row) => row.department?.name || 'General'
    },
    {
      key: 'jobPosition',
      label: 'Job Title',
      sortable: true,
      render: (val, row) => row.jobPosition?.title || 'Staff'
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (val) => {
        let cls = 'badge-success';
        if (val === 'ON_LEAVE') cls = 'badge-warning';
        if (val === 'TERMINATED' || val === 'SUSPENDED') cls = 'badge-danger';
        return <span className={`badge ${cls}`}>{val}</span>;
      }
    },
    {
      key: 'joiningDate',
      label: 'Joined',
      sortable: true,
      render: (val) => val ? new Date(val).toLocaleDateString() : '—'
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => { setSelectedEmployee(row); setIsDetailOpen(true); }}
            style={{
              padding: '6px',
              borderRadius: '6px',
              background: 'rgba(20, 184, 166, 0.12)',
              border: '1px solid rgba(20, 184, 166, 0.3)',
              color: '#14b8a6',
              cursor: 'pointer'
            }}
            title="View Details"
          >
            <Eye size={15} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#ffffff' }}>
            Employees Directory
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginTop: '4px' }}>
            Manage staff profiles, contracts, compensation, and organizational hierarchy.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Plus size={16} />
          <span>New Employee</span>
        </button>
      </div>

      {/* Main Table */}
      <DataTable
        columns={columns}
        data={employees}
        searchPlaceholder="Search employees by name, code, or email..."
      />

      {/* Create Employee Modal */}
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
          <div className="card" style={{ maxWidth: '580px', width: '100%', padding: '28px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#ffffff' }}>Add New Employee</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateEmployee} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '6px' }}>First Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    style={{ width: '100%', padding: '10px', backgroundColor: '#0f1219', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '6px' }}>Last Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    style={{ width: '100%', padding: '10px', backgroundColor: '#0f1219', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '6px' }}>Work Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    style={{ width: '100%', padding: '10px', backgroundColor: '#0f1219', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '6px' }}>Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1 (555) 000-0000"
                    style={{ width: '100%', padding: '10px', backgroundColor: '#0f1219', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '6px' }}>Department</label>
                  <select
                    value={formData.departmentId}
                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                    style={{ width: '100%', padding: '10px', backgroundColor: '#0f1219', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                  >
                    <option value="">Select Department...</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '6px' }}>Job Position</label>
                  <select
                    value={formData.jobPositionId}
                    onChange={(e) => setFormData({ ...formData, jobPositionId: e.target.value })}
                    style={{ width: '100%', padding: '10px', backgroundColor: '#0f1219', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
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
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '6px' }}>Joining Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.joiningDate}
                    onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                    style={{ width: '100%', padding: '10px', backgroundColor: '#0f1219', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '6px' }}>Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    style={{ width: '100%', padding: '10px', backgroundColor: '#0f1219', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="ON_LEAVE">ON LEAVE</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                  </select>
                </div>
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
                  Save Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Employee Detail Slideover/Modal */}
      {isDetailOpen && selectedEmployee && (
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
          <div className="card" style={{ maxWidth: '520px', width: '100%', padding: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff' }}>Employee Profile</h2>
              <button
                onClick={() => setIsDetailOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #14b8a6, #6366f1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                fontWeight: 700,
                color: '#fff'
              }}>
                {selectedEmployee.firstName?.[0]}{selectedEmployee.lastName?.[0]}
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#fff', margin: 0 }}>
                  {selectedEmployee.firstName} {selectedEmployee.lastName}
                </h3>
                <span style={{ fontFamily: 'monospace', color: '#38bdf8', fontSize: '0.85rem' }}>
                  {selectedEmployee.code}
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '0.875rem' }}>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase' }}>Email</span>
                <div style={{ color: '#e2e8f0', marginTop: '2px' }}>{selectedEmployee.email}</div>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase' }}>Status</span>
                <div style={{ marginTop: '2px' }}>
                  <span className="badge badge-success">{selectedEmployee.status}</span>
                </div>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase' }}>Department</span>
                <div style={{ color: '#e2e8f0', marginTop: '2px' }}>{selectedEmployee.department?.name || 'Engineering'}</div>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase' }}>Job Title</span>
                <div style={{ color: '#e2e8f0', marginTop: '2px' }}>{selectedEmployee.jobPosition?.title || 'Staff'}</div>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase' }}>Joining Date</span>
                <div style={{ color: '#e2e8f0', marginTop: '2px' }}>
                  {selectedEmployee.joiningDate ? new Date(selectedEmployee.joiningDate).toLocaleDateString() : 'N/A'}
                </div>
              </div>
            </div>

            <div style={{ marginTop: '28px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setIsDetailOpen(false)}
                className="btn btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
