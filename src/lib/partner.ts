import type { PartnerStatus } from '../api/client';

/** The Mantine color each status gets. Labels live in the translations (status.*). */
export const STATUS_COLOR: Record<PartnerStatus, string> = {
  PENDING_VERIFICATION: 'yellow',
  VERIFIED: 'blue',
  WAITING_CONTRACT: 'yellow',
  APPROVED: 'blue',
  ACTIVE: 'green',
  SUSPENDED: 'red',
  TERMINATED: 'gray',
  REJECTED: 'red',
};

/** The road from sign-up to taking payments (journey.* in the translations). */
export const JOURNEY = ['signup', 'documents', 'contract', 'activation', 'live'] as const;

/** Where a status sits on the journey. */
export function journeyStep(status: PartnerStatus): number {
  switch (status) {
    case 'PENDING_VERIFICATION':
    case 'REJECTED':
      return 1;
    case 'VERIFIED':
    case 'WAITING_CONTRACT':
      return 2;
    case 'APPROVED':
      return 3;
    case 'ACTIVE':
      return JOURNEY.length;
    default:
      return 4;
  }
}

export const isStopped = (status: PartnerStatus) =>
  status === 'REJECTED' || status === 'SUSPENDED' || status === 'TERMINATED';

/** What an admin can do in each status. The server enforces the same rules; this only hides dead buttons. */
export type AdminAction =
  'verify' | 'contract' | 'requestActivation' | 'suspend' | 'restore' | 'terminate' | 'reject';

export const ACTIONS: Record<PartnerStatus, AdminAction[]> = {
  PENDING_VERIFICATION: ['verify', 'reject'],
  VERIFIED: ['reject'],
  WAITING_CONTRACT: ['contract', 'reject'],
  APPROVED: ['requestActivation', 'terminate'],
  ACTIVE: ['suspend', 'terminate'],
  SUSPENDED: ['restore', 'terminate'],
  TERMINATED: [],
  REJECTED: [],
};

/** Actions that need a written reason, and the ones that can't be undone. */
export const NEEDS_REASON: AdminAction[] = ['reject', 'suspend', 'terminate'];
export const DESTRUCTIVE: AdminAction[] = ['reject', 'terminate', 'suspend'];
