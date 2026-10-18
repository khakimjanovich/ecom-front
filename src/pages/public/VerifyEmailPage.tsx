import {
  Alert,
  Anchor,
  Button,
  Container,
  Group,
  Input,
  Paper,
  PinInput,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useInterval } from '@mantine/hooks';
import { IconCircleCheck, IconMail } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { messageFor } from '../../api/errors';
import { useResendCode, useVerifyEmail } from '../../api/queries';
import { useSession } from '../../auth/session';
import { notifyError, notifySuccess } from '../../lib/notify';

const CODE_LENGTH = 6;
const RESEND_AFTER_SECONDS = 30;

export function VerifyEmailPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const { signIn } = useSession();
  const [email, setEmail] = useState(params.get('email') ?? '');
  const [code, setCode] = useState('');
  const verify = useVerifyEmail();
  const resend = useResendCode();
  const cooldown = useCooldown(RESEND_AFTER_SECONDS);

  const submit = (value: string) => {
    if (value.length === CODE_LENGTH && email)
      verify.mutate({ email, code: value }, { onError: () => setCode('') });
  };
  const sendAgain = () =>
    resend.mutate(email, {
      onSuccess: () => {
        notifySuccess(t('verify.sent'));
        cooldown.start();
      },
      onError: notifyError,
    });

  if (verify.isSuccess) {
    return (
      <Container size={460} py={48}>
        <Paper withBorder p="xl">
          <Stack align="center" ta="center">
            <IconCircleCheck size={48} color="var(--mantine-color-green-6)" />
            <Title order={3}>{t('verify.doneTitle')}</Title>
            <Text c="dimmed" size="sm">
              {t('verify.doneText')}
            </Text>
            <Button onClick={() => void signIn(email)}>{t('common.signIn')}</Button>
          </Stack>
        </Paper>
      </Container>
    );
  }

  return (
    <Container size={460} py={48}>
      <Title order={2}>{t('verify.title')}</Title>
      <Text c="dimmed" size="sm" mt={4}>
        {t('verify.subtitle')}
      </Text>
      <Paper withBorder p="xl" mt="lg">
        <Stack>
          <TextInput
            label={t('verify.email')}
            type="email"
            leftSection={<IconMail size={16} />}
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value.trim())}
          />
          <Input.Wrapper label={t('verify.code')}>
            <PinInput
              length={CODE_LENGTH}
              type="number"
              oneTimeCode
              size="lg"
              value={code}
              onChange={setCode}
              onComplete={submit}
              error={verify.isError}
              disabled={verify.isPending}
              ariaLabel={t('verify.code')}
              mt={6}
            />
          </Input.Wrapper>
          {verify.isError && (
            <Alert color="red" variant="light">
              {messageFor(verify.error)}
            </Alert>
          )}
          <Group justify="space-between">
            <Anchor
              component="button"
              size="sm"
              disabled={!email || cooldown.running || resend.isPending}
              onClick={sendAgain}
            >
              {cooldown.running ? t('verify.resendIn', { seconds: cooldown.left }) : t('verify.resend')}
            </Anchor>
            <Button
              loading={verify.isPending}
              disabled={code.length < CODE_LENGTH || !email}
              onClick={() => submit(code)}
            >
              {t('verify.submit')}
            </Button>
          </Group>
        </Stack>
      </Paper>
    </Container>
  );
}

/** A countdown that blocks the resend link for a few seconds. The server has its own limits; this saves clicks. */
function useCooldown(seconds: number) {
  const [left, setLeft] = useState(0);
  const interval = useInterval(() => setLeft((s) => s - 1), 1000);
  useEffect(() => {
    if (left <= 0) interval.stop();
  }, [left, interval]);
  return {
    left,
    running: left > 0,
    start: () => {
      setLeft(seconds);
      interval.start();
    },
  };
}
