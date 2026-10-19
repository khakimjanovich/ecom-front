import {
  Alert,
  Button,
  Card,
  Code,
  Divider,
  Drawer,
  Group,
  Modal,
  Pagination,
  Select,
  SimpleGrid,
  Skeleton,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDebouncedValue } from '@mantine/hooks';
import { IconDeviceDesktopAnalytics, IconPlus, IconSearch } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Terminal } from '../../api/client';
import { messageFor } from '../../api/errors';
import {
  type TerminalFilter,
  usePartnerSalesPoints,
  useRegisterTerminal,
  useSalesPoint,
  useTerminalSearch,
} from '../../api/queries';
import { MerchantName, MerchantSelect, SalesPointSelect } from '../../components/MerchantPicker';
import { TerminalActions, TerminalHistory, TerminalStatusBadge } from '../../components/TerminalControls';
import { Empty } from '../../layout/Empty';
import { PageTitle } from '../../layout/PageTitle';
import { notifyError, notifySuccess } from '../../lib/notify';
import { formatDate } from '../../lib/time';

const SCHEMES = ['UZCARD', 'HUMO'] as const;
const STATUSES = ['ACTIVE', 'SUSPENDED', 'REVOKED'] as const;
const ID = /^[A-Za-z0-9]{1,30}$/;
const PAGE_SIZE = 20;

/** Every terminal the processing center issued, across all websites: find one, see its history, act on it. */
export function TerminalsPage() {
  const { t } = useTranslation();
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [salesPointId, setSalesPointId] = useState<string | null>(null);
  const [scheme, setScheme] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [q] = useDebouncedValue(search.trim(), 300);
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<Terminal | null>(null);
  const [registering, setRegistering] = useState(false);

  const filter: TerminalFilter = {
    salesPointId: salesPointId ?? undefined,
    scheme: (scheme as TerminalFilter['scheme']) ?? undefined,
    status: (status as TerminalFilter['status']) ?? undefined,
    q: q || undefined,
    page: page - 1,
    size: PAGE_SIZE,
  };
  const terminals = useTerminalSearch(filter);
  const reset =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      set(v);
      setPage(1);
    };
  // The open drawer shows the latest copy of its terminal after an action.
  const current = open && (terminals.data?.items.find((x) => x.id === open.id) ?? open);

  return (
    <>
      <PageTitle
        title={t('terminalsPage.title')}
        description={t('terminalsPage.description')}
        actions={
          <Button leftSection={<IconPlus size={16} />} onClick={() => setRegistering(true)}>
            {t('terminals.register')}
          </Button>
        }
      />
      <Card withBorder padding="sm" mb="md">
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 5 }}>
          <MerchantSelect
            placeholder={t('payments.allMerchants')}
            aria-label={t('fees.merchant')}
            value={partnerId}
            onChange={(v) => {
              setPartnerId(v);
              setSalesPointId(null);
              setPage(1);
            }}
          />
          <SalesPointSelect
            partnerId={partnerId}
            placeholder={t('terminalsPage.allWebsites')}
            aria-label={t('fees.salesPoint')}
            value={salesPointId}
            onChange={reset(setSalesPointId)}
          />
          <Select
            clearable
            placeholder={t('fees.anyScheme')}
            aria-label={t('terminals.scheme')}
            data={SCHEMES.map((s) => ({ value: s, label: t(`scheme.${s}`) }))}
            value={scheme}
            onChange={reset(setScheme)}
          />
          <Select
            clearable
            placeholder={t('terminalsPage.anyStatus')}
            aria-label={t('fees.status')}
            data={STATUSES.map((s) => ({ value: s, label: t(`terminals.status.${s}`) }))}
            value={status}
            onChange={reset(setStatus)}
          />
          <TextInput
            placeholder={t('terminalsPage.search')}
            aria-label={t('terminalsPage.search')}
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => {
              setSearch(e.currentTarget.value);
              setPage(1);
            }}
          />
        </SimpleGrid>
      </Card>

      {terminals.isPending && <Skeleton h={240} />}
      {terminals.isError && <Alert color="red">{messageFor(terminals.error)}</Alert>}
      {terminals.data?.items.length === 0 && (
        <Empty
          icon={IconDeviceDesktopAnalytics}
          title={t('terminalsPage.empty')}
          text={t('terminalsPage.emptyText')}
        />
      )}
      {!!terminals.data?.items.length && (
        <Card withBorder padding={0}>
          <Table.ScrollContainer minWidth={820}>
            <Table verticalSpacing="sm" horizontalSpacing="md" highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t('fees.salesPoint')}</Table.Th>
                  <Table.Th>{t('terminals.scheme')}</Table.Th>
                  <Table.Th>{t('terminals.mid')}</Table.Th>
                  <Table.Th>{t('terminals.tid')}</Table.Th>
                  <Table.Th>{t('fees.status')}</Table.Th>
                  <Table.Th>{t('terminalsPage.registered')}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {terminals.data.items.map((terminal) => (
                  <Table.Tr key={terminal.id} style={{ cursor: 'pointer' }} onClick={() => setOpen(terminal)}>
                    <Table.Td>
                      <Website id={terminal.salesPointId} />
                    </Table.Td>
                    <Table.Td>{t(`scheme.${terminal.scheme}`)}</Table.Td>
                    <Table.Td>
                      <Code>{terminal.merchantId}</Code>
                    </Table.Td>
                    <Table.Td>
                      <Code>{terminal.terminalId}</Code>
                    </Table.Td>
                    <Table.Td>
                      <TerminalStatusBadge status={terminal.status} />
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{formatDate(terminal.createdAt)}</Text>
                      <Text size="xs" c="dimmed">
                        {terminal.registeredBy}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Card>
      )}
      {!!terminals.data && terminals.data.totalItems > 0 && (
        <Group justify="space-between" mt="md">
          <Text size="sm" c="dimmed">
            {t('terminalsPage.count', { count: terminals.data.totalItems })}
          </Text>
          <Pagination value={page} onChange={setPage} total={terminals.data.totalPages} size="sm" />
        </Group>
      )}

      <Drawer
        opened={current !== null}
        onClose={() => setOpen(null)}
        position="right"
        size="md"
        title={<Title order={4}>{t('terminalsPage.details')}</Title>}
      >
        {current && <TerminalDetails terminal={current} />}
      </Drawer>
      <RegisterTerminal opened={registering} onClose={() => setRegistering(false)} />
    </>
  );
}

/** A website's name, and the merchant it belongs to. */
function Website({ id }: { id: string }) {
  const salesPoint = useSalesPoint(id);
  return (
    <>
      <Text size="sm" fw={500}>
        {salesPoint.data?.name ?? '…'}
      </Text>
      <Text size="xs" c="dimmed">
        {salesPoint.data ? <MerchantName id={salesPoint.data.partnerId} /> : '…'}
      </Text>
    </>
  );
}

function TerminalDetails({ terminal }: { terminal: Terminal }) {
  const { t } = useTranslation();
  const fact = (label: string, value: React.ReactNode) => (
    <Group justify="space-between" wrap="nowrap">
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <Text size="sm" ta="right" component="div">
        {value}
      </Text>
    </Group>
  );
  return (
    <Stack>
      <Group justify="space-between">
        <TerminalStatusBadge status={terminal.status} />
        <TerminalActions terminal={terminal} size="xs" />
      </Group>
      {fact(t('fees.salesPoint'), <Website id={terminal.salesPointId} />)}
      {fact(t('terminals.scheme'), t(`scheme.${terminal.scheme}`))}
      {fact(t('terminals.mid'), <Code>{terminal.merchantId}</Code>)}
      {fact(t('terminals.tid'), <Code>{terminal.terminalId}</Code>)}
      {fact(t('terminalsPage.registered'), `${formatDate(terminal.createdAt)} · ${terminal.registeredBy}`)}
      <Text size="xs" c="dimmed">
        {t('terminals.hint')}
      </Text>
      <Divider label={t('terminals.history')} labelPosition="left" />
      <TerminalHistory terminalId={terminal.id} />
    </Stack>
  );
}

/** Pick the merchant, then its website, then a card the website accepts; MID and TID come from the processing center. */
function RegisterTerminal({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const register = useRegisterTerminal();
  const form = useForm({
    initialValues: {
      partnerId: null as string | null,
      salesPointId: null as string | null,
      scheme: null as string | null,
      merchantId: '',
      terminalId: '',
    },
    validate: {
      salesPointId: (v) => (v ? null : t('fees.salesPoint')),
      scheme: (v) => (v ? null : t('terminals.scheme')),
      merchantId: (v) => (ID.test(v.trim()) ? null : t('terminalsPage.idRule')),
      terminalId: (v) => (ID.test(v.trim()) ? null : t('terminalsPage.idRule')),
    },
  });
  const websites = usePartnerSalesPoints(form.values.partnerId ?? '');
  const website = websites.data?.find((s) => s.id === form.values.salesPointId);
  const close = () => {
    form.reset();
    onClose();
  };
  const submit = form.onSubmit((v) =>
    register.mutate(
      {
        salesPointId: v.salesPointId!,
        scheme: v.scheme as 'UZCARD' | 'HUMO',
        merchantId: v.merchantId.trim(),
        terminalId: v.terminalId.trim(),
      },
      {
        onSuccess: () => {
          notifySuccess(t('terminals.registered'));
          close();
        },
        onError: notifyError,
      },
    ),
  );
  return (
    <Modal opened={opened} onClose={close} title={t('terminals.register')} centered>
      <form onSubmit={submit}>
        <Stack>
          <MerchantSelect
            label={t('fees.merchant')}
            {...form.getInputProps('partnerId')}
            onChange={(v) => form.setValues({ partnerId: v, salesPointId: null, scheme: null })}
          />
          <SalesPointSelect
            partnerId={form.values.partnerId}
            label={t('fees.salesPoint')}
            {...form.getInputProps('salesPointId')}
            onChange={(v) => form.setValues({ salesPointId: v, scheme: null })}
          />
          <Select
            label={t('terminals.scheme')}
            description={website && !website.schemes.length ? t('terminalsPage.noSchemes') : undefined}
            disabled={!website}
            data={(website?.schemes ?? []).map((s) => ({ value: s, label: t(`scheme.${s}`) }))}
            {...form.getInputProps('scheme')}
          />
          <Group grow align="flex-start">
            <TextInput label={t('terminals.mid')} {...form.getInputProps('merchantId')} />
            <TextInput label={t('terminals.tid')} {...form.getInputProps('terminalId')} />
          </Group>
          <Text size="xs" c="dimmed">
            {t('terminalsPage.registerHint')}
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={close}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" loading={register.isPending}>
              {t('terminals.register')}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
