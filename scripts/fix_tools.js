const fs = require('fs');

let content = fs.readFileSync('app/api/code-chamber/chat/route.ts', 'utf8');

content = content.replace(/run_terminal_command:\s*\{[\s\S]*?command:.*?\}\),/g, \un_terminal_command: tool({
        description: 'Execute a command in the integrated terminal (e.g. npm install, ls, git status)',
        parameters: z.object({
          command: z.string().describe('The command to execute'),
        }),
      }),\);

content = content.replace(/read_file:\s*\{[\s\S]*?path:.*?\}\),/g, \ead_file: tool({
        description: 'Read the content of a file',
        parameters: z.object({
          path: z.string().describe('The relative path of the file to read'),
        }),
      }),\);

content = content.replace(/write_file:\s*\{[\s\S]*?content:.*?\}\),/g, \write_file: tool({
        description: 'Write content to a file (overwrites existing)',
        parameters: z.object({
          path: z.string().describe('The relative path of the file'),
          content: z.string().describe('The file content to write'),
        }),
      }),\);

fs.writeFileSync('app/api/code-chamber/chat/route.ts', content);
