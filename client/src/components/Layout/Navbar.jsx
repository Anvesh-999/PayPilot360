import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut, Clock, Bell, User, CheckCircle2, ChevronDown } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [clockedIn, setClockedIn] = useState(false);
  const [clockLoading, setClockLoading] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState(null);

  // Check today's status on mount
  useEffect(() => {
    async function checkAttendance() {
      try {
        const { data } = await api.get('/attendance/my-today');
        if (data.data) {
          setTodayAttendance(data.data);
          setClockedIn(data.data.checkIn && !data.data.checkOut);
        }
      } catch (err) {
        // May not have checkIn today or not an employee
      }
    }
    if (user) {
      checkAttendance();
    }
  }, [user]);

  const handleTogglePunch = async () => {
    setClockLoading(true);
    try {
      if (!clockedIn) {
        const { data } = await api.post('/attendance/check-in');
        setClockedIn(true);
        setTodayAttendance(data.data);
        toast.success(`Clocked in at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
      } else {
        const { data } = await api.post('/attendance/check-out');
        setClockedIn(false);
        setTodayAttendance(data.data);
        toast.success(`Clocked out at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Attendance action failed');
    } finally {
      setClockLoading(false);
    }
  };

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'SUPER_ADMIN': return 'badge-danger';
      case 'HR_MANAGER': return 'badge-purple';
      case 'PAYROLL_MANAGER': return 'badge-info';
      case 'PAYROLL_USER': return 'badge-info';
      case 'HR_STAFF': return 'badge-warning';
      default: return 'badge-success';
    }
  };

  return (
    <header style={{
      height: '68px',
      backgroundColor: 'var(--bg-secondary, #161b26)',
      borderBottom: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 28px',
      position: 'sticky',
      top: 0,
      zIndex: 30
    }}>
      {/* Left Greeting */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0, color: 'var(--text-primary, #ffffff)' }}>
            Welcome back, {user?.name?.split(' ')[0] || user?.email || 'User'}
          </h2>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted, #94a3b8)' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Quick Punch Button */}
        <button
          onClick={handleTogglePunch}
          disabled={clockLoading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '7px 14px',
            borderRadius: '20px',
            fontSize: '0.82rem',
            fontWeight: 600,
            cursor: 'pointer',
            border: clockedIn ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(16, 185, 129, 0.4)',
            backgroundColor: clockedIn ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
            color: clockedIn ? '#ef4444' : '#10b981',
            transition: 'all 0.2s ease'
          }}
          title={clockedIn ? 'Click to punch out' : 'Click to punch in'}
        >
          <Clock size={16} />
          {clockLoading ? 'Processing...' : clockedIn ? 'Clock Out' : 'Clock In'}
        </button>

        {/* User Card */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '6px 12px',
          background: 'rgba(255, 255, 255, 0.03)',
          borderRadius: '12px',
          border: '1px solid var(--border-color, rgba(255, 255, 255, 0.06))'
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #14b8a6, #6366f1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            color: '#fff',
            fontSize: '14px'
          }}>
            {user?.name ? user.name[0].toUpperCase() : 'U'}
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary, #ffffff)' }}>
              {user?.name || user?.email}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
              <span className={`badge ${getRoleBadgeClass(user?.role)}`} style={{ fontSize: '0.65rem', padding: '1px 6px' }}>
                {user?.role?.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: '#ef4444',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          title="Sign out"
        >
          <LogOut size={17} />
        </button>
      </div>
    </header>
  );
}
