import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { prompt, language = 'typescript', model = 'gpt-4o', context } = body;

    const contextStr = context ? `\n\nContext:\n${JSON.stringify(context, null, 2)}` : '';

    const { text } = await generateText({
      model: openai('gpt-4o'),
      system: `You are an expert AI software developer. 
Your task is to generate code based on the human prompter's request. 
The requested language is ${language}.
Provide ONLY the raw code or result in your response. DO NOT wrap it in Markdown formatting blocks like \`\`\` unless specifically requested. Do not include explanatory text before or after the code.`,
      prompt: prompt + contextStr,
    });

    return Response.json({ code: text });
  } catch (error) {
    console.error('Error generating code:', error);
    return Response.json({ error: 'Code generation failed' }, { status: 500 });
  }
}
