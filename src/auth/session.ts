import { User } from 'oidc-client-ts';
import { useCallback } from 'react';
import { useAuth } from 'react-oidc-context';
import { currentLanguage } from '../i18n';
import { authority, config } from '../lib/config';

export type Role = 'admin' | 'partner';

/** The current access token, read where oidc-client-ts keeps it, for API calls made outside React. */
export function accessToken(): string | undefined {
  const stored = sessionStorage.getItem(`oidc.user:${authority}:${config.clientId}`);
  const user = stored ? User.fromStorageString(stored) : null;
  return user && !user.expired ? user.access_token : undefined;
}

/** Keycloak puts realm roles in the access token (realm_access.roles). Used only to shape the UI; the API decides. */
export function rolesOf(token: string | undefined): Role[] {
  if (!token) return [];
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    const roles: string[] = payload?.realm_access?.roles ?? [];
    return roles.filter((r): r is Role => r === 'admin' || r === 'partner');
  } catch {
    return [];
  }
}

export function useSession() {
  const auth = useAuth();
  const roles = rolesOf(auth.user?.access_token);
  const { signinRedirect } = auth;
  const signIn = useCallback(
    (loginHint?: string, returnTo?: string) =>
      signinRedirect({
        ui_locales: currentLanguage(),
        login_hint: loginHint,
        state: returnTo ? { returnTo } : undefined,
      }),
    [signinRedirect],
  );
  return {
    auth,
    signedIn: auth.isAuthenticated,
    roles,
    isAdmin: roles.includes('admin'),
    isPartner: roles.includes('partner'),
    /** Where this person's own area starts. */
    home: roles.includes('admin') ? '/admin/partners' : roles.includes('partner') ? '/merchant' : '/',
    /** The page the person wanted before signing in, if any. */
    returnTo: (auth.user?.state as { returnTo?: string } | undefined)?.returnTo,
    name: (auth.user?.profile.preferred_username as string | undefined) ?? '',
    /** Keycloak's login page opens in the screen language; afterwards the person returns to {@code returnTo}. */
    signIn,
  };
}
