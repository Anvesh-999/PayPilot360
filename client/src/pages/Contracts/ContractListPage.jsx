import { useState, useEffect } from 'react';
import DataTable from '../../components/Common/DataTable';
import { Plus, FileText, CheckCircle2, AlertCircle, X, DollarSign, Trash2 } from 'lucide-react';
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
      const contractsList = contRes.data.data?.items || (Array.isArray(contRes.data.data) ? contRes.data.data : []);
      const empsList = empRes.data.data?.items || (Array.isArray(empRes.data.data) ? empRes.data.data : []);
      const structsList = Array.isArray(structRes.data.data) ? structRes.data.data : (structRes.data.data?.items || []);
      setContracts(contractsList);
      setEmployees(empsList);
      setStructures(structsList);
    } catch (err) {
      toast.error('Failed to load contract records from database');
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
      toast.success('Contract created successfully');
      setIsModalOpen(false);
      setFormData({
        employeeId: '',
        salaryStructureId: '',
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

  const columns = [
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
          ${parseFloat(row.basicWage || val || 0).toLocaleString()} / {(row.wageType || 'MONTHLY').toLowerCase()}
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
          {val}
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
        background: 'linear-gradient(135deg, #ffffff 0%, #f0f9ff 50%, #eff6ff 100%)',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Employment Contracts
            </h1>
            <span className="badge badge-cyan">{contracts.length} Agreements Active</span>
          </div>
          <p style={{ color: '#475569', fontSize: '0.88rem', marginTop: '4px' }}>
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
        loading={loading}
        searchPlaceholder="Search contracts by employee name or code..."
      />

      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '520px', width: '100%', padding: '26px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Add Employment Contract</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateContract} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Employee *</label>
                <select
                  required
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                  className="form-select"
                >
                  <option value="">Select Employee...</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.employeeCode || e.code || 'EMP'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Salary Structure</label>
                <select
                  value={formData.salaryStructureId}
                  onChange={(e) => setFormData({ ...formData, salaryStructureId: e.target.value })}
                  className="form-select"
                >
                  <option value="">Select Salary Structure...</option>
                  {structures.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Base Wage ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 7500"
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
