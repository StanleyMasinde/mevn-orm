# Changelog

## v4.2.0

- Restore support for the documented `client` and `connection` database config shape.
- Keep deprecated `dialect` config working as a compatibility path.
- Update migration script defaults to prefer `DB_CLIENT` while still accepting `DB_DIALECT`.
- Add tests covering both the documented config shape and deprecated compatibility config.
- Migrate linting to ESLint 9 flat config.
- Remove unused Babel lint tooling and the unused `mysql` dependency.
- Refresh the README and rebuild the changelog.

## v4.1.0 - 2026-03-27

- Bump version from 4.0.7 to 4.1.0.
- Upgrade dependencies.
- Bump `@faker-js/faker` from `10.3.0` to `10.4.0`.
- Bump `vitest` from `4.1.0` to `4.1.1`.

## v4.0.7 - 2026-03-21

- Bump version from 4.0.6 to 4.0.7.
- Fix workflow permission code-scanning alerts.
- Bump `sqlite3` from `5.1.7` to `6.0.1`.
- Bump `pnpm/action-setup` from `4` to `5`.

## v4.0.6 - 2026-03-17

- Upgrade dependencies.

## v4.0.5 - 2026-03-12

- Bump version from 4.0.4 to 4.0.5.
- Bump `@types/node` from `25.3.3` to `25.4.0`.

## v4.0.4 - 2026-03-03

- Bump package version.
- Upgrade dependencies to address vulnerable packages.

## v4.0.3 - 2026-03-03

- Bump version from 4.0.2 to 4.0.3.
- Change Dependabot schedule to weekly.
- Fix PR assignee and reviewer usernames.
- Bump `dotenv` from `17.2.4` to `17.3.1`.
- Bump `@types/node` from `24.10.13` to `25.3.3`.

## v4.0.2 - 2026-02-11

- Bump version from 4.0.1 to 4.0.2.
- Revise README for clarity and updated client names.

## v4.0.1 - 2026-02-11

- Stop publishing `.ts` files to npm.

## v4.0.0 - 2026-02-11

- Bump version from 3.2.2 to 4.0.0.
- Rewrite the package in TypeScript.
- Switch tests to Vitest.
- Add migration support.
- Refactor relationships and database config.
- Expand documentation, including Nuxt/Nitro and migration examples.

## v3.2.2-2 - 2026-02-11

- Pre-release for `v3.2.2`.
- Fix CI database configuration.
- Use the latest Node LTS in CI.

## v3.2.2-1 - 2026-02-10

- Tag created with no additional non-merge commits beyond `v3.2.2`.

## v3.2.2 - 2026-02-11

- Fix pnpm publish flow.
- Switch the package manager to pnpm.
- Upgrade dependencies to address CVEs.
- Fix multiple pnpm versions configured in CI.
- Use the latest Node LTS in CI.
- Bump several dev dependencies, including Babel, Faker, Chai, Mocha, `dotenv`, and `js-yaml`.

## v3.2.1 - 2025-09-29

- Add `changelog.md`.
- Temporarily pin CI to Node 16.

## v3.2.0 - 2025-09-29

- Use Node 20 for tests.
- Support the latest Node versions in CI.
- Upgrade dependencies.
- Bump `actions/setup-node` from `4` to `5`.
- Bump `actions/checkout` from `4` to `5`.
- Remove `.babelrc`.

## v3.1.0 - 2025-07-02

- Release tag `v3.1.0`.

## v3.0.0 - 2025-07-02

- Release tag `v3.0.0`.

## v2.6.0 - 2025-07-02

- Upgrade dependencies.
- Bump `@faker-js/faker` from `8.4.1` to `9.9.0`.
- Bump `@babel/core` from `7.27.4` to `7.27.7`.
- Bump `@babel/eslint-parser` from `7.27.1` to `7.27.5`.
- Bump `dotenv` from `16.5.0` to `17.0.1`.
- Bump `actions/setup-node` from `3` to `4`.
- Bump `actions/checkout` from `3` to `4`.
- Update the README.

## v2.5.0 - 2025-06-01

- Upgrade dependencies.
- Update the README.
- Bump `eslint` from `8.35.0` to `8.39.0`.
- Bump `@babel/cli` from `7.21.0` to `7.21.5`.
- Bump `@babel/core` from `7.21.0` to `7.21.5`.
- Bump `@babel/eslint-parser` from `7.19.1` to `7.21.3`.
- Bump `sqlite3` from `5.1.4` to `5.1.6`.

## Archive

- `v2.4.7-1` - 2023-03-08
- `v2.4.6` - 2023-03-08
- `v2.4.5` - 2023-03-06
- `v2.4.4` - 2023-01-04
- `v2.4.3` - 2023-01-04
- `v2.4.2` - 2023-01-03
- `v2.4.1` - 2022-07-21
- `v2.4.0` - 2022-07-20
- `v2.3.7` - 2022-07-20
- `2.3.6` - 2022-02-03
- `v2.3.0` - 2022-02-01
- `2.3.1` - 2022-02-01
- `v2.2.1` - 2021-02-16
- `v2.2.0` - 2021-02-16
- `v2.1.5` - 2021-01-29
- `v2.1.4` - 2021-01-29
- `v2.1.3` - 2021-01-28
- `v2.1.2` - 2021-01-13
- `v2.1.0` - 2021-01-13
- `v2.0.4` - 2021-01-02
- `v2.0.3` - 2020-12-22
- `v2.0.2` - 2020-12-17
- `v2.0.1` - 2020-12-11
