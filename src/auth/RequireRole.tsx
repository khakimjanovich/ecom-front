import { Anchor, Center, Loader } from '@mantine/core';
import { IconShieldLock } from '@tabler/icons-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Outlet } from 'react-router';
import { Empty } from '../layout/Empty';
import { type Role, useSession } from './session';

/** Sends signed-out visitors to Keycloak, and explains (instead of failing) when the role is missing. */
export function RequireRole({ role }: { role: Role }) {
  const { t } = useTranslation();
  const { auth, signedIn, roles, signIn } = useSession();

  useEffect(() => {
    if (!auth.isLoading && !signedIn && !auth.activeNavigator)
      void signIn(undefined, location.pathname + location.search);
  }, [auth.isLoading, auth.activeNavigator, signedIn, signIn]);

  if (!signedIn) {
    return (
      <Center mih="50vh">
        <Loader />
      </Center>
    );
  }
  if (!roles.includes(role)) {
    return (
      <Empty
        icon={IconShieldLock}
        title={t('role.title')}
        text={t(`role.${role}`)}
        action={
          <Anchor component={Link} to="/">
            {t('role.home')}
          </Anchor>
        }
      />
    );
  }
  return <Outlet />;
}
