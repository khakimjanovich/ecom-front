import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, call, type PartnerStatus } from './client';

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
