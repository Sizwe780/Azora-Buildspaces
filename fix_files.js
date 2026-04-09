const fs = require('fs');

try {
  let file2 = 'components/rooms/ai-studio/PromptLibrary.tsx';
  let txt2 = fs.readFileSync(file2, 'utf8');
  if (!txt2.includes('import { useToast }')) {
      txt2 = txt2.replace('import { Plus', 'import { useToast } from "@/hooks/use-toast";\nimport { Plus');
      fs.writeFileSync(file2, txt2);
  }
} catch(e) {}

try {
  let file3 = 'components/rooms/ai-studio/ModelComparison.tsx';
  let txt3 = fs.readFileSync(file3, 'utf8');
  if (!txt3.includes('import { useToast }')) {
      txt3 = txt3.replace('import { Play', 'import { useToast } from "@/hooks/use-toast";\nimport { Play');
      fs.writeFileSync(file3, txt3);
  }
} catch(e) {}
