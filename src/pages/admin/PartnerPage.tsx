import {
  Alert,
  Anchor,
  Button,
  Card,
  Grid,
  Group,
  Skeleton,
  Stack,
  Text,
  Timeline,
  Title,
  Tooltip,
} from '@mantine/core';
import { modals } from '@mantine/modals';
import { IconArrowLeft, IconArrowRight } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import type { Partner } from '../../api/client';
import { messageFor } from '../../api/errors';
import { useHistory, usePartner, usePartnerAction, usePartnerSalesPoints } from '../../api/queries';
import { Journey } from '../../components/Journey';
import { PromptModal } from '../../components/PromptModal';
import { SalesPointBadge } from '../../components/SalesPointFacts';
import { StatusBadge } from '../../components/StatusBadge';
import { notifyError, notifySuccess } from '../../lib/notify';
import { ACTIONS, type AdminAction, DESTRUCTIVE, NEEDS_REASON } from '../../lib/partner';
import { formatDate } from '../../lib/time';

/** One merchant: where it stands, what an admin can do next, and everything that happened so far. */
export function PartnerPage() {
  const { t } = useTranslation();
  const { id = '' } = useParams();
  const partner = usePartner(id);
  const history = useHistory(id);

  if (partner.isPending) return <Skeleton h={400} />;
  if (partner.isError) return <Alert color="red">{messageFor(partner.error)}</Alert>;

  return (
    <Stack gap="lg" maw={1100}>
      <Anchor component={Link} to="/admin/partners" size="sm">
        <Group gap={4}>
          <IconArrowLeft size={14} />
          {t('partner.back')}
        </Group>
      </Anchor>

      <Group justify="space-between">
        <div>
          <Title order={2}>{partner.data.companyName}</Title>
          <Text c="dimmed" size="sm">
            {partner.data.email}
            {partner.data.contractNumber &&
              ` · ${t('partner.contractNumber')}: ${partner.data.contractNumber}`}
          </Text>
        </div>
        <StatusBadge status={partner.data.status} />
      </Group>

      <Card withBorder padding="lg">
        <Journey status={partner.data.status} />
      </Card>

      <Grid gap="lg">
        <Grid.Col span={{ base: 12, md: 5 }}>
          <Stack>
            <Actions partner={partner.data} />
            <Websites partnerId={partner.data.id} />
          </Stack>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 7 }}>
          <Card withBorder padding="lg">
            <Title order={4} mb="md">
              {t('partner.history')}
            </Title>
            {history.data?.length === 0 && <Text c="dimmed">{t('partner.noHistory')}</Text>}
            <Timeline bulletSize={14} lineWidth={2} active={(history.data?.length ?? 0) - 1}>
              {history.data?.map((change) => (
                <Timeline.Item
                  key={change.changedAt + change.toStatus}
                  title={
                    <Group gap={6}>
                      <Text size="sm">{t(`status.${change.fromStatus}`)}</Text>
                      <IconArrowRight size={14} />
                      <Text size="sm" fw={600}>
                        {t(`status.${change.toStatus}`)}
                      </Text>
                    </Group>
                  }
                >
                  <Text size="xs" c="dimmed">
                    {formatDate(change.changedAt)} · {t('partner.by', { name: change.changedBy })}
                  </Text>
                  {change.reason && (
                    <Text size="sm" mt={4}>
                      “{change.reason}”
                    </Text>
                  )}
                </Timeline.Item>
              ))}
            </Timeline>
          </Card>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}

function Actions({ partner }: { partner: Partner }) {
  const { t } = useTranslation();
  const act = usePartnerAction(partner.id);
  const [prompt, setPrompt] = useState<AdminAction | null>(null);
  const actions = ACTIONS[partner.status];

  const run = (kind: AdminAction, value?: string) =>
    act.mutate(
      { kind, reason: value, contractNumber: value },
      {
        onSuccess: () => {
          setPrompt(null);
          notifySuccess(kind === 'requestActivation' ? t('partner.requested') : t('partner.done'));
        },
        onError: notifyError,
      },
    );

  const start = (kind: AdminAction) => {
    if (kind === 'contract' || NEEDS_REASON.includes(kind)) return setPrompt(kind);
    modals.openConfirmModal({
      title: t(`partner.action.${kind}`),
      children: <Text size="sm">{t(`partner.explain.${kind}`)}</Text>,
      labels: { confirm: t(`partner.action.${kind}`), cancel: t('common.cancel') },
      onConfirm: () => run(kind),
    });
  };

  return (
    <Card withBorder padding="lg">
      <Title order={4} mb="md">
        {t('partner.actions')}
      </Title>
      {actions.length === 0 && <Text c="dimmed">{t('partner.noActions')}</Text>}
      <Stack gap="sm">
        {actions.map((kind) => {
          const blocked = kind === 'verify' && !partner.emailVerified;
          return (
            <Tooltip key={kind} label={t('partner.emailNotVerified')} disabled={!blocked} multiline w={260}>
              <Stack gap={2}>
                <Button
                  variant={DESTRUCTIVE.includes(kind) ? 'light' : 'filled'}
                  color={DESTRUCTIVE.includes(kind) ? 'red' : undefined}
                  disabled={blocked}
                  loading={act.isPending && act.variables?.kind === kind}
                  onClick={() => start(kind)}
                  fullWidth
                >
                  {t(`partner.action.${kind}`)}
                </Button>
                <Text size="xs" c="dimmed">
                  {t(`partner.explain.${kind}`)}
                </Text>
              </Stack>
            </Tooltip>
          );
        })}
      </Stack>

      <PromptModal
        opened={prompt !== null}
        onClose={() => setPrompt(null)}
        title={prompt ? t(`partner.action.${prompt}`) : ''}
        description={prompt ? t(`partner.explain.${prompt}`) : undefined}
        label={prompt === 'contract' ? t('partner.contractNumber') : t('partner.reason')}
        hint={prompt === 'contract' ? t('partner.contractHint') : t('partner.reasonHint')}
        multiline={prompt !== 'contract'}
        confirmLabel={prompt ? t(`partner.action.${prompt}`) : ''}
        color={prompt && DESTRUCTIVE.includes(prompt) ? 'red' : undefined}
        loading={act.isPending}
        onSubmit={(value) => prompt && run(prompt, value)}
      />
    </Card>
  );
}

function Websites({ partnerId }: { partnerId: string }) {
  const { t } = useTranslation();
  const salesPoints = usePartnerSalesPoints(partnerId);
  return (
    <Card withBorder padding="lg">
      <Title order={4} mb="md">
        {t('salesPoint.websitesOf')}
      </Title>
      {salesPoints.data?.length === 0 && <Text c="dimmed">{t('salesPoint.noWebsites')}</Text>}
      <Stack gap="xs">
        {salesPoints.data?.map((salesPoint) => (
          <Group key={salesPoint.id} justify="space-between" wrap="nowrap">
            <div style={{ minWidth: 0 }}>
              <Anchor component={Link} to={`/admin/sales-points/${salesPoint.id}`} fw={500}>
                {salesPoint.name}
              </Anchor>
              <Text size="xs" c="dimmed" truncate>
                {salesPoint.websiteUrl}
              </Text>
            </div>
            <SalesPointBadge status={salesPoint.status} />
          </Group>
        ))}
      </Stack>
    </Card>
  );
}
