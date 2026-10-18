import i18n from '../i18n';
import { ApiError } from './client';
import { fieldErrors, messageFor } from './errors';

describe('error messages', () => {
  beforeAll(() => i18n.changeLanguage('en'));

  it('show the detail the server already translated', () => {
    const error = new ApiError(409, {
      code: 'PARTNER_EMAIL_TAKEN',
      detail: 'aziza@shop.uz allaqachon roʻyxatdan oʻtgan.',
    });
    expect(messageFor(error)).toBe('aziza@shop.uz allaqachon roʻyxatdan oʻtgan.');
  });

  it('explain a lost connection in our own words', () => {
    expect(messageFor(new TypeError('Failed to fetch'))).toMatch(/could not reach the server/);
  });

  it('map validation errors to their fields', () => {
    const error = new ApiError(400, {
      code: 'VALIDATION_FAILED',
      errors: [{ field: 'email', message: 'must be a well-formed email address' }],
    });
    expect(fieldErrors(error)).toEqual({ email: 'must be a well-formed email address' });
    expect(fieldErrors(new ApiError(409, { code: 'PARTNER_EMAIL_TAKEN' }))).toEqual({});
  });
});
