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
- **SweetAlert2** (`sweetalert2`) is used for confirmation and session-expired dialogs, not Angular Material. Inline **Bootstrap 5 modals** (not SweetAlert) are used for in-page overlays that need live content — e.g. the CP-info modal in `RegisterDomicilio` and the camera modal in `RegisterPerson`. Open them programmatically via `window.bootstrap.Modal` (declared as a global from the CDN in `src/index.html`), not `data-bs-toggle`.
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

- Tabs: `persona` (default), `domicilio`, `imagen`, and `afiliacion`, stored in `activeTab` signal
- After a persona is saved, `idPersona` is stored; the domicilio, imágenes, and afiliación tabs — and the persona photo capture — are blocked until then
- `RegisterPerson` (`src/app/register/register-person/`): create/update persona, duplicate check via `PersonaService.search` + SweetAlert, emits `personaSaved`. Also captures a **personal photo**: a "Tomar foto" button (disabled until `idPersona` is set) opens the `CameraCapture` modal; on capture it runs `POST file` → `POST imagen` (with `idTipoImagenDocumento = 1`, the PERSONAL PHOTO type) → thumbnail `GET imagen/thumbnail/:uuid`, and lists thumbnails below the form. Multiple photos per persona; they load via `effect()` on `idPersona`. Object-URL thumbnails are revoked on `DestroyRef`.
  - `CameraCapture` (`src/app/register/register-person/camera-capture/`): reusable Bootstrap modal wrapping a live `getUserMedia` `<video>` preview with a device selector and a "Capturar" button (canvas → JPEG `File`). Emits `photoCaptured: output<File>`; starts the stream on the modal's `shown.bs.modal` event and stops all tracks on `hidden.bs.modal`. The stream/camera lifecycle is owned here, not by the parent.
- `RegisterDomicilio` (`src/app/register/register-domicilio/`): create/update domicilio for the current `idPersona`
- `RegisterImagen` (`src/app/register/register-imagen/`): 0-N images per persona. Upload file (`POST file`) → thumbnail (`GET imagen/thumbnail/{uuid}`) → select type (`GET static_catalog/tipo_imagen/for_persona`) → create (`POST imagen`) or update (`POST imagen/update`). Same type may repeat. No delete of saved images; unsaved drafts can be discarded in the UI. Replacing a saved file persists immediately. Images that belong to an afiliación (`idAfiliacion != null`) are filtered out — this tab shows only persona documents.
- `RegisterAfiliacion` (`src/app/register/register-afiliacion/`): 0-N afiliaciones per persona. An `estado` and a `tipo de afiliación` are both mandatory: selected from `GET static_catalog/estado` (options show `ABREVIADO - NOMBRE`; the summary table shows `abreviado`) and `GET static_catalog/tipo_afiliacion` (options show `TIPO - DESCRIPCIÓN`; the summary table shows `tipo`); legacy rows without `idEstado` / `idTipoAfiliacion` force a selection on edit. Dates are `<input type="date">` in the form and sent as `yyyy-MM-dd`; the API may return them as epoch-millis numbers, so `toInputDate()` accepts `string | number | Date`. Each afiliación requires two images (types `PAGO` and `SOLICITUD` from `GET static_catalog/tipo_imagen/for_afiliacion`). Save order: create (`POST afiliacion`) or update (`PUT afiliacion`) **first**, then create/update each `imagen` with the returned `idAfiliacion` (and `idPersona`). The image→afiliación link lives on `Imagen.idAfiliacion`, not on the afiliación. Edit-slot loading is resolved by matching the persona's images (`GET imagen/find_by/idpersona/:id`) on `idAfiliacion` + `idTipoImagenDocumento`; when a matched image has no `uuid`, it falls back to `GET imagen/find_by/id/:id`. The summary table shows columns Inicio, Fin, Vitalicia, Estado, Tipo, Última modificación and Acciones — no image thumbnails. Soft-delete sets `deleted: true` via update.
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

| Service             | Create            | Update                  | Read                                                                                                                                                                                                                                                                                |
| ------------------- | ----------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PersonaService`    | `POST persona`    | `POST persona/update`   | `GET persona/:id`, `GET persona` (search)                                                                                                                                                                                                                                           |
| `DomicilioService`  | `POST domicilio`  | `POST domicilio/update` | `GET domicilio/find_by/idpersona/:id`, `GET address/by_cp/:cp` (returns `Localizacion` with `colonias[]`, snake_case fields)                                                                                                                                                        |
| `ImagenService`     | `POST imagen`     | `POST imagen/update`    | `GET imagen/find_by/idpersona/:id`, `GET imagen/find_by/id/:id`, `GET imagen/thumbnail/:uuid` (blob), `POST file` (multipart field `file` → `{ filename, uploadError, frontError }`), `GET static_catalog/tipo_imagen/for_persona`, `GET static_catalog/tipo_imagen/for_afiliacion` |
| `AfiliacionService` | `POST afiliacion` | `PUT afiliacion`        | `GET afiliacion/find_by/id_persona/:id`, `GET static_catalog/estado` (returns `Estado[]`), `GET static_catalog/tipo_afiliacion` (returns `TipoAfiliacion[]`)                                                                                                                        |

`Imagen` body: `{ idImagen?, idPersona, idAfiliacion?, uuid, idTipoImagenDocumento }`. `idAfiliacion` is set only for afiliación images (pago/solicitud); persona images omit it. Catalog items use `idTipoImagen`; map that to `idTipoImagenDocumento` on save. `UploadResult.filename` is the stored uuid (with extension). `POST file` returns HTTP 200 even when `uploadError` is true — check the body. The **PERSONAL PHOTO** captured in `RegisterPerson` is stored with a hardcoded `idTipoImagenDocumento = 1`; because it is a persona image (`idAfiliacion` null), it also shows up in the `RegisterImagen` tab.

`Afiliacion` body: `{ idAfiliacion?, idPersona, idEstado, idTipoAfiliacion, fechaInicio, fechaFin, vitalicia, deleted }`. `idEstado` is a mandatory FK to the `Estado` catalog (`{ idEstado, abreviado, nombre }` from `GET static_catalog/estado`). `idTipoAfiliacion` is a mandatory FK to the `TipoAfiliacion` catalog (`{ idTipoAfiliacion, tipo, descripcion }` from `GET static_catalog/tipo_afiliacion`). `fechaInicio` / `fechaFin` are sent as `yyyy-MM-dd` but may be returned as epoch-millis numbers. The afiliación no longer carries image ids — its images are `Imagen` rows linked via `idAfiliacion`.

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
