const fs = require('fs');
const path = require('path');

const gitDir = path.join(__dirname, 'app', 'api', 'projects', 'current', 'git');
const dirs = fs.readdirSync(gitDir);

const authImports = `import { getServerSession } from 'next-auth'\nimport { authOptions } from '@/lib/auth/config'\n`;

dirs.forEach(d => {
  const p = path.join(gitDir, d, 'route.ts');
  if (fs.existsSync(p)) {
    let content = fs.readFileSync(p, 'utf8');
    let changed = false;

    // Add imports if missing
    if (!content.includes('import { getServerSession }')) {
      content = content.replace(/(import .* from ['"]next\/server['"]\r?\n)/, "$1" + authImports);
      changed = true;
    }

    if (changed) {
      fs.writeFileSync(p, content);
      console.log('Fixed imports', p);
    }
  }
});
