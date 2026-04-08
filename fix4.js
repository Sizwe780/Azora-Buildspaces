const fs = require("fs");
let content = fs.readFileSync("components/rooms/ai-studio.tsx", "utf8");
content = content.replace(
  /<ErrorBoundary componentName="AI Studio Metrics Dashboard">[\s\S]*?<\/ErrorBoundary>/,
  '<ErrorBoundary componentName="AI Studio Metrics Dashboard">\n                    <AgentMetrics />\n                  </ErrorBoundary>'
);
fs.writeFileSync("components/rooms/ai-studio.tsx", content);
