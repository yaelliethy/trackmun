import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { useTheme } from 'next-themes'
import { RootLayout } from './components/layout/RootLayout'
import { RootRedirect } from './components/common/RootRedirect'

// Auth & Public Pages
import { LoginPage } from './pages/auth/LoginPage'
import { RegisterPage } from './pages/auth/RegisterPage'
import { RegistrationSuccessPage } from './pages/auth/RegistrationSuccessPage'
import { DelegateDashboardPage } from './pages/delegate/DelegateDashboardPage'
import { ErrorPage } from './pages/error/ErrorPage'
import { ForbiddenPage } from './pages/error/ForbiddenPage'

// Admin Pages
import { AdminLayout } from './components/admin/AdminLayout'
import { AdminDelegatesPage } from './pages/admin/AdminDelegatesPage'
import { AdminOCPage } from './pages/admin/AdminOCPage'
import { AdminChairsPage } from './pages/admin/AdminChairsPage'
import { AdminAdminsPage } from './pages/admin/AdminAdminsPage'
import { AdminCouncilsPage } from './pages/admin/AdminCouncilsPage'
import { AdminRegistrationPage } from './pages/admin/AdminRegistrationPage'
import { AdminAttendancePage } from './pages/admin/AdminAttendancePage'
import { AdminBenefitsPage } from './pages/admin/AdminBenefitsPage'

// Chair Pages
import { ChairsLayout } from './components/chairs/ChairsLayout'
import { ChairAttendancePage } from './pages/chairs/ChairAttendancePage'
import { AssignedDelegates } from './pages/chairs/AssignedDelegates'
import { DelegateRequests } from './pages/chairs/DelegateRequests'

// OC Pages
import { OCLayout } from './components/oc/OCLayout'
import { OCAttendancePage } from './pages/oc/OCAttendancePage'
import { OCBenefitsPage } from './pages/oc/OCBenefitsPage'

// Press Pages
import { PressLayout } from './components/press/PressLayout'
import { FeedPage } from './pages/press/FeedPage'
import { SearchPage } from './pages/press/SearchPage'
import { UserProfilePage } from './pages/press/UserProfilePage'

// Protected Route wrappers
import { ProtectedRoute } from './components/common/ProtectedRoute'

import { queryClient } from './lib/query-client'

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        element: <RootRedirect />,
      },
      {
        path: 'login',
        element: <LoginPage />,
      },
      {
        path: 'register',
        element: <RegisterPage />,
      },
      {
        path: 'register/success',
        element: <RegistrationSuccessPage />,
      },
      {
        path: 'dashboard',
        element: (
          <ProtectedRoute requiredRole={['delegate']}>
            <DelegateDashboardPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin',
        element: (
          <ProtectedRoute requiredRole={['admin']}>
            <AdminLayout />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <Navigate to="delegates" replace /> },
          { path: 'delegates', element: <AdminDelegatesPage /> },
          { path: 'oc', element: <AdminOCPage /> },
          { path: 'chairs', element: <AdminChairsPage /> },
          { path: 'admins', element: <AdminAdminsPage /> },
          { path: 'councils', element: <AdminCouncilsPage /> },
          { path: 'registration', element: <AdminRegistrationPage /> },
          { path: 'attendance', element: <AdminAttendancePage /> },
          { path: 'benefits', element: <AdminBenefitsPage /> },
        ],
      },
      {
        path: 'chairs',
        element: (
          <ProtectedRoute requiredRole={['chair', 'admin']}>
            <ChairsLayout />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <Navigate to="assigned" replace /> },
          { path: 'assigned', element: <AssignedDelegates /> },
          { path: 'requests', element: <DelegateRequests /> },
          { path: 'attendance', element: <ChairAttendancePage /> },
        ],
      },
      {
        path: 'oc',
        element: (
          <ProtectedRoute requiredRole={['oc', 'admin']}>
            <OCLayout />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <Navigate to="attendance" replace /> },
          { path: 'attendance', element: <OCAttendancePage /> },
          { path: 'benefits', element: <OCBenefitsPage /> },
        ],
      },
      {
        path: 'feed',
        element: (
          <ProtectedRoute requiredRole={['delegate', 'oc', 'chair', 'admin', 'press']}>
            <PressLayout />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <FeedPage /> },
          { path: 'search', element: <SearchPage /> },
          { path: 'users/:userId', element: <UserProfilePage /> },
        ],
      },
      {
        path: '403',
        element: <ForbiddenPage />,
      },
      {
        path: '*',
        element: <Navigate to="/" replace />,
      }
    ],
  },
])

function ThemedToaster() {
  const { resolvedTheme } = useTheme()
  return (
    <Toaster
      position="top-right"
      richColors
      theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
    />
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <ThemedToaster />
    </QueryClientProvider>
  )
}

export default App
