# AGENTS.md

## Commands

```bash
npm start              # dev server on http://localhost:4200
npm test               # run Vitest unit tests (via ng test)
npm run build          # production build to dist/
npm run watch          # dev build with watch mode
npx prettier --check . # check formatting
npx prettier --write . # fix formatting
npx ng generate component <name>  # scaffolding — see File-naming quirk below
```

No lint or e2e scripts are configured (README mentions `ng e2e` but angular.json has no e2e builder).

## Architecture

- Angular 21, standalone components only (no NgModules)
- Entrypoint: `src/main.ts` bootstraps `App` from `src/app/app.ts` using `appConfig` from `src/app/app.config.ts`
- Routes defined in `src/app/app.routes.ts`
- Global styles: `src/styles.css` (plain CSS, not SCSS)
- **Bootstrap 5** is a dependency — CSS classes and utilities are available
- **Angular Signals** (`signal()`) are used for reactive state, not RxJS `BehaviorSubject`
- `src/app/` content is placeholder/scaffolding; replace freely

## File-naming quirk

Components use `<name>.ts` / `<name>.html` / `<name>.css` — **not** `<name>.component.ts`. The root component class is `App` (not `AppComponent`), in `src/app/app.ts`.

**Gotcha:** `ng generate component` produces `.component.ts` files by default. Either rename the generated files to match the `<name>.ts` convention, or configure `schematics` in `angular.json` to skip the `.component` suffix.

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
