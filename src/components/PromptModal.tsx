import { Button, Group, Modal, Stack, Text, Textarea, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

type Props = {
  opened: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  label: string;
  hint?: string;
  multiline?: boolean;
  confirmLabel: string;
  color?: string;
  loading?: boolean;
  onSubmit: (value: string) => void;
};

/** Asks for one value before an action: a reason for a suspension, a contract number for a signing. */
export function PromptModal({
  opened,
  onClose,
  title,
  description,
  label,
  hint,
  multiline,
  confirmLabel,
  color,
  loading,
  onSubmit,
}: Props) {
  const { t } = useTranslation();
  const form = useForm({
    initialValues: { value: '' },
    validate: { value: (v) => (v.trim().length < 3 ? t('partner.reasonShort') : null) },
  });
  useEffect(() => {
    if (opened) form.reset();
    // reset only when the modal opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened]);

  const Field = multiline ? Textarea : TextInput;
  return (
    <Modal opened={opened} onClose={onClose} title={title} centered>
      <form onSubmit={form.onSubmit(({ value }) => onSubmit(value.trim()))}>
        <Stack>
          {description && (
            <Text size="sm" c="dimmed">
              {description}
            </Text>
          )}
          <Field
            label={label}
            description={hint}
            data-autofocus
            maxLength={500}
            autosize={multiline || undefined}
            minRows={multiline ? 3 : undefined}
            {...form.getInputProps('value')}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" color={color} loading={loading}>
              {confirmLabel}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
