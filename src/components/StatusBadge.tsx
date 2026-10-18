import { Badge } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { PartnerStatus } from '../api/client';
import { STATUS_COLOR } from '../lib/partner';

export function StatusBadge({ status }: { status: PartnerStatus }) {
  const { t } = useTranslation();
  return (
    <Badge color={STATUS_COLOR[status]} variant="light">
      {t(`status.${status}`)}
    </Badge>
  );
}
