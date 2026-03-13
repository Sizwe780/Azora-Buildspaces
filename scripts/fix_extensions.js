const fs = require('fs');

const filePath = 'lib/services/extension-marketplace.ts';
let code = fs.readFileSync(filePath, 'utf8');

const importPrisma = `import { prisma } from '../database/client';\n`;
if (!code.includes(importPrisma)) {
    code = code.replace(/export class ExtensionMarketplaceService \{/, importPrisma + '\nexport class ExtensionMarketplaceService {');
}

// update getInstalled
code = code.replace(
    /getInstalled\(\): InstalledExtension\[\] \{\s*return Array\.from\(this\.installed\.values\(\)\)\s*\}/,
    `async getInstalled(projectId: string = 'default'): Promise<InstalledExtension[]> {\n    try {\n      const dbExts = await prisma.installedExtension.findMany({ where: { projectId } });\n      if (dbExts && dbExts.length > 0) {\n        // Merge with memory\n        for (const ext of dbExts) {\n          if (this.registry.has(ext.extensionId)) {\n             const base = this.registry.get(ext.extensionId)!;\n             this.installed.set(ext.extensionId, { ...base, isEnabled: ext.isActive, installedAt: ext.installedAt.getTime(), installPath: \`/extensions/\${projectId}/\${ext.extensionId}\`, isBuiltIn: false, autoUpdate: true, permissions: ['all'] });\n          }\n        }\n      }\n    } catch (e) { \n      console.error('Failed to load extensions from DB', e);\n    }\n    return Array.from(this.installed.values());\n  }`
);

// update install
code = code.replace(
    /async install\(extensionId: string, userId: string\): Promise<InstalledExtension> \{/,
    `async install(extensionId: string, userId: string, projectId: string = 'default'): Promise<InstalledExtension> {`
);

code = code.replace(
    /this\.installed\.set\(extensionId, installedExt\)(\s*)return installedExt/,
    `this.installed.set(extensionId, installedExt);\n\n    try {\n      // Ensure default project exists\n      if (projectId === 'default') {\n        const proj = await prisma.buildSpaceProject.findFirst({ where: { id: 'default' } });\n        if (!proj) {\n           const defaultUser = await prisma.user.findFirst();\n           if (defaultUser) await prisma.buildSpaceProject.create({ data: { id: 'default', slug: 'default', name: 'Default Workspace', ownerId: defaultUser.id } });\n        }\n      }\n      await prisma.installedExtension.upsert({\n        where: { projectId_extensionId: { projectId, extensionId } },\n        create: { projectId, extensionId, version: ext.version, name: ext.name, publisher: ext.publisher.id, description: ext.description, isActive: true },\n        update: { version: ext.version, isActive: true }\n      });\n    } catch (e) { console.error('Failed to save to DB', e) }\n\n$1return installedExt`
);

// update uninstall
code = code.replace(
    /async uninstall\(extensionId: string\): Promise<boolean> \{\s*const ext = this\.installed\.get\(extensionId\)\s*if \(!ext\) return false\s*if \(ext\.isBuiltIn\) throw new Error\(\`Cannot uninstall built-in extension \$\{extensionId\}\`\)\s*this\.installed\.delete\(extensionId\)\s*return true\s*\}/g,
    `async uninstall(extensionId: string, projectId: string = 'default'): Promise<boolean> {\n    const ext = this.installed.get(extensionId)\n    if (!ext) return false\n    if (ext.isBuiltIn) throw new Error(\`Cannot uninstall built-in extension \${extensionId}\`)\n    this.installed.delete(extensionId)\n    try {\n       await prisma.installedExtension.deleteMany({ where: { projectId, extensionId } });\n    } catch (e) { console.error('Failed to delete from DB', e) }\n    return true\n  }`
);

fs.writeFileSync(filePath, code);
