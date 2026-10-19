import { Badge, Button, Card, Group, Pagination, Skeleton, Stack, Text, Tooltip } from '@mantine/core';
import { IconChecklist } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CommissionChange } from '../../api/client';
import { messageFor } from '../../api/errors';
import { useCommissionRequests, useDecideCommission } from '../../api/queries';
import { useSession } from '../../auth/session';
import { MerchantName, SalesPointName } from '../../components/MerchantPicker';
import { PromptModal } from '../../components/PromptModal';
import { Empty } from '../../layout/Empty';
import { formatSom } from '../../lib/money';
import { notifyError, notifySuccess } from '../../lib/notify';
import { formatDate, fromNow } from '../../lib/time';

/** Fee rules to add or end, waiting for a second admin. */
export function FeeChanges() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const changes = useCommissionRequests(page - 1);
  const decide = useDecideCommission();
  const { name } = useSession();
  const [rejecting, setRejecting] = useState<CommissionChange | null>(null);

  const done = () => notifySuccess(t('partner.done'));
  if (changes.isPending) return <Skeleton h={200} />;
  if (changes.isError) return <Text c="red">{messageFor(changes.error)}</Text>;
  if (!changes.data.items.length) return <Empty icon={IconChecklist} title={t('approvals.emptyTitle')} />;

  return (
    <Stack maw={760}>
      {changes.data.items.map((change) => {
        const mine = change.requestedBy === name;
        const rule = change.rule;
        return (
          <Card key={change.id} withBorder padding="lg">
            <Group justify="space-between" align="flex-start">
              <div>
                <Text fw={600}>
                  {change.kind === 'CREATE'
                    ? t('approvals.create')
                    : t('approvals.endRule', { when: formatDate(change.endsAt!) })}
                </Text>
                <Text size="sm">
                  {rule.percent}% + {formatSom(rule.fixedFee)} ·{' '}
                  {rule.partnerId ? <MerchantName id={rule.partnerId} /> : t('fees.bankWide')}
                  {rule.salesPointId && (
                    <>
                      {' · '}
                      <SalesPointName id={rule.salesPointId} />
                    </>
                  )}
                  {' · '}
                  {rule.scheme ? t(`scheme.${rule.scheme}`) : t('fees.anyScheme')}
                </Text>
                {change.kind === 'END' && (
                  <Text size="sm" mt={4}>
                    <Text span c="dimmed">
                      {t('fees.validTo')}:{' '}
                    </Text>
                    <Text span td="line-through" c="dimmed">
                      {rule.validTo ? formatDate(rule.validTo) : t('fees.noEnd')}
                    </Text>
                    {' → '}
                    <Text span fw={600}>
                      {formatDate(change.endsAt!)}
                    </Text>
                  </Text>
                )}
                <Text size="xs" c="dimmed">
                  {t('approvals.requestedBy', { name: change.requestedBy })} · {fromNow(change.createdAt)}
                </Text>
              </div>
              <Badge variant="light" color="yellow">
                {t('fees.validFrom')}: {formatDate(rule.validFrom)}
              </Badge>
            </Group>
            <Group mt="md">
              <Tooltip label={t('approvals.yours')} disabled={!mine} multiline w={260}>
                <Button
                  disabled={mine}
                  loading={decide.isPending && decide.variables?.requestId === change.id}
                  onClick={() =>
                    decide.mutate(
                      { requestId: change.id, approve: true },
                      { onSuccess: done, onError: notifyError },
                    )
                  }
                >
                  {t('approvals.approve')}
                </Button>
              </Tooltip>
              <Button variant="light" color="red" disabled={mine} onClick={() => setRejecting(change)}>
                {t('approvals.reject')}
              </Button>
            </Group>
          </Card>
        );
      })}
      {changes.data.totalPages > 1 && (
        <Pagination value={page} onChange={setPage} total={changes.data.totalPages} size="sm" />
      )}
      <PromptModal
        opened={rejecting !== null}
        onClose={() => setRejecting(null)}
        title={t('approvals.reject')}
        label={t('partner.reason')}
        hint={t('partner.reasonHint')}
        multiline
        confirmLabel={t('approvals.reject')}
        color="red"
        loading={decide.isPending}
        onSubmit={(reason) =>
          rejecting &&
          decide.mutate(
            { requestId: rejecting.id, approve: false, reason },
            {
              onSuccess: () => {
                setRejecting(null);
                done();
              },
              onError: notifyError,
            },
          )
        }
      />
    </Stack>
  );
}
