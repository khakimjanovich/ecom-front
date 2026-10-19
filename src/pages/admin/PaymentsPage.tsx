import { Alert, Badge, Card, Code, Skeleton, Table, Text } from '@mantine/core';
import { IconReceipt } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { messageFor } from '../../api/errors';
import { usePayments } from '../../api/queries';
import { MerchantName, MerchantSelect, SalesPointName } from '../../components/MerchantPicker';
import { Empty } from '../../layout/Empty';
import { PageTitle } from '../../layout/PageTitle';
import { formatSom } from '../../lib/money';
import { formatDate } from '../../lib/time';

const STATUS_COLOR = {
  CREATED: 'blue',
  AWAITING_CODE: 'yellow',
  CARD_CONFIRMED: 'green',
  FAILED: 'red',
} as const;

/** Every payment merchants' servers created, newest first, optionally for one merchant. */
export function PaymentsPage() {
  const { t } = useTranslation();
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const payments = usePayments(partnerId);

  return (
    <>
      <PageTitle
        title={t('payments.title')}
        description={t('payments.description')}
        actions={
          <MerchantSelect
            aria-label={t('payments.merchant')}
            placeholder={t('payments.allMerchants')}
            clearable
            w={280}
            value={partnerId}
            onChange={setPartnerId}
          />
        }
      />
      {payments.isPending && <Skeleton h={240} />}
      {payments.isError && <Alert color="red">{messageFor(payments.error)}</Alert>}
      {payments.data?.length === 0 && (
        <Empty icon={IconReceipt} title={t('payments.empty')} text={t('payments.emptyText')} />
      )}
      {!!payments.data?.length && (
        <Card withBorder padding={0}>
          <Table.ScrollContainer minWidth={820}>
            <Table verticalSpacing="sm" horizontalSpacing="md" highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t('payments.created')}</Table.Th>
                  <Table.Th>{t('payments.order')}</Table.Th>
                  <Table.Th ta="right">{t('payments.amount')}</Table.Th>
                  <Table.Th>{t('payments.website')}</Table.Th>
                  <Table.Th>{t('payments.client')}</Table.Th>
                  <Table.Th>{t('payments.status')}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {payments.data.map((payment) => (
                  <Table.Tr key={payment.id}>
                    <Table.Td>
                      <Text size="sm">{formatDate(payment.createdAt)}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={500} ff="monospace">
                        {payment.orderId}
                      </Text>
                      {payment.description && (
                        <Text size="xs" c="dimmed">
                          {payment.description}
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td ta="right">
                      <Text size="sm" fw={600}>
                        {formatSom(payment.amount)}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">
                        <SalesPointName id={payment.salesPointId} />
                      </Text>
                      <Text size="xs" c="dimmed">
                        <MerchantName id={payment.partnerId} />
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Code>{payment.clientId}</Code>
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="light" color={STATUS_COLOR[payment.status]}>
                        {t(`payments.statusName.${payment.status}`)}
                      </Badge>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Card>
      )}
    </>
  );
}
