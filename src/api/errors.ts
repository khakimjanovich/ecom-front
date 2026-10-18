import i18n from '../i18n';
import { ApiError } from './client';

/**
 * What a person should read about a failed call. The server already writes the detail in the person's language
 * (Accept-Language), so only network failures need our own words.
 */
export function messageFor(error: unknown): string {
  if (error instanceof ApiError) return error.problem.detail ?? i18n.t('errors.unknown');
  if (error instanceof TypeError) return i18n.t('errors.network');
  return i18n.t('errors.unknown');
}

/** Field name → message, from a VALIDATION_FAILED problem. */
export function fieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError) || error.code !== 'VALIDATION_FAILED') return {};
  return Object.fromEntries((error.problem.errors ?? []).map((e) => [e.field ?? '', e.message ?? '']));
}
