# ecom-front

[![build](https://github.com/khakimjanovich/ecom-front/actions/workflows/build.yml/badge.svg)](https://github.com/khakimjanovich/ecom-front/actions/workflows/build.yml)

The web app for [ecom](https://github.com/khakimjanovich/ecom): a **merchant portal** (sign up, verify the email, follow the onboarding, add websites, manage API clients) and a **bank console** (merchants, lifecycle actions, four-eyes approvals, website checks and terms) in one React app. Each person sees the area of their Keycloak role.

React 19 · TypeScript · Vite · [Mantine](https://mantine.dev) · TanStack Query · react-router · react-oidc-context (Keycloak, PKCE) · i18next · Vitest · Playwright

## Run

Start [ecom-infra](https://github.com/khakimjanovich/ecom-infra) (`docker compose up -d`) and the ecom app (`./gradlew :app:bootRun`), then:

```bash
pnpm install
pnpm dev        # http://localhost:5180 — /api goes to the ecom app on :8080
```

Admins `aziz` and `malika` sign in with the local password `local-only`. Settings and their defaults are in `.env.example`.

## How it is built

| Folder                         | What lives there                                                                                                                                                                                                                                                                                |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/api`                      | `client.ts`: typed clients **generated from the platform OpenAPI contracts** (`pnpm api` → `src/api/generated`, not committed; `ECOM_SPEC_BASE=../platform/openapi` uses a local checkout), so paths and bodies can't drift from the backend. `queries.ts`: every read and write the pages use. |
| `src/auth`                     | Keycloak session, roles from the access token (UI only — the API decides), the role guard.                                                                                                                                                                                                      |
| `src/i18n`                     | English, Russian and Uzbek. Every API call sends `Accept-Language`, so server errors come back translated; Keycloak's login opens in the same language.                                                                                                                                         |
| `src/pages`                    | `public` (landing, sign-up, email code), `merchant`, `admin`.                                                                                                                                                                                                                                   |
| `src/components`, `src/layout` | The few shared pieces on top of Mantine.                                                                                                                                                                                                                                                        |

## Tests

| Kind                    | Run         | What it proves                                                                                                                                                                                                                                                                                                                                                                                         |
| ----------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Unit (Vitest)           | `pnpm test` | translations complete in all languages, error handling, roles, the shown-once secret dialog                                                                                                                                                                                                                                                                                                            |
| End to end (Playwright) | `pnpm e2e`  | on the real stack: a merchant signs up in Uzbek and verifies the emailed code; aziz approves documents, signs the contract and requests activation; the maker can't approve; malika approves; the merchant creates an API client and rotates its secret, then adds a website (a foreign return address is refused); after a failed check it can't be switched on, after a passed one it takes payments |

`pnpm lint` checks ESLint and Prettier. CI runs lint, unit tests and the build on every push.
