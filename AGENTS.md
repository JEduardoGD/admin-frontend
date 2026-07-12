# AGENTS.md

## Commands

```bash
npm start              # dev server on http://localhost:4200
npm test               # run Vitest unit tests (via ng test)
npm run build          # production build to dist/
npm run watch          # dev build with watch mode
npx prettier --check . # check formatting
npx prettier --write . # fix formatting
npx ng generate component <name>  # scaffolding (Angular CLI schematics)
```

No lint or e2e scripts are configured.

## Architecture

- Angular 21, standalone components only (no NgModules)
- Entrypoint: `src/main.ts` bootstraps `App` from `src/app/app.ts` using `appConfig` from `src/app/app.config.ts`
- Routes defined in `src/app/app.routes.ts`
- Global styles: `src/styles.css` (plain CSS, not SCSS)
- `src/app/` content is placeholder/scaffolding; replace freely

## File-naming quirk

Components use `<name>.ts` / `<name>.html` / `<name>.css` — **not** `<name>.component.ts`. The root component class is `App` (not `AppComponent`), in `src/app/app.ts`.

## Testing (Vitest)

- Runner: Vitest 4.x via `@angular/build:unit-test` builder
- Test files: `src/**/*.spec.ts` (one exists: `src/app/app.spec.ts`)
- Vitest globals (`describe`, `it`, `expect`) are typed via `tsconfig.spec.json`
- Uses `TestBed` from `@angular/core/testing`; tests are standard Angular component tests

## Code style

- Prettier: 100 print width, single quotes, Angular HTML parser (config in `package.json`)
- EditorConfig: 2-space indent, UTF-8, single quotes for `.ts`, trailing whitespace trimmed
- TypeScript: strict mode on, no fallthrough, explicit overrides required
- Template syntax uses `@for` / `@if` control flow (new Angular syntax), not `*ngFor` / `*ngIf`
