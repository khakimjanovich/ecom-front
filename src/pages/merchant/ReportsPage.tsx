import { Alert, Button, Card, Skeleton, Table, Text } from '@mantine/core';
import { IconDownload, IconReportMoney } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { messageFor } from '../../api/errors';
import { fetchDailyPayments, useDailyReports, useMySalesPoints } from '../../api/queries';
import { Empty } from '../../layout/Empty';
import { PageTitle } from '../../layout/PageTitle';
import { formatSom } from '../../lib/money';
import { notifyError } from '../../lib/notify';

/** One row per website and business day, built each night; the CSV lists every payment and refund behind a day. */
export function ReportsPage() {
  const { t } = useTranslation();
  const reports = useDailyReports();
  const salesPoints = useMySalesPoints();
  const names = new Map((salesPoints.data ?? []).map((s) => [s.id, s.name]));

  const download = async (day: string) => {
    try {
      const blob = (await fetchDailyPayments(day)) as Blob;
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `payments-${day}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (e) {
      notifyError(e);
    }
  };

  return (
    <>
      <PageTitle title={t('reports.title')} description={t('reports.description')} />
      {reports.isPending && <Skeleton h={200} />}
      {reports.isError && <Alert color="red">{messageFor(reports.error)}</Alert>}
      {reports.data?.length === 0 && (
        <Empty icon={IconReportMoney} title={t('reports.empty')} text={t('reports.emptyText')} />
      )}
      {!!reports.data?.length && (
        <Card withBorder padding={0}>
          <Table.ScrollContainer minWidth={860}>
            <Table verticalSpacing="sm" horizontalSpacing="md">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t('reports.day')}</Table.Th>
                  <Table.Th>{t('salesPoints.website')}</Table.Th>
                  <Table.Th>{t('reports.paid')}</Table.Th>
                  <Table.Th>{t('reports.fee')}</Table.Th>
                  <Table.Th>{t('reports.refunded')}</Table.Th>
                  <Table.Th>{t('reports.payout')}</Table.Th>
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {reports.data.map((row) => (
                  <Table.Tr key={`${row.businessDay}-${row.salesPointId}`}>
                    <Table.Td>{row.businessDay}</Table.Td>
                    <Table.Td>{names.get(row.salesPointId) ?? '…'}</Table.Td>
                    <Table.Td>
                      <Text size="sm">{formatSom(row.paidAmount)}</Text>
                      <Text size="xs" c="dimmed">
                        {t('reports.count', { count: row.paidCount })}
                      </Text>
                    </Table.Td>
                    <Table.Td>{formatSom(row.fee)}</Table.Td>
                    <Table.Td>
                      <Text size="sm">{formatSom(row.refundedAmount)}</Text>
                      <Text size="xs" c="dimmed">
                        {t('reports.count', { count: row.refundedCount })}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={600} c={row.payout < 0 ? 'red' : undefined}>
                        {formatSom(row.payout)}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Button
                        size="xs"
                        variant="default"
                        leftSection={<IconDownload size={14} />}
                        onClick={() => download(row.businessDay)}
                      >
                        CSV
                      </Button>
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
