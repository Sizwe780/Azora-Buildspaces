const fs = require('fs');

let content = fs.readFileSync('components/rooms/ai-studio.tsx', 'utf8');

if (!content.includes('import PromptLibrary')) {
    content = content.replace(/import AgentMetrics from "\.\/ai-studio\/AgentMetrics"([^']*?)/, 'import AgentMetrics from "./ai-studio/AgentMetrics";\nimport PromptLibrary from "./ai-studio/PromptLibrary";$1');
}

const regex = /<TabsContent value="templates"[^>]*>[\s\S]*?<\/TabsContent>(\s*)<TabsContent value="chains"/;
if (regex.test(content)) {
    content = content.replace(regex, `<TabsContent value="templates" className="flex-1 m-0 overflow-auto">
                  <ErrorBoundary componentName="AI Studio Prompt Templates">
                    <PromptLibrary />
                  </ErrorBoundary>
                </TabsContent>$1<TabsContent value="chains"`);
    fs.writeFileSync('components/rooms/ai-studio.tsx', content);
    console.log("Successfully updated ai-studio.tsx");
} else {
    console.log("Could not find templates tab to replace");
}
