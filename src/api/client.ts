import createClient, { type Middleware } from 'openapi-fetch';
import { accessToken } from '../auth/session';
import { currentLanguage } from '../i18n';
import type { paths as commissionPaths, components as commissionComponents } from './generated/commission';
import type { components, paths } from './generated/partner';

export type Schemas = components['schemas'];
export type Partner = Schemas['PartnerResponse'];
export type PartnerStatus = Schemas['PartnerStatus'];
export type Problem = Schemas['Problem'];
export type SalesPoint = Schemas['SalesPointResponse'];
export type SalesPointStatus = Schemas['SalesPointStatus'];
export type CommissionSchemas = commissionComponents['schemas'];
export type CommissionRule = CommissionSchemas['CommissionRuleResponse'];
export type CommissionChange = CommissionSchemas['ChangeRequestResponse'];

/** A failed call, carrying the server's problem detail (RFC 9457) and its stable code. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly problem: Partial<Problem>,
  ) {
    super(problem.detail ?? problem.title ?? `Request failed (${status})`);
  }
  get code() {
    return this.problem.code;
  }
}

/** Every call carries the access token and the screen language, so server errors come back translated. */
const withTokenAndLanguage: Middleware = {
  onRequest({ request }) {
    const token = accessToken();
    if (token) request.headers.set('Authorization', `Bearer ${token}`);
    request.headers.set('Accept-Language', currentLanguage());
    return request;
  },
};

/** Typed from the partner contract (partner-v1.yaml): paths, bodies and responses can't drift from the API. */
export const api = createClient<paths>({ baseUrl: '' });
api.use(withTokenAndLanguage);

/** Typed from the commission contract (commission-v1.yaml). */
export const commissionApi = createClient<commissionPaths>({ baseUrl: '' });
commissionApi.use(withTokenAndLanguage);

/** Unwraps an openapi-fetch result: the data, or an ApiError. */
export async function call<T>(
  result: Promise<{ data?: T; error?: unknown; response: Response }>,
): Promise<T> {
  const { data, error, response } = await result;
  if (!response.ok) {
    throw new ApiError(
      response.status,
      (error as Partial<Problem>) ?? { status: response.status, title: response.statusText },
    );
  }
  return data as T;
}
