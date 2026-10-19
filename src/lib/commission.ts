import type { CommissionRule } from '../api/client';

export type RuleState = 'waiting' | 'rejected' | 'upcoming' | 'inForce' | 'ended';

/** Where a rule stands right now: what an admin wants to know first. */
export function ruleState(
  rule: Pick<CommissionRule, 'status' | 'validFrom' | 'validTo'>,
  now = Date.now(),
): RuleState {
  if (rule.status === 'PROPOSED') return 'waiting';
  if (rule.status === 'REJECTED') return 'rejected';
  if (new Date(rule.validFrom).getTime() > now) return 'upcoming';
  if (rule.validTo && new Date(rule.validTo).getTime() <= now) return 'ended';
  return 'inForce';
}

export const RULE_STATE_COLOR: Record<RuleState, string> = {
  waiting: 'yellow',
  rejected: 'gray',
  upcoming: 'blue',
  inForce: 'green',
  ended: 'gray',
};

export const LEVEL_COLOR = { SALES_POINT: 'grape', PARTNER: 'indigo', SCHEME: 'cyan', BANK: 'gray' } as const;
