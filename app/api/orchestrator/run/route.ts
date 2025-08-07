import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { Orchestrator } from '@/lib/orchestrator/orchestrator';
import { db } from '@/lib/db';
import { orchestrationRuns } from '@/lib/db/orchestration-schema';
import { eq } from 'drizzle-orm';
import { headers } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { userGoal, runId, config } = body;

    if (!userGoal) {
      return NextResponse.json(
        { error: 'userGoal is required' },
        { status: 400 }
      );
    }

    // Initialize orchestrator with custom config if provided
    const orchestrator = new Orchestrator(config);

    // Run orchestration
    const response = await orchestrator.orchestrate(
      userGoal,
      session.user.id,
      runId
    );

    // Track usage for billing
    if (response.ok && response.state) {
      const tokensUsed = response.events
        .filter(e => e.data?.tokensUsed)
        .reduce((sum, e) => sum + (e.data.tokensUsed || 0), 0);

      // Deduct credits (1 credit per 100 tokens, for example)
      const creditsUsed = Math.ceil(tokensUsed / 100);
      
      // TODO: Integrate with Autumn billing to deduct credits
      // await deductCredits(session.user.id, creditsUsed);
    }

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Orchestration error:', error);
    return NextResponse.json(
      { 
        error: 'Orchestration failed',
        message: error.message 
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    // Authenticate user
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const runId = searchParams.get('runId');

    if (!runId) {
      // List all runs for user
      const runs = await db
        .select()
        .from(orchestrationRuns)
        .where(eq(orchestrationRuns.userId, session.user.id))
        .orderBy(orchestrationRuns.createdAt)
        .limit(20);

      return NextResponse.json({ runs });
    }

    // Get specific run
    const [run] = await db
      .select()
      .from(orchestrationRuns)
      .where(eq(orchestrationRuns.id, runId))
      .limit(1);

    if (!run) {
      return NextResponse.json(
        { error: 'Run not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (run.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    return NextResponse.json({ run });

  } catch (error: any) {
    console.error('Get orchestration error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch orchestration',
        message: error.message 
      },
      { status: 500 }
    );
  }
}