import createClient, { type Middleware } from 'openapi-fetch';
import { accessToken } from '../auth/session';
import { currentLanguage } from '../i18n';
import type { components as binComponents, paths as binPaths } from './generated/bin';
import type { components as cardComponents, paths as cardPaths } from './generated/card';
import type { components as paymentComponents, paths as paymentPaths } from './generated/payment';
import type { paths as commissionPaths, components as commissionComponents } from './generated/commission';
import type { components, paths } from './generated/partner';
import type { components as terminalComponents, paths as terminalPaths } from './generated/terminal';

export type Schemas = components['schemas'];
export type Partner = Schemas['PartnerResponse'];
export type PartnerStatus = Schemas['PartnerStatus'];
export type Problem = Schemas['Problem'];
export type SalesPoint = Schemas['SalesPointResponse'];
export type SalesPointStatus = Schemas['SalesPointStatus'];
export type PartnerDocument = Schemas['DocumentResponse'];
export type DocumentType = Schemas['DocumentType'];
export type PartnerDocuments = Schemas['PartnerDocumentsResponse'];
export type CommissionSchemas = commissionComponents['schemas'];
export type CommissionRule = CommissionSchemas['CommissionRuleResponse'];
export type CommissionChange = CommissionSchemas['ChangeRequestResponse'];
export type Terminal = terminalComponents['schemas']['TerminalResponse'];
export type BinRange = binComponents['schemas']['BinResponse'];
export type StoredCard = cardComponents['schemas']['CardResponse'];
export type AdminPayment = paymentComponents['schemas']['PaymentAdminResponse'];
export type PaymentPage = paymentComponents['schemas']['PaymentPage'];

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

/** Typed from the terminal contract (terminal-v1.yaml). */
export const terminalApi = createClient<terminalPaths>({ baseUrl: '' });
terminalApi.use(withTokenAndLanguage);

/** Typed from the BIN contract (bin-v1.yaml). */
export const binApi = createClient<binPaths>({ baseUrl: '' });
binApi.use(withTokenAndLanguage);

/** Typed from the card contract (card-v1.yaml). */
export const cardApi = createClient<cardPaths>({ baseUrl: '' });
cardApi.use(withTokenAndLanguage);

/** Typed from the payment contract (payment-v1.yaml). */
export const paymentApi = createClient<paymentPaths>({ baseUrl: '' });
paymentApi.use(withTokenAndLanguage);
