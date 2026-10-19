import { Badge, Button, Group, Stack, Text, Timeline } from '@mantine/core';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Epos } from '../api/client';
import { type EposAction, useEposAction, useEposAudit } from '../api/queries';
import { notifyError, notifySuccess } from '../lib/notify';
import { formatDate } from '../lib/time';
import { PromptModal } from './PromptModal';

export const EPOS_STATUS_COLOR = { ACTIVE: 'green', SUSPENDED: 'yellow', REVOKED: 'gray' } as const;

export function EposStatusBadge({ status }: { status: Epos['status'] }) {
  const { t } = useTranslation();
  return (
    <Badge variant="light" color={EPOS_STATUS_COLOR[status]}>
      {t(`epos.status.${status}`)}
    </Badge>
  );
}

/** What can happen to a epos next: suspend and revoke need a reason; revoked is final. */
export function EposActions({ epos, size = 'compact-xs' }: { epos: Epos; size?: string }) {
  const { t } = useTranslation();
  const act = useEposAction();
  const [asking, setAsking] = useState<EposAction | null>(null);
  const run = (kind: EposAction, reason?: string) =>
    act.mutate(
      { eposId: epos.id, kind, reason },
      {
        onSuccess: () => {
          setAsking(null);
          notifySuccess(t('partner.done'));
        },
        onError: notifyError,
      },
    );
  return (
    <Group gap={4} wrap="nowrap">
      {epos.status === 'ACTIVE' && (
        <Button size={size} variant="subtle" color="yellow" onClick={() => setAsking('suspend')}>
          {t('epos.suspend')}
        </Button>
      )}
      {epos.status === 'SUSPENDED' && (
        <Button size={size} variant="subtle" loading={act.isPending} onClick={() => run('resume')}>
          {t('epos.resume')}
        </Button>
      )}
      {epos.status !== 'REVOKED' && (
        <Button size={size} variant="subtle" color="red" onClick={() => setAsking('revoke')}>
          {t('epos.revoke')}
        </Button>
      )}
      <PromptModal
        opened={asking !== null}
        onClose={() => setAsking(null)}
        title={asking ? t(`epos.${asking}`) : ''}
        label={t('partner.reason')}
        hint={asking === 'revoke' ? t('epos.revokeHint') : t('partner.reasonHint')}
        multiline
        confirmLabel={asking ? t(`epos.${asking}`) : ''}
        color="red"
        loading={act.isPending}
        onSubmit={(reason) => asking && run(asking, reason)}
      />
    </Group>
  );
}

/** Every change to the epos, oldest first, with who and why. */
export function EposHistory({ eposId }: { eposId: string }) {
  const { t } = useTranslation();
  const audit = useEposAudit(eposId);
  return (
    <Timeline bulletSize={10} lineWidth={2}>
      {audit.data?.map((entry) => (
        <Timeline.Item key={entry.occurredAt + entry.action} title={t(`epos.action.${entry.action}`)}>
          <Stack gap={0}>
            <Text size="xs" c="dimmed">
              {entry.actor} · {formatDate(entry.occurredAt)}
            </Text>
            {entry.reason && <Text size="xs">“{entry.reason}”</Text>}
          </Stack>
        </Timeline.Item>
      ))}
    </Timeline>
  );
}
