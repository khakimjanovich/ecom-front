import { uzcardVerdict } from './EposControls';

describe('an e-POS terminal checked at Uzcard', () => {
  const there = { check: { name: 'Shop', type: 1 } };

  it('agrees when a terminal we route to is in SV-Gate, and a revoked one is not', () => {
    expect(uzcardVerdict('ACTIVE', there)).toBe('agrees');
    expect(uzcardVerdict('SUSPENDED', there)).toBe('agrees');
    expect(uzcardVerdict('REVOKED', {})).toBe('agrees');
  });

  it('flags a live terminal SV-Gate lacks, and a revoked one it still has', () => {
    expect(uzcardVerdict('ACTIVE', { listing: { name: 'Shop' } })).toBe('missing');
    expect(uzcardVerdict('REVOKED', there)).toBe('leftover');
  });
});
