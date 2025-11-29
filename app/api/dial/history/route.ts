import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { dialResults } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { headers } from 'next/headers';

// Prevent static generation - API routes should be dynamic
export const dynamic = 'force-dynamic';

// GET endpoint to fetch dial history
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get dial results for the user
    const results = await db.query.dialResults.findMany({
      where: eq(dialResults.userId, session.user.id),
      orderBy: [desc(dialResults.createdAt)],
      limit: Math.min(limit, 100), // Cap at 100
      offset,
    });

    // Get total count for pagination
    const allResults = await db.query.dialResults.findMany({
      where: eq(dialResults.userId, session.user.id),
      columns: { id: true },
    });
    const total = allResults.length;

    return NextResponse.json({
      data: results,
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + results.length < total,
      },
    });
  } catch (error: any) {
    console.error('Dial history GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dial history', message: error.message },
      { status: 500 }
    );
  }
}
