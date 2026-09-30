# fmre-administration-front

Administration frontend for FMR&E, built with Angular 21.

## Prerequisites

- Node.js 18+
- npm 10+

## Setup

```bash
npm install
```

Create a `.env` file with the following variables:

| Variable          | Description                    | Default                    |
| ----------------- | ------------------------------ | -------------------------- |
| `AUTH_AUTHORITY`  | OIDC authority (Cognito URL)   | —                          |
| `AUTH_REDIRECT_URL` | Post-login redirect URL      | `http://localhost:4200`    |
| `AUTH_CLIENT_ID`  | Cognito app client ID          | —                          |
| `AUTH_SCOPE`      | OIDC scopes (space-separated)  | `openid email`             |
| `API_BASE_URL`    | Backend API base URL           | `http://localhost:8080/api` |

`src/environments/environment.ts` is generated automatically from `.env` on `npm start` and `npm run build` (via the `prestart`/`prebuild` hooks).

## Commands

| Command                | Description                              |
| ---------------------- | ---------------------------------------- |
| `npm start`            | Dev server at `http://localhost:4200`    |
| `npm test`             | Run Vitest unit tests                    |
| `npm run build`        | Production build to `dist/`              |
| `npm run watch`        | Dev build with file watcher              |
| `npx prettier --check .` | Check formatting                      |
| `npx prettier --write .` | Fix formatting                        |
| `npm run generate-env` | Regenerate `environment.ts` from `.env` |

## Architecture

- **Standalone components** only (no NgModules)
- **Signals** for reactive state (`signal()`, `computed()`)
- **Reactive Forms** with `FormBuilder.nonNullable.group`
- Routes defined in `src/app/app.routes.ts`:

| Path               | Component      | Guard     | Description           |
| ------------------ | -------------- | --------- | --------------------- |
| `/`                | `LandingPage`  | —         | Public home page      |
| `/admin`           | `AdminLayout`  | `authGuard` | Authenticated layout |
| `/admin/register`  | `Register`     | `authGuard` | Persona registration  |

## Authentication

Uses OIDC/OAuth2 (AWS Cognito) via `angular-auth-oidc-client`. The auth interceptor automatically attaches Bearer tokens to API requests. Configuration is in `src/app/auth/auth.config.ts`.

## File naming

Components use `<name>.ts` / `<name>.html` / `<name>.css` (no `.component` suffix). When scaffolding with `ng generate component`, rename the generated files to match this convention.

## Tech stack

Angular 21 · TypeScript 5.9 · Bootstrap 5 · Vitest · OIDC/AWS Cognito · SweetAlert2
