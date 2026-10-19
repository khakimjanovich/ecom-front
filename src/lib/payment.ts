import type { PaymentStatus } from '../api/client';

export const PAYMENT_STATUS_COLOR: Record<PaymentStatus, string> = {
  CREATED: 'blue',
  AWAITING_CODE: 'yellow',
  CARD_CONFIRMED: 'cyan',
  DEBITING: 'cyan',
  PAID: 'green',
  DECLINED: 'red',
  UNKNOWN: 'orange',
  MANUAL_REVIEW: 'grape',
  FAILED: 'gray',
  EXPIRED: 'gray',
};
