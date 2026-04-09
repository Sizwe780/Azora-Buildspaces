import { openai } from '@ai-sdk/openai';
import { streamText, tool } from 'ai';
import { z } from 'zod';

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: openai('gpt-4o'),
    messages,
    system: 'You are an advanced AI coding agent in a cloud IDE. You can edit files and run terminal commands. ALWAYS use the provided tools to perform actions. When asked to "fix" or "edit", verify the file content first, then write the changes.',
    tools: {
      run_terminal_command: tool({
        description: 'Execute a command in the integrated terminal (e.g. npm install, ls, git status)',
        parameters: z.object({
          command: z.string().describe('The command to execute'),
        }),
      }),
      read_file: tool({
        description: 'Read the content of a file',
        parameters: z.object({
          path: z.string().describe('The relative path of the file to read'),
        }),
      }),
      write_file: tool({
        description: 'Write content to a file (overwrites existing)',
        parameters: z.object({
          path: z.string().describe('The relative path of the file'),
          content: z.string().describe('The file content to write'),
        }),
      }),
      list_files: tool({
        description: 'List files in a directory',
        parameters: z.object({
          path: z.string().describe('The directory path (default: .)').optional(),
        }),
      }),
    },
  });

  return result.toDataStreamResponse();
}
