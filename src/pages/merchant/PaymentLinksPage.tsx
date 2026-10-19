import {
  Alert,
  Badge,
  Button,
  Card,
  CopyButton,
  Group,
  Modal,
  NumberInput,
  Select,
  Skeleton,
  Stack,
  Table,
  Text,
  TextInput,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconCopy, IconLink, IconPlus } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { messageFor } from '../../api/errors';
import { useCreatePaymentLink, useMySalesPoints, usePaymentLinks } from '../../api/queries';
import { Empty } from '../../layout/Empty';
import { PageTitle } from '../../layout/PageTitle';
import { formatSom, toTiyin } from '../../lib/money';
import { PAYMENT_STATUS_COLOR } from '../../lib/payment';
import { formatDate } from '../../lib/time';

const VALID_FOR = [1, 24, 72, 168];

/** Links to the bank's payment page, for buyers reached in a chat. A link is shown once, like a secret. */
export function PaymentLinksPage() {
  const { t } = useTranslation();
  const [website, setWebsite] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<string | null>(null);
  const salesPoints = useMySalesPoints();
  const links = usePaymentLinks(website);
  const names = new Map((salesPoints.data ?? []).map((s) => [s.id, s.name]));

  return (
    <>
      <PageTitle
        title={t('links.title')}
        description={t('links.description')}
        actions={
          <Button leftSection={<IconPlus size={16} />} onClick={() => setCreating(true)}>
            {t('links.create')}
          </Button>
        }
      />
      <Select
        mb="md"
        maw={320}
        clearable
        placeholder={t('links.allWebsites')}
        aria-label={t('salesPoints.website')}
        data={(salesPoints.data ?? []).map((s) => ({ value: s.id, label: s.name }))}
        value={website}
        onChange={setWebsite}
      />
      {links.isPending && <Skeleton h={200} />}
      {links.isError && <Alert color="red">{messageFor(links.error)}</Alert>}
      {links.data?.length === 0 && (
        <Empty icon={IconLink} title={t('links.empty')} text={t('links.emptyText')} />
      )}
      {!!links.data?.length && (
        <Card withBorder padding={0}>
          <Table.ScrollContainer minWidth={720}>
            <Table verticalSpacing="sm" horizontalSpacing="md">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t('links.what')}</Table.Th>
                  <Table.Th>{t('links.amount')}</Table.Th>
                  <Table.Th>{t('fees.status')}</Table.Th>
                  <Table.Th>{t('links.expires')}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {links.data.map((link) => (
                  <Table.Tr key={link.id}>
                    <Table.Td>
                      <Text size="sm" fw={500}>
                        {link.description}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {names.get(link.salesPointId) ?? '…'} · {link.orderId}
                      </Text>
                    </Table.Td>
                    <Table.Td>{formatSom(link.amount)}</Table.Td>
                    <Table.Td>
                      <Badge variant="light" color={PAYMENT_STATUS_COLOR[link.status]}>
                        {t(`payments.statusName.${link.status}`)}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{formatDate(link.paidAt ?? link.expiresAt)}</Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Card>
      )}
      <CreateLink
        opened={creating}
        onClose={() => setCreating(false)}
        onCreated={(url) => {
          setCreating(false);
          setCreated(url);
        }}
      />
      <Modal opened={created !== null} onClose={() => setCreated(null)} title={t('links.ready')} centered>
        <Stack>
          <Text size="sm">{t('links.readyText')}</Text>
          <TextInput readOnly value={created ?? ''} aria-label={t('links.url')} ff="monospace" />
          <Group justify="flex-end">
            <CopyButton value={created ?? ''}>
              {({ copied, copy }) => (
                <Button
                  leftSection={<IconCopy size={16} />}
                  color={copied ? 'teal' : undefined}
                  onClick={copy}
                >
                  {copied ? t('links.copied') : t('links.copy')}
                </Button>
              )}
            </CopyButton>
            <Button variant="default" onClick={() => setCreated(null)}>
              {t('links.done')}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}

function CreateLink({
  opened,
  onClose,
  onCreated,
}: {
  opened: boolean;
  onClose: () => void;
  onCreated: (url: string) => void;
}) {
  const { t } = useTranslation();
  const create = useCreatePaymentLink();
  const salesPoints = useMySalesPoints();
  const live = (salesPoints.data ?? []).filter((s) => s.status === 'ACTIVE');
  const form = useForm({
    initialValues: {
      salesPointId: null as string | null,
      amount: '' as number | '',
      description: '',
      hours: '24',
    },
    validate: {
      salesPointId: (v) => (v ? null : t('links.pickWebsite')),
      amount: (v) => (typeof v === 'number' && v >= 1 ? null : t('links.amountRule')),
      description: (v) => (v.trim() ? null : t('links.whatRule')),
    },
  });
  const close = () => {
    form.reset();
    create.reset();
    onClose();
  };
  const submit = form.onSubmit((v) =>
    create.mutate(
      {
        salesPointId: v.salesPointId!,
        amount: toTiyin(v.amount as number),
        description: v.description.trim(),
        validForHours: Number(v.hours),
      },
      {
        onSuccess: (link) => {
          form.reset();
          onCreated(link.url!);
        },
      },
    ),
  );
  return (
    <Modal opened={opened} onClose={close} title={t('links.create')} centered>
      <form onSubmit={submit}>
        <Stack>
          <Select
            label={t('salesPoints.website')}
            description={live.length ? undefined : t('links.noLive')}
            data={live.map((s) => ({ value: s.id, label: s.name }))}
            {...form.getInputProps('salesPointId')}
          />
          <NumberInput
            label={t('links.amount')}
            suffix=" UZS"
            min={1}
            decimalScale={2}
            thousandSeparator=" "
            {...form.getInputProps('amount')}
          />
          <TextInput label={t('links.what')} maxLength={255} {...form.getInputProps('description')} />
          <Select
            label={t('links.validFor')}
            data={VALID_FOR.map((h) => ({ value: String(h), label: t('links.hours', { count: h }) }))}
            allowDeselect={false}
            {...form.getInputProps('hours')}
          />
          {create.isError && (
            <Alert color="red" variant="light">
              {messageFor(create.error)}
            </Alert>
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={close}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" loading={create.isPending}>
              {t('links.create')}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
