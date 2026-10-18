import {
  Alert,
  Button,
  Card,
  Group,
  Modal,
  Skeleton,
  Stack,
  TagsInput,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconPencil, IconPlus, IconWorldWww } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { SalesPoint } from '../../api/client';
import { fieldErrors, messageFor } from '../../api/errors';
import { useCreateSalesPoint, useMySalesPoints, useUpdateReturnUrls } from '../../api/queries';
import { SalesPointBadge, SalesPointFacts } from '../../components/SalesPointFacts';
import { Empty } from '../../layout/Empty';
import { PageTitle } from '../../layout/PageTitle';
import { notifyError, notifySuccess } from '../../lib/notify';

const HTTPS = /^https:\/\/.+/;

/** The merchant's websites: add one, see what the bank decided, fix return addresses while it is a draft. */
export function SalesPointsPage() {
  const { t } = useTranslation();
  const salesPoints = useMySalesPoints();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<SalesPoint | null>(null);

  return (
    <>
      <PageTitle
        title={t('salesPoints.title')}
        description={t('salesPoints.description')}
        actions={
          <Button leftSection={<IconPlus size={16} />} onClick={() => setAdding(true)}>
            {t('salesPoints.add')}
          </Button>
        }
      />
      {salesPoints.isPending && <Skeleton h={200} />}
      {salesPoints.isError && <Alert color="red">{messageFor(salesPoints.error)}</Alert>}
      {salesPoints.data?.length === 0 && (
        <Empty icon={IconWorldWww} title={t('salesPoints.emptyTitle')} text={t('salesPoints.emptyText')} />
      )}
      <Stack maw={960}>
        {salesPoints.data?.map((salesPoint) => (
          <Card key={salesPoint.id} withBorder padding="lg">
            <Group justify="space-between" mb="md">
              <Title order={4}>{salesPoint.name}</Title>
              <Group gap="xs">
                {salesPoint.status === 'DRAFT' && (
                  <Button
                    size="xs"
                    variant="default"
                    leftSection={<IconPencil size={14} />}
                    onClick={() => setEditing(salesPoint)}
                  >
                    {t('salesPoints.editReturnUrls')}
                  </Button>
                )}
                <SalesPointBadge status={salesPoint.status} />
              </Group>
            </Group>
            <SalesPointFacts salesPoint={salesPoint} />
          </Card>
        ))}
      </Stack>
      <AddWebsite opened={adding} onClose={() => setAdding(false)} />
      <EditReturnUrls key={editing?.id} salesPoint={editing} onClose={() => setEditing(null)} />
    </>
  );
}

function AddWebsite({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const create = useCreateSalesPoint();
  const form = useForm({
    initialValues: { name: '', websiteUrl: 'https://', returnUrls: [] as string[] },
    validate: {
      name: (v) => (v.trim().length < 2 ? t('signup.errors.company') : null),
      websiteUrl: (v) => (HTTPS.test(v.trim()) ? null : t('salesPoints.websiteHint')),
      returnUrls: (v) =>
        v.length && v.every((url) => HTTPS.test(url)) ? null : t('salesPoints.returnUrlsHint'),
    },
  });
  const submit = form.onSubmit((values) =>
    create.mutate(
      { name: values.name.trim(), websiteUrl: values.websiteUrl.trim(), returnUrls: values.returnUrls },
      {
        onSuccess: () => {
          notifySuccess(t('salesPoints.added'));
          form.reset();
          onClose();
        },
        onError: (error) => {
          const fields = fieldErrors(error);
          if (Object.keys(fields).length) form.setErrors(fields);
          else notifyError(error);
        },
      },
    ),
  );
  return (
    <Modal opened={opened} onClose={onClose} title={t('salesPoints.add')} centered>
      <form onSubmit={submit} noValidate>
        <Stack>
          <TextInput
            label={t('salesPoints.name')}
            description={t('salesPoints.nameHint')}
            data-autofocus
            {...form.getInputProps('name')}
          />
          <TextInput
            label={t('salesPoints.website')}
            description={t('salesPoints.websiteHint')}
            type="url"
            {...form.getInputProps('websiteUrl')}
          />
          <TagsInput
            label={t('salesPoints.returnUrls')}
            description={t('salesPoints.returnUrlsHint')}
            placeholder="https://"
            splitChars={[',', ' ']}
            {...form.getInputProps('returnUrls')}
          />
          {create.isError && !Object.keys(fieldErrors(create.error)).length && (
            <Alert color="red" variant="light">
              {messageFor(create.error)}
            </Alert>
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" loading={create.isPending}>
              {t('salesPoints.add')}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

function EditReturnUrls({ salesPoint, onClose }: { salesPoint: SalesPoint | null; onClose: () => void }) {
  const { t } = useTranslation();
  const update = useUpdateReturnUrls();
  const [urls, setUrls] = useState<string[]>(salesPoint?.returnUrls ?? []);

  return (
    <Modal opened={salesPoint !== null} onClose={onClose} title={t('salesPoints.editReturnUrls')} centered>
      <Stack>
        <Text size="sm" c="dimmed">
          {t('salesPoints.draftOnly')}
        </Text>
        <TagsInput
          label={t('salesPoints.returnUrls')}
          description={t('salesPoints.returnUrlsHint')}
          value={urls}
          onChange={setUrls}
          splitChars={[',', ' ']}
        />
        {update.isError && (
          <Alert color="red" variant="light">
            {messageFor(update.error)}
          </Alert>
        )}
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            loading={update.isPending}
            disabled={!urls.length}
            onClick={() =>
              salesPoint &&
              update.mutate(
                { salesPointId: salesPoint.id, returnUrls: urls },
                {
                  onSuccess: () => {
                    notifySuccess(t('salesPoints.saved'));
                    onClose();
                  },
                },
              )
            }
          >
            {t('salesPoint.save')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
