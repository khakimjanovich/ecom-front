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
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDebouncedValue } from '@mantine/hooks';
import { IconDeviceDesktopAnalytics, IconPlus, IconSearch } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Epos } from '../../api/client';
import { messageFor } from '../../api/errors';
import {
  type EposFilter,
  usePartnerSalesPoints,
  useRegisterEpos,
  useSalesPoint,
  useEposSearch,
} from '../../api/queries';
import { MerchantName, MerchantSelect, SalesPointSelect } from '../../components/MerchantPicker';
import { EposActions, EposHistory, EposStatusBadge, UzcardCheck } from '../../components/EposControls';
import { Empty } from '../../layout/Empty';
import { PageTitle } from '../../layout/PageTitle';
import { notifySuccess } from '../../lib/notify';
import { formatDate } from '../../lib/time';

const SCHEMES = ['UZCARD', 'HUMO'] as const;
const STATUSES = ['ACTIVE', 'SUSPENDED', 'REVOKED'] as const;
const ID = /^[A-Za-z0-9]{1,30}$/;
const PAGE_SIZE = 20;

/** Every epos the processing center issued, across all websites: find one, see its history, act on it. */
export function EposPage() {
  const { t } = useTranslation();
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [salesPointId, setSalesPointId] = useState<string | null>(null);
  const [scheme, setScheme] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [q] = useDebouncedValue(search.trim(), 300);
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<Epos | null>(null);
  const [registering, setRegistering] = useState(false);

  const filter: EposFilter = {
    salesPointId: salesPointId ?? undefined,
    scheme: (scheme as EposFilter['scheme']) ?? undefined,
    status: (status as EposFilter['status']) ?? undefined,
    q: q || undefined,
    page: page - 1,
    size: PAGE_SIZE,
  };
  const eposList = useEposSearch(filter);
  const reset =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      set(v);
      setPage(1);
    };
  // The open drawer shows the latest copy of its epos after an action.
  const current = open && (eposList.data?.items.find((x) => x.id === open.id) ?? open);

  return (
    <>
      <PageTitle
        title={t('eposPage.title')}
        description={t('eposPage.description')}
        actions={
          <Button leftSection={<IconPlus size={16} />} onClick={() => setRegistering(true)}>
            {t('epos.register')}
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
            placeholder={t('eposPage.allWebsites')}
            aria-label={t('fees.salesPoint')}
            value={salesPointId}
            onChange={reset(setSalesPointId)}
          />
          <Select
            clearable
            placeholder={t('fees.anyScheme')}
            aria-label={t('epos.scheme')}
            data={SCHEMES.map((s) => ({ value: s, label: t(`scheme.${s}`) }))}
            value={scheme}
            onChange={reset(setScheme)}
          />
          <Select
            clearable
            placeholder={t('eposPage.anyStatus')}
            aria-label={t('fees.status')}
            data={STATUSES.map((s) => ({ value: s, label: t(`epos.status.${s}`) }))}
            value={status}
            onChange={reset(setStatus)}
          />
          <TextInput
            placeholder={t('eposPage.search')}
            aria-label={t('eposPage.search')}
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => {
              setSearch(e.currentTarget.value);
              setPage(1);
            }}
          />
        </SimpleGrid>
      </Card>

      {eposList.isPending && <Skeleton h={240} />}
      {eposList.isError && <Alert color="red">{messageFor(eposList.error)}</Alert>}
      {eposList.data?.items.length === 0 && (
        <Empty icon={IconDeviceDesktopAnalytics} title={t('eposPage.empty')} text={t('eposPage.emptyText')} />
      )}
      {!!eposList.data?.items.length && (
        <Card withBorder padding={0}>
          <Table.ScrollContainer minWidth={820}>
            <Table verticalSpacing="sm" horizontalSpacing="md" highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t('fees.salesPoint')}</Table.Th>
                  <Table.Th>{t('epos.scheme')}</Table.Th>
                  <Table.Th>{t('epos.mid')}</Table.Th>
                  <Table.Th>{t('epos.tid')}</Table.Th>
                  <Table.Th>{t('fees.status')}</Table.Th>
                  <Table.Th>{t('eposPage.registered')}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {eposList.data.items.map((epos) => (
                  <Table.Tr key={epos.id} style={{ cursor: 'pointer' }} onClick={() => setOpen(epos)}>
                    <Table.Td>
                      <Website id={epos.salesPointId} />
                    </Table.Td>
                    <Table.Td>{t(`scheme.${epos.scheme}`)}</Table.Td>
                    <Table.Td>
                      <Code>{epos.merchantId}</Code>
                    </Table.Td>
                    <Table.Td>
                      <Code>{epos.terminalId}</Code>
                    </Table.Td>
                    <Table.Td>
                      <EposStatusBadge status={epos.status} />
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{formatDate(epos.createdAt)}</Text>
                      <Text size="xs" c="dimmed">
                        {epos.registeredBy}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Card>
      )}
      {!!eposList.data && eposList.data.totalItems > 0 && (
        <Group justify="space-between" mt="md">
          <Text size="sm" c="dimmed">
            {t('eposPage.count', { count: eposList.data.totalItems })}
          </Text>
          <Pagination value={page} onChange={setPage} total={eposList.data.totalPages} size="sm" />
        </Group>
      )}

      <Drawer
        opened={current !== null}
        onClose={() => setOpen(null)}
        position="right"
        size="md"
        title={t('eposPage.details')}
      >
        {current && <EposDetails epos={current} />}
      </Drawer>
      <RegisterEpos opened={registering} onClose={() => setRegistering(false)} />
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

function EposDetails({ epos }: { epos: Epos }) {
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
        <EposStatusBadge status={epos.status} />
        <EposActions epos={epos} size="xs" />
      </Group>
      {fact(t('fees.salesPoint'), <Website id={epos.salesPointId} />)}
      {fact(t('epos.scheme'), t(`scheme.${epos.scheme}`))}
      {fact(t('epos.mid'), <Code>{epos.merchantId}</Code>)}
      {fact(t('epos.tid'), <Code>{epos.terminalId}</Code>)}
      {fact(t('eposPage.registered'), `${formatDate(epos.createdAt)} · ${epos.registeredBy}`)}
      <Text size="xs" c="dimmed">
        {t('epos.hint')}
      </Text>
      {epos.scheme === 'UZCARD' && (
        <>
          <Divider label={t('epos.uzcard.title')} labelPosition="left" />
          <UzcardCheck key={epos.id} epos={epos} />
        </>
      )}
      <Divider label={t('epos.history')} labelPosition="left" />
      <EposHistory eposId={epos.id} />
    </Stack>
  );
}

/** Pick the merchant, then its website, then a card the website accepts; MID and TID come from the processing center. */
function RegisterEpos({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const register = useRegisterEpos();
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
      scheme: (v) => (v ? null : t('epos.scheme')),
      merchantId: (v) => (ID.test(v.trim()) ? null : t('eposPage.idRule')),
      terminalId: (v) => (ID.test(v.trim()) ? null : t('eposPage.idRule')),
    },
  });
  const websites = usePartnerSalesPoints(form.values.partnerId ?? '');
  const website = websites.data?.find((s) => s.id === form.values.salesPointId);
  const close = () => {
    form.reset();
    register.reset();
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
          notifySuccess(t('epos.registered'));
          close();
        },
      },
    ),
  );
  return (
    <Modal opened={opened} onClose={close} title={t('epos.register')} centered>
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
            label={t('epos.scheme')}
            description={website && !website.schemes.length ? t('eposPage.noSchemes') : undefined}
            disabled={!website}
            data={(website?.schemes ?? []).map((s) => ({ value: s, label: t(`scheme.${s}`) }))}
            {...form.getInputProps('scheme')}
          />
          <Group grow align="flex-start">
            <TextInput label={t('epos.mid')} {...form.getInputProps('merchantId')} />
            <TextInput label={t('epos.tid')} {...form.getInputProps('terminalId')} />
          </Group>
          <Text size="xs" c="dimmed">
            {t('eposPage.registerHint')}
            {form.values.scheme === 'UZCARD' && ` ${t('epos.uzcard.registerHint')}`}
          </Text>
          {register.isError && (
            <Alert color="red" title={t('epos.notRegistered')}>
              {messageFor(register.error)}
            </Alert>
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={close}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" loading={register.isPending}>
              {t('epos.register')}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
