import {
  Alert,
  Anchor,
  Badge,
  Button,
  Card,
  Checkbox,
  Grid,
  Group,
  NumberInput,
  SegmentedControl,
  Skeleton,
  Stack,
  Text,
  Textarea,
  TextInput,
  Timeline,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { modals } from '@mantine/modals';
import { IconArrowLeft } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import type { SalesPoint, Schemas } from '../../api/client';
import { messageFor } from '../../api/errors';
import { type SalesPointAction, useSalesPoint, useSalesPointAdmin, useSiteChecks } from '../../api/queries';
import { PromptModal } from '../../components/PromptModal';
import { SalesPointBadge, SalesPointFacts } from '../../components/SalesPointFacts';
import { notifyError, notifySuccess } from '../../lib/notify';
import { SALES_POINT_ACTIONS, SALES_POINT_NEEDS_REASON } from '../../lib/salesPoint';
import { formatDate } from '../../lib/time';
import { TerminalsCard } from './TerminalsCard';

const SCHEMES: Schemas['CardScheme'][] = ['UZCARD', 'HUMO'];

/** One website, as the bank sees it: what was checked, the deal's terms, and switching it on or off. */
export function SalesPointPage() {
  const { t } = useTranslation();
  const { id = '' } = useParams();
  const salesPoint = useSalesPoint(id);
  const checks = useSiteChecks(id);

  if (salesPoint.isPending) return <Skeleton h={400} />;
  if (salesPoint.isError) return <Alert color="red">{messageFor(salesPoint.error)}</Alert>;
  const open = salesPoint.data.status !== 'CLOSED';

  return (
    <Stack gap="lg" maw={1100}>
      <Anchor component={Link} to={`/admin/partners/${salesPoint.data.partnerId}`} size="sm">
        <Group gap={4}>
          <IconArrowLeft size={14} />
          {t('salesPoint.back')}
        </Group>
      </Anchor>
      <Group justify="space-between">
        <Title order={2}>{salesPoint.data.name}</Title>
        <SalesPointBadge status={salesPoint.data.status} />
      </Group>

      <Card withBorder padding="lg">
        <SalesPointFacts salesPoint={salesPoint.data} />
      </Card>

      <Grid gap="lg">
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Stack>
            <Actions salesPoint={salesPoint.data} />
            {open && <Settings key={salesPoint.data.id} salesPoint={salesPoint.data} />}
            <TerminalsCard key={salesPoint.data.schemes.join()} salesPoint={salesPoint.data} />
          </Stack>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card withBorder padding="lg">
            <Title order={4} mb="md">
              {t('salesPoint.checks')}
            </Title>
            {open && <RecordCheck salesPointId={id} />}
            {checks.data?.length === 0 && <Text c="dimmed">{t('salesPoint.noChecks')}</Text>}
            <Timeline bulletSize={14} lineWidth={2} mt="md">
              {checks.data?.map((check) => (
                <Timeline.Item
                  key={check.id}
                  color={check.result === 'PASSED' ? 'green' : 'red'}
                  title={
                    <Badge color={check.result === 'PASSED' ? 'green' : 'red'} variant="light">
                      {t(`check.${check.result}`)}
                    </Badge>
                  }
                >
                  <Text size="xs" c="dimmed">
                    {t('salesPoint.by', { name: check.checkedBy, when: formatDate(check.checkedAt) })}
                  </Text>
                  {check.findings.map((finding) => (
                    <Text key={finding} size="sm">
                      • {finding}
                    </Text>
                  ))}
                </Timeline.Item>
              ))}
            </Timeline>
          </Card>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}

function Actions({ salesPoint }: { salesPoint: SalesPoint }) {
  const { t } = useTranslation();
  const { act } = useSalesPointAdmin(salesPoint.id);
  const [prompt, setPrompt] = useState<SalesPointAction | null>(null);
  const actions = SALES_POINT_ACTIONS[salesPoint.status];

  const run = (kind: SalesPointAction, reason?: string) =>
    act.mutate(
      { kind, reason },
      {
        onSuccess: () => {
          setPrompt(null);
          notifySuccess(t('partner.done'));
        },
        onError: notifyError,
      },
    );
  const start = (kind: SalesPointAction) =>
    SALES_POINT_NEEDS_REASON.includes(kind)
      ? setPrompt(kind)
      : modals.openConfirmModal({
          title: t(`salesPoint.${kind}`),
          children: kind === 'activate' ? <Text size="sm">{t('salesPoint.activateHint')}</Text> : null,
          labels: { confirm: t(`salesPoint.${kind}`), cancel: t('common.cancel') },
          onConfirm: () => run(kind),
        });

  if (!actions.length) return null;
  return (
    <Card withBorder padding="lg">
      <Title order={4} mb="md">
        {t('partner.actions')}
      </Title>
      <Group>
        {actions.map((kind) => (
          <Button
            key={kind}
            variant={kind === 'activate' || kind === 'restore' ? 'filled' : 'light'}
            color={kind === 'activate' || kind === 'restore' ? undefined : 'red'}
            loading={act.isPending && act.variables?.kind === kind}
            onClick={() => start(kind)}
          >
            {t(`salesPoint.${kind}`)}
          </Button>
        ))}
      </Group>
      {salesPoint.status === 'DRAFT' && (
        <Text size="xs" c="dimmed" mt="xs">
          {t('salesPoint.activateHint')}
        </Text>
      )}
      <PromptModal
        opened={prompt !== null}
        onClose={() => setPrompt(null)}
        title={prompt ? t(`salesPoint.${prompt}`) : ''}
        label={t('partner.reason')}
        hint={t('partner.reasonHint')}
        multiline
        confirmLabel={prompt ? t(`salesPoint.${prompt}`) : ''}
        color="red"
        loading={act.isPending}
        onSubmit={(reason) => prompt && run(prompt, reason)}
      />
    </Card>
  );
}

function Settings({ salesPoint }: { salesPoint: SalesPoint }) {
  const { t } = useTranslation();
  const { saveSettings } = useSalesPointAdmin(salesPoint.id);
  const form = useForm({
    initialValues: {
      schemes: salesPoint.schemes,
      refundWindowDays: salesPoint.refundWindowDays,
      extendedRefundDays: salesPoint.extendedRefundDays ?? '',
      extendedRefundReason: salesPoint.extendedRefundReason ?? '',
    },
  });
  const submit = form.onSubmit((values) =>
    saveSettings.mutate(
      {
        schemes: values.schemes,
        refundWindowDays: Number(values.refundWindowDays),
        extendedRefundDays: values.extendedRefundDays === '' ? undefined : Number(values.extendedRefundDays),
        extendedRefundReason: values.extendedRefundReason.trim() || undefined,
      },
      { onSuccess: () => notifySuccess(t('salesPoints.saved')), onError: notifyError },
    ),
  );
  return (
    <Card withBorder padding="lg">
      <Title order={4} mb="md">
        {t('salesPoint.settings')}
      </Title>
      <form onSubmit={submit}>
        <Stack>
          <Checkbox.Group label={t('salesPoints.schemes')} {...form.getInputProps('schemes')}>
            <Group mt={6}>
              {SCHEMES.map((scheme) => (
                <Checkbox key={scheme} value={scheme} label={t(`scheme.${scheme}`)} />
              ))}
            </Group>
          </Checkbox.Group>
          <Group grow align="flex-start">
            <NumberInput
              label={t('salesPoint.refundDays')}
              min={0}
              allowDecimal={false}
              {...form.getInputProps('refundWindowDays')}
            />
            <NumberInput
              label={t('salesPoint.extendedDays')}
              min={1}
              allowDecimal={false}
              {...form.getInputProps('extendedRefundDays')}
            />
          </Group>
          {form.values.extendedRefundDays !== '' && (
            <TextInput
              label={t('salesPoint.extendedReason')}
              {...form.getInputProps('extendedRefundReason')}
            />
          )}
          <Group justify="flex-end">
            <Button type="submit" loading={saveSettings.isPending}>
              {t('salesPoint.save')}
            </Button>
          </Group>
        </Stack>
      </form>
    </Card>
  );
}

function RecordCheck({ salesPointId }: { salesPointId: string }) {
  const { t } = useTranslation();
  const { recordCheck } = useSalesPointAdmin(salesPointId);
  const form = useForm({ initialValues: { result: 'PASSED' as Schemas['SiteCheckResult'], findings: '' } });
  const submit = form.onSubmit(({ result, findings }) =>
    recordCheck.mutate(
      {
        result,
        findings: findings
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean),
      },
      {
        onSuccess: () => {
          form.reset();
          notifySuccess(t('salesPoints.saved'));
        },
        onError: notifyError,
      },
    ),
  );
  return (
    <form onSubmit={submit}>
      <Stack gap="sm">
        <SegmentedControl
          aria-label={t('salesPoint.result')}
          data={[
            { value: 'PASSED', label: t('check.PASSED') },
            { value: 'FAILED', label: t('check.FAILED') },
          ]}
          {...form.getInputProps('result')}
        />
        <Textarea
          label={t('salesPoint.findings')}
          description={t('salesPoint.findingsHint')}
          autosize
          minRows={2}
          {...form.getInputProps('findings')}
        />
        <Group justify="flex-end">
          <Button type="submit" variant="light" loading={recordCheck.isPending}>
            {t('salesPoint.recordCheck')}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
