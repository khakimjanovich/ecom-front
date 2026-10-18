import { Alert, Button, Card, Group, SimpleGrid, Skeleton, Stack, Text, Title } from '@mantine/core';
import { IconInfoCircle, IconKey } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { messageFor } from '../../api/errors';
import { useMe } from '../../api/queries';
import { Journey } from '../../components/Journey';
import { StatusBadge } from '../../components/StatusBadge';
import { formatDate } from '../../lib/time';

export function OverviewPage() {
  const { t } = useTranslation();
  const me = useMe();
  if (me.isPending) return <Skeleton h={320} />;
  if (me.isError) return <Alert color="red">{messageFor(me.error)}</Alert>;
  const partner = me.data;
  const live = partner.status === 'ACTIVE';

  return (
    <Stack gap="lg" maw={960}>
      <Group justify="space-between">
        <div>
          <Title order={2}>{partner.companyName}</Title>
          <Text c="dimmed" size="sm">
            {partner.email}
          </Text>
        </div>
        <StatusBadge status={partner.status} />
      </Group>

      <Card withBorder padding="lg">
        <Journey status={partner.status} />
      </Card>

      <Alert icon={<IconInfoCircle size={18} />} title={t('overview.next')} color={live ? 'green' : 'indigo'}>
        {t(`next.${partner.status}`)}
        {live && (
          <Group mt="sm">
            <Button size="xs" component={Link} to="/merchant/api-clients" leftSection={<IconKey size={14} />}>
              {t('overview.createClient')}
            </Button>
          </Group>
        )}
      </Alert>

      <SimpleGrid cols={{ base: 1, sm: 3 }}>
        <Fact
          label={t('overview.email')}
          value={partner.emailVerified ? t('overview.verified') : t('overview.notVerified')}
        />
        <Fact label={t('overview.contract')} value={partner.contractNumber ?? t('overview.notSigned')} />
        <Fact label={t('overview.signedUp')} value={formatDate(partner.createdAt)} />
      </SimpleGrid>
    </Stack>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <Card withBorder padding="md">
      <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
        {label}
      </Text>
      <Text fw={500} mt={4}>
        {value}
      </Text>
    </Card>
  );
}
