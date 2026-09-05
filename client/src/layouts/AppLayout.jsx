import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Layout/Sidebar';
import Navbar from '../components/Layout/Navbar';
import AICopilotDrawer from '../components/AI/AICopilotDrawer';
import { Toaster } from 'react-hot-toast';

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#ffffff',
            color: '#0f172a',
            border: '1px solid #e2e8f0',
            fontSize: '0.875rem',
            borderRadius: '12px',
            boxShadow: '0 10px 25px -4px rgba(15, 23, 42, 0.1)',
            fontWeight: 500,
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#ecfdf5',
            },
          },
          error: {
            iconTheme: {
              primary: '#f43f5e',
              secondary: '#fff1f2',
            },
          },
        }}
      />
      {/* Persistent Sidebar */}
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, backgroundColor: '#f8fafc' }}>
        <Navbar />
        <main style={{ flex: 1, padding: '28px', overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>

      {/* Global AI Copilot Slide-over Assistant */}
      <AICopilotDrawer />
    </div>
  );
}
