import { Select, type SelectProps } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { useState } from 'react';
import { usePartner, usePartnerSalesPoints, usePartners, useSalesPoint } from '../api/queries';

/** Pick a merchant by typing part of its name or email; the server does the searching. */
export function MerchantSelect(props: Omit<SelectProps, 'data'>) {
  const [search, setSearch] = useState('');
  const [q] = useDebouncedValue(search.trim(), 300);
  const partners = usePartners({ q: q || undefined, page: 0, size: 20 });
  const chosen = usePartner(props.value ?? '');
  const options = new Map((partners.data?.items ?? []).map((p) => [p.id, `${p.companyName} · ${p.email}`]));
  if (props.value && chosen.data)
    options.set(chosen.data.id, `${chosen.data.companyName} · ${chosen.data.email}`);
  return (
    <Select
      searchable
      clearable
      {...props}
      data={[...options].map(([value, label]) => ({ value, label }))}
      searchValue={search}
      onSearchChange={setSearch}
      filter={({ options: all }) => all}
      nothingFoundMessage="—"
    />
  );
}

/** One of the chosen merchant's websites. */
export function SalesPointSelect({
  partnerId,
  ...props
}: Omit<SelectProps, 'data'> & { partnerId: string | null }) {
  const salesPoints = usePartnerSalesPoints(partnerId ?? '');
  return (
    <Select
      clearable
      disabled={!partnerId}
      {...props}
      data={(partnerId ? (salesPoints.data ?? []) : []).map((s) => ({
        value: s.id,
        label: `${s.name} · ${s.websiteUrl}`,
      }))}
    />
  );
}

export function MerchantName({ id }: { id: string }) {
  const partner = usePartner(id);
  return <>{partner.data?.companyName ?? '…'}</>;
}

export function SalesPointName({ id }: { id: string }) {
  const salesPoint = useSalesPoint(id);
  return <>{salesPoint.data?.name ?? '…'}</>;
}
