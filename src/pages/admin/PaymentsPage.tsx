import {
  Alert,
  Badge,
  Button,
  Card,
  Code,
  Group,
  Modal,
  Skeleton,
  Stack,
  Table,
  Tabs,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconChecks, IconReceipt } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AdminPayment, PaymentResolution } from '../../api/client';
import { messageFor } from '../../api/errors';
import { usePayments, usePaymentsToReview, useResolvePayment } from '../../api/queries';
import { MerchantName, MerchantSelect, SalesPointName } from '../../components/MerchantPicker';
import { Empty } from '../../layout/Empty';
import { PageTitle } from '../../layout/PageTitle';
import { PAYMENT_STATUS_COLOR } from '../../lib/payment';
import { formatSom } from '../../lib/money';
import { notifyError, notifySuccess } from '../../lib/notify';
import { formatDate, fromNow } from '../../lib/time';

/**
 * Every payment merchants' servers created, newest first, optionally for one merchant; and the ones
 * the scheme left without an answer, for a person to resolve.
 */
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
      <Tabs defaultValue="all" keepMounted={false}>
        <Tabs.List mb="md">
          <Tabs.Tab value="all">{t('payments.all')}</Tabs.Tab>
          <Tabs.Tab value="review">{t('payments.review.tab')}</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="review">
          <ReviewQueue />
        </Tabs.Panel>
        <Tabs.Panel value="all">
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
                      <Table.Th>{t('payments.card')}</Table.Th>
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
                          {payment.fee != null && (
                            <Text size="xs" c="dimmed">
                              {t('payments.fee', { fee: formatSom(payment.fee) })}
                            </Text>
                          )}
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
                          {payment.cardMask ? (
                            <>
                              <Text size="sm" ff="monospace">
                                {payment.cardMask}
                              </Text>
                              <Text size="xs" c="dimmed">
                                {[
                                  payment.cardScheme && t(`scheme.${payment.cardScheme}`),
                                  payment.merchantId,
                                  payment.terminalId,
                                ]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </Text>
                            </>
                          ) : payment.clientId ? (
                            <Code>{payment.clientId}</Code>
                          ) : (
                            <Badge variant="outline" color="gray">
                              {t('payments.link')}
                            </Badge>
                          )}
                        </Table.Td>
                        <Table.Td>
                          <Badge variant="light" color={PAYMENT_STATUS_COLOR[payment.status]}>
                            {t(`payments.statusName.${payment.status}`)}
                          </Badge>
                          {(payment.rrn || payment.declineCode) && (
                            <Text size="xs" c="dimmed" ff="monospace" mt={4}>
                              {payment.rrn ? `RRN ${payment.rrn}` : payment.declineCode}
                            </Text>
                          )}
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            </Card>
          )}
        </Tabs.Panel>
      </Tabs>
    </>
  );
}

/** UNKNOWN (still being checked) and MANUAL_REVIEW (a person decides), oldest first. */
function ReviewQueue() {
  const { t } = useTranslation();
  const queue = usePaymentsToReview();
  const [deciding, setDeciding] = useState<{
    payment: AdminPayment;
    decision: PaymentResolution['decision'];
  }>();

  if (queue.isPending) return <Skeleton h={240} />;
  if (queue.isError) return <Alert color="red">{messageFor(queue.error)}</Alert>;
  if (!queue.data.length)
    return (
      <Empty icon={IconChecks} title={t('payments.review.empty')} text={t('payments.review.emptyText')} />
    );
  return (
    <Card withBorder padding={0}>
      <Table.ScrollContainer minWidth={820}>
        <Table verticalSpacing="sm" horizontalSpacing="md">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t('payments.review.age')}</Table.Th>
              <Table.Th>{t('payments.order')}</Table.Th>
              <Table.Th ta="right">{t('payments.amount')}</Table.Th>
              <Table.Th>{t('payments.card')}</Table.Th>
              <Table.Th>{t('payments.status')}</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {queue.data.map((payment) => (
              <Table.Tr key={payment.id}>
                <Table.Td>
                  <Text size="sm">{fromNow(payment.createdAt)}</Text>
                  <Text size="xs" c="dimmed">
                    {formatDate(payment.createdAt)}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" fw={500} ff="monospace">
                    {payment.orderId}
                  </Text>
                  <Text size="xs" c="dimmed">
                    <SalesPointName id={payment.salesPointId} />
                  </Text>
                </Table.Td>
                <Table.Td ta="right">
                  <Text size="sm" fw={600}>
                    {formatSom(payment.amount)}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" ff="monospace">
                    {payment.cardMask}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {[
                      payment.cardScheme && t(`scheme.${payment.cardScheme}`),
                      payment.merchantId,
                      payment.terminalId,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Badge variant="light" color={PAYMENT_STATUS_COLOR[payment.status]}>
                    {t(`payments.statusName.${payment.status}`)}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  {payment.status === 'MANUAL_REVIEW' && (
                    <Group gap="xs" justify="flex-end" wrap="nowrap">
                      <Button
                        size="xs"
                        variant="light"
                        onClick={() => setDeciding({ payment, decision: 'DEBITED' })}
                      >
                        {t('payments.review.debited')}
                      </Button>
                      <Button
                        size="xs"
                        variant="light"
                        color="red"
                        onClick={() => setDeciding({ payment, decision: 'NOT_DEBITED' })}
                      >
                        {t('payments.review.notDebited')}
                      </Button>
                    </Group>
                  )}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
      {deciding && (
        <ResolveModal
          payment={deciding.payment}
          decision={deciding.decision}
          onClose={() => setDeciding(undefined)}
        />
      )}
    </Card>
  );
}

/** The decision needs a note; DEBITED also the scheme's reference for the debit. */
function ResolveModal({
  payment,
  decision,
  onClose,
}: {
  payment: AdminPayment;
  decision: PaymentResolution['decision'];
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const resolve = useResolvePayment();
  const debited = decision === 'DEBITED';
  const form = useForm({
    initialValues: { note: '', schemeReference: '' },
    validate: {
      note: (v) => (v.trim().length < 3 ? t('partner.reasonShort') : null),
      schemeReference: (v) => (debited && !v.trim() ? t('payments.review.referenceRequired') : null),
    },
  });
  return (
    <Modal
      opened
      onClose={onClose}
      title={t(debited ? 'payments.review.debitedTitle' : 'payments.review.notDebitedTitle')}
      centered
    >
      <form
        onSubmit={form.onSubmit(({ note, schemeReference }) =>
          resolve.mutate(
            {
              paymentId: payment.id,
              decision,
              note: note.trim(),
              schemeReference: debited ? schemeReference.trim() : undefined,
            },
            {
              onSuccess: (resolved) => {
                notifySuccess(
                  t('payments.review.resolved', { status: t(`payments.statusName.${resolved.status}`) }),
                );
                onClose();
              },
              onError: notifyError,
            },
          ),
        )}
      >
        <Stack>
          <Text size="sm" c="dimmed">
            {t(debited ? 'payments.review.debitedText' : 'payments.review.notDebitedText', {
              order: payment.orderId,
              amount: formatSom(payment.amount),
            })}
          </Text>
          {debited && (
            <TextInput
              label={t('payments.review.reference')}
              maxLength={64}
              data-autofocus
              {...form.getInputProps('schemeReference')}
            />
          )}
          <Textarea
            label={t('payments.review.note')}
            description={t('payments.review.noteHint')}
            maxLength={500}
            autosize
            minRows={3}
            {...form.getInputProps('note')}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" color={debited ? undefined : 'red'} loading={resolve.isPending}>
              {t('payments.review.confirm')}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
