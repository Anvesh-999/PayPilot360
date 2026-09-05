import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Layout/Sidebar';
import Navbar from '../components/Layout/Navbar';
import { Toaster } from 'react-hot-toast';

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-primary, #0f1219)' }}>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1c2233',
            color: '#f8fafc',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            fontSize: '0.875rem',
            borderRadius: '8px',
          },
          success: {
            iconTheme: {
              primary: '#14b8a6',
              secondary: '#1c2233',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#1c2233',
            },
          },
        }}
      />
      {/* Persistent Sidebar */}
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Navbar />
        <main style={{ flex: 1, padding: '28px', overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
