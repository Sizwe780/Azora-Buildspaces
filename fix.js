
const fs = require("fs");
let content = fs.readFileSync("components/workspace/x-terminal-client.tsx", "utf8");
content = content.replace(/const process = await runtimeEngine\.spawn\(\s*program,\s*rest,\s*\{[\s\S]*?\}\s*\);/, `        const process = await runtimeEngine.spawn(program, rest, (output) => {
          if (output.type === "stdout" || output.type === "stderr") {
            termInstance.current?.write(output.data || output.output || "");
          }
        });`);
fs.writeFileSync("components/workspace/x-terminal-client.tsx", content);

