import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut, Clock, Calendar } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [clockedIn, setClockedIn] = useState(false);
  const [clockLoading, setClockLoading] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState(null);

  useEffect(() => {
    async function checkAttendance() {
      try {
        const { data } = await api.get('/attendance/my-today');
        if (data.data) {
          setTodayAttendance(data.data);
          setClockedIn(Boolean(data.data.checkIn && !data.data.checkOut));
        }
      } catch (err) {
        // Not clocked in or non-employee account
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

  const getRoleBadge = (role) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return { label: 'Super Admin', className: 'badge-purple' };
      case 'HR_MANAGER':
        return { label: 'HR Manager', className: 'badge-cyan' };
      case 'PAYROLL_MANAGER':
        return { label: 'Payroll Manager', className: 'badge-blue' };
      case 'PAYROLL_USER':
        return { label: 'Payroll Staff', className: 'badge-blue' };
      case 'HR_STAFF':
        return { label: 'HR Staff', className: 'badge-warning' };
      default:
        return { label: 'Employee', className: 'badge-success' };
    }
  };

  const roleInfo = getRoleBadge(user?.role);
  const displayName = user?.employee ? `${user.employee.firstName} ${user.employee.lastName}` : (user?.name || user?.email?.split('@')[0] || 'Member');
  const userInitials = (user?.employee?.firstName?.[0] || user?.name?.[0] || user?.email?.[0] || 'U').toUpperCase();

  const isShiftEnded = Boolean(todayAttendance?.checkIn && todayAttendance?.checkOut);
  const isCurrentlyWorking = Boolean(todayAttendance?.checkIn && !todayAttendance?.checkOut);

  return (
    <header style={{
      height: '64px',
      backgroundColor: 'rgba(255, 255, 255, 0.92)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid #e2e8f0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      position: 'sticky',
      top: 0,
      zIndex: 30,
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)'
    }}>
      {/* Left Greeting & Date */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.94rem', fontWeight: 700, color: '#0f172a' }}>
              Welcome back, {user?.employee?.firstName || user?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'Member'}
            </span>
            <span className={`badge ${roleInfo.className}`} style={{ fontSize: '0.7rem', padding: '1px 8px' }}>
              {roleInfo.label}
            </span>
          </div>
          <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Calendar size={12} color="#94a3b8" />
            <span>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        </div>
      </div>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Quick Punch Button */}
        <button
          onClick={handleTogglePunch}
          disabled={clockLoading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '7px 15px',
            borderRadius: '999px',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: clockLoading ? 'not-allowed' : 'pointer',
            border: isCurrentlyWorking
              ? '1px solid #fecdd3'
              : isShiftEnded
              ? '1px solid #bae6fd'
              : '1px solid #a7f3d0',
            backgroundColor: isCurrentlyWorking
              ? '#fff1f2'
              : isShiftEnded
              ? '#f0f9ff'
              : '#ecfdf5',
            color: isCurrentlyWorking
              ? '#e11d48'
              : isShiftEnded
              ? '#0284c7'
              : '#059669',
            boxShadow: isCurrentlyWorking
              ? '0 2px 8px rgba(244, 63, 94, 0.15)'
              : '0 2px 8px rgba(16, 185, 129, 0.15)',
            transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
          title={
            isCurrentlyWorking
              ? 'Click to clock out'
              : isShiftEnded
              ? 'Shift ended today. Click to resume / re-enter'
              : 'Click to clock in'
          }
        >
          <Clock size={15} />
          <span>
            {clockLoading
              ? 'Syncing...'
              : isCurrentlyWorking
              ? 'Clock Out'
              : isShiftEnded
              ? 'Shift Ended (Clock In)'
              : 'Quick Clock In'}
          </span>
        </button>

        {/* User Monogram Pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '4px 10px 4px 6px',
          background: '#ffffff',
          borderRadius: '999px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
        }}>
          <div style={{
            width: '30px',
            height: '30px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            color: '#ffffff',
            fontSize: '13px',
            boxShadow: '0 2px 8px rgba(99, 102, 241, 0.25)'
          }}>
            {userInitials}
          </div>
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {displayName}
          </span>
        </div>

        {/* Sign Out Button */}
        <button
          onClick={logout}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '34px',
            height: '34px',
            borderRadius: '10px',
            background: '#fff1f2',
            border: '1px solid #fecdd3',
            color: '#e11d48',
            cursor: 'pointer',
            transition: 'all 0.18s ease'
          }}
          title="Sign out of PeoplePay360"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
