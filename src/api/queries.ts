import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { currentLanguage } from '../i18n';
import {
  api,
  call,
  binApi,
  cardApi,
  paymentApi,
  commissionApi,
  terminalApi,
  type CommissionSchemas,
  type PartnerStatus,
  type Schemas,
} from './client';

/** Every server read and write the pages use, in one place. Keys are shared so writes refresh the right reads. */
const keys = {
  me: ['me'] as const,
  clients: ['clients'] as const,
  partners: (filter: object) => ['partners', filter] as const,
  partner: (id: string) => ['partner', id] as const,
  history: (id: string) => ['history', id] as const,
  approvals: ['approvals'] as const,
};

/* ------- public: sign-up ------- */

export const useRegister = () =>
  useMutation({
    mutationFn: (body: { companyName: string; email: string; password: string }) =>
      call(api.POST('/api/v1/registrations', { body })),
  });

export const useVerifyEmail = () =>
  useMutation({
    mutationFn: (body: { email: string; code: string }) =>
      call(api.POST('/api/v1/registrations/email-verification', { body })),
  });

export const useResendCode = () =>
  useMutation({
    mutationFn: (email: string) =>
      call(api.POST('/api/v1/registrations/email-verification/resend', { body: { email } })),
  });

/* ------- merchant ------- */

export const useMe = () =>
  useQuery({ queryKey: keys.me, queryFn: () => call(api.GET('/api/v1/partner/me')) });

export const useClients = (enabled: boolean) =>
  useQuery({ queryKey: keys.clients, queryFn: () => call(api.GET('/api/v1/partner/clients')), enabled });

export function useCreateClient() {
  const queries = useQueryClient();
  return useMutation({
    mutationFn: () => call(api.POST('/api/v1/partner/clients')),
    onSuccess: () => queries.invalidateQueries({ queryKey: keys.clients }),
  });
}

export function useRotateSecret() {
  const queries = useQueryClient();
  return useMutation({
    mutationFn: (clientId: string) =>
      call(api.POST('/api/v1/partner/clients/{clientId}/secret', { params: { path: { clientId } } })),
    onSuccess: () => queries.invalidateQueries({ queryKey: keys.clients }),
  });
}

/* ------- admin ------- */

export type PartnerFilter = { status?: PartnerStatus; q?: string; page: number; size: number };

export const usePartners = (filter: PartnerFilter) =>
  useQuery({
    queryKey: keys.partners(filter),
    queryFn: () => call(api.GET('/api/v1/admin/partners', { params: { query: filter } })),
    placeholderData: keepPreviousData,
  });

export const usePartner = (id: string) =>
  useQuery({
    queryKey: keys.partner(id),
    queryFn: () => call(api.GET('/api/v1/partners/{id}', { params: { path: { id } } })),
    enabled: !!id,
  });

export const useHistory = (id: string) =>
  useQuery({
    queryKey: keys.history(id),
    queryFn: () => call(api.GET('/api/v1/admin/partners/{id}/history', { params: { path: { id } } })),
  });

export const useApprovals = () =>
  useQuery({ queryKey: keys.approvals, queryFn: () => call(api.GET('/api/v1/admin/activation-requests')) });

/** One lifecycle step on a partner. Refreshes the partner, its history, the lists and the approvals inbox. */
export function usePartnerAction(id: string) {
  const queries = useQueryClient();
  const path = { params: { path: { id } } };
  return useMutation({
    mutationFn: (action: { kind: string; reason?: string; contractNumber?: string }): Promise<unknown> => {
      const reason = { body: { reason: action.reason ?? '' } };
      switch (action.kind) {
        case 'verify':
          return call(api.POST('/api/v1/admin/partners/{id}/verify', path));
        case 'reject':
          return call(api.POST('/api/v1/admin/partners/{id}/reject', { ...path, ...reason }));
        case 'contract':
          return call(
            api.POST('/api/v1/admin/partners/{id}/contract', {
              ...path,
              body: { contractNumber: action.contractNumber ?? '' },
            }),
          );
        case 'requestActivation':
          return call(api.POST('/api/v1/admin/partners/{id}/activation-requests', path));
        case 'suspend':
          return call(api.POST('/api/v1/admin/partners/{id}/suspend', { ...path, ...reason }));
        case 'restore':
          return call(api.POST('/api/v1/admin/partners/{id}/restore', path));
        case 'terminate':
          return call(api.POST('/api/v1/admin/partners/{id}/terminate', { ...path, ...reason }));
        default:
          throw new Error(`Unknown action ${action.kind}`);
      }
    },
    onSuccess: () =>
      Promise.all(
        [keys.partner(id), keys.history(id), ['partners'], keys.approvals].map((queryKey) =>
          queries.invalidateQueries({ queryKey }),
        ),
      ),
  });
}

export function useDecideActivation() {
  const queries = useQueryClient();
  return useMutation({
    mutationFn: ({
      requestId,
      approve,
      reason,
    }: {
      requestId: string;
      approve: boolean;
      reason?: string;
    }) => {
      const path = { params: { path: { requestId } } };
      return approve
        ? call(api.POST('/api/v1/admin/activation-requests/{requestId}/approve', path))
        : call(
            api.POST('/api/v1/admin/activation-requests/{requestId}/reject', {
              ...path,
              body: { reason: reason ?? '' },
            }),
          );
    },
    onSuccess: () => queries.invalidateQueries(),
  });
}

/* ------- sales points (websites) ------- */

const salesPointKeys = {
  mine: ['salesPoints', 'mine'] as const,
  ofPartner: (partnerId: string) => ['salesPoints', 'partner', partnerId] as const,
  one: (id: string) => ['salesPoint', id] as const,
  checks: (id: string) => ['salesPoint', id, 'checks'] as const,
};

export const useMySalesPoints = () =>
  useQuery({ queryKey: salesPointKeys.mine, queryFn: () => call(api.GET('/api/v1/partner/sales-points')) });

export function useCreateSalesPoint() {
  const queries = useQueryClient();
  return useMutation({
    mutationFn: (body: Schemas['SalesPointRequest']) =>
      call(api.POST('/api/v1/partner/sales-points', { body })),
    onSuccess: () => queries.invalidateQueries({ queryKey: salesPointKeys.mine }),
  });
}

export function useUpdateReturnUrls() {
  const queries = useQueryClient();
  return useMutation({
    mutationFn: ({ salesPointId, returnUrls }: { salesPointId: string; returnUrls: string[] }) =>
      call(
        api.PUT('/api/v1/partner/sales-points/{salesPointId}/return-urls', {
          params: { path: { salesPointId } },
          body: { returnUrls },
        }),
      ),
    onSuccess: () => queries.invalidateQueries({ queryKey: salesPointKeys.mine }),
  });
}

export const usePartnerSalesPoints = (partnerId: string) =>
  useQuery({
    queryKey: salesPointKeys.ofPartner(partnerId),
    queryFn: () =>
      call(api.GET('/api/v1/admin/partners/{id}/sales-points', { params: { path: { id: partnerId } } })),
    enabled: !!partnerId,
  });

export const useSalesPoint = (salesPointId: string) =>
  useQuery({
    queryKey: salesPointKeys.one(salesPointId),
    queryFn: () =>
      call(api.GET('/api/v1/admin/sales-points/{salesPointId}', { params: { path: { salesPointId } } })),
    enabled: !!salesPointId,
  });

export const useSiteChecks = (salesPointId: string) =>
  useQuery({
    queryKey: salesPointKeys.checks(salesPointId),
    queryFn: () =>
      call(
        api.GET('/api/v1/admin/sales-points/{salesPointId}/site-checks', {
          params: { path: { salesPointId } },
        }),
      ),
  });

/** Every admin change to one website. Each refreshes the website, its checks and the lists it appears in. */
export function useSalesPointAdmin(salesPointId: string) {
  const queries = useQueryClient();
  const path = { params: { path: { salesPointId } } };
  const onSuccess = () =>
    queries.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith('salesPoint') });

  const recordCheck = useMutation({
    mutationFn: (body: Schemas['SiteCheckRequest']) =>
      call(api.POST('/api/v1/admin/sales-points/{salesPointId}/site-checks', { ...path, body })),
    onSuccess,
  });
  const saveSettings = useMutation({
    mutationFn: (body: Schemas['SalesPointSettingsRequest']) =>
      call(api.PUT('/api/v1/admin/sales-points/{salesPointId}/settings', { ...path, body })),
    onSuccess,
  });
  const act = useMutation({
    mutationFn: ({ kind, reason = '' }: { kind: SalesPointAction; reason?: string }) => {
      switch (kind) {
        case 'activate':
          return call(api.POST('/api/v1/admin/sales-points/{salesPointId}/activate', path));
        case 'restore':
          return call(api.POST('/api/v1/admin/sales-points/{salesPointId}/restore', path));
        case 'suspend':
          return call(
            api.POST('/api/v1/admin/sales-points/{salesPointId}/suspend', { ...path, body: { reason } }),
          );
        case 'close':
          return call(
            api.POST('/api/v1/admin/sales-points/{salesPointId}/close', { ...path, body: { reason } }),
          );
      }
    },
    onSuccess,
  });
  return { recordCheck, saveSettings, act };
}

export type SalesPointAction = 'activate' | 'suspend' | 'restore' | 'close';

/* ------- commission ------- */

export type RuleFilter = {
  partnerId?: string;
  salesPointId?: string;
  scheme?: 'UZCARD' | 'HUMO';
  status?: 'PROPOSED' | 'ACTIVE' | 'REJECTED';
  activeAt?: string;
  page: number;
  size: number;
};

export const useCommissionRules = (filter: RuleFilter) =>
  useQuery({
    queryKey: ['commission', 'rules', filter],
    queryFn: () => call(commissionApi.GET('/api/v1/admin/commissions', { params: { query: filter } })),
    placeholderData: keepPreviousData,
  });

export const useRuleHistory = (ruleId: string | undefined) =>
  useQuery({
    queryKey: ['commission', 'history', ruleId],
    queryFn: () =>
      call(
        commissionApi.GET('/api/v1/admin/commissions/{ruleId}/history', {
          params: { path: { ruleId: ruleId! } },
        }),
      ),
    enabled: !!ruleId,
  });

export const useCommissionRequests = (page = 0, size = 20) =>
  useQuery({
    queryKey: ['commission', 'requests', page, size],
    queryFn: () =>
      call(commissionApi.GET('/api/v1/admin/commission-requests', { params: { query: { page, size } } })),
    placeholderData: keepPreviousData,
  });

/** Proposals, ends and decisions all change what's pending and what's in force. */
function useCommissionChange<T>(mutationFn: (input: T) => Promise<unknown>) {
  const queries = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queries.invalidateQueries({ queryKey: ['commission'] }),
  });
}

export const useProposeRule = () =>
  useCommissionChange((body: CommissionSchemas['CommissionRuleRequest']) =>
    call(commissionApi.POST('/api/v1/admin/commissions', { body })),
  );

export const useProposeRuleEnd = () =>
  useCommissionChange(({ ruleId, endsAt }: { ruleId: string; endsAt: string }) =>
    call(
      commissionApi.POST('/api/v1/admin/commissions/{ruleId}/end', {
        params: { path: { ruleId } },
        body: { endsAt },
      }),
    ),
  );

export const useDecideCommission = () =>
  useCommissionChange(
    ({ requestId, approve, reason = '' }: { requestId: string; approve: boolean; reason?: string }) => {
      const path = { params: { path: { requestId } } };
      return approve
        ? call(commissionApi.POST('/api/v1/admin/commission-requests/{requestId}/approve', path))
        : call(
            commissionApi.POST('/api/v1/admin/commission-requests/{requestId}/reject', {
              ...path,
              body: { reason },
            }),
          );
    },
  );

export const useQuote = () =>
  useMutation({
    mutationFn: (body: CommissionSchemas['QuoteRequest']) =>
      call(commissionApi.POST('/api/v1/admin/commissions/quote', { body })),
  });

/* ------- terminals ------- */

export type TerminalFilter = {
  salesPointId?: string;
  scheme?: 'UZCARD' | 'HUMO';
  status?: 'ACTIVE' | 'SUSPENDED' | 'REVOKED';
  q?: string;
  page: number;
  size: number;
};

export const useTerminals = (salesPointId: string) =>
  useQuery({
    queryKey: ['terminals', 'of', salesPointId],
    queryFn: () =>
      call(
        terminalApi.GET('/api/v1/admin/sales-points/{salesPointId}/terminals', {
          params: { path: { salesPointId } },
        }),
      ),
  });

export const useTerminalSearch = (filter: TerminalFilter) =>
  useQuery({
    queryKey: ['terminals', 'search', filter],
    queryFn: () => call(terminalApi.GET('/api/v1/admin/terminals', { params: { query: filter } })),
    placeholderData: keepPreviousData,
  });

export const useTerminalAudit = (terminalId: string, enabled = true) =>
  useQuery({
    queryKey: ['terminals', 'audit', terminalId],
    queryFn: () =>
      call(
        terminalApi.GET('/api/v1/admin/terminals/{terminalId}/audit', { params: { path: { terminalId } } }),
      ),
    enabled,
  });

export type TerminalAction = 'suspend' | 'resume' | 'revoke';

/** Registering and every status change refresh every terminal list and audit trail. */
export function useRegisterTerminal() {
  const queries = useQueryClient();
  return useMutation({
    mutationFn: ({
      salesPointId,
      ...body
    }: {
      salesPointId: string;
      scheme: 'UZCARD' | 'HUMO';
      merchantId: string;
      terminalId: string;
    }) =>
      call(
        terminalApi.POST('/api/v1/admin/sales-points/{salesPointId}/terminals', {
          params: { path: { salesPointId } },
          body,
        }),
      ),
    onSuccess: () => queries.invalidateQueries({ queryKey: ['terminals'] }),
  });
}

export function useTerminalAction() {
  const queries = useQueryClient();
  return useMutation({
    mutationFn: ({
      terminalId,
      kind,
      reason = '',
    }: {
      terminalId: string;
      kind: TerminalAction;
      reason?: string;
    }) => {
      const path = { params: { path: { terminalId } } };
      switch (kind) {
        case 'resume':
          return call(terminalApi.POST('/api/v1/admin/terminals/{terminalId}/resume', path));
        case 'suspend':
          return call(
            terminalApi.POST('/api/v1/admin/terminals/{terminalId}/suspend', { ...path, body: { reason } }),
          );
        case 'revoke':
          return call(
            terminalApi.POST('/api/v1/admin/terminals/{terminalId}/revoke', { ...path, body: { reason } }),
          );
      }
    },
    onSuccess: () => queries.invalidateQueries({ queryKey: ['terminals'] }),
  });
}

/* ------- cards: BIN registry and vault ------- */

export const useBins = () =>
  useQuery({
    queryKey: ['bins'],
    queryFn: () => call(binApi.GET('/api/v1/admin/bins')),
  });

export function useSyncBins() {
  const queries = useQueryClient();
  return useMutation({
    mutationFn: () => call(binApi.POST('/api/v1/admin/bins/sync')),
    onSuccess: () => queries.invalidateQueries({ queryKey: ['bins'] }),
  });
}

/** Runs once the person has typed enough digits; a miss is an answer (404), not a failure to retry. */
export const useBinLookup = (digits: string) =>
  useQuery({
    queryKey: ['bins', 'lookup', digits],
    queryFn: () => call(binApi.GET('/api/v1/admin/bins/lookup', { params: { query: { digits } } })),
    enabled: /^\d{6,8}$/.test(digits),
    retry: false,
  });

/** A POST, so the card number never lands in a URL, a log or the query cache. Each search is audited. */
export function useCardSearch() {
  const queries = useQueryClient();
  return useMutation({
    mutationFn: (number: string) => call(cardApi.POST('/api/v1/admin/cards/search', { body: { number } })),
    onSuccess: () => queries.invalidateQueries({ queryKey: ['cards', 'audit'] }),
  });
}

export const useCardAudit = (cardToken: string | undefined) =>
  useQuery({
    queryKey: ['cards', 'audit', cardToken],
    queryFn: () =>
      call(
        cardApi.GET('/api/v1/admin/cards/{cardToken}/audit', { params: { path: { cardToken: cardToken! } } }),
      ),
    enabled: !!cardToken,
  });

/* ------- payments ------- */

export const usePayments = (partnerId: string | null) =>
  useQuery({
    queryKey: ['payments', partnerId],
    queryFn: () =>
      call(
        paymentApi.GET('/api/v1/admin/payments', {
          params: { query: { partnerId: partnerId ?? undefined } },
        }),
      ),
    placeholderData: keepPreviousData,
  });

/* ------- the payment page (the buyer, no login: the link's token is the credential) ------- */

const pageOf = (token: string) => ({ params: { path: { token } } });

/** Keyed by language too: the bank's name comes back in it. */
export const usePaymentPage = (token: string) =>
  useQuery({
    queryKey: ['pay', token, currentLanguage()],
    queryFn: () => call(paymentApi.GET('/api/v1/pay/{token}', pageOf(token))),
    retry: false,
    // While the bank is still asking the scheme, the page checks again on its own.
    refetchInterval: (query) =>
      ['DEBITING', 'UNKNOWN'].includes(query.state.data?.status ?? '') ? 5_000 : false,
  });

export function useSubmitCard(token: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (card: { number: string; expiry: string }) =>
      call(paymentApi.POST('/api/v1/pay/{token}/card', { ...pageOf(token), body: card })),
    onSuccess: (page) => client.setQueryData(['pay', token, currentLanguage()], page),
    onError: () => client.invalidateQueries({ queryKey: ['pay', token] }),
  });
}

export function useConfirmCode(token: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (code: string) =>
      call(paymentApi.POST('/api/v1/pay/{token}/code', { ...pageOf(token), body: { code } })),
    onSuccess: (page) => client.setQueryData(['pay', token, currentLanguage()], page),
    onError: () => client.invalidateQueries({ queryKey: ['pay', token] }),
  });
}

/* ------- documents (KYB) and logos ------- */

/** Multipart bodies: openapi-fetch sends the FormData as is. */
const formData = (fields: Record<string, string | Blob | undefined>) => {
  const data = new FormData();
  Object.entries(fields).forEach(([key, value]) => value !== undefined && data.append(key, value));
  return data;
};

export const useMyDocuments = () =>
  useQuery({
    queryKey: ['documents', 'mine'],
    queryFn: () => call(api.GET('/api/v1/partner/documents')),
  });

export const usePartnerDocuments = (partnerId: string) =>
  useQuery({
    queryKey: ['documents', partnerId],
    queryFn: () =>
      call(api.GET('/api/v1/admin/partners/{id}/documents', { params: { path: { id: partnerId } } })),
  });

export function useUploadDocument() {
  const queries = useQueryClient();
  return useMutation({
    mutationFn: ({ type, file, description }: { type: string; file: File; description?: string }) =>
      call(
        api.POST('/api/v1/partner/documents', {
          body: {} as never,
          bodySerializer: () => formData({ type, file, description: description || undefined }),
        }),
      ),
    onSuccess: () => queries.invalidateQueries({ queryKey: ['documents'] }),
  });
}

export function useReviewDocument(partnerId: string) {
  const queries = useQueryClient();
  return useMutation({
    mutationFn: ({
      documentId,
      approve,
      reason = '',
    }: {
      documentId: string;
      approve: boolean;
      reason?: string;
    }) => {
      const path = { params: { path: { id: partnerId, documentId } } };
      return approve
        ? call(api.POST('/api/v1/admin/partners/{id}/documents/{documentId}/verify', path))
        : call(
            api.POST('/api/v1/admin/partners/{id}/documents/{documentId}/reject', {
              ...path,
              body: { reason },
            }),
          );
    },
    onSuccess: () => queries.invalidateQueries({ queryKey: ['documents'] }),
  });
}

/** A stored file, with the access token: the browser can't add it to a plain link. */
export const fetchMyDocument = (documentId: string) =>
  call(
    api.GET('/api/v1/partner/documents/{documentId}/file', {
      params: { path: { documentId } },
      parseAs: 'blob',
    }),
  );

export const fetchPartnerDocument = (partnerId: string, documentId: string) =>
  call(
    api.GET('/api/v1/admin/partners/{id}/documents/{documentId}/file', {
      params: { path: { id: partnerId, documentId } },
      parseAs: 'blob',
    }),
  );

export function useUploadLogo() {
  const queries = useQueryClient();
  return useMutation({
    mutationFn: ({ salesPointId, file }: { salesPointId: string; file: File }) =>
      call(
        api.PUT('/api/v1/partner/sales-points/{salesPointId}/logo', {
          params: { path: { salesPointId } },
          body: {} as never,
          bodySerializer: () => formData({ file }),
        }),
      ),
    onSuccess: () => queries.invalidateQueries({ queryKey: ['salesPoints'] }),
  });
}

/** The logo as an object URL, refreshed whenever it changes (logoUpdatedAt). */
export const useLogo = (salesPointId: string, updatedAt: string | undefined, admin = false) =>
  useQuery({
    queryKey: ['logo', salesPointId, updatedAt],
    queryFn: async () =>
      URL.createObjectURL(
        (await call(
          admin
            ? api.GET('/api/v1/admin/sales-points/{salesPointId}/logo', {
                params: { path: { salesPointId } },
                parseAs: 'blob',
              })
            : api.GET('/api/v1/partner/sales-points/{salesPointId}/logo', {
                params: { path: { salesPointId } },
                parseAs: 'blob',
              }),
        )) as Blob,
      ),
    enabled: !!updatedAt,
    staleTime: Infinity,
  });
