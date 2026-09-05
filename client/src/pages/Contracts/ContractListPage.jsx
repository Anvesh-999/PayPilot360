import { useState, useEffect } from 'react';
import DataTable from '../../components/Common/DataTable';
import { Plus, FileText, CheckCircle2, AlertCircle, X, DollarSign } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function ContractListPage() {
  const [contracts, setContracts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [structures, setStructures] = useState([]);
  const [loading, setLoading] = useState(true);
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

  const fetchData = async () => {
    setLoading(true);
    try {
      const [contRes, empRes, structRes] = await Promise.all([
        api.get('/contracts'),
        api.get('/employees'),
        api.get('/salary/structures')
      ]);
      setContracts(contRes.data.data || []);
      setEmployees(empRes.data.data || []);
      setStructures(structRes.data.data || []);
    } catch (err) {
      // Mock contracts for demo
      setContracts([
        { id: 'c1', employee: { firstName: 'John', lastName: 'Doe', code: 'EMP-0001' }, salaryStructure: { name: 'Standard Full-Time (Exempt)' }, baseSalary: 8500, wageType: 'MONTHLY', startDate: '2023-01-15', status: 'ACTIVE' },
        { id: 'c2', employee: { firstName: 'Jane', lastName: 'Smith', code: 'EMP-0002' }, salaryStructure: { name: 'Executive Package' }, baseSalary: 11000, wageType: 'MONTHLY', startDate: '2023-03-01', status: 'ACTIVE' },
        { id: 'c3', employee: { firstName: 'Michael', lastName: 'Brown', code: 'EMP-0003' }, salaryStructure: { name: 'Sales Commission Tier 1' }, baseSalary: 6200, wageType: 'MONTHLY', startDate: '2023-06-10', status: 'ACTIVE' },
      ]);
      setEmployees([
        { id: '1', firstName: 'John', lastName: 'Doe', code: 'EMP-0001' },
        { id: '2', firstName: 'Jane', lastName: 'Smith', code: 'EMP-0002' },
      ]);
      setStructures([
        { id: 's1', name: 'Standard Full-Time (Exempt)' },
        { id: 's2', name: 'Executive Package' },
        { id: 's3', name: 'Sales Commission Tier 1' },
      ]);
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
        endDate: formData.endDate || null,
      });
      toast.success('Contract created successfully');
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to create contract');
    }
  };

  const columns = [
    {
      key: 'employee',
      label: 'Employee',
      sortable: true,
      render: (_, row) => (
        <div>
          <div style={{ fontWeight: 600, color: '#ffffff' }}>{row.employee?.firstName} {row.employee?.lastName}</div>
          <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#38bdf8' }}>{row.employee?.code}</div>
        </div>
      )
    },
    {
      key: 'salaryStructure',
      label: 'Salary Structure',
      sortable: true,
      render: (val, row) => row.salaryStructure?.name || 'Default Structure'
    },
    {
      key: 'baseSalary',
      label: 'Base Wage',
      sortable: true,
      render: (val, row) => (
        <span style={{ fontWeight: 600, color: '#10b981' }}>
          ${parseFloat(val || 0).toLocaleString()} / {row.wageType?.toLowerCase()}
        </span>
      )
    },
    {
      key: 'startDate',
      label: 'Effective Range',
      render: (_, row) => (
        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
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
          {val}
        </span>
      )
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#ffffff' }}>
            Employment Contracts
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginTop: '4px' }}>
            Define wage terms, linked salary structures, and contractual timelines per employee.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Plus size={16} />
          <span>New Contract</span>
        </button>
      </div>

      <DataTable
        columns={columns}
        data={contracts}
        searchPlaceholder="Search contracts by employee name or code..."
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
          <div className="card" style={{ maxWidth: '520px', width: '100%', padding: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#ffffff' }}>Add Employment Contract</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateContract} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '6px' }}>Employee *</label>
                <select
                  required
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                  style={{ width: '100%', padding: '10px', backgroundColor: '#0f1219', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                >
                  <option value="">Select Employee...</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '6px' }}>Salary Structure *</label>
                <select
                  required
                  value={formData.salaryStructureId}
                  onChange={(e) => setFormData({ ...formData, salaryStructureId: e.target.value })}
                  style={{ width: '100%', padding: '10px', backgroundColor: '#0f1219', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                >
                  <option value="">Select Salary Structure...</option>
                  {structures.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '6px' }}>Base Wage ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 7500"
                    value={formData.baseSalary}
                    onChange={(e) => setFormData({ ...formData, baseSalary: e.target.value })}
                    style={{ width: '100%', padding: '10px', backgroundColor: '#0f1219', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '6px' }}>Wage Period</label>
                  <select
                    value={formData.wageType}
                    onChange={(e) => setFormData({ ...formData, wageType: e.target.value })}
                    style={{ width: '100%', padding: '10px', backgroundColor: '#0f1219', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="HOURLY">Hourly</option>
                  </select>
                </div>
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
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '6px' }}>End Date (Optional)</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    style={{ width: '100%', padding: '10px', backgroundColor: '#0f1219', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                  />
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
                  Create Contract
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
