import { User } from 'oidc-client-ts';
import { useCallback } from 'react';
import { useAuth } from 'react-oidc-context';
import { currentLanguage } from '../i18n';
import { authority, config } from '../lib/config';

export type Role = 'admin' | 'partner';

const USER_KEY = `oidc.user:${authority}:${config.clientId}`;

/** The current access token, read where oidc-client-ts keeps it, for API calls made outside React. */
export function accessToken(): string | undefined {
  const stored = sessionStorage.getItem(USER_KEY);
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

/**
 * The server refused our token: Keycloak no longer knows this session (it ended, or Keycloak was
 * restarted). Forget it here too and start again signed out, instead of showing pages that can't load.
 */
/** Whether this tab holds a session, even one whose token has expired. */
export const hasSession = () => sessionStorage.getItem(USER_KEY) !== null;

export function sessionEnded() {
  sessionStorage.removeItem(USER_KEY);
  location.assign('/');
}

export function useSession() {
  const auth = useAuth();
  const roles = rolesOf(auth.user?.access_token);
  const { signinRedirect, signoutRedirect, removeUser } = auth;
  const signIn = useCallback(
    (loginHint?: string, returnTo?: string) =>
      signinRedirect({
        ui_locales: currentLanguage(),
        login_hint: loginHint,
        state: returnTo ? { returnTo } : undefined,
      }),
    [signinRedirect],
  );
  /**
   * Ends the session at Keycloak (its end-session endpoint, a full-page redirect) and comes back
   * signed out. If Keycloak can't be reached, the session is forgotten here at least.
   */
  const signOut = useCallback(async () => {
    try {
      await signoutRedirect();
    } catch {
      await removeUser();
      location.assign('/');
    }
  }, [signoutRedirect, removeUser]);
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
    signOut,
  };
}
