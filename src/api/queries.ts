import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  api,
  call,
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

const commissionKeys = {
  rules: (partnerId?: string) => ['commission', 'rules', partnerId ?? 'all'] as const,
  requests: ['commission', 'requests'] as const,
};

export const useCommissionRules = (partnerId?: string) =>
  useQuery({
    queryKey: commissionKeys.rules(partnerId),
    queryFn: () => call(commissionApi.GET('/api/v1/admin/commissions', { params: { query: { partnerId } } })),
  });

export const useCommissionRequests = () =>
  useQuery({
    queryKey: commissionKeys.requests,
    queryFn: () => call(commissionApi.GET('/api/v1/admin/commission-requests')),
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

const terminalKeys = {
  of: (salesPointId: string) => ['terminals', salesPointId] as const,
  audit: (terminalId: string) => ['terminals', 'audit', terminalId] as const,
};

export const useTerminals = (salesPointId: string) =>
  useQuery({
    queryKey: terminalKeys.of(salesPointId),
    queryFn: () =>
      call(
        terminalApi.GET('/api/v1/admin/sales-points/{salesPointId}/terminals', {
          params: { path: { salesPointId } },
        }),
      ),
  });

export const useTerminalAudit = (terminalId: string, enabled: boolean) =>
  useQuery({
    queryKey: terminalKeys.audit(terminalId),
    queryFn: () =>
      call(
        terminalApi.GET('/api/v1/admin/terminals/{terminalId}/audit', { params: { path: { terminalId } } }),
      ),
    enabled,
  });

export type TerminalAction = 'suspend' | 'resume' | 'revoke';

/** Registering and every status change refresh the website's terminals and their audit trails. */
export function useTerminalAdmin(salesPointId: string) {
  const queries = useQueryClient();
  const onSuccess = () => queries.invalidateQueries({ queryKey: ['terminals'] });
  const register = useMutation({
    mutationFn: (body: { scheme: 'UZCARD' | 'HUMO'; merchantId: string; terminalId: string }) =>
      call(
        terminalApi.POST('/api/v1/admin/sales-points/{salesPointId}/terminals', {
          params: { path: { salesPointId } },
          body,
        }),
      ),
    onSuccess,
  });
  const act = useMutation({
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
    onSuccess,
  });
  return { register, act };
}
