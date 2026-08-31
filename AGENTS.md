# AGENTS.md

## Commands

```bash
npm start              # generate-env + dev server on http://localhost:4200
npm test               # run Vitest unit tests (via ng test)
npm run build          # generate-env + production build to dist/
npm run watch          # generate-env + dev build with watch mode
npm run generate-env   # regenerate src/environments/environment.ts from .env
npx prettier --check . # check formatting
npx prettier --write . # fix formatting
npx ng generate component <name>  # scaffolding — see File-naming quirk below
```

No lint or e2e scripts are configured.

## Architecture

- Angular 21, standalone components only (no NgModules)
- Entrypoint: `src/main.ts` bootstraps `App` from `src/app/app.ts` using `appConfig` from `src/app/app.config.ts`
- `App` is a thin shell (`<router-outlet />` only). Authenticated chrome lives in `AdminLayout`
- Global styles: `src/styles.css` (plain CSS, not SCSS). **Bootstrap 5 CSS** is imported there; Bootstrap JS is loaded from CDN in `src/index.html`
- **Angular Signals** (`signal()`, `computed()`, `input()`, `output()`, `effect()`) are used for component state and parent/child communication
- **RxJS Observables** still drive HTTP (via `ApiService` and feature services)
- **`inject()`** (functional DI) is used everywhere, not constructor injection
- Forms use **Reactive Forms** (`FormBuilder.nonNullable.group`) in the tab child components, not in `Register` itself
- **SweetAlert2** (`sweetalert2`) is used for confirmation and session-expired dialogs, not Angular Material or Bootstrap modals
- Import convention: `import Swal from 'sweetalert2'` (lowercase `Swal`), called as `Swal.fire({...})`
- User-facing copy (labels, alerts, SweetAlert text) is in **Spanish**

## Routes

Defined in `src/app/app.routes.ts`:

| Path              | Component      | Guard       | Notes                                   |
| ----------------- | -------------- | ----------- | --------------------------------------- |
| `/`               | `LandingPage`  | —           | Public home; login or link to `/admin`  |
| `/admin`          | `AdminLayout`  | `authGuard` | Header + footer + child `router-outlet` |
| `/admin` (child)  | `ControlPanel` | inherited   | Default authenticated view              |
| `/admin/register` | `Register`     | inherited   | Persona + domicilio + imágenes tabs     |

`authGuard` (`src/app/auth/auth.guard.ts`) is a functional `CanActivateFn`. If `AuthService.isAuthenticated()` is false it calls `login()` and returns `false`.

## Register flow

`Register` (`src/app/register/register.ts`) is a tab orchestrator. It does **not** own the forms.

- Tabs: `persona` (default), `domicilio`, and `imagen`, stored in `activeTab` signal
- After a persona is saved, `idPersona` is stored; the domicilio and imágenes tabs are blocked until then
- `RegisterPerson` (`src/app/register/register-person/`): create/update persona, duplicate check via `PersonaService.search` + SweetAlert, emits `personaSaved`
- `RegisterDomicilio` (`src/app/register/register-domicilio/`): create/update domicilio for the current `idPersona`
- `RegisterImagen` (`src/app/register/register-imagen/`): 0-N images per persona. Upload file (`POST file`) → thumbnail (`GET imagen/thumbnail/{uuid}`) → select type (`GET static_catalog/tipo_imagen`) → create (`POST imagen`) or update (`POST imagen/update`). Same type may repeat. No delete of saved images; unsaved drafts can be discarded in the UI. Replacing a saved file persists immediately.
- Child components use `input.required()` / `output()` and load existing records with `effect()`
- Dates are formatted with `formatDate(..., 'yyyy-MM-dd', 'en-US')` for `<input type="date">`

## Auth & backend

- OIDC via `angular-auth-oidc-client` (AWS Cognito)
  - Config: `src/app/auth/auth.config.ts` (`provideAuth` + `withAppInitializerAuthCheck()`)
  - Wrapper: `AuthService` in `src/app/auth/auth.service.ts` — `isAuthenticated` is a `computed()` over `OidcSecurityService.authenticated()`
  - Guard: `src/app/auth/auth.guard.ts`
- HTTP: `provideHttpClient(withInterceptors([authInterceptor()]))` in `app.config.ts` — Bearer token is attached automatically for URLs in `secureRoutes` (the API base URL)
- Base API client: `src/app/core/api.service.ts` (`ApiService` with typed `get/post/put/delete`, plus `postForm` for `FormData` and `getBlob` for binary, prefixed with `environment.api.baseUrl`)
- Feature services inject `ApiService` and must **not** call `HttpClient` directly

## HTTP & error handling

- `ErrorHandlerService` (`src/app/core/error-handler.service.ts`): on HTTP 401, shows a SweetAlert (“Sesión expirada”) and navigates to `/`
- Feature services pipe HTTP calls with `catchError((err) => this.errorHandler.handleUnauthorized(err))`
- Backend **updates use POST** to `resource/update`, not HTTP PUT. Follow existing services:

| Service            | Create           | Update                  | Read                                                                                                                                                                                      |
| ------------------ | ---------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PersonaService`   | `POST persona`   | `POST persona/update`   | `GET persona/:id`, `GET persona` (search)                                                                                                                                                 |
| `DomicilioService` | `POST domicilio` | `POST domicilio/update` | `GET domicilio/find_by/idpersona/:id`                                                                                                                                                     |
| `ImagenService`    | `POST imagen`    | `POST imagen/update`    | `GET imagen/find_by/idpersona/:id`, `GET imagen/thumbnail/:uuid` (blob), `POST file` (multipart field `file` → `{ filename, uploadError, frontError }`), `GET static_catalog/tipo_imagen` |

`Imagen` body: `{ idImagen?, idPersona, uuid, idTipoImagenDocumento }`. Catalog items use `idTipoImagen`; map that to `idTipoImagenDocumento` on save. `UploadResult.filename` is the stored uuid (with extension). `POST file` returns HTTP 200 even when `uploadError` is true — check the body.

## Environment config

- All runtime parameters live in `.env` (gitignored): `AUTH_AUTHORITY`, `AUTH_REDIRECT_URL`, `AUTH_CLIENT_ID`, `AUTH_SCOPE`, `API_BASE_URL`
- `npm run generate-env` (also `prestart`/`prebuild`, and the `watch` script) runs `scripts/generate-env.mjs`, which generates `src/environments/environment.ts` (also gitignored — never edit it manually)
- Adding a new env var: add it to `.env` **and** to the template in `scripts/generate-env.mjs`

## File-naming quirk

Components use `<name>.ts` / `<name>.html` / `<name>.css` — **not** `<name>.component.ts`. The root component class is `App` (not `AppComponent`), in `src/app/app.ts`.

**Gotcha:** `ng generate component` produces `.component.ts` files by default (`angular.json` schematics are empty). Either rename the generated files to match the `<name>.ts` convention, or configure schematics in `angular.json` to skip the `.component` suffix.

## Testing (Vitest)

- Runner: Vitest 4.x via `@angular/build:unit-test` builder
- Test files: `src/**/*.spec.ts`
- Vitest globals (`describe`, `it`, `expect`) are typed via `tsconfig.spec.json`
- Uses `TestBed` from `@angular/core/testing`; tests are standard Angular component tests
- Run a single test file: `npx vitest run src/app/app.spec.ts`

## Code style

- Prettier: 100 print width, single quotes, Angular HTML parser (config in `package.json`)
- EditorConfig: 2-space indent, UTF-8, single quotes for `.ts`, trailing whitespace trimmed
- TypeScript: strict mode on, no fallthrough, explicit overrides required
- Template syntax uses `@for` / `@if` control flow (new Angular syntax), not `*ngFor` / `*ngIf`
