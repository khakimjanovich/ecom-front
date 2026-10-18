import {
  Alert,
  Badge,
  Button,
  Card,
  Grid,
  Group,
  Modal,
  NumberInput,
  Select,
  Skeleton,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconCalculator, IconPercentage, IconPlus } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CommissionRule } from '../../api/client';
import { messageFor } from '../../api/errors';
import { useCommissionRules, useProposeRule, useProposeRuleEnd, useQuote } from '../../api/queries';
import {
  MerchantName,
  MerchantSelect,
  SalesPointName,
  SalesPointSelect,
} from '../../components/MerchantPicker';
import { Empty } from '../../layout/Empty';
import { PageTitle } from '../../layout/PageTitle';
import { formatSom, toTiyin } from '../../lib/money';
import { notifyError, notifySuccess } from '../../lib/notify';
import { formatDate } from '../../lib/time';

const SCHEMES = ['UZCARD', 'HUMO'] as const;
const STATUS_COLOR = { PROPOSED: 'yellow', ACTIVE: 'green', REJECTED: 'gray' } as const;

/** <input type="datetime-local"> speaks local time without a zone; the API speaks ISO instants. */
const toInstant = (local: string) => new Date(local).toISOString();
const localNow = () =>
  new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16);

/** The bank's fee rules: who pays what, from when, and a calculator to check it. */
export function CommissionsPage() {
  const { t } = useTranslation();
  const rules = useCommissionRules();
  const [proposing, setProposing] = useState(false);
  const [ending, setEnding] = useState<CommissionRule | null>(null);

  return (
    <>
      <PageTitle
        title={t('fees.title')}
        description={t('fees.description')}
        actions={
          <Button leftSection={<IconPlus size={16} />} onClick={() => setProposing(true)}>
            {t('fees.new')}
          </Button>
        }
      />
      <Grid gap="lg">
        <Grid.Col span={{ base: 12, lg: 8 }}>
          {rules.isPending && <Skeleton h={240} />}
          {rules.isError && <Alert color="red">{messageFor(rules.error)}</Alert>}
          {rules.data?.length === 0 && (
            <Empty icon={IconPercentage} title={t('fees.empty')} text={t('fees.emptyText')} />
          )}
          {!!rules.data?.length && (
            <Card withBorder padding={0}>
              <Table.ScrollContainer minWidth={720}>
                <Table verticalSpacing="sm" horizontalSpacing="md">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>{t('fees.scope')}</Table.Th>
                      <Table.Th>{t('fees.fee')}</Table.Th>
                      <Table.Th>{t('fees.validFrom')}</Table.Th>
                      <Table.Th>{t('fees.status')}</Table.Th>
                      <Table.Th />
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {rules.data.map((rule) => (
                      <Table.Tr key={rule.id}>
                        <Table.Td>
                          <Scope rule={rule} />
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" fw={500}>
                            {rule.percent}% + {formatSom(rule.fixedFee)}
                          </Text>
                          {(rule.minFee != null || rule.maxFee != null) && (
                            <Text size="xs" c="dimmed">
                              {rule.minFee != null && `≥ ${formatSom(rule.minFee)} `}
                              {rule.maxFee != null && `≤ ${formatSom(rule.maxFee)}`}
                            </Text>
                          )}
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{formatDate(rule.validFrom)}</Text>
                          <Text size="xs" c="dimmed">
                            {rule.validTo ? `→ ${formatDate(rule.validTo)}` : t('fees.noEnd')}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge variant="light" color={STATUS_COLOR[rule.status]}>
                            {t(`ruleStatus.${rule.status}`)}
                          </Badge>
                          <Text size="xs" c="dimmed">
                            {t('fees.proposedBy', { name: rule.proposedBy })}
                            {rule.approvedBy && `, ${t('fees.approvedBy', { name: rule.approvedBy })}`}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          {rule.status === 'ACTIVE' && !rule.validTo && (
                            <Button size="xs" variant="subtle" color="red" onClick={() => setEnding(rule)}>
                              {t('fees.end')}
                            </Button>
                          )}
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            </Card>
          )}
        </Grid.Col>
        <Grid.Col span={{ base: 12, lg: 4 }}>
          <Calculator />
        </Grid.Col>
      </Grid>
      <ProposeRule opened={proposing} onClose={() => setProposing(false)} />
      <EndRule key={ending?.id} rule={ending} onClose={() => setEnding(null)} />
    </>
  );
}

function Scope({ rule }: { rule: CommissionRule }) {
  const { t } = useTranslation();
  if (!rule.partnerId && !rule.scheme) return <Text size="sm">{t('fees.bankWide')}</Text>;
  return (
    <Stack gap={0}>
      {rule.partnerId && (
        <Text size="sm" fw={500}>
          <MerchantName id={rule.partnerId} />
        </Text>
      )}
      {rule.salesPointId && (
        <Text size="xs" c="dimmed">
          <SalesPointName id={rule.salesPointId} />
        </Text>
      )}
      <Text size="xs" c="dimmed">
        {rule.scheme ? t(`scheme.${rule.scheme}`) : t('fees.anyScheme')}
      </Text>
    </Stack>
  );
}

function ProposeRule({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const propose = useProposeRule();
  const form = useForm({
    initialValues: {
      partnerId: null as string | null,
      salesPointId: null as string | null,
      scheme: null as string | null,
      percent: 0 as number | string,
      fixed: 0 as number | string,
      min: '' as number | string,
      max: '' as number | string,
      validFrom: localNow(),
      validTo: '',
    },
  });
  const submit = form.onSubmit((v) =>
    propose.mutate(
      {
        partnerId: v.partnerId ?? undefined,
        salesPointId: v.salesPointId ?? undefined,
        scheme: (v.scheme as (typeof SCHEMES)[number] | null) ?? undefined,
        percent: Number(v.percent),
        fixedFee: toTiyin(Number(v.fixed)),
        minFee: v.min === '' ? undefined : toTiyin(Number(v.min)),
        maxFee: v.max === '' ? undefined : toTiyin(Number(v.max)),
        validFrom: toInstant(v.validFrom),
        validTo: v.validTo ? toInstant(v.validTo) : undefined,
      },
      {
        onSuccess: () => {
          notifySuccess(t('fees.proposed'));
          form.reset();
          onClose();
        },
        onError: notifyError,
      },
    ),
  );
  return (
    <Modal opened={opened} onClose={onClose} title={t('fees.new')} size="lg" centered>
      <form onSubmit={submit}>
        <Stack>
          <Text size="sm" fw={500}>
            {t('fees.scope')}
          </Text>
          <MerchantSelect
            label={t('fees.merchant')}
            placeholder={t('fees.anyMerchant')}
            {...form.getInputProps('partnerId')}
            onChange={(value) => form.setValues({ partnerId: value, salesPointId: null })}
          />
          <Group grow>
            <SalesPointSelect
              partnerId={form.values.partnerId}
              label={t('fees.salesPoint')}
              placeholder={t('fees.anySalesPoint')}
              {...form.getInputProps('salesPointId')}
            />
            <Select
              clearable
              label={t('fees.scheme')}
              placeholder={t('fees.anyScheme')}
              data={SCHEMES.map((s) => ({ value: s, label: t(`scheme.${s}`) }))}
              {...form.getInputProps('scheme')}
            />
          </Group>
          <Group grow align="flex-start">
            <NumberInput
              label={t('fees.percent')}
              min={0}
              max={100}
              decimalScale={4}
              suffix="%"
              {...form.getInputProps('percent')}
            />
            <NumberInput
              label={t('fees.fixed')}
              min={0}
              decimalScale={2}
              thousandSeparator=" "
              {...form.getInputProps('fixed')}
            />
          </Group>
          <Group grow align="flex-start">
            <NumberInput
              label={t('fees.min')}
              min={0}
              decimalScale={2}
              thousandSeparator=" "
              {...form.getInputProps('min')}
            />
            <NumberInput
              label={t('fees.max')}
              min={0}
              decimalScale={2}
              thousandSeparator=" "
              {...form.getInputProps('max')}
            />
          </Group>
          <Group grow align="flex-start">
            <TextInput
              type="datetime-local"
              label={t('fees.validFrom')}
              required
              {...form.getInputProps('validFrom')}
            />
            <TextInput
              type="datetime-local"
              label={t('fees.validTo')}
              placeholder={t('fees.noEnd')}
              {...form.getInputProps('validTo')}
            />
          </Group>
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" loading={propose.isPending}>
              {t('fees.propose')}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

function EndRule({ rule, onClose }: { rule: CommissionRule | null; onClose: () => void }) {
  const { t } = useTranslation();
  const end = useProposeRuleEnd();
  const [endsAt, setEndsAt] = useState(localNow());
  return (
    <Modal opened={rule !== null} onClose={onClose} title={t('fees.endTitle')} centered>
      <Stack>
        <TextInput
          type="datetime-local"
          label={t('fees.endsAt')}
          value={endsAt}
          onChange={(e) => setEndsAt(e.currentTarget.value)}
        />
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            color="red"
            loading={end.isPending}
            onClick={() =>
              rule &&
              end.mutate(
                { ruleId: rule.id, endsAt: toInstant(endsAt) },
                {
                  onSuccess: () => {
                    notifySuccess(t('fees.proposed'));
                    onClose();
                  },
                  onError: notifyError,
                },
              )
            }
          >
            {t('fees.propose')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

function Calculator() {
  const { t } = useTranslation();
  const quote = useQuote();
  const form = useForm({
    initialValues: {
      partnerId: null as string | null,
      salesPointId: null as string | null,
      scheme: 'UZCARD',
      amount: 100_000 as number | string,
    },
  });
  const submit = form.onSubmit((v) =>
    v.partnerId && v.salesPointId
      ? quote.mutate({
          partnerId: v.partnerId,
          salesPointId: v.salesPointId,
          scheme: v.scheme as (typeof SCHEMES)[number],
          amount: toTiyin(Number(v.amount)),
        })
      : undefined,
  );
  return (
    <Card withBorder padding="lg">
      <Group gap="xs" mb={4}>
        <IconCalculator size={18} />
        <Title order={4}>{t('fees.calculator')}</Title>
      </Group>
      <Text size="xs" c="dimmed" mb="md">
        {t('fees.calculatorHint')}
      </Text>
      <form onSubmit={submit}>
        <Stack gap="sm">
          <MerchantSelect
            label={t('fees.merchant')}
            {...form.getInputProps('partnerId')}
            onChange={(value) => form.setValues({ partnerId: value, salesPointId: null })}
          />
          <SalesPointSelect
            partnerId={form.values.partnerId}
            label={t('fees.salesPoint')}
            {...form.getInputProps('salesPointId')}
          />
          <Select
            label={t('fees.scheme')}
            data={SCHEMES.map((s) => ({ value: s, label: t(`scheme.${s}`) }))}
            allowDeselect={false}
            {...form.getInputProps('scheme')}
          />
          <NumberInput
            label={t('fees.amount')}
            min={0.01}
            decimalScale={2}
            thousandSeparator=" "
            {...form.getInputProps('amount')}
          />
          <Button
            type="submit"
            variant="light"
            loading={quote.isPending}
            disabled={!form.values.salesPointId}
          >
            {t('fees.calculate')}
          </Button>
          {quote.isError && (
            <Alert color="red" variant="light">
              {messageFor(quote.error)}
            </Alert>
          )}
          {quote.data && (
            <Stack gap={4}>
              <Group justify="space-between">
                <Text size="sm">{t('fees.fee')}</Text>
                <Text fw={600}>{formatSom(quote.data.fee)}</Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm">{t('fees.net')}</Text>
                <Text fw={600}>{formatSom(quote.data.net)}</Text>
              </Group>
              <Text size="xs" c="dimmed" ff="monospace">
                {t('fees.ruleUsed')}: {quote.data.ruleId.slice(0, 8)}
              </Text>
            </Stack>
          )}
        </Stack>
      </form>
    </Card>
  );
}
