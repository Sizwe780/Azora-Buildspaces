// Extension API for Azora-Buildspaces Code Chamber
// This file exposes the public API for third-party extensions

export interface ExtensionContext {
  workspaceRoot: string;
  getSetting: (key: string) => any;
  setSetting: (key: string, value: any) => void;
  showNotification: (message: string, type?: 'info' | 'warning' | 'error' | 'success') => void;
  registerCommand: (command: string, handler: (...args: any[]) => void) => void;
  registerView: (viewId: string, component: React.ComponentType<any>) => void;
  registerSidebar: (sidebarId: string, component: React.ComponentType<any>) => void;
  registerMenuItem: (menuId: string, item: { label: string; action: () => void }) => void;
  getActiveFile: () => string;
  getFileContent: (path: string) => Promise<string>;
  setFileContent: (path: string, content: string) => Promise<void>;
  onFileChange: (callback: (path: string, content: string) => void) => void;
}

export type ExtensionActivate = (context: ExtensionContext) => void;

export interface ExtensionManifest {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  activate: ExtensionActivate;
}

// Example registry for extensions
export const extensionRegistry: ExtensionManifest[] = [];

export function registerExtension(manifest: ExtensionManifest) {
  extensionRegistry.push(manifest);
}

// Example: Extension loader
export function activateExtensions(context: ExtensionContext) {
  for (const ext of extensionRegistry) {
    try {
      ext.activate(context);
    } catch (err) {
      context.showNotification(`Extension ${ext.name} failed to activate: ${err}`, 'error');
    }
  }
}
