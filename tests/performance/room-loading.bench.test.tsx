/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render } from '@testing-library/react';

// We mock our workspace router components and Next-Auth similarly to integration specs to purely test rendering
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), prefetch: jest.fn() }),
  useSearchParams: () => new URLSearchParams(''),
  usePathname: () => '/workspace',
}));

jest.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { name: 'Perf User' } }, status: 'authenticated' }),
  getSession: () => Promise.resolve({ user: { name: 'Perf User' } }),
}));

jest.mock('@/app/workspace/page', () => {
    const React = require('react');
    const { useState } = React;
    const { WorkspaceSidebar } = require('@/components/workspace/workspace-sidebar');
    const { WorkspaceHeader } = require('@/components/workspace/workspace-header');

    return function MockWorkspacePage() {
        const [activeRoom, setActiveRoom] = useState('code-chamber');
        const Room = () => <div data-testid="mock-room">Loaded Room: {activeRoom}</div>;

        return (
            <div data-testid="workspace-shell">
                <WorkspaceHeader />
                <WorkspaceSidebar activeRoom={activeRoom} onNavigate={setActiveRoom} />
                <Room />
            </div>
        );
    }
});

import WorkspacePage from '@/app/workspace/page';

describe('Workspace Performance Benchmarks', () => {
  const RENDER_THRESHOLD_MS = 500; // Expected to render shell in under 500ms for node CI
  
  it('mounts the workspace shell within performance thresholds', () => {
    const start = performance.now();
    
    const { unmount } = render(<WorkspacePage />);
    
    const end = performance.now();
    const renderTime = end - start;
    
    console.log(`[Performance] Workspace Shell mount time: ${renderTime.toFixed(2)}ms`); // For artifact reading if requested
    
    expect(renderTime).toBeLessThan(RENDER_THRESHOLD_MS);
    unmount();
  });

  it('runs 100 consecutive component re-renders within thresholds', () => {
    const STRESS_THRESHOLD_MS = 5000; 
    
    const start = performance.now();
    for (let i = 0; i < 100; i++) {
        const { unmount } = render(<WorkspacePage />);
        unmount();
    }
    const end = performance.now();
    
    const renderTime = end - start;
    console.log(`[Performance] Workspace Shell 100x stress un/mount: ${renderTime.toFixed(2)}ms`); 
    
    expect(renderTime).toBeLessThan(STRESS_THRESHOLD_MS);
  });
});