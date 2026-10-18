import { Stack, Text, ThemeIcon, Title } from '@mantine/core';
import type { Icon } from '@tabler/icons-react';
import type { ReactNode } from 'react';

/** A friendly placeholder: nothing here yet, or nothing allowed, and what to do about it. */
export function Empty({
  icon: IconComponent,
  title,
  text,
  action,
}: {
  icon: Icon;
  title: string;
  text?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Stack align="center" gap="xs" py={56} maw={440} mx="auto" ta="center">
      <ThemeIcon size={48} radius="xl" variant="light" color="gray">
        <IconComponent size={24} />
      </ThemeIcon>
      <Title order={3} size="h4">
        {title}
      </Title>
      {text && (
        <Text c="dimmed" size="sm">
          {text}
        </Text>
      )}
      {action}
    </Stack>
  );
}
