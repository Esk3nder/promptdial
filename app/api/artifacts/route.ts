import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { artifacts } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { headers } from 'next/headers';

// Prevent static generation - API routes should be dynamic
export const dynamic = 'force-dynamic';

// Validate artifact handle format
function isValidHandle(handle: string): boolean {
  // Must be lowercase, alphanumeric with hyphens, start with letter, 2-30 chars
  const pattern = /^[a-z][a-z0-9-]{1,29}$/;
  return pattern.test(handle);
}

// GET endpoint to fetch all artifacts for the user
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results = await db.query.artifacts.findMany({
      where: eq(artifacts.userId, session.user.id),
      orderBy: [desc(artifacts.updatedAt)],
    });

    return NextResponse.json({ data: results });
  } catch (error: any) {
    console.error('Artifacts GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch artifacts', message: error.message },
      { status: 500 }
    );
  }
}

// POST endpoint to create a new artifact
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { handle, displayName, content } = body;

    // Validate required fields
    if (!handle || !displayName || !content) {
      return NextResponse.json(
        { error: 'handle, displayName, and content are required' },
        { status: 400 }
      );
    }

    // Validate handle format
    const normalizedHandle = handle.toLowerCase().trim();
    if (!isValidHandle(normalizedHandle)) {
      return NextResponse.json(
        { error: 'Handle must be 2-30 characters, lowercase, start with a letter, and contain only letters, numbers, and hyphens' },
        { status: 400 }
      );
    }

    // Check if handle already exists for this user
    const existing = await db.query.artifacts.findFirst({
      where: eq(artifacts.handle, normalizedHandle),
    });

    if (existing && existing.userId === session.user.id) {
      return NextResponse.json(
        { error: 'An artifact with this handle already exists' },
        { status: 409 }
      );
    }

    // Create the artifact
    const [newArtifact] = await db.insert(artifacts).values({
      userId: session.user.id,
      handle: normalizedHandle,
      displayName: displayName.trim(),
      content: content.trim(),
    }).returning();

    return NextResponse.json(newArtifact, { status: 201 });
  } catch (error: any) {
    console.error('Artifacts POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create artifact', message: error.message },
      { status: 500 }
    );
  }
}
