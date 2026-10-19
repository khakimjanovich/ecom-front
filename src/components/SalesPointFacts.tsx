import { Anchor, Badge, Group, SimpleGrid, Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { SalesPoint } from '../api/client';
import { SALES_POINT_COLOR } from '../lib/salesPoint';
import { formatDate } from '../lib/time';

export function SalesPointBadge({ status }: { status: SalesPoint['status'] }) {
  const { t } = useTranslation();
  return (
    <Badge color={SALES_POINT_COLOR[status]} variant="light">
      {t(`spStatus.${status}`)}
    </Badge>
  );
}

/** Everything a person needs to know about one website, for the merchant and the bank alike. */
export function SalesPointFacts({ salesPoint }: { salesPoint: SalesPoint }) {
  const { t } = useTranslation();
  const check = salesPoint.lastSiteCheck;
  return (
    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
      <Fact label={t('salesPoints.website')}>
        <Anchor href={salesPoint.websiteUrl} target="_blank" rel="noreferrer">
          {salesPoint.websiteUrl}
        </Anchor>
      </Fact>
      <Fact label={t('salesPoints.returnUrls')}>
        {salesPoint.returnUrls.map((url) => (
          <Text key={url} size="sm" ff="monospace" style={{ wordBreak: 'break-all' }}>
            {url}
          </Text>
        ))}
      </Fact>
      <Fact label={t('salesPoints.webhook')}>
        {salesPoint.webhookUrl ? (
          <Text size="sm" ff="monospace" style={{ wordBreak: 'break-all' }}>
            {salesPoint.webhookUrl}
          </Text>
        ) : (
          <Text size="sm" c="dimmed">
            {t('salesPoints.noWebhook')}
          </Text>
        )}
      </Fact>
      <Fact label={t('salesPoints.schemes')}>
        {salesPoint.schemes.length ? (
          <Group gap={6}>
            {salesPoint.schemes.map((scheme) => (
              <Badge key={scheme} variant="outline" color="gray">
                {t(`scheme.${scheme}`)}
              </Badge>
            ))}
          </Group>
        ) : (
          <Text size="sm" c="dimmed">
            {t('salesPoints.noSchemes')}
          </Text>
        )}
      </Fact>
      <Fact label={t('salesPoints.refund')}>
        <Text size="sm">{t('salesPoints.days', { count: salesPoint.refundWindowDays })}</Text>
        {salesPoint.extendedRefundDays && (
          <Text size="sm" c="dimmed">
            {t('salesPoints.plusDays', {
              count: salesPoint.extendedRefundDays,
              reason: salesPoint.extendedRefundReason,
            })}
          </Text>
        )}
      </Fact>
      <Fact label={t('salesPoints.lastCheck')}>
        {check ? (
          <Group gap={6}>
            <Badge color={check.result === 'PASSED' ? 'green' : 'red'} variant="light">
              {t(`check.${check.result}`)}
            </Badge>
            <Text size="xs" c="dimmed">
              {t('salesPoint.by', { name: check.checkedBy, when: formatDate(check.checkedAt) })}
            </Text>
          </Group>
        ) : (
          <Text size="sm" c="dimmed">
            {t('salesPoints.notChecked')}
          </Text>
        )}
      </Fact>
      {salesPoint.statusReason && (
        <Fact label={t('salesPoint.reason')}>
          <Text size="sm">“{salesPoint.statusReason}”</Text>
        </Fact>
      )}
    </SimpleGrid>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Stack gap={4}>
      <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
        {label}
      </Text>
      {children}
    </Stack>
  );
}
