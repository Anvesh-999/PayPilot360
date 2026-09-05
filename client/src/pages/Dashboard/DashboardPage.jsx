import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import StatCard from '../../components/Common/StatCard';
import {
  Users,
  IndianRupee,
  CalendarCheck,
  Clock,
  TrendingUp,
  AlertCircle,
  FileCheck,
  ChevronRight,
  ArrowUpRight,
  Sparkles,
  Layers,
  CheckCircle2
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import api from '../../services/api';
import { Link, Navigate } from 'react-router-dom';

export default function DashboardPage() {
  const { user, hasRole } = useAuth();

  if (user?.role === 'EMPLOYEE') {
    return <Navigate to="/portal" replace />;
  }

  const [stats, setStats] = useState({
    activeEmployees: 10,
    totalMonthlyPayroll: 396800,
    pendingLeaves: 2,
    todayAttendanceRate: 95.8,
  });

  const [departmentData, setDepartmentData] = useState([
    { name: 'Engineering', count: 6, color: '#3b82f6' },
    { name: 'Sales', count: 2, color: '#10b981' },
    { name: 'HR & Admin', count: 2, color: '#8b5cf6' },
    { name: 'Operations', count: 1, color: '#f59e0b' },
  ]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const { data } = await api.get('/dashboard/summary');
        if (data.data) {
          const k = data.data.kpis || data.data;
          setStats({
            activeEmployees: k.activeEmployees ?? k.totalEmployees ?? 10,
            totalMonthlyPayroll: k.totalGrossSalary || k.totalMonthlyPayroll || (k.averageSalary ? Math.round(k.averageSalary * (k.activeEmployees || 10)) : 396800),
            pendingLeaves: k.pendingLeaveRequests ?? k.pendingLeaves ?? 2,
            todayAttendanceRate: k.attendanceRate ? parseFloat(k.attendanceRate) : 95.8,
          });

          if (data.data.charts?.departmentDistribution?.length > 0) {
            const palette = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899'];
            setDepartmentData(data.data.charts.departmentDistribution.map((d, i) => ({
              name: d.name,
              count: d.value,
              color: palette[i % palette.length]
            })));
          }
        }
      } catch (err) {
        // Fallback default sample metrics
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  const payrollTrendData = [
    { month: 'Nov', gross: 360000, net: 324000, deductions: 36000 },
    { month: 'Dec', gross: 375000, net: 337500, deductions: 37500 },
    { month: 'Jan', gross: 382000, net: 343800, deductions: 38200 },
    { month: 'Feb', gross: 390000, net: 351000, deductions: 39000 },
    { month: 'Mar', gross: 396800, net: 357120, deductions: 39680 },
  ];

  const recentPayruns = [
    { id: 'PR-2026-03', name: 'March 2026 Regular Cycle', period: 'Mar 1 - Mar 31, 2026', total: '₹3,96,800.00', status: 'DRAFT', employees: 10 },
    { id: 'PR-2026-02', name: 'February 2026 Regular Cycle', period: 'Feb 1 - Feb 28, 2026', total: '₹3,90,000.00', status: 'PAID', employees: 10 },
    { id: 'PR-2026-01', name: 'January 2026 Regular Cycle', period: 'Jan 1 - Jan 31, 2026', total: '₹3,82,000.00', status: 'PAID', employees: 9 },
  ];

  const isPayroll = hasRole(['SUPER_ADMIN', 'PAYROLL_MANAGER', 'PAYROLL_USER']);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '26px' }}>
      {/* Top Banner & Quick Controls */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        padding: '22px 26px',
        backgroundColor: '#ffffff',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 55%, #eef2ff 100%)',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              backgroundColor: '#ecfdf5',
              color: '#059669'
            }}>
              <Sparkles size={16} />
            </span>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
              Executive Overview
            </h1>
          </div>
          <p style={{ margin: '6px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
            Live payroll run analytics, team distribution, and operational metrics for March 2026.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Link to="/attendance" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={15} /> Clock Records
          </Link>
          {isPayroll && (
            <Link to="/payroll" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <ArrowUpRight size={15} /> Execute Payrun
            </Link>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '18px'
      }}>
        <StatCard
          title="Active Headcount"
          value={stats.activeEmployees}
          description="Enrolled staff with contracts"
          color="#6366f1"
          icon={Users}
          badgeText="+1 this month"
          badgePositive={true}
        />
        <StatCard
          title="Monthly Payroll Cost"
          value={`₹${stats.totalMonthlyPayroll.toLocaleString('en-IN')}`}
          description="Projected gross wages + allowances"
          color="#059669"
          icon={IndianRupee}
          badgeText="+1.7% vs Feb"
          badgePositive={true}
        />
        <StatCard
          title="Pending Leave Review"
          value={stats.pendingLeaves}
          description="Time-off requests awaiting action"
          color="#d97706"
          icon={CalendarCheck}
          badgeText={stats.pendingLeaves > 0 ? 'Requires Action' : 'All clear'}
          badgePositive={stats.pendingLeaves === 0}
        />
        <StatCard
          title="Avg Attendance Rate"
          value={`${stats.todayAttendanceRate}%`}
          description="Check-ins recorded today"
          color="#0284c7"
          icon={Clock}
          badgeText="Healthy"
          badgePositive={true}
        />
      </div>

      {/* Visual Analytics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px' }}>
        {/* Payroll Expense Evolution */}
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Disbursement & Deduction Trends
              </h3>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                5-month expenditure trajectory
              </span>
            </div>
            <span className="badge badge-primary">FY 2025-26</span>
          </div>
          <div style={{ height: '260px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={payrollTrendData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="grossGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} tickFormatter={(v) => `₹${v / 1000}k`} />
                <Tooltip
                  formatter={(val) => [`₹${val.toLocaleString('en-IN')}`, '']}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', fontSize: '12px' }}
                />
                <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#64748b' }} />
                <Area type="monotone" dataKey="gross" name="Gross Pay" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#grossGrad)" />
                <Area type="monotone" dataKey="net" name="Net Disbursed" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#netGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Headcount by Department */}
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Department Distribution
              </h3>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                Headcount breakdown by operational business unit
              </span>
            </div>
            <Link to="/employees" style={{ fontSize: '0.8rem', color: '#6366f1', textDecoration: 'none', fontWeight: 600 }}>
              View Directory &rarr;
            </Link>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', height: '260px' }}>
            <div style={{ width: '55%', height: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={departmentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={5}
                    dataKey="count"
                  >
                    {departmentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: '12px' }}
                    formatter={(val, name) => [`${val} Members`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ width: '45%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {departmentData.map((dept, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: dept.color }} />
                    <span style={{ color: '#475569', fontWeight: 500 }}>{dept.name}</span>
                  </div>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>{dept.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Payrun Management Snapshot */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#fafbfc'
        }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Recent Payroll Cycles
            </h3>
            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
              Batches calculated and settled across the company
            </span>
          </div>
          <Link to="/payroll" className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            All Runs <ChevronRight size={14} />
          </Link>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border-color)', color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              <th style={{ padding: '12px 24px' }}>Batch Identifier</th>
              <th style={{ padding: '12px 24px' }}>Cycle Name</th>
              <th style={{ padding: '12px 24px' }}>Period</th>
              <th style={{ padding: '12px 24px' }}>Staff Included</th>
              <th style={{ padding: '12px 24px' }}>Total Amount</th>
              <th style={{ padding: '12px 24px' }}>Status</th>
              <th style={{ padding: '12px 24px', textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {recentPayruns.map((pr) => (
              <tr key={pr.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '0.88rem' }} className="table-row-hover">
                <td style={{ padding: '14px 24px', fontWeight: 700, color: '#6366f1', fontFamily: 'monospace' }}>
                  {pr.id}
                </td>
                <td style={{ padding: '14px 24px', fontWeight: 600, color: '#0f172a' }}>
                  {pr.name}
                </td>
                <td style={{ padding: '14px 24px', color: '#64748b', fontSize: '0.82rem' }}>
                  {pr.period}
                </td>
                <td style={{ padding: '14px 24px', color: '#334155' }}>
                  {pr.employees} Employees
                </td>
                <td style={{ padding: '14px 24px', fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                  {pr.total}
                </td>
                <td style={{ padding: '14px 24px' }}>
                  <span className={`badge ${pr.status === 'PAID' ? 'badge-success' : 'badge-warning'}`}>
                    {pr.status === 'PAID' ? '✓ Disbursed' : '● In Draft'}
                  </span>
                </td>
                <td style={{ padding: '14px 24px', textAlign: 'right' }}>
                  <Link to="/payroll" className="btn btn-secondary btn-sm" style={{ padding: '4px 10px', fontSize: '0.78rem' }}>
                    Inspect
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
