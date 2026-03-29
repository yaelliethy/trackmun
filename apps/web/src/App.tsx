import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { LoginPage } from './pages/auth/LoginPage';
import { DelegateDashboardPage } from './pages/delegate/DelegateDashboardPage';
import { AdminDelegatesPage } from './pages/admin/AdminDelegatesPage';
import { AdminOCPage } from './pages/admin/AdminOCPage';
import { AdminChairsPage } from './pages/admin/AdminChairsPage';
import { AdminAdminsPage } from './pages/admin/AdminAdminsPage';
import { AdminBenefitsPage } from './pages/admin/AdminBenefitsPage';
import { AdminAttendancePage } from './pages/admin/AdminAttendancePage';
import { AdminRegistrationPage } from './pages/admin/AdminRegistrationPage';
import { AdminCouncilsPage } from './pages/admin/AdminCouncilsPage';
import { AdminLayout } from './components/admin/AdminLayout';
import { OCLayout } from './components/oc/OCLayout';
import { OCAttendancePage } from './pages/oc/OCAttendancePage';
import { OCBenefitsPage } from './pages/oc/OCBenefitsPage';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { NotFoundPage, ForbiddenPage } from './pages/error/ErrorPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { RegistrationSuccessPage } from './pages/auth/RegistrationSuccessPage';

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Routes>
        {/* Public Auth Routes */}
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/register/success" element={<RegistrationSuccessPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Public Admin Routes */}
        <Route path="/admin/login" element={<AdminLoginPage />} />

        {/* Protected Delegate Routes */}
        <Route path="/delegate" element={
          <ProtectedRoute requiredRole="delegate">
            <DelegateDashboardPage />
          </ProtectedRoute>
        }>
          <Route path="dashboard" element={<DelegateDashboardPage />} />
        </Route>

        {/* Protected OC Routes */}
        <Route path="/oc" element={
          <ProtectedRoute requiredRole={['oc', 'admin']}>
            <OCLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/oc/attendance" replace />} />
          <Route path="attendance" element={<OCAttendancePage />} />
          <Route path="benefits" element={<OCBenefitsPage />} />
        </Route>

        {/* Protected Admin Routes */}
        <Route path="/admin" element={
          <ProtectedRoute requiredRole="admin">
            <AdminLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/admin/delegates" replace />} />
          <Route path="delegates" element={<AdminDelegatesPage />} />
          <Route path="oc" element={<AdminOCPage />} />
          <Route path="chairs" element={<AdminChairsPage />} />
          <Route path="admins" element={<AdminAdminsPage />} />
          <Route path="benefits" element={<AdminBenefitsPage />} />
          <Route path="attendance" element={<AdminAttendancePage />} />
          <Route path="registration" element={<AdminRegistrationPage />} />
          <Route path="councils" element={<AdminCouncilsPage />} />
        </Route>

        {/* Error Routes */}
        <Route path="/403" element={<ForbiddenPage />} />
        <Route path="/404" element={<NotFoundPage />} />

        {/* Root Redirect */}
        <Route path="/" element={<Navigate to="/admin/delegates" replace />} />

        {/* Catch-all 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
  );
}

export default App;
