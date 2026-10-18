import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import './i18n';

import { MantineProvider } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WebStorageStateStore } from 'oidc-client-ts';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from 'react-oidc-context';
import { BrowserRouter } from 'react-router';
import { App } from './App';
import { authority, config } from './lib/config';
import { theme } from './theme';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 10_000 } },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider
      authority={authority}
      client_id={config.clientId}
      redirect_uri={`${location.origin}/app`}
      post_logout_redirect_uri={location.origin}
      userStore={new WebStorageStateStore({ store: sessionStorage })}
      onSigninCallback={() => history.replaceState({}, document.title, location.pathname)}
    >
      <QueryClientProvider client={queryClient}>
        <MantineProvider theme={theme}>
          <Notifications position="top-right" />
          <ModalsProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </ModalsProvider>
        </MantineProvider>
      </QueryClientProvider>
    </AuthProvider>
  </StrictMode>,
);
