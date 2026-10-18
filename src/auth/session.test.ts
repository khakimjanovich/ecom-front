import { rolesOf } from './session';

const token = (payload: object) =>
  `h.${btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}.s`;

describe('roles from the access token', () => {
  it('keep only our realm roles', () => {
    expect(
      rolesOf(token({ realm_access: { roles: ['admin', 'offline_access', 'default-roles-ecom'] } })),
    ).toEqual(['admin']);
  });

  it('are empty without a token or roles', () => {
    expect(rolesOf(undefined)).toEqual([]);
    expect(rolesOf(token({}))).toEqual([]);
    expect(rolesOf('not-a-jwt')).toEqual([]);
  });
});
