import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { executionEnvironmentService } from '@/lib/services/execution-environment';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type, config } = await request.json();

    if (!type || !config) {
      return NextResponse.json(
        { error: 'Missing environment type or config' },
        { status: 400 }
      );
    }

    const environment = await executionEnvironmentService.createEnvironment(
      type,
      config,
      session.user.id
    );

    return NextResponse.json(environment, { status: 201 });
  } catch (error: any) {
    console.error('Error creating execution environment:', error);
    return NextResponse.json(
      { error: 'Failed to create environment', details: error.message },
      { status: 500 }
    );
  }
}
