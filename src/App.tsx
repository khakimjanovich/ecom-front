import { Center, Loader } from '@mantine/core';
import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { RequireRole } from './auth/RequireRole';
import { useSession } from './auth/session';
import { Shell } from './layout/Shell';
import { LandingPage } from './pages/public/LandingPage';
import { NotFoundPage } from './pages/public/NotFoundPage';
import { SignUpPage } from './pages/public/SignUpPage';
import { VerifyEmailPage } from './pages/public/VerifyEmailPage';

// The merchant and admin areas load on first visit, so the public pages stay small.
const page = <T extends string>(load: () => Promise<Record<T, React.ComponentType>>, name: T) =>
  lazy(() => load().then((module) => ({ default: module[name] })));
const OverviewPage = page(() => import('./pages/merchant/OverviewPage'), 'OverviewPage');
const ApiClientsPage = page(() => import('./pages/merchant/ApiClientsPage'), 'ApiClientsPage');
const PartnersPage = page(() => import('./pages/admin/PartnersPage'), 'PartnersPage');
const PartnerPage = page(() => import('./pages/admin/PartnerPage'), 'PartnerPage');
const ApprovalsPage = page(() => import('./pages/admin/ApprovalsPage'), 'ApprovalsPage');

const loading = (
  <Center mih="40vh">
    <Loader />
  </Center>
);

export function App() {
  return (
    <Suspense fallback={loading}>
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<LandingPage />} />
          <Route path="signup" element={<SignUpPage />} />
          <Route path="verify" element={<VerifyEmailPage />} />
          <Route path="app" element={<HomeByRole />} />

          <Route path="merchant" element={<RequireRole role="partner" />}>
            <Route index element={<OverviewPage />} />
            <Route path="api-clients" element={<ApiClientsPage />} />
          </Route>

          <Route path="admin" element={<RequireRole role="admin" />}>
            <Route index element={<Navigate to="partners" replace />} />
            <Route path="partners" element={<PartnersPage />} />
            <Route path="partners/:id" element={<PartnerPage />} />
            <Route path="approvals" element={<ApprovalsPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

/** After sign-in: back to the page the person wanted, else their own area. */
function HomeByRole() {
  const { auth, home, returnTo } = useSession();
  if (auth.isLoading) return null;
  if (!auth.isAuthenticated) return <Navigate to="/" replace />;
  return <Navigate to={returnTo ?? home} replace />;
}
