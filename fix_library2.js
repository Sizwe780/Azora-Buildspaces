const fs = require('fs');

let content = fs.readFileSync('components/rooms/ai-studio.tsx', 'utf8');

if (!content.includes('import PromptLibrary')) {
    content = content.replace(/import AgentMetrics from "\.\/ai-studio\/AgentMetrics"/, 'import AgentMetrics from "./ai-studio/AgentMetrics"\nimport PromptLibrary from "./ai-studio/PromptLibrary"');
}

const match = content.match(/<TabsContent value="templates" className="flex-1 m-0 overflow-auto">/);
const chainsMatch = content.match(/\{\/\* \u00e2\u201d\u20ac\u00e2\u201d\u20ac Phase 1: Chain Presets \u00e2\u201d\u20ac\u00e2\u201d\u20ac \*\/\}\n\s*<TabsContent value="chains"/);
const endMatch = content.match(/\{\/\* \u2500\u2500 Phase 1: Chain Presets \u2500\u2500 \*\/\}\r?\n\s*<TabsContent value="chains"/);

if (match && (chainsMatch || endMatch)) {
    const endStr = endMatch ? endMatch[0] : chainsMatch[0];
    const startIndex = match.index;
    const endIndex = content.indexOf(endStr);
    
    if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex) {
        const replacement = `<TabsContent value="templates" className="flex-1 m-0 overflow-auto">
                  <ErrorBoundary componentName="AI Studio Prompt Templates">
                    <PromptLibrary />
                  </ErrorBoundary>
                </TabsContent>

                `;
        
        content = content.substring(0, startIndex) + replacement + content.substring(endIndex);
        fs.writeFileSync('components/rooms/ai-studio.tsx', content);
        console.log("Successfully updated ai-studio.tsx");
    } else {
        console.log("Indices wrong");
    }
} else {
    console.log("Could not find patterns", match, chainsMatch, endMatch);
}