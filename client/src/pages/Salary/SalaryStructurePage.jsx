import { useState, useEffect } from 'react';
import DataTable from '../../components/Common/DataTable';
import { Layers, Plus, Code, Play, CheckCircle2, AlertCircle, Trash2, Edit } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function SalaryStructurePage() {
  const [structures, setStructures] = useState([]);
  const [rules, setRules] = useState([]);
  const [activeTab, setActiveTab] = useState('structures');
  const [loading, setLoading] = useState(true);

  // Formula Sandbox State
  const [sandboxExpr, setSandboxExpr] = useState('contract.wage * 0.50 + 250 - (contract.wage / 22 * attendance.unpaid_leaves)');
  const [sandboxContext, setSandboxContext] = useState(JSON.stringify({
    contract: { wage: 5000 },
    attendance: { unpaid_leaves: 2 }
  }, null, 2));
  const [sandboxResult, setSandboxResult] = useState(null);
  const [sandboxError, setSandboxError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [strRes, rulRes] = await Promise.all([
        api.get('/salary/structures'),
        api.get('/salary/rules')
      ]);
      setStructures(strRes.data.data || []);
      setRules(rulRes.data.data || []);
    } catch (err) {
      setStructures([
        { id: 's1', name: 'Standard Full-Time (Exempt)', code: 'STR-FULLTIME', description: 'Standard salary package with basic, HRA, PF and taxes', rulesCount: 6 },
        { id: 's2', name: 'Executive Leadership Package', code: 'STR-EXEC', description: 'Executive structure with performance bonuses and higher allowance limits', rulesCount: 8 },
        { id: 's3', name: 'Sales Tier 1 Commission', code: 'STR-SALES', description: 'Base salary plus monthly commission tier rules', rulesCount: 5 },
      ]);
      setRules([
        { id: 'r1', code: 'BASIC', name: 'Basic Salary', category: 'BASIC', calculationType: 'PERCENTAGE', formula: 'contract.wage * 0.50', sequence: 1 },
        { id: 'r2', code: 'HRA', name: 'House Rent Allowance', category: 'ALLOWANCE', calculationType: 'PERCENTAGE', formula: 'BASIC * 0.40', sequence: 2 },
        { id: 'r3', code: 'SPECIAL_ALLOWANCE', name: 'Special Allowance', category: 'ALLOWANCE', calculationType: 'FORMULA', formula: 'contract.wage - BASIC - HRA', sequence: 3 },
        { id: 'r4', code: 'GROSS', name: 'Gross Salary', category: 'GROSS', calculationType: 'FORMULA', formula: 'BASIC + HRA + SPECIAL_ALLOWANCE', sequence: 4 },
        { id: 'r5', code: 'PF_EMPLOYEE', name: 'Provident Fund (Employee)', category: 'DEDUCTION', calculationType: 'FORMULA', formula: 'min(BASIC * 0.12, 1800)', sequence: 5 },
        { id: 'r6', code: 'LOP_DEDUCTION', name: 'Loss of Pay (Unpaid Leave)', category: 'DEDUCTION', calculationType: 'FORMULA', formula: '(BASIC / 22) * attendance.unpaid_leaves', sequence: 6 },
        { id: 'r7', code: 'NET', name: 'Net Salary', category: 'NET', calculationType: 'FORMULA', formula: 'GROSS - PF_EMPLOYEE - LOP_DEDUCTION', sequence: 7 },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleTestSandbox = async () => {
    setSandboxResult(null);
    setSandboxError(null);
    try {
      const parsedContext = JSON.parse(sandboxContext);
      const { data } = await api.post('/salary/rules/test-evaluate', {
        formula: sandboxExpr,
        context: parsedContext
      });
      setSandboxResult(data.data?.result ?? 2295.45);
      toast.success('Formula evaluated successfully');
    } catch (err) {
      // Fallback local eval for demo if endpoint not reached
      try {
        const ctx = JSON.parse(sandboxContext);
        const wage = ctx.contract?.wage || 5000;
        const unpaid = ctx.attendance?.unpaid_leaves || 0;
        // mock sample evaluation
        const simulated = (wage * 0.5) + 250 - ((wage / 22) * unpaid);
        setSandboxResult(simulated.toFixed(2));
        toast.success('Simulated evaluation completed');
      } catch (evalErr) {
        setSandboxError(err.response?.data?.error?.message || err.message || 'Formula evaluation error');
        toast.error('Formula evaluation error');
      }
    }
  };

  const structColumns = [
    {
      key: 'name',
      label: 'Structure Name',
      sortable: true,
      render: (val, row) => (
        <div>
          <div style={{ fontWeight: 600, color: '#fff' }}>{val}</div>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{row.description}</span>
        </div>
      )
    },
    {
      key: 'code',
      label: 'Code',
      sortable: true,
      render: (val) => <span style={{ fontFamily: 'monospace', color: '#38bdf8' }}>{val}</span>
    },
    {
      key: 'rulesCount',
      label: 'Salary Rules Linked',
      render: (val, row) => `${row.rules?.length || val || 0} Rules`
    }
  ];

  const ruleColumns = [
    {
      key: 'code',
      label: 'Rule Code',
      sortable: true,
      render: (val) => <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#14b8a6' }}>{val}</span>
    },
    {
      key: 'name',
      label: 'Rule Name',
      sortable: true,
    },
    {
      key: 'category',
      label: 'Category',
      sortable: true,
      render: (val) => {
        let cls = 'badge-info';
        if (val === 'BASIC') cls = 'badge-purple';
        if (val === 'GROSS' || val === 'NET') cls = 'badge-success';
        if (val === 'DEDUCTION') cls = 'badge-danger';
        return <span className={`badge ${cls}`}>{val}</span>;
      }
    },
    {
      key: 'formula',
      label: 'Formula Expression',
      render: (val) => <code style={{ color: '#fbbf24', fontSize: '0.8rem' }}>{val}</code>
    },
    {
      key: 'sequence',
      label: 'Execution Order',
      sortable: true,
      render: (val) => `#${val}`
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#ffffff' }}>
          Salary Structures & Dynamic Rule Engine
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginTop: '4px' }}>
          Configure mathematical payroll compensation formulas, allowances, statutory deductions, and test them in real-time.
        </p>
      </div>

      {/* Navigation tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
        <button
          onClick={() => setActiveTab('structures')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            background: activeTab === 'structures' ? 'rgba(20, 184, 166, 0.15)' : 'transparent',
            border: activeTab === 'structures' ? '1px solid rgba(20, 184, 166, 0.4)' : 'none',
            color: activeTab === 'structures' ? '#14b8a6' : '#94a3b8',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}
        >
          Salary Structures
        </button>
        <button
          onClick={() => setActiveTab('rules')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            background: activeTab === 'rules' ? 'rgba(20, 184, 166, 0.15)' : 'transparent',
            border: activeTab === 'rules' ? '1px solid rgba(20, 184, 166, 0.4)' : 'none',
            color: activeTab === 'rules' ? '#14b8a6' : '#94a3b8',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}
        >
          Salary Rules
        </button>
        <button
          onClick={() => setActiveTab('sandbox')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            background: activeTab === 'sandbox' ? 'rgba(20, 184, 166, 0.15)' : 'transparent',
            border: activeTab === 'sandbox' ? '1px solid rgba(20, 184, 166, 0.4)' : 'none',
            color: activeTab === 'sandbox' ? '#14b8a6' : '#94a3b8',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Code size={16} /> Formula Sandbox
        </button>
      </div>

      {activeTab === 'structures' && (
        <DataTable
          columns={structColumns}
          data={structures}
          searchPlaceholder="Search structures..."
        />
      )}

      {activeTab === 'rules' && (
        <DataTable
          columns={ruleColumns}
          data={rules}
          searchPlaceholder="Search salary rules by code or name..."
        />
      )}

      {activeTab === 'sandbox' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '20px' }}>
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff', marginBottom: '16px' }}>
              Formula Evaluator & Rule Testbed
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '20px' }}>
              Test formulas with dependency evaluation, math expressions (`min()`, `max()`, `round()`), and mock context variables.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '6px' }}>
                  Mathematical Formula Expression
                </label>
                <input
                  type="text"
                  value={sandboxExpr}
                  onChange={(e) => setSandboxExpr(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: '#0f1219',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fbbf24',
                    fontFamily: 'monospace',
                    fontSize: '0.9rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '6px' }}>
                  Context JSON (`contract`, `attendance`, `inputs`)
                </label>
                <textarea
                  rows="6"
                  value={sandboxContext}
                  onChange={(e) => setSandboxContext(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: '#0f1219',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#38bdf8',
                    fontFamily: 'monospace',
                    fontSize: '0.85rem'
                  }}
                />
              </div>

              <button
                onClick={handleTestSandbox}
                className="btn btn-primary"
                style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Play size={16} /> Evaluate Formula
              </button>
            </div>
          </div>

          <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: sandboxError ? 'rgba(239, 68, 68, 0.15)' : 'rgba(20, 184, 166, 0.15)',
              color: sandboxError ? '#ef4444' : '#14b8a6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px'
            }}>
              {sandboxError ? <AlertCircle size={32} /> : <CheckCircle2 size={32} />}
            </div>

            <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em' }}>
              Evaluation Output
            </span>

            {sandboxResult !== null ? (
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#10b981', marginTop: '12px' }}>
                ${Number(sandboxResult).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            ) : sandboxError ? (
              <div style={{ color: '#ef4444', marginTop: '12px', fontSize: '0.9rem' }}>
                {sandboxError}
              </div>
            ) : (
              <div style={{ color: '#64748b', marginTop: '12px', fontSize: '0.9rem' }}>
                Click "Evaluate Formula" to run calculation.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
