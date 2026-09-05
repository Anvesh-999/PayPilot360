import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard,
  Users,
  FileText,
  Clock,
  CalendarCheck,
  Calculator,
  Receipt,
  Layers,
  UserCircle,
  ChevronRight
} from 'lucide-react';

export default function Sidebar({ collapsed, setCollapsed }) {
  const { user, hasRole } = useAuth();
  const role = user?.role;
  const isEmployee = role === 'EMPLOYEE';

  const isHR = hasRole(['SUPER_ADMIN', 'HR_MANAGER', 'HR_STAFF']);
  const isHRManager = hasRole(['SUPER_ADMIN', 'HR_MANAGER']);
  const isPayroll = hasRole(['SUPER_ADMIN', 'PAYROLL_MANAGER', 'PAYROLL_USER']);
  const isPayrollManager = hasRole(['SUPER_ADMIN', 'PAYROLL_MANAGER']);

  const navSections = [
    {
      title: 'OVERVIEW',
      items: [
        { path: '/dashboard', label: 'Executive Dashboard', icon: LayoutDashboard, color: '#4f46e5', bg: '#eef2ff', show: !isEmployee },
        { path: '/portal', label: 'My Self-Service', icon: UserCircle, color: '#16a34a', bg: '#f0fdf4', show: isEmployee },
      ]
    },
    {
      title: isEmployee ? 'MY WORKSPACE' : 'CORE HR',
      items: [
        { path: '/employees', label: 'Employees Directory', icon: Users, color: '#7c3aed', bg: '#f5f3ff', show: isHR },
        { path: '/contracts', label: 'Contracts & Terms', icon: FileText, color: '#0284c7', bg: '#f0f9ff', show: isHRManager || isPayrollManager },
        { path: '/attendance', label: isEmployee ? 'My Attendance' : 'Attendance & Clock', icon: Clock, color: '#059669', bg: '#ecfdf5', show: true },
        { path: '/leave', label: isEmployee ? 'My Leaves & Requests' : 'Leave & Time Off', icon: CalendarCheck, color: '#d97706', bg: '#fffbeb', show: true },
      ]
    },
    {
      title: isEmployee ? 'MY COMPENSATION' : 'PAYROLL & FINANCE',
      items: [
        { path: '/payroll', label: 'Payroll Cycles', icon: Calculator, color: '#2563eb', bg: '#eff6ff', show: isPayroll },
        { path: '/payslips', label: isEmployee ? 'My Payslips' : 'Employee Payslips', icon: Receipt, color: '#e11d48', bg: '#fff1f2', show: true },
        { path: '/salary-structures', label: 'Salary Structures', icon: Layers, color: '#c026d3', bg: '#fdf4ff', show: isPayrollManager },
      ]
    },
    ...(isEmployee ? [] : [{
      title: 'SELF SERVICE',
      items: [
        { path: '/portal', label: 'My Portal', icon: UserCircle, color: '#16a34a', bg: '#f0fdf4', show: true },
      ]
    }])
  ];

  return (
    <aside
      className={`sidebar ${collapsed ? 'collapsed' : ''}`}
      style={{
        width: collapsed ? '76px' : '264px',
        transition: 'width 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        backgroundColor: '#ffffff',
        borderRight: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        flexShrink: 0,
        boxShadow: '1px 0 10px rgba(0, 0, 0, 0.02)'
      }}
    >
      {/* Brand Header */}
      <div style={{
        padding: collapsed ? '18px 12px' : '18px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        borderBottom: '1px solid #f1f5f9',
        background: 'linear-gradient(180deg, #ffffff 0%, #fafafa 100%)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)',
            fontWeight: 800,
            color: '#ffffff',
            fontSize: '17px',
            letterSpacing: '-0.02em',
            flexShrink: 0
          }}>
            P3
          </div>
          {!collapsed && (
            <div>
              <div style={{
                fontSize: '1.08rem',
                fontWeight: 800,
                letterSpacing: '-0.03em',
                color: '#0f172a',
                lineHeight: 1.2
              }}>
                PeoplePay<span style={{ color: '#6366f1' }}>360</span>
              </div>
              <div style={{
                fontSize: '0.68rem',
                color: '#64748b',
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                marginTop: '1px'
              }}>
                Payroll & HR Suite
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation List */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '16px 10px' }}>
        {navSections.map((section, sIdx) => {
          const visibleItems = section.items.filter(item => item.show);
          if (visibleItems.length === 0) return null;

          return (
            <div key={sIdx} style={{ marginBottom: '18px' }}>
              {!collapsed && (
                <div style={{
                  fontSize: '0.66rem',
                  fontWeight: 700,
                  color: '#94a3b8',
                  padding: '4px 12px 6px 12px',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase'
                }}>
                  {section.title}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      title={collapsed ? item.label : undefined}
                      style={({ isActive }) => ({
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: collapsed ? '11px' : '9px 12px',
                        justifyContent: collapsed ? 'center' : 'flex-start',
                        borderRadius: '10px',
                        textDecoration: 'none',
                        color: isActive ? item.color : '#475569',
                        backgroundColor: isActive ? item.bg : 'transparent',
                        fontWeight: isActive ? 600 : 500,
                        fontSize: '0.875rem',
                        transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                        border: isActive ? `1px solid ${item.color}35` : '1px solid transparent',
                        boxShadow: isActive ? `0 2px 8px ${item.color}15` : 'none'
                      })}
                    >
                      {({ isActive }) => (
                        <>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '24px',
                            height: '24px',
                            color: item.color
                          }}>
                            <Icon size={18} />
                          </div>
                          {!collapsed && (
                            <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {item.label}
                            </span>
                          )}
                          {isActive && !collapsed && (
                            <div style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              backgroundColor: item.color,
                              boxShadow: `0 0 6px ${item.color}80`
                            }} />
                          )}
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Collapse Toggle / System Status Footer */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid #f1f5f9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        backgroundColor: '#fafafa'
      }}>
        {!collapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="status-dot active" />
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
              Cloud Active
            </span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            color: '#64748b',
            cursor: 'pointer',
            padding: '5px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            transition: 'all 0.15s ease'
          }}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronRight size={15} style={{ transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.2s' }} />
        </button>
      </div>
    </aside>
  );
}
