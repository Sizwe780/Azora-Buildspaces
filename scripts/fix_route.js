const fs = require('fs');
const file = 'app/api/code-chamber/extensions/route.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /extensions: extensionMarketplace\.getInstalled\(\),(\s*)total: extensionMarketplace\.getInstalled\(\)\.length,/,
  'extensions: await extensionMarketplace.getInstalled(searchParams.get(\'projectId\') || \'default\'),$1total: (await extensionMarketplace.getInstalled(searchParams.get(\'projectId\') || \'default\')).length,'
);

code = code.replace(
    /const installed = await extensionMarketplace\.install\(extensionId, userId \|\| 'anonymous'\)/,
    'const installed = await extensionMarketplace.install(extensionId, userId || \'anonymous\', body.projectId || \'default\')'
);

code = code.replace(
    /const removed = await extensionMarketplace\.uninstall\(extensionId\)/,
    'const removed = await extensionMarketplace.uninstall(extensionId, body.projectId || \'default\')'
);

fs.writeFileSync(file, code);
console.log('Fixed route.ts');
