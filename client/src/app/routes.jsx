import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { RootLayout } from '../layouts/RootLayout.jsx';
import { DashboardLayout } from '../layouts/DashboardLayout.jsx';
import { ProtectedRoute } from '../features/auth/ProtectedRoute.jsx';
import { RoleGuard } from '../features/auth/RoleGuard.jsx';
import { LoadingScreen } from '../components/LoadingScreen.jsx';
import { ROLES, ROUTES, getDashboardPathForRole } from '../utils/constants.js';
import { useAuth } from '../hooks/useAuth.js';

// Lazy-loaded routes for optimal bundle chunking and performance
const LandingPage = lazy(() => import('../pages/LandingPage.jsx').then((m) => ({ default: m.LandingPage })));
const LoginPage = lazy(() => import('../pages/LoginPage.jsx').then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('../pages/RegisterPage.jsx').then((m) => ({ default: m.RegisterPage })));
const ExplorePage = lazy(() => import('../pages/ExplorePage.jsx').then((m) => ({ default: m.ExplorePage })));
const CreateIssuePage = lazy(() => import('../pages/CreateIssuePage.jsx').then((m) => ({ default: m.CreateIssuePage })));
const MyReportsPage = lazy(() => import('../pages/MyReportsPage.jsx').then((m) => ({ default: m.MyReportsPage })));
const IssueDetailsPage = lazy(() => import('../pages/IssueDetailsPage.jsx').then((m) => ({ default: m.IssueDetailsPage })));
const CitizenDashboard = lazy(() => import('../pages/CitizenDashboard.jsx').then((m) => ({ default: m.CitizenDashboard })));
const StaffDashboard = lazy(() => import('../pages/StaffDashboard.jsx').then((m) => ({ default: m.StaffDashboard })));
const AdminDashboard = lazy(() => import('../pages/AdminDashboard.jsx').then((m) => ({ default: m.AdminDashboard })));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage.jsx').then((m) => ({ default: m.NotFoundPage })));

function DashboardIndexRedirect() {
  const { user } = useAuth();
  const target = user ? getDashboardPathForRole(user.role) : ROUTES.LOGIN;
  return <Navigate to={target} replace />;
}

export function AppRoutes() {
  return (
    <Suspense fallback={<LoadingScreen message="Loading CivicFix..." />}>
      <Routes>
        {/* Public and Root Layout Routes */}
        <Route element={<RootLayout />}>
          <Route path={ROUTES.HOME} element={<LandingPage />} />
          <Route path={ROUTES.LOGIN} element={<LoginPage />} />
          <Route path={ROUTES.REGISTER} element={<RegisterPage />} />
          <Route path={ROUTES.EXPLORE} element={<ExplorePage />} />
          <Route path="/issues/:id" element={<IssueDetailsPage />} />

          {/* Authenticated routes sharing the main navbar/footer */}
          <Route
            path={ROUTES.CREATE_ISSUE}
            element={
              <ProtectedRoute>
                <CreateIssuePage />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.MY_REPORTS}
            element={
              <ProtectedRoute>
                <MyReportsPage />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<NotFoundPage />} />
        </Route>

        {/* Protected Dashboard Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardIndexRedirect />
            </ProtectedRoute>
          }
        />

        <Route
          path={ROUTES.CITIZEN_DASHBOARD}
          element={
            <ProtectedRoute>
              <RoleGuard allowedRoles={[ROLES.CITIZEN]}>
                <DashboardLayout title="Citizen Workspace" />
              </RoleGuard>
            </ProtectedRoute>
          }
        >
          <Route index element={<CitizenDashboard />} />
        </Route>

        <Route
          path={ROUTES.STAFF_DASHBOARD}
          element={
            <ProtectedRoute>
              <RoleGuard allowedRoles={[ROLES.STAFF, ROLES.ADMIN]}>
                <DashboardLayout title="Municipal Staff Console" />
              </RoleGuard>
            </ProtectedRoute>
          }
        >
          <Route index element={<StaffDashboard />} />
        </Route>

        <Route
          path={ROUTES.ADMIN_DASHBOARD}
          element={
            <ProtectedRoute>
              <RoleGuard allowedRoles={[ROLES.ADMIN]}>
                <DashboardLayout title="Civic Administrator Console" />
              </RoleGuard>
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
