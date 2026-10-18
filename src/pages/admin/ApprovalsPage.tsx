import { Anchor, Badge, Button, Card, Group, Skeleton, Stack, Tabs, Text, Tooltip } from '@mantine/core';
import { IconChecklist } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import type { Schemas } from '../../api/client';
import { messageFor } from '../../api/errors';
import { useApprovals, useCommissionRequests, useDecideActivation } from '../../api/queries';
import { useSession } from '../../auth/session';
import { PromptModal } from '../../components/PromptModal';
import { Empty } from '../../layout/Empty';
import { PageTitle } from '../../layout/PageTitle';
import { FeeChanges } from './FeeChanges';
import { notifyError, notifySuccess } from '../../lib/notify';
import { fromNow } from '../../lib/time';

type Request = Schemas['ActivationRequestResponse'];

function Activations() {
  const { t } = useTranslation();
  const approvals = useApprovals();
  const decide = useDecideActivation();
  const { name } = useSession();
  const [rejecting, setRejecting] = useState<Request | null>(null);

  const approve = (request: Request) =>
    decide.mutate(
      { requestId: request.id, approve: true },
      {
        onSuccess: () => notifySuccess(t('approvals.approved', { company: request.companyName })),
        onError: notifyError,
      },
    );
  const reject = (reason: string) =>
    rejecting &&
    decide.mutate(
      { requestId: rejecting.id, approve: false, reason },
      {
        onSuccess: () => {
          setRejecting(null);
          notifySuccess(t('approvals.rejected'));
        },
        onError: notifyError,
      },
    );

  return (
    <>
      {approvals.isPending && <Skeleton h={200} />}
      {approvals.isError && <Text c="red">{messageFor(approvals.error)}</Text>}
      {approvals.data?.length === 0 && (
        <Empty icon={IconChecklist} title={t('approvals.emptyTitle')} text={t('approvals.emptyText')} />
      )}
      <Stack maw={760}>
        {approvals.data?.map((request) => {
          const mine = request.requestedBy === name;
          return (
            <Card key={request.id} withBorder padding="lg">
              <Group justify="space-between" align="flex-start" wrap="wrap">
                <div>
                  <Anchor component={Link} to={`/admin/partners/${request.partnerId}`} fw={600}>
                    {request.companyName}
                  </Anchor>
                  <Text size="sm" c="dimmed">
                    {t('approvals.requestedBy', { name: request.requestedBy })} · {fromNow(request.createdAt)}
                  </Text>
                </div>
                <Badge variant="light" color="yellow">
                  {t('approvals.expires', { when: fromNow(request.expiresAt) })}
                </Badge>
              </Group>
              <Group mt="md">
                <Tooltip label={t('approvals.yours')} disabled={!mine} multiline w={260}>
                  <Button
                    disabled={mine}
                    loading={decide.isPending && decide.variables?.requestId === request.id}
                    onClick={() => approve(request)}
                  >
                    {t('approvals.approve')}
                  </Button>
                </Tooltip>
                <Button variant="light" color="red" disabled={mine} onClick={() => setRejecting(request)}>
                  {t('approvals.reject')}
                </Button>
              </Group>
            </Card>
          );
        })}
      </Stack>
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
        onSubmit={reject}
      />
    </>
  );
}

/** Four eyes: everything waiting for a second admin. Nobody can approve their own request. */
export function ApprovalsPage() {
  const { t } = useTranslation();
  const activations = useApprovals();
  const fees = useCommissionRequests();
  const count = (n?: number) =>
    n ? (
      <Badge size="xs" circle ml={6}>
        {n}
      </Badge>
    ) : null;
  return (
    <>
      <PageTitle title={t('approvals.title')} description={t('approvals.description')} />
      <Tabs defaultValue="activations" keepMounted={false}>
        <Tabs.List mb="md">
          <Tabs.Tab value="activations">
            {t('approvals.activations')}
            {count(activations.data?.length)}
          </Tabs.Tab>
          <Tabs.Tab value="fees">
            {t('approvals.feeChanges')}
            {count(fees.data?.length)}
          </Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="activations">
          <Activations />
        </Tabs.Panel>
        <Tabs.Panel value="fees">
          <FeeChanges />
        </Tabs.Panel>
      </Tabs>
    </>
  );
}
