import { Alert, Badge, Button, Card, Code, Group, Skeleton, Table, Text, Tooltip } from '@mantine/core';
import { modals } from '@mantine/modals';
import { IconKey, IconPlus, IconRefresh } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { messageFor } from '../../api/errors';
import { useClients, useCreateClient, useMe, useRotateSecret } from '../../api/queries';
import { SecretReveal } from '../../components/SecretReveal';
import { Empty } from '../../layout/Empty';
import { PageTitle } from '../../layout/PageTitle';
import { notifyError } from '../../lib/notify';
import { formatDate } from '../../lib/time';

const SECRET_MODAL = 'client-secret';

/** Machine-to-machine clients for the merchant's servers. Secrets are shown once, and rotation kills the old one. */
export function ApiClientsPage() {
  const { t } = useTranslation();
  const me = useMe();
  const live = me.data?.status === 'ACTIVE';
  const clients = useClients(live);
  const create = useCreateClient();
  const rotate = useRotateSecret();

  const reveal = (title: string, issued: { clientId: string; clientSecret: string }) =>
    modals.open({
      modalId: SECRET_MODAL,
      title,
      closeOnClickOutside: false,
      closeOnEscape: false,
      withCloseButton: false,
      children: (
        <SecretReveal
          clientId={issued.clientId}
          secret={issued.clientSecret}
          onDone={() => modals.close(SECRET_MODAL)}
        />
      ),
    });

  const onCreate = () =>
    create.mutate(undefined, { onSuccess: (c) => reveal(t('clients.newTitle'), c), onError: notifyError });

  const onRotate = (clientId: string) =>
    modals.openConfirmModal({
      title: t('clients.rotateTitle'),
      children: <Text size="sm">{t('clients.rotateText')}</Text>,
      labels: { confirm: t('clients.rotate'), cancel: t('common.cancel') },
      confirmProps: { color: 'red' },
      onConfirm: () =>
        rotate.mutate(clientId, {
          onSuccess: (c) => reveal(t('clients.newSecretTitle'), c),
          onError: notifyError,
        }),
    });

  if (me.isPending) return <Skeleton h={240} />;
  if (!live) return <Empty icon={IconKey} title={t('clients.lockedTitle')} text={t('clients.lockedText')} />;

  return (
    <>
      <PageTitle
        title={t('clients.title')}
        description={t('clients.description')}
        actions={
          <Button leftSection={<IconPlus size={16} />} loading={create.isPending} onClick={onCreate}>
            {t('clients.new')}
          </Button>
        }
      />
      {clients.isError && <Alert color="red">{messageFor(clients.error)}</Alert>}
      {clients.data?.length === 0 && (
        <Empty icon={IconKey} title={t('clients.emptyTitle')} text={t('clients.emptyText')} />
      )}
      {!!clients.data?.length && (
        <Card withBorder padding={0}>
          <Table.ScrollContainer minWidth={680}>
            <Table verticalSpacing="sm" horizontalSpacing="lg">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t('clients.clientId')}</Table.Th>
                  <Table.Th>{t('clients.created')}</Table.Th>
                  <Table.Th>{t('clients.rotated')}</Table.Th>
                  <Table.Th>{t('clients.signingKey')}</Table.Th>
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {clients.data.map((client) => (
                  <Table.Tr key={client.clientId}>
                    <Table.Td>
                      <Code>{client.clientId}</Code>
                    </Table.Td>
                    <Table.Td>{formatDate(client.createdAt)}</Table.Td>
                    <Table.Td>
                      {client.secretRotatedAt ? formatDate(client.secretRotatedAt) : t('clients.never')}
                    </Table.Td>
                    <Table.Td>
                      {client.signingKeyConfigured ? (
                        <Badge color="green" variant="light">
                          {t('clients.keySet')}
                        </Badge>
                      ) : (
                        <Tooltip label={t('clients.keyMissingHint')} multiline w={260}>
                          <Badge color="yellow" variant="light">
                            {t('clients.keyMissing')}
                          </Badge>
                        </Tooltip>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Group justify="flex-end">
                        <Button
                          variant="default"
                          size="xs"
                          leftSection={<IconRefresh size={14} />}
                          onClick={() => onRotate(client.clientId)}
                        >
                          {t('clients.rotate')}
                        </Button>
                      </Group>
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
