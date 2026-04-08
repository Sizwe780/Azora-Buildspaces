const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'components', 'rooms', 'ai-studio.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Add import
if (!content.includes('import ModelComparison')) {
  let importAdded = false;
  content = content.replace(
    /import \{ PromptLibrary \} from "\.\/ai-studio\/PromptLibrary"/,
    () => {
        importAdded = true;
        return 'import { PromptLibrary } from "./ai-studio/PromptLibrary"\nimport ModelComparison from "./ai-studio/ModelComparison"'
    }
  );
  if (!importAdded) {
      if (content.includes('import PromptLibrary')) {
        content = content.replace('import PromptLibrary', 'import ModelComparison from "./ai-studio/ModelComparison"\nimport PromptLibrary');
      }
  }
}

// Find compare tab content
const compareStartText = '<TabsContent value="compare" className="flex-1 m-0 \\noverflow-auto">'; // Handle newlines if needed, or just use indexof
const idx = content.indexOf('<TabsContent value="compare"');

if (idx !== -1) {
  const startIndex = idx;
  let inComponent = false;
  let endIndex = -1;
  let tagLevel = 0;
  
  for (let i = startIndex; i < content.length; i++) {
      if (content.substring(i, i + 12) === '<TabsContent') {
          tagLevel++;
      }
      if (content.substring(i, i + 14) === '</TabsContent>') {
          tagLevel--;
          if (tagLevel === 0) {
              endIndex = i + 14;
              break;
          }
      }
  }

  if (endIndex > -1) {
    const replacement = `<TabsContent value="compare" className="flex-1 m-0 overflow-hidden h-full relative">
                    <ModelComparison />
                  </TabsContent>`;
    let newContent = content.substring(0, startIndex) + replacement + content.substring(endIndex);
    fs.writeFileSync(filePath, newContent);
    console.log('Successfully updated compare tab');
  } else {
    console.log('Could not find </TabsContent> for compare');
  }
} else {
  console.log('Could not find compare tab start');
}
