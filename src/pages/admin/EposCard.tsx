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
import type { SalesPoint, Epos } from '../../api/client';
import { useRegisterEpos, useEposList } from '../../api/queries';
import { EposActions, EposHistory, EposStatusBadge } from '../../components/EposControls';
import { notifyError, notifySuccess } from '../../lib/notify';

const ID = /^[A-Za-z0-9]{1,30}$/;

/** A website's e-POS terminals: one live per card scheme, registered from what the processing center issued. */
export function EposCard({ salesPoint }: { salesPoint: SalesPoint }) {
  const { t } = useTranslation();
  const eposList = useEposList(salesPoint.id);
  const register = useRegisterEpos();
  const form = useForm({
    initialValues: { scheme: salesPoint.schemes[0] ?? null, merchantId: '', terminalId: '' },
    validate: {
      scheme: (v) => (v ? null : t('epos.scheme')),
      merchantId: (v) => (ID.test(v.trim()) ? null : t('epos.mid')),
      terminalId: (v) => (ID.test(v.trim()) ? null : t('epos.tid')),
    },
  });

  return (
    <Card withBorder padding="lg">
      <Title order={4}>{t('epos.title')}</Title>
      <Text size="xs" c="dimmed" mb="md">
        {t('epos.hint')}
      </Text>

      {eposList.data?.length === 0 && (
        <Text c="dimmed" size="sm" mb="md">
          {t('epos.none')}
        </Text>
      )}
      {!!eposList.data?.length && (
        <Table.ScrollContainer minWidth={520} mb="md">
          <Table verticalSpacing="xs">
            <Table.Tbody>
              {eposList.data.map((epos) => (
                <Table.Tr key={epos.id}>
                  <Table.Td>{t(`scheme.${epos.scheme}`)}</Table.Td>
                  <Table.Td>
                    <Code>{epos.merchantId}</Code> / <Code>{epos.terminalId}</Code>
                  </Table.Td>
                  <Table.Td>
                    <EposStatusBadge status={epos.status} />
                  </Table.Td>
                  <Table.Td>
                    <Group gap={4} justify="flex-end" wrap="nowrap">
                      <EposActions epos={epos} />
                      <History epos={epos} />
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
                notifySuccess(t('epos.registered'));
              },
              onError: notifyError,
            },
          ),
        )}
      >
        <Group align="flex-end" grow>
          <Select
            label={t('epos.scheme')}
            data={salesPoint.schemes.map((s) => ({ value: s, label: t(`scheme.${s}`) }))}
            allowDeselect={false}
            {...form.getInputProps('scheme')}
          />
          <TextInput label={t('epos.mid')} {...form.getInputProps('merchantId')} />
          <TextInput label={t('epos.tid')} {...form.getInputProps('terminalId')} />
        </Group>
        <Group justify="flex-end" mt="sm">
          <Button
            type="submit"
            variant="light"
            loading={register.isPending}
            disabled={!salesPoint.schemes.length}
          >
            {t('epos.register')}
          </Button>
        </Group>
      </form>
    </Card>
  );
}

function History({ epos }: { epos: Epos }) {
  const { t } = useTranslation();
  const [opened, setOpened] = useState(false);
  return (
    <Popover opened={opened} onChange={setOpened} position="bottom-end" width={300} withArrow shadow="md">
      <Popover.Target>
        <ActionIcon
          variant="subtle"
          color="gray"
          onClick={() => setOpened((o) => !o)}
          aria-label={t('epos.history')}
        >
          <IconHistory size={16} />
        </ActionIcon>
      </Popover.Target>
      <Popover.Dropdown>{opened && <EposHistory eposId={epos.id} />}</Popover.Dropdown>
    </Popover>
  );
}
