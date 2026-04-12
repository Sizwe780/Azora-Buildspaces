# Security Audit & Penetration Testing Report
Date: **April 11, 2026**

## Architecture Security Enhancements
As part of the SDLC Compliance, the Next.js App Router and Prisma database were recently hardened against common web and API vulnerabilities.

### 1. Cryptography
*   **Symmetric Encryption**: User data encryption (`lib/encryption.ts`) strictly enforces **AES-256-GCM**. The `ENCRYPTION_KEY` checks actively throw on length non-compliance (must be 32 bytes).
*   **Password Hashing**: Upgraded iterations for `PBKDF2` from `1,000` to `310,000` per recent OWASP specifications for SHA-512.

### 2. Authorization & Lifecycles
*   **RBAC Validations**: Valid roles are structurally merged into the NextAuth `user` object and persisted effectively within JWT instances to prevent privilege escalation.
*   **Brute-force Limitations**: After `5` failed login attempts, an active user table row updates `lockedUntil` effectively blocking `CredentialsProvider` usage for 15 minutes.
*   **Simultaneous Session Invalidation**: Adjusting `sessionValidAfter` structurally invalidates any persistent JSON Web Tokens (`token.iat` checks) issued prior to the invalidation timestamp.

### 3. Application Defenses (CSP)
*   Content Security Policy headers are strictly filtered within `next.config.mjs` and the `lib/security-headers.ts` stack.
*   Directives `'unsafe-inline'` and `'unsafe-eval'` have been entirely stripped from `script-src` and `style-src` rendering all script injections ineffective.

### 4. Dependency Auditing
*   `pnpm audit` has swept dependencies resulting in patching vulnerable library trees involving legacy crypto and AST parsers.

### Penetration Testing Objectives (E2E)
A new testing suite (`tests/e2e/security.spec.ts`) runs automatically against root endpoints assessing standard compliance:
*   `x-frame-options`
*   `x-content-type-options` (nosniff)
*   `strict-transport-security` (HSTS)
*   `content-security-policy` (absent unsafe scopes)
