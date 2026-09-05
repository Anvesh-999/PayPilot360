import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import AppLayout from './layouts/AppLayout';
import ProtectedRoute from './components/Common/ProtectedRoute';

// Pages
import LoginPage from './pages/Auth/LoginPage';
import DashboardPage from './pages/Dashboard/DashboardPage';
import EmployeeListPage from './pages/Employees/EmployeeListPage';
import ContractListPage from './pages/Contracts/ContractListPage';
import AttendancePage from './pages/Attendance/AttendancePage';
import LeavePage from './pages/Leave/LeavePage';
import SalaryStructurePage from './pages/Salary/SalaryStructurePage';
import PayrollPage from './pages/Payroll/PayrollPage';
import PayslipListPage from './pages/Payslips/PayslipListPage';
import EmployeePortalPage from './pages/Portal/EmployeePortalPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Auth Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Application Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/attendance" element={<AttendancePage />} />
              <Route path="/leave" element={<LeavePage />} />
              <Route path="/payslips" element={<PayslipListPage />} />
              <Route path="/portal" element={<EmployeePortalPage />} />

              {/* Employee Directory Routes - Staff listing is restricted to HR & Admins */}
              <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'HR_MANAGER', 'HR_STAFF', 'PAYROLL_MANAGER', 'PAYROLL_USER']} />}>
                <Route path="/employees" element={<EmployeeListPage />} />
              </Route>

              {/* Contract & Structure Management */}
              <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'HR_MANAGER', 'PAYROLL_MANAGER']} />}>
                <Route path="/contracts" element={<ContractListPage />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'PAYROLL_MANAGER', 'HR_MANAGER']} />}>
                <Route path="/salary-structures" element={<SalaryStructurePage />} />
              </Route>

              {/* Payroll Lifecycle Engine */}
              <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'PAYROLL_MANAGER', 'PAYROLL_USER']} />}>
                <Route path="/payroll" element={<PayrollPage />} />
              </Route>
            </Route>
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
