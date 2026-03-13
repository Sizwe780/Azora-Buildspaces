const fs = require('fs');
const filePath = 'lib/services/extension-marketplace.ts';
let code = fs.readFileSync(filePath, 'utf8');

const oldStr = `async uninstall(extensionId: string): Promise<boolean> {
    const ext = this.installed.get(extensionId)
    if (!ext) return false
    if (ext.isBuiltIn) throw new Error(\`Cannot uninstall built-in extension \${extensionId}\`)
    this.installed.delete(extensionId)
    return true
  }`;

const newStr = `async uninstall(extensionId: string, projectId: string = 'default'): Promise<boolean> {
    const ext = this.installed.get(extensionId)
    if (!ext) return false
    if (ext.isBuiltIn) throw new Error(\`Cannot uninstall built-in extension \${extensionId}\`)
    this.installed.delete(extensionId)
    try {
       await prisma.installedExtension.deleteMany({ where: { projectId, extensionId } });
    } catch (e) { console.error('Failed to delete from DB', e) }
    return true
  }`;

code = code.replace(oldStr, newStr);
fs.writeFileSync(filePath, code);
