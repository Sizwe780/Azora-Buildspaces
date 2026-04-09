import { openai, createOpenAI } from '@ai-sdk/openai';
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

  const isCitadels = process.env.CODE_CHAMBER_PROVIDER === 'citadels';
  const citadelsUrl = process.env.CITADELSG_ENDPOINT || process.env.CITADELSM_ENDPOINT;
  const customProvider = isCitadels && citadelsUrl
    ? createOpenAI({ baseURL: citadelsUrl, apiKey: process.env.OPENAI_API_KEY || 'fake-key' })
    : openai;

  const result = streamText({
    model: customProvider(process.env.OPENAI_MODEL || 'gpt-4o'),
    messages,
    system: 'You are an advanced AI coding agent in a cloud IDE. You can edit files and run terminal commands. ALWAYS use the provided tools to perform actions. When asked to "fix" or "edit", verify the file content first, then write the changes.',
    tools: {
      run_terminal_command: tool({
        description: 'Execute a command in the integrated terminal (e.g. npm install, ls, git status)',
        parameters: z.object({
          command: z.string().describe('The command to execute'),
        }),
      } as any),
      read_file: tool({
        description: 'Read the content of a file',
        parameters: z.object({
          path: z.string().describe('The relative path of the file to read'),
        }),
      } as any),
      write_file: tool({
        description: 'Write content to a file (overwrites existing)',
        parameters: z.object({
          path: z.string().describe('The relative path of the file'),
          content: z.string().describe('The file content to write'),
        }),
      } as any),
      list_files: tool({
        description: 'List files in a directory',
        parameters: z.object({
          path: z.string().describe('The directory path (default: .)'),
        }),
      } as any),
    },
  });

  return result.toTextStreamResponse();
}
