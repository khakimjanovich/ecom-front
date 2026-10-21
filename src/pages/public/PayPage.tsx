import {
  Alert,
  Anchor,
  Avatar,
  Badge,
  Button,
  Center,
  Container,
  Divider,
  Group,
  Input,
  Loader,
  Paper,
  PinInput,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import {
  IconArrowBackUp,
  IconCircleCheck,
  IconCircleX,
  IconClockHour4,
  IconCreditCard,
  IconLock,
} from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import { ApiError, type PaymentPage } from '../../api/client';
import { messageFor } from '../../api/errors';
import { useConfirmCode, usePaymentPage, useSubmitCard } from '../../api/queries';
import { LanguageMenu } from '../../layout/LanguageMenu';
import { formatSom } from '../../lib/money';
import { formatDate } from '../../lib/time';

const digitsOnly = (value: string) => value.replace(/\D/g, '');
/** "8600 1402 3456 7890": easier to check than sixteen digits in a row. */
const grouped = (digits: string) => digits.replace(/(\d{4})(?=\d)/g, '$1 ');
/** People type MM/YY; the API takes YYMM. */
const toExpiry = (mmyy: string) => (mmyy.length === 4 ? mmyy.slice(2) + mmyy.slice(0, 2) : '');
/** A month the card can carry: 01–12. */
const validMonth = (mmyy: string) => /^(0[1-9]|1[0-2])/.test(mmyy);

/** The bank's payment page: the buyer types the card here, never on the shop's site. */
export function PayPage() {
  const { t } = useTranslation();
  const { token = '' } = useParams();
  const page = usePaymentPage(token);

  return (
    <Container size={460} py={40}>
      <Group justify="space-between" mb="md">
        <Group gap={6}>
          <IconLock size={16} />
          <Text size="sm" c="dimmed">
            {t('pay.secure')}
          </Text>
        </Group>
        <LanguageMenu />
      </Group>
      <Paper withBorder p="xl" radius="md">
        {page.isPending && (
          <Center mih={200}>
            <Loader />
          </Center>
        )}
        {page.isError && <Closed title={closedTitle(page.error, t)} text={messageFor(page.error)} />}
        {page.data && <PageBody token={token} page={page.data} />}
      </Paper>
    </Container>
  );
}

const closedTitle = (error: unknown, t: (key: string) => string) =>
  error instanceof ApiError && error.status === 410 ? t('pay.expired') : t('pay.notFound');

function PageBody({ token, page }: { token: string; page: PaymentPage }) {
  const { t } = useTranslation();
  return (
    <Stack>
      <Group wrap="nowrap">
        <Avatar
          src={page.hasLogo ? `/api/v1/pay/${token}/logo` : null}
          alt={page.merchantName}
          radius="sm"
          size="lg"
        >
          {page.merchantName.slice(0, 1)}
        </Avatar>
        <div>
          <Text fw={600}>{page.merchantName}</Text>
          <Text size="xs" c="dimmed">
            {t('pay.order', { order: page.orderId })}
          </Text>
        </div>
      </Group>
      <div>
        <Text size="xs" c="dimmed">
          {t('pay.amount')}
        </Text>
        <Title order={2}>{formatSom(page.amount)}</Title>
        {page.description && (
          <Text size="sm" c="dimmed">
            {page.description}
          </Text>
        )}
      </div>
      <Divider />
      {page.status === 'CREATED' && <CardStep token={token} page={page} />}
      {page.status === 'AWAITING_CODE' && <CodeStep token={token} page={page} />}
      {(page.status === 'CARD_CONFIRMED' || page.status === 'DEBITING') && (
        <Done icon={<Loader />} title={t('pay.debiting')} text={t('pay.debitingText')} />
      )}
      {page.status === 'PAID' && (
        <Done
          icon={<IconCircleCheck size={44} color="var(--mantine-color-green-6)" />}
          title={t('pay.paid')}
          text={t('pay.paidText', { rrn: page.rrn })}
        />
      )}
      {page.status === 'DECLINED' && (
        <Done
          icon={<IconCircleX size={44} color="var(--mantine-color-red-6)" />}
          title={t('pay.declined')}
          text={t(`pay.decline.${page.declineCode}`, { defaultValue: t('pay.decline.other') })}
        />
      )}
      {(page.status === 'REVERSED' || page.status === 'REFUNDED' || page.status === 'RETURNING') && (
        <Done
          icon={<IconArrowBackUp size={44} color="var(--mantine-color-teal-6)" />}
          title={t(page.status === 'RETURNING' ? 'pay.returning' : 'pay.returned')}
          text={t(page.status === 'RETURNING' ? 'pay.returningText' : 'pay.returnedText')}
        />
      )}
      {(page.status === 'UNKNOWN' || page.status === 'MANUAL_REVIEW') && (
        <Done
          icon={<IconClockHour4 size={44} color="var(--mantine-color-yellow-6)" />}
          title={t('pay.unknown')}
          text={t('pay.unknownText')}
        />
      )}
      {page.status === 'FAILED' && (
        <Done
          icon={<IconCircleX size={44} color="var(--mantine-color-red-6)" />}
          title={t('pay.failed')}
          text={t('pay.failedText')}
        />
      )}
      <Group justify="space-between">
        <Text size="xs" c="dimmed">
          {t('pay.until', { time: formatDate(page.expiresAt) })}
        </Text>
        {page.returnUrl && (
          <Anchor href={page.returnUrl} size="xs">
            {t('pay.back')}
          </Anchor>
        )}
      </Group>
    </Stack>
  );
}

function CardStep({ token, page }: { token: string; page: PaymentPage }) {
  const { t } = useTranslation();
  const submit = useSubmitCard(token);
  const [number, setNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const expiryWrong = expiry.length === 4 && !validMonth(expiry);
  const ready = number.length === 16 && expiry.length === 4 && !expiryWrong;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit.mutate({ number, expiry: toExpiry(expiry) });
      }}
    >
      <Stack>
        <Group gap={6}>
          {page.schemes.map((scheme) => (
            <Badge key={scheme} variant="light">
              {t(`scheme.${scheme}`)}
            </Badge>
          ))}
        </Group>
        <TextInput
          label={t('pay.number')}
          placeholder="8600 0000 0000 0000"
          inputMode="numeric"
          autoComplete="cc-number"
          leftSection={<IconCreditCard size={16} />}
          value={grouped(number)}
          onChange={(e) => setNumber(digitsOnly(e.currentTarget.value).slice(0, 16))}
        />
        <TextInput
          label={t('pay.expiry')}
          placeholder="MM/YY"
          inputMode="numeric"
          autoComplete="cc-exp"
          w={120}
          error={expiryWrong && t('pay.expiryHint')}
          value={expiry.length > 2 ? `${expiry.slice(0, 2)}/${expiry.slice(2)}` : expiry}
          onChange={(e) => setExpiry(digitsOnly(e.currentTarget.value).slice(0, 4))}
        />
        {submit.isError && (
          <Alert color="red">
            {/* The API names its own YYMM format; the buyer typed MM/YY. */}
            {submit.error instanceof ApiError && submit.error.code === 'CARD_EXPIRY_INVALID'
              ? t('pay.expiryHint')
              : messageFor(submit.error)}
          </Alert>
        )}
        <Text size="xs" c="dimmed">
          {t('pay.cardAttempts', { count: page.cardAttemptsLeft })}
        </Text>
        <Button type="submit" disabled={!ready} loading={submit.isPending}>
          {t('pay.sendCode')}
        </Button>
      </Stack>
    </form>
  );
}

function CodeStep({ token, page }: { token: string; page: PaymentPage }) {
  const { t } = useTranslation();
  const confirm = useConfirmCode(token);
  const [code, setCode] = useState('');
  const [anotherCard, setAnotherCard] = useState(false);
  if (anotherCard) return <CardStep token={token} page={page} />;
  return (
    <Stack>
      <Text size="sm">
        {t('pay.codeSent', {
          card: [page.cardBank, page.cardScheme && t(`scheme.${page.cardScheme}`)]
            .filter(Boolean)
            .join(' · '),
          masked: page.maskedCard?.slice(-4),
        })}
      </Text>
      <Input.Wrapper label={t('pay.code')}>
        <PinInput
          length={6}
          type="number"
          oneTimeCode
          value={code}
          onChange={setCode}
          onComplete={(value) => confirm.mutate(value, { onError: () => setCode('') })}
        />
      </Input.Wrapper>
      {confirm.isError && <Alert color="red">{messageFor(confirm.error)}</Alert>}
      <Text size="xs" c="dimmed">
        {t('pay.codeAttempts', { count: page.codeAttemptsLeft })}
      </Text>
      <Group justify="space-between">
        <Button loading={confirm.isPending} disabled={code.length !== 6} onClick={() => confirm.mutate(code)}>
          {t('pay.confirm')}
        </Button>
        {page.cardAttemptsLeft > 0 && (
          <Anchor component="button" size="sm" onClick={() => setAnotherCard(true)}>
            {t('pay.anotherCard')}
          </Anchor>
        )}
      </Group>
    </Stack>
  );
}

function Done({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <Stack align="center" ta="center" py="md">
      {icon}
      <Title order={4}>{title}</Title>
      <Text size="sm" c="dimmed">
        {text}
      </Text>
    </Stack>
  );
}

function Closed({ title, text }: { title: string; text: string }) {
  return (
    <Done icon={<IconCircleX size={44} color="var(--mantine-color-red-6)" />} title={title} text={text} />
  );
}
