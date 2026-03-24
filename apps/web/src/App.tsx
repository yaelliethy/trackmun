import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AdminDelegatesPage } from './pages/admin/AdminDelegatesPage';
import { AdminOCPage } from './pages/admin/AdminOCPage';
import { AdminChairsPage } from './pages/admin/AdminChairsPage';
import { AdminLayout } from './components/admin/AdminLayout';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { NotFoundPage, ForbiddenPage } from './pages/error/ErrorPage';

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Routes>
        {/* Public Admin Routes */}
        <Route path="/admin/login" element={<AdminLoginPage />} />
        
        {/* Protected Admin Routes */}
        <Route path="/admin" element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/admin/delegates" replace />} />
          <Route path="delegates" element={<AdminDelegatesPage />} />
          <Route path="oc" element={<AdminOCPage />} />
          <Route path="chairs" element={<AdminChairsPage />} />
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
