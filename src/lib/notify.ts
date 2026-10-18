import { notifications } from '@mantine/notifications';
import { messageFor } from '../api/errors';
import i18n from '../i18n';

export const notifySuccess = (message: string) => notifications.show({ color: 'green', message });
export const notifyError = (error: unknown) =>
  notifications.show({ color: 'red', title: i18n.t('errors.title'), message: messageFor(error) });
export const notifyWarning = (message: string) => notifications.show({ color: 'yellow', message });
