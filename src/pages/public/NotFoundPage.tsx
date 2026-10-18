import { Anchor } from '@mantine/core';
import { IconMapOff } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Empty } from '../../layout/Empty';

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <Empty
      icon={IconMapOff}
      title={t('notFound.title')}
      text={t('notFound.text')}
      action={
        <Anchor component={Link} to="/">
          {t('notFound.home')}
        </Anchor>
      }
    />
  );
}
