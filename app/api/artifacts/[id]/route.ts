import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { artifacts } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { headers } from 'next/headers';

// Prevent static generation - API routes should be dynamic
export const dynamic = 'force-dynamic';

// GET endpoint to fetch a single artifact
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

    const artifact = await db.query.artifacts.findFirst({
      where: and(
        eq(artifacts.id, id),
        eq(artifacts.userId, session.user.id)
      ),
    });

    if (!artifact) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(artifact);
  } catch (error: any) {
    console.error('Artifact GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch artifact', message: error.message },
      { status: 500 }
    );
  }
}

// PUT endpoint to update an artifact
export async function PUT(
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
    const body = await request.json();
    const { displayName, content } = body;

    // Verify ownership
    const existing = await db.query.artifacts.findFirst({
      where: and(
        eq(artifacts.id, id),
        eq(artifacts.userId, session.user.id)
      ),
    });

    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Update the artifact (handle cannot be changed)
    const [updated] = await db.update(artifacts)
      .set({
        displayName: displayName?.trim() || existing.displayName,
        content: content?.trim() || existing.content,
        updatedAt: new Date(),
      })
      .where(and(
        eq(artifacts.id, id),
        eq(artifacts.userId, session.user.id)
      ))
      .returning();

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Artifact PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update artifact', message: error.message },
      { status: 500 }
    );
  }
}

// DELETE endpoint to delete an artifact
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

    // Verify ownership
    const existing = await db.query.artifacts.findFirst({
      where: and(
        eq(artifacts.id, id),
        eq(artifacts.userId, session.user.id)
      ),
    });

    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await db.delete(artifacts).where(
      and(
        eq(artifacts.id, id),
        eq(artifacts.userId, session.user.id)
      )
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Artifact DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete artifact', message: error.message },
      { status: 500 }
    );
  }
}
