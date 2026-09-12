import { lazy, Suspense } from 'react';
import { createBrowserRouter, Outlet } from 'react-router-dom';
import { AppLayout } from '@/layouts/AppLayout';
import { AuthLayout } from '@/layouts/AuthLayout';
import { RequireAuth, RequireAdmin, GuestOnly } from '@/components/common/guards';
import { PageLoader } from '@/components/ui';
import RouteErrorPage from '@/pages/public/RouteErrorPage';

// Route-level code splitting.
const LandingPage = lazy(() => import('@/pages/public/LandingPage'));
const LoginPage = lazy(() => import('@/pages/public/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/public/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/public/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/pages/public/ResetPasswordPage'));
const NotFoundPage = lazy(() => import('@/pages/public/NotFoundPage'));

const DashboardPage = lazy(() => import('@/pages/app/DashboardPage'));
const VehiclesPage = lazy(() => import('@/pages/app/VehiclesPage'));
const VehicleFormPage = lazy(() => import('@/pages/app/VehicleFormPage'));
const VehicleDetailPage = lazy(() => import('@/pages/app/VehicleDetailPage'));
const VehicleReportPage = lazy(() => import('@/pages/app/VehicleReportPage'));
const MaintenancePage = lazy(() => import('@/pages/app/MaintenancePage'));
const ServiceHistoryPage = lazy(() => import('@/pages/app/ServiceHistoryPage'));
const ExpensesPage = lazy(() => import('@/pages/app/ExpensesPage'));
const RemindersPage = lazy(() => import('@/pages/app/RemindersPage'));
const DocumentsPage = lazy(() => import('@/pages/app/DocumentsPage'));
const NotificationsPage = lazy(() => import('@/pages/app/NotificationsPage'));
const SettingsPage = lazy(() => import('@/pages/app/SettingsPage'));

const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage'));
const AdminUsersPage = lazy(() => import('@/pages/admin/AdminUsersPage'));
const AdminVehiclesPage = lazy(() => import('@/pages/admin/AdminVehiclesPage'));
const AdminMaintenancePage = lazy(() => import('@/pages/admin/AdminMaintenancePage'));
const AdminTemplatesPage = lazy(() => import('@/pages/admin/AdminTemplatesPage'));
const AdminCatalogPage = lazy(() => import('@/pages/admin/AdminCatalogPage'));

const Page = ({ children }) => <Suspense fallback={<PageLoader label="Loading…" />}>{children}</Suspense>;

export const router = createBrowserRouter([
  {
    errorElement: <RouteErrorPage />,
    children: [
      { path: '/', element: <Page><LandingPage /></Page> },
      {
        element: (
          <GuestOnly>
            <AuthLayout />
          </GuestOnly>
        ),
        children: [
          { path: '/login', element: <Page><LoginPage /></Page> },
          { path: '/register', element: <Page><RegisterPage /></Page> },
        ],
      },
      {
        element: <AuthLayout />,
        children: [
          { path: '/forgot-password', element: <Page><ForgotPasswordPage /></Page> },
          { path: '/reset-password/:token', element: <Page><ResetPasswordPage /></Page> },
        ],
      },
      {
        path: '/app',
        element: (
          <RequireAuth>
            <AppLayout variant="app" />
          </RequireAuth>
        ),
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'vehicles', element: <VehiclesPage /> },
          { path: 'vehicles/new', element: <VehicleFormPage /> },
          { path: 'vehicles/:id', element: <VehicleDetailPage /> },
          { path: 'vehicles/:id/edit', element: <VehicleFormPage /> },
          { path: 'vehicles/:id/report', element: <VehicleReportPage /> },
          { path: 'maintenance', element: <MaintenancePage /> },
          { path: 'service-history', element: <ServiceHistoryPage /> },
          { path: 'expenses', element: <ExpensesPage /> },
          { path: 'reminders', element: <RemindersPage /> },
          { path: 'documents', element: <DocumentsPage /> },
          { path: 'notifications', element: <NotificationsPage /> },
          { path: 'settings', element: <SettingsPage /> },
        ],
      },
      {
        path: '/admin',
        element: (
          <RequireAuth>
            <RequireAdmin>
              <AppLayout variant="admin" />
            </RequireAdmin>
          </RequireAuth>
        ),
        children: [
          { index: true, element: <AdminDashboardPage /> },
          { path: 'users', element: <AdminUsersPage /> },
          { path: 'vehicles', element: <AdminVehiclesPage /> },
          { path: 'maintenance', element: <AdminMaintenancePage /> },
          { path: 'templates', element: <AdminTemplatesPage /> },
          { path: 'categories', element: <AdminCatalogPage kind="categories" /> },
          { path: 'vehicle-types', element: <AdminCatalogPage kind="vehicleTypes" /> },
          { path: 'fuel-types', element: <AdminCatalogPage kind="fuelTypes" /> },
        ],
      },
      { path: '*', element: <Page><NotFoundPage /></Page> },
    ],
  },
]);

export { Outlet };
