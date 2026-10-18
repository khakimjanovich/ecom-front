import { Anchor, Card, Group, Pagination, Select, Skeleton, Table, Text, TextInput } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { IconSearch, IconUsers } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router';
import type { PartnerStatus } from '../../api/client';
import { messageFor } from '../../api/errors';
import { usePartners } from '../../api/queries';
import { StatusBadge } from '../../components/StatusBadge';
import { Empty } from '../../layout/Empty';
import { PageTitle } from '../../layout/PageTitle';
import { STATUS_COLOR } from '../../lib/partner';
import { formatDate } from '../../lib/time';

const PAGE_SIZE = 20;

/** All merchants. Filters live in the URL, so Back and shared links keep them. */
export function PartnersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const status = (params.get('status') as PartnerStatus | null) ?? undefined;
  const page = Number(params.get('page') ?? 1);
  const [search, setSearch] = useState(params.get('q') ?? '');
  const [q] = useDebouncedValue(search.trim(), 300);

  const partners = usePartners({ status, q: q || undefined, page: page - 1, size: PAGE_SIZE });
  const update = (changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
    setParams(next, { replace: true });
  };

  return (
    <>
      <PageTitle title={t('partners.title')} description={t('partners.description')} />
      <Group mb="md" align="flex-end">
        <TextInput
          placeholder={t('partners.search')}
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => {
            setSearch(e.currentTarget.value);
            update({ q: e.currentTarget.value.trim() || undefined, page: undefined });
          }}
          w={{ base: '100%', sm: 320 }}
          aria-label={t('partners.search')}
        />
        <Select
          placeholder={t('partners.allStatuses')}
          data={Object.keys(STATUS_COLOR).map((value) => ({ value, label: t(`status.${value}`) }))}
          value={status ?? null}
          onChange={(value) => update({ status: value ?? undefined, page: undefined })}
          clearable
          w={{ base: '100%', sm: 240 }}
          aria-label={t('partners.allStatuses')}
        />
      </Group>

      {partners.isPending && <Skeleton h={320} />}
      {partners.isError && <Text c="red">{messageFor(partners.error)}</Text>}
      {partners.data?.items.length === 0 && (
        <Empty icon={IconUsers} title={t('partners.emptyTitle')} text={t('partners.emptyText')} />
      )}
      {!!partners.data?.items.length && (
        <Card withBorder padding={0}>
          <Table.ScrollContainer minWidth={640}>
            <Table highlightOnHover verticalSpacing="sm" horizontalSpacing="lg">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t('partners.company')}</Table.Th>
                  <Table.Th>{t('partners.email')}</Table.Th>
                  <Table.Th>{t('partners.signedUp')}</Table.Th>
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {partners.data.items.map((partner) => (
                  <Table.Tr
                    key={partner.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/admin/partners/${partner.id}`)}
                  >
                    <Table.Td>
                      <Anchor
                        component={Link}
                        to={`/admin/partners/${partner.id}`}
                        fw={500}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {partner.companyName}
                      </Anchor>
                    </Table.Td>
                    <Table.Td>{partner.email}</Table.Td>
                    <Table.Td>{formatDate(partner.createdAt)}</Table.Td>
                    <Table.Td>
                      <StatusBadge status={partner.status} />
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Card>
      )}
      {(partners.data?.totalPages ?? 0) > 1 && (
        <Group justify="center" mt="md">
          <Pagination
            total={partners.data!.totalPages}
            value={page}
            onChange={(p) => update({ page: String(p) })}
          />
        </Group>
      )}
    </>
  );
}
