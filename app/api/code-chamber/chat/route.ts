import { openai } from '@ai-sdk/openai';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';

export const maxDuration = 30;

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { messages } = await req.json();

  const result = streamText({
    model: openai('gpt-4o'),
    messages,
    system: 'You are an advanced AI coding agent in a cloud IDE. You can edit files and run terminal commands. ALWAYS use the provided tools to perform actions. When asked to "fix" or "edit", verify the file content first, then write the changes.',
    tools: {
      run_terminal_command: {
        description: 'Execute a command in the integrated terminal (e.g. npm install, ls, git status)',
        parameters: z.object({
          command: z.string().describe('The command to execute'),
        }) as any,
      } as any,
      read_file: {
        description: 'Read the content of a file',
        parameters: z.object({
          path: z.string().describe('The relative path of the file to read'),
        }) as any,
      } as any,
      write_file: {
        description: 'Write content to a file (overwrites existing)',
        parameters: z.object({
          path: z.string().describe('The relative path of the file'),
          content: z.string().describe('The file content to write'),
        }) as any,
      } as any,
      list_files: {
        description: 'List files in a directory',
        parameters: z.object({
          path: z.string().describe('The directory path (default: .)').optional(),
        }) as any,
      } as any,
    },
  });

  return result.toTextStreamResponse();
}
