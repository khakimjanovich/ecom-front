import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Code,
  Group,
  Popover,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Timeline,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconHistory } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { SalesPoint, Terminal } from '../../api/client';
import { type TerminalAction, useTerminalAdmin, useTerminalAudit, useTerminals } from '../../api/queries';
import { PromptModal } from '../../components/PromptModal';
import { notifyError, notifySuccess } from '../../lib/notify';
import { formatDate } from '../../lib/time';

const STATUS_COLOR = { ACTIVE: 'green', SUSPENDED: 'yellow', REVOKED: 'gray' } as const;
const ID = /^[A-Za-z0-9]{1,30}$/;

/** A website's terminals: one live per card scheme, registered from what the processing center issued. */
export function TerminalsCard({ salesPoint }: { salesPoint: SalesPoint }) {
  const { t } = useTranslation();
  const terminals = useTerminals(salesPoint.id);
  const { register, act } = useTerminalAdmin(salesPoint.id);
  const [prompt, setPrompt] = useState<{ terminal: Terminal; kind: TerminalAction } | null>(null);
  const form = useForm({
    initialValues: { scheme: salesPoint.schemes[0] ?? null, merchantId: '', terminalId: '' },
    validate: {
      scheme: (v) => (v ? null : t('terminals.scheme')),
      merchantId: (v) => (ID.test(v.trim()) ? null : t('terminals.mid')),
      terminalId: (v) => (ID.test(v.trim()) ? null : t('terminals.tid')),
    },
  });

  const run = (terminal: Terminal, kind: TerminalAction, reason?: string) =>
    act.mutate(
      { terminalId: terminal.id, kind, reason },
      {
        onSuccess: () => {
          setPrompt(null);
          notifySuccess(t('partner.done'));
        },
        onError: notifyError,
      },
    );

  return (
    <Card withBorder padding="lg">
      <Title order={4}>{t('terminals.title')}</Title>
      <Text size="xs" c="dimmed" mb="md">
        {t('terminals.hint')}
      </Text>

      {terminals.data?.length === 0 && (
        <Text c="dimmed" size="sm" mb="md">
          {t('terminals.none')}
        </Text>
      )}
      {!!terminals.data?.length && (
        <Table.ScrollContainer minWidth={520} mb="md">
          <Table verticalSpacing="xs">
            <Table.Tbody>
              {terminals.data.map((terminal) => (
                <Table.Tr key={terminal.id}>
                  <Table.Td>{t(`scheme.${terminal.scheme}`)}</Table.Td>
                  <Table.Td>
                    <Code>{terminal.merchantId}</Code> / <Code>{terminal.terminalId}</Code>
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="light" color={STATUS_COLOR[terminal.status]}>
                      {t(`terminals.status.${terminal.status}`)}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Group gap={4} justify="flex-end" wrap="nowrap">
                      {terminal.status === 'ACTIVE' && (
                        <Button
                          size="compact-xs"
                          variant="subtle"
                          color="yellow"
                          onClick={() => setPrompt({ terminal, kind: 'suspend' })}
                        >
                          {t('terminals.suspend')}
                        </Button>
                      )}
                      {terminal.status === 'SUSPENDED' && (
                        <Button size="compact-xs" variant="subtle" onClick={() => run(terminal, 'resume')}>
                          {t('terminals.resume')}
                        </Button>
                      )}
                      {terminal.status !== 'REVOKED' && (
                        <Button
                          size="compact-xs"
                          variant="subtle"
                          color="red"
                          onClick={() => setPrompt({ terminal, kind: 'revoke' })}
                        >
                          {t('terminals.revoke')}
                        </Button>
                      )}
                      <History terminal={terminal} />
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}

      <form
        onSubmit={form.onSubmit((v) =>
          register.mutate(
            {
              scheme: v.scheme as 'UZCARD' | 'HUMO',
              merchantId: v.merchantId.trim(),
              terminalId: v.terminalId.trim(),
            },
            {
              onSuccess: () => {
                form.setValues({ merchantId: '', terminalId: '' });
                notifySuccess(t('terminals.registered'));
              },
              onError: notifyError,
            },
          ),
        )}
      >
        <Group align="flex-end" grow>
          <Select
            label={t('terminals.scheme')}
            data={salesPoint.schemes.map((s) => ({ value: s, label: t(`scheme.${s}`) }))}
            allowDeselect={false}
            {...form.getInputProps('scheme')}
          />
          <TextInput label={t('terminals.mid')} {...form.getInputProps('merchantId')} />
          <TextInput label={t('terminals.tid')} {...form.getInputProps('terminalId')} />
        </Group>
        <Group justify="flex-end" mt="sm">
          <Button
            type="submit"
            variant="light"
            loading={register.isPending}
            disabled={!salesPoint.schemes.length}
          >
            {t('terminals.register')}
          </Button>
        </Group>
      </form>

      <PromptModal
        opened={prompt !== null}
        onClose={() => setPrompt(null)}
        title={prompt ? t(`terminals.${prompt.kind}`) : ''}
        label={t('partner.reason')}
        hint={t('partner.reasonHint')}
        multiline
        confirmLabel={prompt ? t(`terminals.${prompt.kind}`) : ''}
        color="red"
        loading={act.isPending}
        onSubmit={(reason) => prompt && run(prompt.terminal, prompt.kind, reason)}
      />
    </Card>
  );
}

function History({ terminal }: { terminal: Terminal }) {
  const { t } = useTranslation();
  const [opened, setOpened] = useState(false);
  const audit = useTerminalAudit(terminal.id, opened);
  return (
    <Popover opened={opened} onChange={setOpened} position="bottom-end" width={300} withArrow shadow="md">
      <Popover.Target>
        <ActionIcon
          variant="subtle"
          color="gray"
          onClick={() => setOpened((o) => !o)}
          aria-label={t('terminals.history')}
        >
          <IconHistory size={16} />
        </ActionIcon>
      </Popover.Target>
      <Popover.Dropdown>
        <Timeline bulletSize={10} lineWidth={2}>
          {audit.data?.map((entry) => (
            <Timeline.Item
              key={entry.occurredAt + entry.action}
              title={t(`terminals.action.${entry.action}`)}
            >
              <Stack gap={0}>
                <Text size="xs" c="dimmed">
                  {entry.actor} · {formatDate(entry.occurredAt)}
                </Text>
                {entry.reason && <Text size="xs">“{entry.reason}”</Text>}
              </Stack>
            </Timeline.Item>
          ))}
        </Timeline>
      </Popover.Dropdown>
    </Popover>
  );
}
