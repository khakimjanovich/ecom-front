import {
  Alert,
  Anchor,
  Button,
  Container,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { isEmail, useForm } from '@mantine/form';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { ApiError } from '../../api/client';
import { fieldErrors, messageFor } from '../../api/errors';
import { useRegister } from '../../api/queries';
import { useSession } from '../../auth/session';

export function SignUpPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { signIn } = useSession();
  const register = useRegister();
  const form = useForm({
    initialValues: { companyName: '', email: '', password: '' },
    validate: {
      companyName: (v) => (v.trim().length < 2 ? t('signup.errors.company') : null),
      email: isEmail(t('signup.errors.email')),
      password: (v) => (v.length < 12 ? t('signup.errors.password') : null),
    },
  });

  const submit = form.onSubmit(({ companyName, email, password }) => {
    const body = { companyName: companyName.trim(), email: email.trim(), password };
    register.mutate(body, {
      onSuccess: () => navigate(`/verify?email=${encodeURIComponent(body.email)}`),
      onError: (error) => form.setErrors(errorsByField(error)),
    });
  });
  const formError = register.isError && !Object.keys(errorsByField(register.error)).length;

  return (
    <Container size={460} py={48}>
      <Title order={2}>{t('signup.title')}</Title>
      <Text c="dimmed" size="sm" mt={4}>
        {t('signup.subtitle')}
      </Text>
      <Paper withBorder p="xl" mt="lg">
        <form onSubmit={submit} noValidate>
          <Stack>
            <TextInput
              label={t('signup.company')}
              autoComplete="organization"
              required
              {...form.getInputProps('companyName')}
            />
            <TextInput
              label={t('signup.email')}
              type="email"
              autoComplete="email"
              required
              {...form.getInputProps('email')}
            />
            <PasswordInput
              label={t('signup.password')}
              description={t('signup.passwordHint')}
              autoComplete="new-password"
              required
              {...form.getInputProps('password')}
            />
            {formError && (
              <Alert color="red" variant="light">
                {messageFor(register.error)}
              </Alert>
            )}
            <Button type="submit" loading={register.isPending} fullWidth>
              {t('signup.submit')}
            </Button>
          </Stack>
        </form>
      </Paper>
      <Text size="sm" ta="center" mt="md">
        {t('signup.haveAccount')}{' '}
        <Anchor component="button" onClick={() => void signIn()}>
          {t('common.signIn')}
        </Anchor>
        {' · '}
        <Anchor component={Link} to="/verify">
          {t('signup.haveCode')}
        </Anchor>
      </Text>
    </Container>
  );
}

/** Server errors that belong to one field are shown under it. */
function errorsByField(error: unknown): Record<string, string> {
  if (error instanceof ApiError && error.code === 'PARTNER_EMAIL_TAKEN') return { email: messageFor(error) };
  return fieldErrors(error);
}
