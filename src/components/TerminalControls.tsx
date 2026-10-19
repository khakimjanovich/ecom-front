import { Badge, Button, Group, Stack, Text, Timeline } from '@mantine/core';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Terminal } from '../api/client';
import { type TerminalAction, useTerminalAction, useTerminalAudit } from '../api/queries';
import { notifyError, notifySuccess } from '../lib/notify';
import { formatDate } from '../lib/time';
import { PromptModal } from './PromptModal';

export const TERMINAL_STATUS_COLOR = { ACTIVE: 'green', SUSPENDED: 'yellow', REVOKED: 'gray' } as const;

export function TerminalStatusBadge({ status }: { status: Terminal['status'] }) {
  const { t } = useTranslation();
  return (
    <Badge variant="light" color={TERMINAL_STATUS_COLOR[status]}>
      {t(`terminals.status.${status}`)}
    </Badge>
  );
}

/** What can happen to a terminal next: suspend and revoke need a reason; revoked is final. */
export function TerminalActions({ terminal, size = 'compact-xs' }: { terminal: Terminal; size?: string }) {
  const { t } = useTranslation();
  const act = useTerminalAction();
  const [asking, setAsking] = useState<TerminalAction | null>(null);
  const run = (kind: TerminalAction, reason?: string) =>
    act.mutate(
      { terminalId: terminal.id, kind, reason },
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
      {terminal.status === 'ACTIVE' && (
        <Button size={size} variant="subtle" color="yellow" onClick={() => setAsking('suspend')}>
          {t('terminals.suspend')}
        </Button>
      )}
      {terminal.status === 'SUSPENDED' && (
        <Button size={size} variant="subtle" loading={act.isPending} onClick={() => run('resume')}>
          {t('terminals.resume')}
        </Button>
      )}
      {terminal.status !== 'REVOKED' && (
        <Button size={size} variant="subtle" color="red" onClick={() => setAsking('revoke')}>
          {t('terminals.revoke')}
        </Button>
      )}
      <PromptModal
        opened={asking !== null}
        onClose={() => setAsking(null)}
        title={asking ? t(`terminals.${asking}`) : ''}
        label={t('partner.reason')}
        hint={asking === 'revoke' ? t('terminals.revokeHint') : t('partner.reasonHint')}
        multiline
        confirmLabel={asking ? t(`terminals.${asking}`) : ''}
        color="red"
        loading={act.isPending}
        onSubmit={(reason) => asking && run(asking, reason)}
      />
    </Group>
  );
}

/** Every change to the terminal, oldest first, with who and why. */
export function TerminalHistory({ terminalId }: { terminalId: string }) {
  const { t } = useTranslation();
  const audit = useTerminalAudit(terminalId);
  return (
    <Timeline bulletSize={10} lineWidth={2}>
      {audit.data?.map((entry) => (
        <Timeline.Item key={entry.occurredAt + entry.action} title={t(`terminals.action.${entry.action}`)}>
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
