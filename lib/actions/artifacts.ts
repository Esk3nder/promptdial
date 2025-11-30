'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { artifacts } from '@/lib/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';

// Validate artifact handle format
function isValidHandle(handle: string): boolean {
  const pattern = /^[a-z][a-z0-9-]{1,29}$/;
  return pattern.test(handle);
}

async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}

export async function getArtifacts() {
  const session = await getSession();

  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const results = await db.query.artifacts.findMany({
    where: eq(artifacts.userId, session.user.id),
    orderBy: [desc(artifacts.updatedAt)],
  });

  return results;
}

export async function getArtifact(id: string) {
  const session = await getSession();

  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const artifact = await db.query.artifacts.findFirst({
    where: and(
      eq(artifacts.id, id),
      eq(artifacts.userId, session.user.id)
    ),
  });

  if (!artifact) {
    throw new Error('Artifact not found');
  }

  return artifact;
}

export async function createArtifact(input: {
  handle: string;
  displayName: string;
  content: string;
}) {
  const session = await getSession();

  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const { handle, displayName, content } = input;

  // Validate required fields
  if (!handle || !displayName || !content) {
    throw new Error('handle, displayName, and content are required');
  }

  // Validate handle format
  const normalizedHandle = handle.toLowerCase().trim();
  if (!isValidHandle(normalizedHandle)) {
    throw new Error('Handle must be 2-30 characters, lowercase, start with a letter, and contain only letters, numbers, and hyphens');
  }

  // Check if handle already exists for this user
  const existing = await db.query.artifacts.findFirst({
    where: and(
      eq(artifacts.handle, normalizedHandle),
      eq(artifacts.userId, session.user.id)
    ),
  });

  if (existing) {
    throw new Error('An artifact with this handle already exists');
  }

  // Create the artifact
  const [newArtifact] = await db.insert(artifacts).values({
    userId: session.user.id,
    handle: normalizedHandle,
    displayName: displayName.trim(),
    content: content.trim(),
  }).returning();

  revalidatePath('/dial');
  return newArtifact;
}

export async function updateArtifact(input: {
  id: string;
  displayName?: string;
  content?: string;
}) {
  const session = await getSession();

  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const { id, displayName, content } = input;

  // Verify ownership
  const existing = await db.query.artifacts.findFirst({
    where: and(
      eq(artifacts.id, id),
      eq(artifacts.userId, session.user.id)
    ),
  });

  if (!existing) {
    throw new Error('Artifact not found');
  }

  // Build update object
  const updateData: Record<string, string> = {};
  if (displayName !== undefined) updateData.displayName = displayName.trim();
  if (content !== undefined) updateData.content = content.trim();

  if (Object.keys(updateData).length === 0) {
    throw new Error('No fields to update');
  }

  const [updated] = await db
    .update(artifacts)
    .set(updateData)
    .where(eq(artifacts.id, id))
    .returning();

  revalidatePath('/dial');
  return updated;
}

export async function deleteArtifact(id: string) {
  const session = await getSession();

  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  // Verify ownership
  const existing = await db.query.artifacts.findFirst({
    where: and(
      eq(artifacts.id, id),
      eq(artifacts.userId, session.user.id)
    ),
  });

  if (!existing) {
    throw new Error('Artifact not found');
  }

  await db.delete(artifacts).where(eq(artifacts.id, id));

  revalidatePath('/dial');
  return { success: true };
}

export async function resolveArtifacts(prompt: string) {
  const session = await getSession();

  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  // Find all @mentions in the prompt
  const mentionPattern = /@([a-z][a-z0-9-]{0,29})/gi;
  const mentions = [...prompt.matchAll(mentionPattern)];

  if (mentions.length === 0) {
    return {
      resolvedPrompt: prompt,
      artifactsUsed: [],
      invalidMentions: [],
    };
  }

  // Get unique handles
  const uniqueHandles = [...new Set(mentions.map(m => m[1].toLowerCase()))];

  // Fetch all artifacts for this user that match the handles
  const userArtifacts = await db.query.artifacts.findMany({
    where: eq(artifacts.userId, session.user.id),
  });

  const artifactMap = new Map(userArtifacts.map(a => [a.handle, a]));

  // Build resolved prompt
  let resolvedPrompt = prompt;
  const artifactsUsed: { handle: string; displayName: string }[] = [];
  const invalidMentions: string[] = [];

  for (const handle of uniqueHandles) {
    const artifact = artifactMap.get(handle);
    if (artifact) {
      // Replace all occurrences of @handle with the artifact content
      const regex = new RegExp(`@${handle}\\b`, 'gi');
      resolvedPrompt = resolvedPrompt.replace(regex, `[${artifact.displayName}]: ${artifact.content}`);
      artifactsUsed.push({ handle: artifact.handle, displayName: artifact.displayName });
    } else {
      invalidMentions.push(handle);
    }
  }

  return {
    resolvedPrompt,
    artifactsUsed,
    invalidMentions,
  };
}
