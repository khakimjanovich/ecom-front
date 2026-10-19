import {
  Alert,
  Badge,
  Button,
  Card,
  Code,
  CopyButton,
  Grid,
  Group,
  Skeleton,
  Stack,
  Table,
  Text,
  TextInput,
  Timeline,
  Title,
} from '@mantine/core';
import { IconDatabase, IconLock, IconRefresh, IconSearch } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiError, type StoredCard } from '../../api/client';
import { messageFor } from '../../api/errors';
import { useBinLookup, useBins, useCardAudit, useCardSearch, useSyncBins } from '../../api/queries';
import { Empty } from '../../layout/Empty';
import { PageTitle } from '../../layout/PageTitle';
import { notifyError, notifySuccess, notifyWarning } from '../../lib/notify';
import { formatDate } from '../../lib/time';

const SCHEME_COLOR = { UZCARD: 'blue', HUMO: 'teal' } as const;
const digitsOnly = (value: string) => value.replace(/\D/g, '');
/** "8600 1402 3456 7890": easier to read back than sixteen digits in a row. */
const grouped = (digits: string) => digits.replace(/(\d{4})(?=\d)/g, '$1 ');

/** The BIN registry and the card vault: which scheme a card belongs to, and cards found without decrypting. */
export function CardsPage() {
  const { t } = useTranslation();
  return (
    <>
      <PageTitle title={t('cards.title')} description={t('cards.description')} />
      <Grid gap="lg">
        <Grid.Col span={{ base: 12, lg: 7 }}>
          <BinRegistry />
        </Grid.Col>
        <Grid.Col span={{ base: 12, lg: 5 }}>
          <Vault />
        </Grid.Col>
      </Grid>
    </>
  );
}

function BinRegistry() {
  const { t } = useTranslation();
  const bins = useBins();
  const sync = useSyncBins();

  const runSync = () =>
    sync.mutate(undefined, {
      onSuccess: (schemes) => {
        const ranges = Object.fromEntries(schemes.map((s) => [s.scheme, s.ranges]));
        notifySuccess(t('cards.synced', { uzcard: ranges.UZCARD ?? 0, humo: ranges.HUMO ?? 0 }));
        schemes
          .filter((s) => !s.updated)
          .forEach((s) => notifyWarning(t('cards.syncKept', { scheme: t(`scheme.${s.scheme}`) })));
      },
      onError: notifyError,
    });

  return (
    <Card withBorder padding="lg">
      <Group justify="space-between" align="flex-start" mb="md">
        <div>
          <Group gap="xs">
            <IconDatabase size={18} />
            <Title order={4}>{t('cards.bins')}</Title>
          </Group>
          <Text size="xs" c="dimmed">
            {t('cards.binsHint')}
          </Text>
        </div>
        <Button
          variant="light"
          size="xs"
          leftSection={<IconRefresh size={14} />}
          loading={sync.isPending}
          onClick={runSync}
        >
          {t('cards.sync')}
        </Button>
      </Group>
      <BinLookup />
      {bins.isPending && <Skeleton h={180} mt="md" />}
      {bins.isError && (
        <Alert color="red" mt="md">
          {messageFor(bins.error)}
        </Alert>
      )}
      {bins.data?.length === 0 && (
        <Empty icon={IconDatabase} title={t('cards.noBins')} text={t('cards.noBinsText')} />
      )}
      {!!bins.data?.length && (
        <Table.ScrollContainer minWidth={420} mt="md">
          <Table verticalSpacing="xs">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t('cards.prefix')}</Table.Th>
                <Table.Th>{t('fees.scheme')}</Table.Th>
                <Table.Th>{t('cards.issuer')}</Table.Th>
                <Table.Th>{t('cards.syncedAt')}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {bins.data.map((bin) => (
                <Table.Tr key={bin.prefix}>
                  <Table.Td ff="monospace">{bin.prefix}</Table.Td>
                  <Table.Td>
                    <Badge variant="light" color={SCHEME_COLOR[bin.scheme]}>
                      {t(`scheme.${bin.scheme}`)}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{bin.bankName ?? '—'}</Text>
                    {bin.issuer && (
                      <Text size="xs" c="dimmed" ff="monospace">
                        {bin.issuer}
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs" c="dimmed">
                      {formatDate(bin.syncedAt)}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}
    </Card>
  );
}

/** Answers as the person types: no button, the scheme shows once there are six digits. */
function BinLookup() {
  const { t } = useTranslation();
  const [digits, setDigits] = useState('');
  const lookup = useBinLookup(digits);
  const unknown = lookup.error instanceof ApiError && lookup.error.status === 404;
  return (
    <TextInput
      label={t('cards.lookup')}
      description={
        lookup.data
          ? [t(`scheme.${lookup.data.scheme}`), lookup.data.bankName].filter(Boolean).join(' · ')
          : t('cards.lookupHint')
      }
      placeholder="860014"
      inputMode="numeric"
      maxLength={8}
      value={digits}
      onChange={(e) => setDigits(digitsOnly(e.currentTarget.value))}
      error={unknown ? t('cards.unknownBin') : lookup.isError ? messageFor(lookup.error) : undefined}
      rightSectionWidth={96}
      rightSection={
        lookup.data && (
          <Badge variant="filled" color={SCHEME_COLOR[lookup.data.scheme]}>
            {t(`scheme.${lookup.data.scheme}`)}
          </Badge>
        )
      }
    />
  );
}

function Vault() {
  const { t } = useTranslation();
  const [number, setNumber] = useState('');
  const search = useCardSearch();
  const find = (e: React.FormEvent) => {
    e.preventDefault();
    search.mutate(number);
  };
  return (
    <Card withBorder padding="lg">
      <Group gap="xs" mb={4}>
        <IconLock size={18} />
        <Title order={4}>{t('cards.vault')}</Title>
      </Group>
      <Text size="xs" c="dimmed" mb="md">
        {t('cards.vaultHint')}
      </Text>
      <form onSubmit={find}>
        <Stack gap="sm">
          <TextInput
            label={t('cards.number')}
            placeholder="8600 1402 3456 7890"
            inputMode="numeric"
            autoComplete="off"
            ff="monospace"
            value={grouped(number)}
            onChange={(e) => setNumber(digitsOnly(e.currentTarget.value).slice(0, 16))}
          />
          <Button
            type="submit"
            variant="light"
            leftSection={<IconSearch size={16} />}
            loading={search.isPending}
            disabled={number.length !== 16}
          >
            {t('cards.find')}
          </Button>
          {search.isError && (
            <Alert color="yellow" variant="light">
              {messageFor(search.error)}
            </Alert>
          )}
          {search.data && <StoredCardFacts card={search.data} />}
        </Stack>
      </form>
    </Card>
  );
}

function StoredCardFacts({ card }: { card: StoredCard }) {
  const { t } = useTranslation();
  const audit = useCardAudit(card.cardToken);
  return (
    <Stack gap="sm" mt="xs">
      <Group justify="space-between">
        <Text ff="monospace" fw={600} size="lg">
          {grouped(card.maskedNumber)}
        </Text>
        <Group gap={6}>
          <Badge variant="light" color={SCHEME_COLOR[card.scheme]}>
            {t(`scheme.${card.scheme}`)}
          </Badge>
          <Badge variant="dot" color={card.status === 'ACTIVE' ? 'green' : 'yellow'}>
            {t(`cards.status.${card.status}`)}
          </Badge>
        </Group>
      </Group>
      <Group gap="xs">
        <Text size="xs" c="dimmed">
          {t('cards.token')}
        </Text>
        <CopyButton value={card.cardToken}>
          {({ copy }) => (
            <Code onClick={copy} style={{ cursor: 'pointer' }}>
              {card.cardToken}
            </Code>
          )}
        </CopyButton>
      </Group>
      <Text size="xs" c="dimmed">
        {card.boundAt ? `${t('cards.boundAt')}: ${formatDate(card.boundAt)}` : t('cards.notBound')}
      </Text>
      <Text size="sm" fw={500} mt="xs">
        {t('cards.history')}
      </Text>
      {audit.isPending && <Skeleton h={80} />}
      {audit.data && (
        <Timeline bulletSize={12} lineWidth={2}>
          {audit.data.map((entry) => (
            <Timeline.Item key={entry.occurredAt + entry.action} title={t(`cards.action.${entry.action}`)}>
              <Text size="xs" c="dimmed">
                {entry.actor}
                {entry.reference && ` · ${entry.reference}`} · {formatDate(entry.occurredAt)}
              </Text>
            </Timeline.Item>
          ))}
        </Timeline>
      )}
    </Stack>
  );
}
