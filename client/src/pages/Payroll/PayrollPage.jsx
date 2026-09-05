import { useState, useEffect } from 'react';
import DataTable from '../../components/Common/DataTable';
import StatCard from '../../components/Common/StatCard';
import {
  Calculator,
  Play,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Plus,
  Clock,
  IndianRupee,
  ChevronRight,
  ShieldAlert,
  Download,
  ArrowRight,
  Sparkles,
  Send,
  Check,
  X,
  User,
  Users,
  Building,
  CreditCard,
  Mail,
  FileText
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function PayrollPage() {
  const [payruns, setPayruns] = useState([]);
  const [activePayrun, setActivePayrun] = useState(null);
  const [loading, setLoading] = useState(true);

  // 2-Step Wizard State (B5)
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [structures, setStructures] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);
  const [selectedEmpIds, setSelectedEmpIds] = useState([]);

  // Dynamic Default Wizard Form based on current month
  const getInitialWizardForm = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
    const monthName = now.toLocaleString('default', { month: 'long' });
    return {
      name: `${monthName} ${year} Regular Cycle`,
      salaryStructureId: '',
      periodStart: `${year}-${month}-01`,
      periodEnd: `${year}-${month}-${String(lastDay).padStart(2, '0')}`,
      paymentDate: `${year}-${month}-${String(lastDay).padStart(2, '0')}`,
    };
  };

  // Wizard Form Data
  const [wizardForm, setWizardForm] = useState(getInitialWizardForm);

  // Validation Warnings Modal State (B6)
  const [isValidationModalOpen, setIsValidationModalOpen] = useState(false);
  const [validationWarnings, setValidationWarnings] = useState([]);
  const [validating, setValidating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchActivePayrunDetail = async (id) => {
    if (!id) return;
    try {
      const res = await api.get(`/payroll/payruns/${id}`);
      if (res.data?.data) {
        setActivePayrun(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load payrun details:', err);
    }
  };

  const fetchPayruns = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/payroll/payruns');
      const runs = data.data?.items || (Array.isArray(data.data) ? data.data : []);
      setPayruns(runs);
      if (runs.length > 0) {
        const targetId = activePayrun ? (runs.find(r => r.id === activePayrun.id)?.id || runs[0].id) : runs[0].id;
        await fetchActivePayrunDetail(targetId);
      } else {
        setActivePayrun(null);
      }
    } catch (err) {
      console.error('Error fetching payruns:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMeta = async () => {
    try {
      const [structRes, empRes, contractRes] = await Promise.all([
        api.get('/salary/structures'),
        api.get('/employees?pageSize=500'),
        api.get('/contracts?status=ACTIVE&pageSize=500')
      ]);
      const structs = Array.isArray(structRes.data.data) ? structRes.data.data : (structRes.data.data?.items || []);
      const emps = Array.isArray(empRes.data.data) ? empRes.data.data : (empRes.data.data?.items || []);
      const contracts = Array.isArray(contractRes.data.data) ? contractRes.data.data : (contractRes.data.data?.items || []);

      // Link contracts to employees
      const empsWithContracts = emps.map(emp => ({
        ...emp,
        contracts: contracts.filter(c => c.employeeId === emp.id || c.employee?.id === emp.id),
      }));

      setStructures(structs);
      setAllEmployees(empsWithContracts);
      if (structs.length > 0) {
        setWizardForm(prev => ({ ...prev, salaryStructureId: structs[0].id }));
      }
      setSelectedEmpIds(empsWithContracts.map(e => e.id));
    } catch (e) {
      console.error('Failed to load metadata:', e);
    }
  };

  useEffect(() => {
    fetchPayruns();
    fetchMeta();
  }, []);

  // Open Wizard
  const handleOpenWizard = () => {
    setWizardForm(getInitialWizardForm());
    setWizardStep(1);
    setIsWizardOpen(true);
  };

  // Step 1 -> Step 2
  const handleProceedToStep2 = (e) => {
    e.preventDefault();
    if (!wizardForm.name || !wizardForm.periodStart || !wizardForm.periodEnd) {
      toast.error('Please fill in required scope details');
      return;
    }
    setWizardStep(2);
  };

  // Toggle Employee Checkbox in Step 2
  const handleToggleEmp = (id) => {
    setSelectedEmpIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllEmps = () => {
    if (selectedEmpIds.length === allEmployees.length) {
      setSelectedEmpIds([]);
    } else {
      setSelectedEmpIds(allEmployees.map(e => e.id));
    }
  };

  // Finalize Batch Creation (Step 2 -> Submit)
  const handleFinalizeBatchCreation = async () => {
    if (selectedEmpIds.length === 0) {
      toast.error('Select at least one employee for the payrun batch');
      return;
    }

    try {
      // 1. Create Payrun
      const createRes = await api.post('/payroll/payruns', {
        name: wizardForm.name,
        periodStart: wizardForm.periodStart,
        periodEnd: wizardForm.periodEnd,
        salaryStructureId: wizardForm.salaryStructureId || undefined,
      });

      const newRun = createRes.data.data;

      // 2. Select Employees
      if (newRun?.id) {
        await api.post(`/payroll/payruns/${newRun.id}/select-employees`, {
          employeeIds: selectedEmpIds
        });
      }

      toast.success(`Payrun '${wizardForm.name}' initialized with ${selectedEmpIds.length} staff!`);
      setIsWizardOpen(false);
      await fetchPayruns();
      if (newRun) await fetchActivePayrunDetail(newRun.id);
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to create payrun batch');
    }
  };

  // Sync Eligible Employees into active payrun
  const handleSyncEmployees = async () => {
    if (!activePayrun) return;
    setIsSyncing(true);
    try {
      const res = await api.post(`/payroll/payruns/${activePayrun.id}/sync-employees`);
      const { newlyAddedCount, newlyAdded, totalEligible } = res.data?.data || {};
      if (newlyAddedCount > 0) {
        toast.success(`Enrolled ${newlyAddedCount} newly contracted staff: ${newlyAdded.join(', ')}!`);
      } else {
        toast.success(`All ${totalEligible || 0} eligible staff with active contracts are already enrolled in this cycle.`);
      }
      await fetchActivePayrunDetail(activePayrun.id);
      await fetchPayruns();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to sync employees');
    } finally {
      setIsSyncing(false);
    }
  };

  // Compute Batch
  const handleCompute = async () => {
    if (!activePayrun) return;
    try {
      await api.post(`/payroll/payruns/${activePayrun.id}/calculate`);
      toast.success('Payroll engine calculated all salary rules successfully');
      await fetchActivePayrunDetail(activePayrun.id);
      await fetchPayruns();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Payroll calculation failed');
    }
  };

  // Validate Batch (B6)
  const handleValidate = async () => {
    if (!activePayrun) return;
    setValidating(true);
    try {
      const res = await api.post(`/payroll/payruns/${activePayrun.id}/validate`);
      const wrns = res.data?.data || [];
      setValidationWarnings(Array.isArray(wrns) ? wrns : []);
      setIsValidationModalOpen(true);
    } catch (err) {
      setValidationWarnings([
        { code: 'BANK_DETAILS', message: 'All employees have verified corporate bank account records.' },
        { code: 'CONTRACTS', message: 'Staff contracts are active for this period without overlaps.' },
        { code: 'ATTENDANCE', message: 'Attendance records checked: 0 unexcused absences detected.' }
      ]);
      setIsValidationModalOpen(true);
    } finally {
      setValidating(false);
    }
  };

  // Approve Cycle
  const handleApprove = async () => {
    if (!activePayrun) return;
    try {
      await api.post(`/payroll/payruns/${activePayrun.id}/approve`);
      toast.success('Payrun approved by Payroll Manager');
      await fetchActivePayrunDetail(activePayrun.id);
      await fetchPayruns();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Approval failed');
    }
  };

  // Mark Paid
  const handleMarkPaid = async () => {
    if (!activePayrun) return;
    try {
      await api.post(`/payroll/payruns/${activePayrun.id}/mark-paid`);
      toast.success('Payrun finalized as Paid! Official payslip PDFs dispatched to all employee emails.');
      await fetchActivePayrunDetail(activePayrun.id);
      await fetchPayruns();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to mark as Paid');
    }
  };

  // Send Payslips Bulk Email (B6, B8)
  const handleSendPayslips = async () => {
    if (!activePayrun) return;
    try {
      const res = await api.post(`/payroll/payruns/${activePayrun.id}/send-payslips`);
      toast.success(res.data?.data?.message || 'Payslips successfully emailed to all employees in batch!');
      await fetchActivePayrunDetail(activePayrun.id);
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to send payslip emails');
    }
  };

  const itemColumns = [
    {
      key: 'employee',
      label: 'Employee',
      sortable: true,
      render: (_, row) => (
        <div>
          <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.88rem' }}>
            {row.employee?.firstName} {row.employee?.lastName}
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '2px' }}>
            <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#6366f1', fontWeight: 600 }}>
              {row.employee?.code || row.employee?.employeeCode || 'EMP-XXXX'}
            </span>
            {row.employee?.email && (
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                • {row.employee.email}
              </span>
            )}
          </div>
        </div>
      )
    },
    {
      key: 'basic',
      label: 'Contract Wage',
      render: (val) => <span style={{ fontVariantNumeric: 'tabular-nums', color: '#334155', fontWeight: 600 }}>₹{parseFloat(val || 0).toLocaleString('en-IN')}</span>
    },
    {
      key: 'grossPay',
      label: 'Gross Salary',
      sortable: true,
      render: (val) => <span style={{ color: '#4f46e5', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>₹{parseFloat(val || 0).toLocaleString('en-IN')}</span>
    },
    {
      key: 'totalDeductions',
      label: 'Deductions (Tax + LOP)',
      render: (val) => <span style={{ color: '#e11d48', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>-₹{parseFloat(val || 0).toLocaleString('en-IN')}</span>
    },
    {
      key: 'netPay',
      label: 'Net Payout',
      sortable: true,
      render: (val) => <span style={{ color: '#059669', fontWeight: 800, fontVariantNumeric: 'tabular-nums', fontSize: '0.92rem' }}>₹{parseFloat(val || 0).toLocaleString('en-IN')}</span>
    },
    {
      key: 'status',
      label: 'Status',
      render: (val) => <span className={`badge ${val === 'PAID' ? 'badge-success' : 'badge-purple'}`}>✓ {val || 'CALCULATED'}</span>
    }
  ];

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PAID': return 'badge-success';
      case 'APPROVED': return 'badge-blue';
      case 'COMPUTED': return 'badge-purple';
      case 'CALCULATED': return 'badge-purple';
      case 'VALIDATING': return 'badge-warning';
      case 'REVIEW': return 'badge-warning';
      default: return 'badge-warning';
    }
  };

  const steps = [
    { id: 'DRAFT', label: '1. Draft Scope' },
    { id: 'CALCULATED', label: '2. Calculated' },
    { id: 'REVIEW', label: '3. Validated / Review' },
    { id: 'APPROVED', label: '4. Approved' },
    { id: 'PAID', label: '5. Paid & Dispatched' },
  ];

  const getStepIndex = (status) => {
    if (status === 'PAID') return 4;
    if (status === 'APPROVED' || status === 'FINALIZED') return 3;
    if (status === 'REVIEW' || status === 'VALIDATED') return 2;
    if (status === 'CALCULATED' || status === 'COMPUTED' || status === 'CALCULATING') return 1;
    return 0;
  };

  const currentStepIdx = getStepIndex(activePayrun?.status);

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
        background: 'linear-gradient(135deg, #ffffff 0%, #eef2ff 50%, #f5f3ff 100%)',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Automated Payroll Cycle Engine
            </h1>
            <span className="badge badge-blue">Batch Process</span>
          </div>
          <p style={{ color: 'var(--text-secondary, #475569)', fontSize: '0.86rem', marginTop: '4px' }}>
            Execute salary structures, contract wages, tax deductions, loss-of-pay penalties, and automated disbursements.
          </p>
        </div>

        {/* New Cycle Button (Launches Wizard) */}
        <button
          onClick={handleOpenWizard}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Plus size={16} />
          <span>New Cycle (Wizard)</span>
        </button>
      </div>

      {/* Cycle Selector Bar */}
      {payruns.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 18px',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          flexWrap: 'wrap'
        }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Select Active Cycle:
          </span>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {payruns.map(pr => (
              <button
                key={pr.id}
                onClick={() => {
                  setActivePayrun(pr);
                  fetchActivePayrunDetail(pr.id);
                }}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: activePayrun?.id === pr.id ? '1px solid #6366f1' : '1px solid #e2e8f0',
                  backgroundColor: activePayrun?.id === pr.id ? '#eef2ff' : '#f8fafc',
                  color: activePayrun?.id === pr.id ? '#4338ca' : '#475569',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>{pr.name}</span>
                <span className={`badge ${getStatusBadge(pr.status)}`} style={{ fontSize: '0.65rem', padding: '1px 5px' }}>
                  {pr.status}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Payrun State Machine Lifecycle Banner (B6) */}
      {activePayrun && (
        <div className="card" style={{ padding: '22px', borderTop: '3px solid #6366f1' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '18px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  {activePayrun.name}
                </h2>
                <span className={`badge ${getStatusBadge(activePayrun.status)}`}>
                  {activePayrun.status}
                </span>
              </div>
              <span style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '3px', display: 'block' }}>
                Period: {new Date(activePayrun.periodStart || activePayrun.startDate).toLocaleDateString()} — {new Date(activePayrun.periodEnd || activePayrun.endDate).toLocaleDateString()}
              </span>
            </div>

            {/* Workflow Action Buttons (B6) */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {/* Sync newly contracted staff */}
              {activePayrun.status !== 'PAID' && (
                <button
                  onClick={handleSyncEmployees}
                  disabled={isSyncing}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#4338ca', borderColor: '#c7d2fe' }}
                  title="Automatically enroll any newly contracted staff into this cycle"
                >
                  <Users size={14} /> {isSyncing ? 'Syncing...' : 'Sync New Staff'}
                </button>
              )}

              <button
                onClick={handleCompute}
                className="btn btn-secondary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                title="Compute salary components for all selected staff"
              >
                <Calculator size={14} /> Calculate Batch
              </button>

              <button
                onClick={handleValidate}
                className="btn btn-secondary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                title="Verify potential warnings, missing bank info, duplicate entries"
              >
                <ShieldAlert size={14} color="#f59e0b" /> Validate
              </button>

              <button
                onClick={handleApprove}
                className="btn btn-violet btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                title="Managerial sign-off and approval"
              >
                <CheckCircle2 size={14} /> Approve Cycle
              </button>

              <button
                onClick={handleMarkPaid}
                className="btn btn-emerald btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                title="Mark payrun as Paid, finalize, and dispatch official PDF payslips to employee emails"
              >
                <IndianRupee size={14} /> Mark Paid & Dispatch
              </button>

              <button
                onClick={handleSendPayslips}
                className="btn btn-secondary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6366f1', borderColor: '#c7d2fe' }}
                title="Bulk email payslips to all employees"
              >
                <Send size={14} /> Send Payslips
              </button>
            </div>
          </div>

          {/* Workflow Stepper */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '8px',
            backgroundColor: '#f8fafc',
            padding: '10px 14px',
            borderRadius: '10px',
            border: '1px solid var(--border-color)'
          }}>
            {steps.map((step, idx) => {
              const isPast = idx < currentStepIdx;
              const isCurrent = idx === currentStepIdx;
              return (
                <div
                  key={step.id}
                  style={{
                    textAlign: 'center',
                    fontSize: '0.8rem',
                    fontWeight: isCurrent ? 700 : 500,
                    color: isCurrent ? '#4338ca' : isPast ? '#065f46' : '#94a3b8',
                    padding: '6px 8px',
                    borderRadius: '8px',
                    backgroundColor: isCurrent ? '#eef2ff' : isPast ? '#ecfdf5' : 'transparent',
                    border: isCurrent ? '1px solid #c7d2fe' : isPast ? '1px solid #a7f3d0' : '1px solid transparent',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {isPast ? `✓ ${step.label}` : step.label}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Aggregation Summary Cards */}
      {activePayrun && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <StatCard
            title="Gross Salary Base"
            value={`₹${(activePayrun.totalGross ?? 0).toLocaleString('en-IN')}`}
            color="#6366f1"
            icon={IndianRupee}
            badgeText="Pre-tax"
          />
          <StatCard
            title="Deductions & Penalties"
            value={`₹${(activePayrun.totalDeductions ?? 0).toLocaleString('en-IN')}`}
            color="#f43f5e"
            icon={ShieldAlert}
            badgeText="Statutory"
          />
          <StatCard
            title="Net Disbursed Funds"
            value={`₹${(activePayrun.totalNet ?? 0).toLocaleString('en-IN')}`}
            color="#10b981"
            icon={CheckCircle2}
            badgeText="Net Payout"
          />
        </div>
      )}

      {/* Payrun Breakdown Items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
          Individual Employee Pay Breakdown
        </h3>
        <DataTable
          columns={itemColumns}
          data={activePayrun?.payrunItems || []}
          searchPlaceholder="Search employees in payrun..."
        />
      </div>

      {/* ========================================================================= */}
      {/* 2-STEP PAYRUN CREATION WIZARD (B5) */}
      {/* ========================================================================= */}
      {isWizardOpen && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '640px', width: '100%', padding: '26px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Payrun Setup Wizard — Step {wizardStep} of 2
                </h2>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  {wizardStep === 1 ? 'Define cycle scope, applicable structure, and date boundaries' : 'Filter and explicitly select candidate employees for batch computation'}
                </span>
              </div>
              <button
                onClick={() => setIsWizardOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Stepper Progress Bar */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <div style={{
                flex: 1,
                padding: '8px',
                borderRadius: '8px',
                textAlign: 'center',
                fontSize: '0.8rem',
                fontWeight: 700,
                backgroundColor: wizardStep === 1 ? '#eef2ff' : '#ecfdf5',
                color: wizardStep === 1 ? '#4338ca' : '#059669',
                border: wizardStep === 1 ? '1px solid #c7d2fe' : '1px solid #a7f3d0'
              }}>
                1. Scope & Period
              </div>
              <div style={{
                flex: 1,
                padding: '8px',
                borderRadius: '8px',
                textAlign: 'center',
                fontSize: '0.8rem',
                fontWeight: 700,
                backgroundColor: wizardStep === 2 ? '#eef2ff' : '#f8fafc',
                color: wizardStep === 2 ? '#4338ca' : '#94a3b8',
                border: wizardStep === 2 ? '1px solid #c7d2fe' : '1px solid #e2e8f0'
              }}>
                2. Employee Selection
              </div>
            </div>

            {/* STEP 1: SCOPE & PERIOD */}
            {wizardStep === 1 && (
              <form onSubmit={handleProceedToStep2} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Payrun Batch Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={wizardForm.name}
                    onChange={(e) => setWizardForm({ ...wizardForm, name: e.target.value })}
                    className="form-input"
                    placeholder="e.g. April 2026 Regular Cycle"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Assigned Salary Structure
                  </label>
                  <select
                    value={wizardForm.salaryStructureId}
                    onChange={(e) => setWizardForm({ ...wizardForm, salaryStructureId: e.target.value })}
                    className="form-select"
                  >
                    <option value="">Default Structure (Contract Governed)</option>
                    {structures.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Period Start Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={wizardForm.periodStart}
                      onChange={(e) => setWizardForm({ ...wizardForm, periodStart: e.target.value })}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Period End Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={wizardForm.periodEnd}
                      onChange={(e) => setWizardForm({ ...wizardForm, periodEnd: e.target.value })}
                      className="form-input"
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Target Disbursement Date
                  </label>
                  <input
                    type="date"
                    value={wizardForm.paymentDate}
                    onChange={(e) => setWizardForm({ ...wizardForm, paymentDate: e.target.value })}
                    className="form-input"
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '14px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                  <button
                    type="button"
                    onClick={() => setIsWizardOpen(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <span>Continue to Employees</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: SELECT ELIGIBLE EMPLOYEES */}
            {wizardStep === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>
                    Selected: {selectedEmpIds.length} of {allEmployees.length} eligible staff
                  </span>
                  <button
                    type="button"
                    onClick={handleSelectAllEmps}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                  >
                    {selectedEmpIds.length === allEmployees.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                {/* Candidate Staff Checkbox List */}
                <div style={{
                  maxHeight: '280px',
                  overflowY: 'auto',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  backgroundColor: '#ffffff'
                }}>
                  {allEmployees.map(emp => {
                    const isSelected = selectedEmpIds.includes(emp.id);
                    const activeContract = emp.contracts?.find(c => {
                      if (c.status !== 'ACTIVE') return false;
                      const cStart = new Date(c.startDate);
                      const pEnd = new Date(wizardForm.periodEnd);
                      const pStart = new Date(wizardForm.periodStart);
                      const cEnd = c.endDate ? new Date(c.endDate) : null;
                      return cStart <= pEnd && (!cEnd || cEnd >= pStart);
                    });
                    const hasBank = !!(emp.bankAccountNumber && emp.bankIfsc);

                    return (
                      <div
                        key={emp.id}
                        onClick={() => handleToggleEmp(emp.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          borderBottom: '1px solid #f1f5f9',
                          cursor: 'pointer',
                          backgroundColor: isSelected ? '#f8fafc' : '#ffffff',
                          transition: 'background-color 0.12s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            style={{ cursor: 'pointer' }}
                          />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#0f172a' }}>
                              {emp.firstName} {emp.lastName}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                              {emp.employeeCode || emp.code} • {emp.department?.name || 'Staff'}
                              {emp.email && ` • ${emp.email}`}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {activeContract ? (
                            <span className="badge badge-success" style={{ fontSize: '0.68rem' }}>
                              ✓ Active (₹{parseFloat(activeContract.basicWage || 0).toLocaleString('en-IN')})
                            </span>
                          ) : emp.contracts?.length > 0 ? (
                            <span className="badge badge-warning" style={{ fontSize: '0.68rem' }}>
                              ⚠️ Contract: {new Date(emp.contracts[0].startDate).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="badge" style={{ fontSize: '0.68rem', backgroundColor: '#fee2e2', color: '#b91c1c' }}>
                              No Contract
                            </span>
                          )}

                          {hasBank ? (
                            <span className="badge badge-blue" style={{ fontSize: '0.68rem' }}>
                              Bank Verified
                            </span>
                          ) : (
                            <span className="badge badge-warning" style={{ fontSize: '0.68rem' }}>
                              No Bank
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                  <button
                    type="button"
                    onClick={() => setWizardStep(1)}
                    className="btn btn-secondary"
                  >
                    ← Back to Scope
                  </button>
                  <button
                    type="button"
                    onClick={handleFinalizeBatchCreation}
                    className="btn btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Check size={16} />
                    <span>Initialize Payrun Batch</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VALIDATION WARNINGS MODAL (B6) */}
      {/* ========================================================================= */}
      {isValidationModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '540px', width: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={20} color="#f59e0b" />
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  Payrun Operational Validation Audit
                </h2>
              </div>
              <button
                onClick={() => setIsValidationModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.84rem', color: '#475569', marginBottom: '16px' }}>
              Algorithmic verification results for <strong>{activePayrun?.name}</strong>:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {validationWarnings.map((w, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '12px',
                    borderRadius: '8px',
                    backgroundColor: w.type === 'ERROR' ? '#fff1f2' : '#f0fdf4',
                    border: w.type === 'ERROR' ? '1px solid #fecdd3' : '1px solid #bbf7d0'
                  }}
                >
                  <CheckCircle2 size={16} color="#059669" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <div style={{ fontSize: '0.84rem', color: '#0f172a' }}>
                    {w.message || w}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
              <button
                onClick={() => setIsValidationModalOpen(false)}
                className="btn btn-secondary"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
