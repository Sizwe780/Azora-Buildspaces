# Performance Testing & Optimization Blueprint

## Methodology
The testing relies on Chromium performance markers gathered during automated Playwright suites (`tests/e2e/performance.spec.ts`). Budgets are enforced upon Core Web Vitals to guarantee smooth human-AI workspace interaction.

## Threshold Budgets
1.  **Time to Interactive (TTI)**: Must resolve under **3500ms** for active command desk initialization.
2.  **Load Event Resolution**: Capped to **4500ms** fetching WebAssembly containers and JS runtimes.
3.  **Largest Contentful Paint (LCP)**: Must render major structural UI segments under **3000ms**.

## Recent Optimization Changes
*   **React Memoization**: Context providers (`components/providers/`) now efficiently memoize children to halt global re-renders.
*   **Asset Segregation**: Heavy WASM/LightFS components are logically segregated (dynamic imports) out of `app/layout.tsx` to shrink the initial page bundle.
*   **Database Pooling**: Prisma client generation connects effectively leveraging the `@prisma/adapter-pg` logic in `lib/database/client.ts` bypassing severe latency hits.

## Continuous Monitoring
These specifications run natively on your GitHub Actions build environments. Failing optimizations intercept the pipeline, assuring PR regressions never merge if TTI or LCP fail their benchmarks.
An audit of the Node garbage collection cycle is scheduled during stress testing metrics across the `performance/` jest suites.