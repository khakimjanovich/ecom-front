import {
  ActionIcon,
  Alert,
  Button,
  Checkbox,
  Code,
  CopyButton,
  Group,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import { IconAlertTriangle, IconCheck, IconCopy } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

function Copyable({ label, value }: { label: string; value: string }) {
  const { t } = useTranslation();
  return (
    <div>
      <Text size="xs" c="dimmed" tt="uppercase" fw={600} mb={4}>
        {label}
      </Text>
      <Group gap="xs" wrap="nowrap">
        <Code block style={{ flex: 1, overflowX: 'auto' }}>
          {value}
        </Code>
        <CopyButton value={value}>
          {({ copied, copy }) => (
            <Tooltip label={copied ? t('common.copied') : t('common.copy')}>
              <ActionIcon
                variant="light"
                color={copied ? 'green' : 'gray'}
                onClick={copy}
                aria-label={`${t('common.copy')}: ${label}`}
              >
                {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
              </ActionIcon>
            </Tooltip>
          )}
        </CopyButton>
      </Group>
    </div>
  );
}

/** A client secret, shown exactly once. The person must confirm they stored it before closing. */
export function SecretReveal({
  clientId,
  secret,
  onDone,
}: {
  clientId: string;
  secret: string;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const [stored, setStored] = useState(false);
  return (
    <Stack>
      <Alert color="yellow" icon={<IconAlertTriangle size={18} />}>
        {t('clients.onceWarning')}
      </Alert>
      <Copyable label={t('clients.clientId')} value={clientId} />
      <Copyable label={t('clients.secret')} value={secret} />
      <Checkbox
        checked={stored}
        onChange={(e) => setStored(e.currentTarget.checked)}
        label={t('clients.stored')}
      />
      <Button disabled={!stored} onClick={onDone}>
        {t('common.done')}
      </Button>
    </Stack>
  );
}
