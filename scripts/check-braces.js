const fs = require('fs');
const lines = fs.readFileSync('components/workspace/editor-panel.tsx', 'utf8').split('\n');
let braces = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  // Simple brace counting (ignoring strings for speed, good enough for indented code)
  for (let c of line) {
    if (c === '{') braces++;
    else if (c === '}') braces--;
  }
  if (braces === 0 && i > 56 && i < 1110) {
    console.log('Function closes at line ' + (i + 1) + ': ' + line.trim());
  }
}
console.log('Final brace count:', braces);
