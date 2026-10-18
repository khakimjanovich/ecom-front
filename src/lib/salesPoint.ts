import type { SalesPointAction } from '../api/queries';
import type { SalesPointStatus } from '../api/client';

export const SALES_POINT_COLOR: Record<SalesPointStatus, string> = {
  DRAFT: 'gray',
  ACTIVE: 'green',
  SUSPENDED: 'red',
  CLOSED: 'dark',
};

/** What an admin can do with a website in each status. The server enforces the same rules. */
export const SALES_POINT_ACTIONS: Record<SalesPointStatus, SalesPointAction[]> = {
  DRAFT: ['activate', 'close'],
  ACTIVE: ['suspend', 'close'],
  SUSPENDED: ['restore', 'close'],
  CLOSED: [],
};

export const SALES_POINT_NEEDS_REASON: SalesPointAction[] = ['suspend', 'close'];
