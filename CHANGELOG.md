# Changelog

All notable changes to this project are documented here, following
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and
[Semantic Versioning](https://semver.org/).
Releases are cut by pushing a `v*` tag — see `.github/workflows/release.yml`.

## [Unreleased]

### Added

- Vitest V8 coverage gate (`npm test` runs with `--coverage`; thresholds: lines 60 / branches 45 / functions 50 / statements 55).
- Prettier (`npm run format` / `format:check`) + ESLint (`npm run lint`) enforced in CI and pre-commit.
- Conventional Commits enforced via versioned `.githooks/commit-msg`.

## [0.1.2] - 2026-11-15

- See git history prior to changelog adoption.
