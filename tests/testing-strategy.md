# Comprehensive Testing Strategy

## Overview
This document outlines the testing strategy for Azora Buildspaces, designed to achieve >80% code coverage across the stack, mitigating the high risk of undetected bugs in production.

## 1. Unit Testing
- **Framework:** Jest
- **Target:** `lib/`, `app/api/` (where logic is decoupled), and utility functions.
- **Coverage Goal:** >80% statements and branches.
- **Requirement:** ALL new functions must be covered by a `.test.ts` file in the `tests/` directory. Prisma queries must be mocked or tested against a local DB instance.

## 2. UI Component Testing
- **Framework:** React Testing Library + Jest
- **Target:** `components/ui/` and complex interactive components in `components/workspace/`.
- **Strategy:**
  - Test accessibility (a11y) roles and ARIA states.
  - Test interactions (clicks, keyboard navigation).
  - Verify render states (loading, success, error).

## 3. Integration Testing
- **Framework:** Jest + testing-library
- **Target:** Server-Side Rendered (SSR) pages and API endpoint integration.
- **Goal:** Ensure cross-room interactions (e.g., Code Chamber communicating with API) function seamlessly without requiring a full browser environment.

## 4. End-to-End (E2E) Testing
- **Framework:** Playwright
- **Target:** Critical user journeys (Onboarding, creating a Spec, deploying a Maker Lab project).
- **Execution:** Runs in the GitHub Actions `e2e` workflow on PRs to `main` and `develop`.

## 5. Coverage Enforcement
- Jest is configured to fail the CI build if global coverage drops below 80% (Lines, Branches, Functions, Statements).
- Run local coverage reports using `pnpm test:coverage` (if configured) or `pnpm test -- --coverage`.