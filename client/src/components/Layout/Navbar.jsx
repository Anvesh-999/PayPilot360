import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut, Clock, Calendar, Search, Bell } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [clockedIn, setClockedIn] = useState(false);
  const [clockLoading, setClockLoading] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

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
      case 'ADMIN':
        return { label: 'Admin', className: 'badge-innowise' };
      case 'HR_MANAGER':
        return { label: 'HR Manager', className: 'badge-cyan' };
      case 'PAYROLL_MANAGER':
      case 'HR_PAYROLL_MANAGER':
        return { label: 'HR Payroll Manager', className: 'badge-innowise' };
      case 'PAYROLL_USER':
      case 'HR_PAYROLL_USER':
        return { label: 'HR Payroll User', className: 'badge-info' };
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
      height: '66px',
      backgroundColor: 'rgba(255, 255, 255, 0.94)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid #f0eef6',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      position: 'sticky',
      top: 0,
      zIndex: 30,
      boxShadow: '0 1px 4px rgba(24, 24, 55, 0.03)'
    }}>
      {/* Left: Search Bar (Innowise Style) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, maxWidth: '420px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: '#f6f5fb',
          padding: '7px 14px',
          borderRadius: '999px',
          border: '1px solid #e5e3ec',
          width: '100%',
          transition: 'all 0.15s ease'
        }}>
          <Search size={15} color="#6b6a8a" />
          <input
            type="text"
            placeholder="Search staff, contracts, payslips..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              border: 'none',
              outline: 'none',
              backgroundColor: 'transparent',
              fontSize: '0.82rem',
              color: '#181837',
              width: '100%'
            }}
          />
          <span style={{
            fontSize: '0.66rem',
            fontWeight: 700,
            color: '#9b9ab5',
            backgroundColor: '#ffffff',
            padding: '2px 6px',
            borderRadius: '5px',
            border: '1px solid #e5e3ec'
          }}>
            Ctrl+K
          </span>
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

        {/* Notification Bell (Innowise Style) */}
        <button
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            backgroundColor: '#f6f5fb',
            border: '1px solid #e5e3ec',
            color: '#5554aa',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            position: 'relative',
            transition: 'all 0.15s ease'
          }}
          title="Notifications"
        >
          <Bell size={16} />
          <span style={{
            position: 'absolute',
            top: '7px',
            right: '7px',
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            backgroundColor: '#f43f5e',
            border: '1.5px solid #ffffff'
          }} />
        </button>

        {/* User Monogram Pill (Innowise Style) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '4px 12px 4px 6px',
          background: '#ffffff',
          borderRadius: '999px',
          border: '1px solid #e5e3ec',
          boxShadow: '0 1px 3px rgba(24, 24, 55, 0.03)'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #5554aa 0%, #757498 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            color: '#ffffff',
            fontSize: '13px',
            boxShadow: '0 2px 8px rgba(85, 84, 170, 0.25)',
            position: 'relative'
          }}>
            {userInitials}
            <span style={{
              position: 'absolute',
              bottom: '0px',
              right: '0px',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#10b981',
              border: '1.5px solid #ffffff'
            }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#181837', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.2 }}>
              {displayName}
            </span>
            <span style={{ fontSize: '0.68rem', color: '#6b6a8a', fontWeight: 600, textTransform: 'capitalize' }}>
              {roleInfo.label}
            </span>
          </div>
        </div>

        {/* Sign Out Button */}
        <button
          onClick={logout}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
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
