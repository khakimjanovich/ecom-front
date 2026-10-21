import { Alert, Badge, Button, Group, Stack, Table, Text, Timeline } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Epos, UzcardTerminal } from '../api/client';
import { messageFor } from '../api/errors';
import { type EposAction, useEposAction, useEposAudit, useEposUzcard } from '../api/queries';
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
          notifySuccess(
            kind === 'revoke' && epos.scheme === 'UZCARD' ? t('epos.revokedAtUzcard') : t('partner.done'),
          );
        },
        // A failed UZCARD revoke changed nothing on either side: say so, and that suspending stops payments meanwhile.
        onError: (error) =>
          kind === 'revoke' && epos.scheme === 'UZCARD'
            ? notifications.show({ color: 'red', title: t('epos.notRevoked'), message: messageFor(error) })
            : notifyError(error),
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
        hint={
          asking === 'revoke'
            ? t(epos.scheme === 'UZCARD' ? 'epos.revokeUzcardHint' : 'epos.revokeHint')
            : t('partner.reasonHint')
        }
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

/** Whether SV-Gate agrees with our record: a terminal we route payments to must be there, a revoked one must not. */
export function uzcardVerdict(
  status: Epos['status'],
  view: UzcardTerminal,
): 'agrees' | 'missing' | 'leftover' {
  const there = !!view.check;
  if (status === 'REVOKED') return there ? 'leftover' : 'agrees';
  return there ? 'agrees' : 'missing';
}

const UZCARD_FIELDS = ['username', 'name', 'type', 'purpose', 'port', 'instId', 'pid'] as const;

/** SV-Gate's two views of a UZCARD e-POS terminal (terminal.check and terminal.get), next to our record. */
export function UzcardCheck({ epos }: { epos: Epos }) {
  const { t } = useTranslation();
  const [asked, setAsked] = useState(false);
  const view = useEposUzcard(epos.id, asked);
  if (!asked) {
    return (
      <Button size="xs" variant="light" onClick={() => setAsked(true)}>
        {t('epos.uzcard.check')}
      </Button>
    );
  }
  if (view.isError) return <Alert color="red">{messageFor(view.error)}</Alert>;
  if (!view.data) return <Text size="sm">{t('epos.uzcard.checking')}</Text>;
  const verdict = uzcardVerdict(epos.status, view.data);
  return (
    <Stack gap="xs">
      <Alert color={verdict === 'agrees' ? 'green' : 'red'}>{t(`epos.uzcard.${verdict}`)}</Alert>
      <Table withTableBorder fz="xs" verticalSpacing={4}>
        <Table.Thead>
          <Table.Tr>
            <Table.Th />
            <Table.Th>terminal.check</Table.Th>
            <Table.Th>terminal.get</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {UZCARD_FIELDS.map((field) => (
            <Table.Tr key={field}>
              <Table.Td c="dimmed">{t(`epos.uzcard.${field}`)}</Table.Td>
              <Table.Td>{view.data.check?.[field] ?? '—'}</Table.Td>
              <Table.Td>{view.data.listing?.[field] ?? '—'}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      <Group justify="flex-end">
        <Button size="compact-xs" variant="subtle" loading={view.isFetching} onClick={() => view.refetch()}>
          {t('epos.uzcard.again')}
        </Button>
      </Group>
    </Stack>
  );
}
