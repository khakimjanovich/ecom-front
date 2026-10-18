import { Button, Container, Group, SimpleGrid, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconKey, IconShieldCheck, IconUsersGroup } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate } from 'react-router';
import { useSession } from '../../auth/session';

const POINTS = [
  { key: 'card', icon: IconShieldCheck },
  { key: 'people', icon: IconUsersGroup },
  { key: 'keys', icon: IconKey },
];

export function LandingPage() {
  const { t } = useTranslation();
  const { signedIn, signIn } = useSession();
  if (signedIn) return <Navigate to="/app" replace />;

  return (
    <Container size="md" py={64}>
      <Stack gap="lg" align="flex-start">
        <Title order={1} fz={{ base: 34, sm: 48 }} lh={1.1}>
          {t('landing.title')}
        </Title>
        <Text size="lg" c="dimmed" maw={560}>
          {t('landing.subtitle')}
        </Text>
        <Group>
          <Button size="md" component={Link} to="/signup">
            {t('landing.create')}
          </Button>
          <Button size="md" variant="default" onClick={() => void signIn()}>
            {t('common.signIn')}
          </Button>
        </Group>
      </Stack>
      <SimpleGrid cols={{ base: 1, sm: 3 }} mt={64} spacing="xl">
        {POINTS.map(({ key, icon: Icon }) => (
          <Stack key={key} gap={6}>
            <ThemeIcon variant="light" size="lg">
              <Icon size={20} />
            </ThemeIcon>
            <Text fw={600}>{t(`landing.points.${key}.title`)}</Text>
            <Text size="sm" c="dimmed">
              {t(`landing.points.${key}.text`)}
            </Text>
          </Stack>
        ))}
      </SimpleGrid>
    </Container>
  );
}
