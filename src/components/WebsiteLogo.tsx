import { Avatar, Button, FileButton, Group, Stack, Text } from '@mantine/core';
import { IconPhoto, IconUpload } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { SalesPoint } from '../api/client';
import { useLogo, useUploadLogo } from '../api/queries';
import { notifyError, notifySuccess } from '../lib/notify';

const MAX_BYTES = 1024 * 1024;

/** The logo buyers see on the payment page. The merchant can change it; the bank only sees it. */
export function WebsiteLogo({ salesPoint, editable }: { salesPoint: SalesPoint; editable: boolean }) {
  const { t } = useTranslation();
  const logo = useLogo(salesPoint.id, salesPoint.logoUpdatedAt, !editable);
  const upload = useUploadLogo();
  const choose = (file: File | null) => {
    if (!file) return;
    if (file.size > MAX_BYTES) return notifyError(new Error(t('logo.tooBig')));
    upload.mutate(
      { salesPointId: salesPoint.id, file },
      { onSuccess: () => notifySuccess(t('logo.saved')), onError: notifyError },
    );
  };
  return (
    <Group gap="md" align="center">
      <Avatar
        src={logo.data}
        size={56}
        radius="md"
        variant="light"
        alt={t('logo.alt', { name: salesPoint.name })}
      >
        <IconPhoto size={24} />
      </Avatar>
      <Stack gap={2}>
        <Text size="sm" fw={500}>
          {t('logo.title')}
        </Text>
        <Text size="xs" c="dimmed">
          {salesPoint.logoUpdatedAt ? t('logo.hint') : t('logo.none')}
        </Text>
        {editable && (
          <FileButton onChange={choose} accept="image/png,image/jpeg">
            {(props) => (
              <Button
                {...props}
                size="compact-xs"
                variant="default"
                leftSection={<IconUpload size={12} />}
                loading={upload.isPending}
                w="fit-content"
              >
                {salesPoint.logoUpdatedAt ? t('logo.change') : t('logo.upload')}
              </Button>
            )}
          </FileButton>
        )}
      </Stack>
    </Group>
  );
}
