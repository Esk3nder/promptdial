import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { dialResults } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { headers } from 'next/headers';

// Prevent static generation - API routes should be dynamic
export const dynamic = 'force-dynamic';

// GET endpoint to fetch a single dial result
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const result = await db.query.dialResults.findFirst({
      where: and(
        eq(dialResults.id, id),
        eq(dialResults.userId, session.user.id)
      ),
    });

    if (!result) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Dial history GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dial result', message: error.message },
      { status: 500 }
    );
  }
}

// DELETE endpoint to delete a dial result
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership before deleting
    const existing = await db.query.dialResults.findFirst({
      where: and(
        eq(dialResults.id, id),
        eq(dialResults.userId, session.user.id)
      ),
    });

    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await db.delete(dialResults).where(
      and(
        eq(dialResults.id, id),
        eq(dialResults.userId, session.user.id)
      )
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Dial history DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete dial result', message: error.message },
      { status: 500 }
    );
  }
}
