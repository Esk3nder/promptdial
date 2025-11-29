import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { artifacts } from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { headers } from 'next/headers';

// Prevent static generation - API routes should be dynamic
export const dynamic = 'force-dynamic';

// Extract all @handles from a prompt
function extractHandles(prompt: string): string[] {
  const pattern = /@([a-z][a-z0-9-]{1,29})/g;
  const matches = prompt.match(pattern);
  if (!matches) return [];

  // Remove @ prefix and deduplicate
  return [...new Set(matches.map(m => m.substring(1)))];
}

// POST endpoint to resolve @handles in a prompt
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { prompt } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'prompt is required and must be a string' },
        { status: 400 }
      );
    }

    // Extract handles from prompt
    const handles = extractHandles(prompt);

    if (handles.length === 0) {
      // No handles to resolve
      return NextResponse.json({
        resolvedPrompt: prompt,
        artifactsUsed: [],
        invalidMentions: [],
      });
    }

    // Fetch all matching artifacts for this user
    const userArtifacts = await db.query.artifacts.findMany({
      where: and(
        eq(artifacts.userId, session.user.id),
        inArray(artifacts.handle, handles)
      ),
    });

    // Create a map for quick lookup
    const artifactMap = new Map(
      userArtifacts.map(a => [a.handle, a])
    );

    // Track which handles were found and which weren't
    const artifactsUsed: { handle: string; displayName: string }[] = [];
    const invalidMentions: string[] = [];

    // Replace @handles with artifact content
    let resolvedPrompt = prompt;

    for (const handle of handles) {
      const artifact = artifactMap.get(handle);
      if (artifact) {
        // Replace @handle with the artifact content
        // Use a regex to ensure we replace the exact @handle
        const regex = new RegExp(`@${handle}\\b`, 'g');
        resolvedPrompt = resolvedPrompt.replace(
          regex,
          `[${artifact.displayName}]: ${artifact.content}`
        );
        artifactsUsed.push({
          handle: artifact.handle,
          displayName: artifact.displayName,
        });
      } else {
        invalidMentions.push(handle);
      }
    }

    return NextResponse.json({
      resolvedPrompt,
      artifactsUsed,
      invalidMentions,
    });
  } catch (error: any) {
    console.error('Artifacts resolve error:', error);
    return NextResponse.json(
      { error: 'Failed to resolve artifacts', message: error.message },
      { status: 500 }
    );
  }
}
