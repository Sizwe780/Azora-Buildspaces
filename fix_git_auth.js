const fs = require('fs');
const path = require('path');
const glob = require('glob'); // This might not be globally installed, let's use a simpler approach

const gitDir = path.join(__dirname, 'app', 'api', 'projects', 'current', 'git');
const dirs = fs.readdirSync(gitDir);

const authImports = `import { getServerSession } from 'next-auth'\nimport { authOptions } from '@/lib/auth/config'\n`;
const authCheck = `\n    const session = await getServerSession(authOptions)\n    if (!session?.user) {\n      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })\n    }\n`;

dirs.forEach(d => {
  const p = path.join(gitDir, d, 'route.ts');
  if (fs.existsSync(p)) {
    let content = fs.readFileSync(p, 'utf8');
    let changed = false;

    // Add imports if missing
    if (!content.includes('getServerSession')) {
      content = content.replace(/(import .* from 'next\/server'\n)/, "$1" + authImports);
      changed = true;
    }

    // Add auth check to GET
    if (content.includes('export async function GET') && !content.match(/export async function GET[^{]*\{[\s\S]*getServerSession/)) {
      content = content.replace(/(export async function GET[^{]*\{[\s\n]*try\s*\{)/, "$1" + authCheck);
      changed = true;
    }

    // Add auth check to POST
    if (content.includes('export async function POST') && !content.match(/export async function POST[^{]*\{[\s\S]*getServerSession/)) {
      content = content.replace(/(export async function POST[^{]*\{[\s\n]*try\s*\{)/, "$1" + authCheck);
      changed = true;
    }

    if (changed) {
      fs.writeFileSync(p, content);
      console.log('Fixed', p);
    }
  }
});
