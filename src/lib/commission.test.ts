import { ruleState } from './commission';

const NOW = Date.parse('2026-10-19T12:00:00Z');

describe('where a fee rule stands', () => {
  it('reads proposals, rejections and the time window', () => {
    expect(ruleState({ status: 'PROPOSED', validFrom: '2026-01-01T00:00:00Z' }, NOW)).toBe('waiting');
    expect(ruleState({ status: 'REJECTED', validFrom: '2026-01-01T00:00:00Z' }, NOW)).toBe('rejected');
    expect(ruleState({ status: 'ACTIVE', validFrom: '2026-11-01T00:00:00Z' }, NOW)).toBe('upcoming');
    expect(ruleState({ status: 'ACTIVE', validFrom: '2026-01-01T00:00:00Z' }, NOW)).toBe('inForce');
    expect(
      ruleState(
        { status: 'ACTIVE', validFrom: '2026-01-01T00:00:00Z', validTo: '2026-10-19T12:00:00Z' },
        NOW,
      ),
    ).toBe('ended');
  });
});
