// Where Keycloak lives. Defaults match ecom-infra; override in .env.local.
export const config = {
  keycloakUrl: import.meta.env.VITE_KEYCLOAK_URL ?? 'http://localhost:8180',
  realm: import.meta.env.VITE_KEYCLOAK_REALM ?? 'ecom',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT ?? 'ecom-portal',
};

export const authority = `${config.keycloakUrl}/realms/${config.realm}`;
