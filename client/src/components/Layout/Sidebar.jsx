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
  Building2,
  Briefcase,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';

export default function Sidebar({ collapsed, setCollapsed }) {
  const { user, hasRole } = useAuth();
  const role = user?.role;

  const isHR = hasRole(['SUPER_ADMIN', 'HR_MANAGER', 'HR_STAFF']);
  const isHRManager = hasRole(['SUPER_ADMIN', 'HR_MANAGER']);
  const isPayroll = hasRole(['SUPER_ADMIN', 'PAYROLL_MANAGER', 'PAYROLL_USER']);
  const isPayrollManager = hasRole(['SUPER_ADMIN', 'PAYROLL_MANAGER']);
  const isSuperAdmin = role === 'SUPER_ADMIN';

  const navSections = [
    {
      title: 'OVERVIEW',
      items: [
        { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, show: true },
      ]
    },
    {
      title: 'CORE HR',
      items: [
        { path: '/employees', label: 'Employees', icon: Users, show: isHR },
        { path: '/contracts', label: 'Contracts', icon: FileText, show: isHRManager || isPayrollManager },
        { path: '/attendance', label: 'Attendance', icon: Clock, show: isHR },
        { path: '/leave', label: 'Leave & Time Off', icon: CalendarCheck, show: true },
      ]
    },
    {
      title: 'PAYROLL & COMPENSATION',
      items: [
        { path: '/payroll', label: 'Payroll Runs', icon: Calculator, show: isPayroll },
        { path: '/payslips', label: 'Payslips', icon: Receipt, show: isPayroll || isHR },
        { path: '/salary-structures', label: 'Salary Rules & Structures', icon: Layers, show: isPayrollManager },
      ]
    },
    {
      title: 'SELF SERVICE',
      items: [
        { path: '/portal', label: 'Employee Portal', icon: UserCircle, show: true },
      ]
    }
  ];

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`} style={{
      width: collapsed ? '80px' : '260px',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      backgroundColor: 'var(--bg-secondary, #161b26)',
      borderRight: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'sticky',
      top: 0,
      zIndex: 40,
      flexShrink: 0
    }}>
      {/* Brand / Logo */}
      <div style={{
        padding: collapsed ? '20px 12px' : '20px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        borderBottom: '1px solid var(--border-color, rgba(255, 255, 255, 0.06))'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 50%, #0369a1 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 15px rgba(20, 184, 166, 0.35)',
            fontWeight: 800,
            color: '#ffffff',
            fontSize: '18px'
          }}>
            P3
          </div>
          {!collapsed && (
            <div>
              <div style={{
                fontSize: '1.15rem',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                background: 'linear-gradient(to right, #ffffff, #94a3b8)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                PeoplePay360
              </div>
              <div style={{ fontSize: '0.72rem', color: '#14b8a6', fontWeight: 600, letterSpacing: '0.05em' }}>
                HR & PAYROLL SUITE
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation list */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '16px 12px' }} className="custom-scrollbar">
        {navSections.map((section, sIdx) => {
          const visibleItems = section.items.filter(item => item.show);
          if (visibleItems.length === 0) return null;

          return (
            <div key={sIdx} style={{ marginBottom: '20px' }}>
              {!collapsed && (
                <div style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  color: 'var(--text-muted, #64748b)',
                  padding: '4px 12px 8px 12px',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase'
                }}>
                  {section.title}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
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
                        padding: collapsed ? '12px' : '10px 14px',
                        justifyContent: collapsed ? 'center' : 'flex-start',
                        borderRadius: '8px',
                        textDecoration: 'none',
                        color: isActive ? '#14b8a6' : 'var(--text-secondary, #94a3b8)',
                        backgroundColor: isActive ? 'rgba(20, 184, 166, 0.12)' : 'transparent',
                        fontWeight: isActive ? 600 : 500,
                        fontSize: '0.9rem',
                        transition: 'all 0.15s ease',
                        borderLeft: isActive ? '3px solid #14b8a6' : '3px solid transparent'
                      })}
                    >
                      <Icon size={20} style={{ flexShrink: 0 }} />
                      {!collapsed && <span>{item.label}</span>}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Collapse toggle / footer */}
      <div style={{
        padding: '14px',
        borderTop: '1px solid var(--border-color, rgba(255, 255, 255, 0.06))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between'
      }}>
        {!collapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#10b981',
              boxShadow: '0 0 8px #10b981'
            }} />
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>System Online</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronRight size={18} style={{ transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.2s' }} />
        </button>
      </div>
    </aside>
  );
}
