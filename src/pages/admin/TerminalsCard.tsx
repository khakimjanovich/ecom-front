import {
  ActionIcon,
  Button,
  Card,
  Code,
  Group,
  Popover,
  Select,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconHistory } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { SalesPoint, Terminal } from '../../api/client';
import { useRegisterTerminal, useTerminals } from '../../api/queries';
import { TerminalActions, TerminalHistory, TerminalStatusBadge } from '../../components/TerminalControls';
import { notifyError, notifySuccess } from '../../lib/notify';

const ID = /^[A-Za-z0-9]{1,30}$/;

/** A website's terminals: one live per card scheme, registered from what the processing center issued. */
export function TerminalsCard({ salesPoint }: { salesPoint: SalesPoint }) {
  const { t } = useTranslation();
  const terminals = useTerminals(salesPoint.id);
  const register = useRegisterTerminal();
  const form = useForm({
    initialValues: { scheme: salesPoint.schemes[0] ?? null, merchantId: '', terminalId: '' },
    validate: {
      scheme: (v) => (v ? null : t('terminals.scheme')),
      merchantId: (v) => (ID.test(v.trim()) ? null : t('terminals.mid')),
      terminalId: (v) => (ID.test(v.trim()) ? null : t('terminals.tid')),
    },
  });

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
                    <TerminalStatusBadge status={terminal.status} />
                  </Table.Td>
                  <Table.Td>
                    <Group gap={4} justify="flex-end" wrap="nowrap">
                      <TerminalActions terminal={terminal} />
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
              salesPointId: salesPoint.id,
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
    </Card>
  );
}

function History({ terminal }: { terminal: Terminal }) {
  const { t } = useTranslation();
  const [opened, setOpened] = useState(false);
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
      <Popover.Dropdown>{opened && <TerminalHistory terminalId={terminal.id} />}</Popover.Dropdown>
    </Popover>
  );
}
