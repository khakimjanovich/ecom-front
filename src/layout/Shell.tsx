import { AppShell, Avatar, Burger, Button, Group, Menu, NavLink, Text, UnstyledButton } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconBuildingStore,
  IconChecklist,
  IconCreditCard,
  IconDeviceDesktopAnalytics,
  IconKey,
  IconLayoutDashboard,
  IconLogout,
  IconPercentage,
  IconReceipt,
  IconUsers,
  IconWorldWww,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Link, Outlet, useLocation } from 'react-router';
import { useSession } from '../auth/session';
import { LanguageMenu } from './LanguageMenu';

type NavItem = { to: string; label: string; icon: typeof IconKey; exact?: boolean };

const MERCHANT_NAV: NavItem[] = [
  { to: '/merchant', label: 'nav.overview', icon: IconLayoutDashboard, exact: true },
  { to: '/merchant/sales-points', label: 'nav.salesPoints', icon: IconWorldWww },
  { to: '/merchant/api-clients', label: 'nav.apiClients', icon: IconKey },
];
const ADMIN_NAV: NavItem[] = [
  { to: '/admin/partners', label: 'nav.merchants', icon: IconUsers },
  { to: '/admin/payments', label: 'nav.payments', icon: IconReceipt },
  { to: '/admin/fees', label: 'nav.fees', icon: IconPercentage },
  { to: '/admin/terminals', label: 'nav.terminals', icon: IconDeviceDesktopAnalytics },
  { to: '/admin/cards', label: 'nav.cards', icon: IconCreditCard },
  { to: '/admin/approvals', label: 'nav.approvals', icon: IconChecklist },
];

/** The frame of every page: brand, language, account and, once signed in, the navigation for the person's role. */
export function Shell() {
  const { t } = useTranslation();
  const { auth, signedIn, isAdmin, isPartner, name, home, signIn } = useSession();
  const [opened, { toggle, close }] = useDisclosure();
  const { pathname } = useLocation();
  const nav = isAdmin ? ADMIN_NAV : isPartner ? MERCHANT_NAV : [];

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={nav.length ? { width: 240, breakpoint: 'sm', collapsed: { mobile: !opened } } : undefined}
      padding="lg"
    >
      <AppShell.Header px="md">
        <Group h="100%" justify="space-between" wrap="nowrap">
          <Group gap="xs" wrap="nowrap">
            {nav.length > 0 && (
              <Burger
                opened={opened}
                onClick={toggle}
                hiddenFrom="sm"
                size="sm"
                aria-label={t('common.menu')}
              />
            )}
            <UnstyledButton component={Link} to={home}>
              <Group gap={8} wrap="nowrap">
                <IconBuildingStore size={24} color="var(--mantine-color-indigo-6)" />
                <Text fw={700}>heeyPay</Text>
                <Text c="dimmed" size="sm" visibleFrom="sm">
                  {isAdmin ? t('brand.bankConsole') : t('brand.merchantPortal')}
                </Text>
              </Group>
            </UnstyledButton>
          </Group>

          <Group gap="xs" wrap="nowrap">
            <LanguageMenu />
            {signedIn ? (
              <Menu position="bottom-end" withArrow>
                <Menu.Target>
                  <UnstyledButton aria-label={t('common.account')}>
                    <Group gap="xs" wrap="nowrap">
                      <Avatar size="sm" color="indigo" name={name} />
                      <Text size="sm" visibleFrom="sm">
                        {name}
                      </Text>
                    </Group>
                  </UnstyledButton>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item
                    leftSection={<IconLogout size={16} />}
                    onClick={() => void auth.signoutRedirect()}
                  >
                    {t('common.signOut')}
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            ) : (
              <>
                <Button variant="subtle" onClick={() => void signIn()}>
                  {t('common.signIn')}
                </Button>
                <Button component={Link} to="/signup" visibleFrom="xs">
                  {t('common.signUp')}
                </Button>
              </>
            )}
          </Group>
        </Group>
      </AppShell.Header>

      {nav.length > 0 && (
        <AppShell.Navbar p="sm">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              component={Link}
              to={item.to}
              label={t(item.label)}
              leftSection={<item.icon size={18} />}
              active={item.exact ? pathname === item.to : pathname.startsWith(item.to)}
              onClick={close}
            />
          ))}
        </AppShell.Navbar>
      )}

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
