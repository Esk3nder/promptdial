import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/lib/auth-client';
import type { Artifact } from '@/lib/db/schema';

interface ArtifactsResponse {
  data: Artifact[];
}

interface CreateArtifactInput {
  handle: string;
  displayName: string;
  content: string;
}

interface UpdateArtifactInput {
  id: string;
  displayName?: string;
  content?: string;
}

interface ResolveArtifactsResponse {
  resolvedPrompt: string;
  artifactsUsed: { handle: string; displayName: string }[];
  invalidMentions: string[];
}

export function useArtifacts() {
  const { data: session } = useSession();

  return useQuery<ArtifactsResponse>({
    queryKey: ['artifacts', session?.user?.id],
    queryFn: async () => {
      const res = await fetch('/api/artifacts');
      if (!res.ok) {
        throw new Error('Failed to fetch artifacts');
      }
      return res.json();
    },
    enabled: !!session?.user?.id,
  });
}

export function useArtifact(id: string | null) {
  const { data: session } = useSession();

  return useQuery<Artifact>({
    queryKey: ['artifact', id],
    queryFn: async () => {
      const res = await fetch(`/api/artifacts/${id}`);
      if (!res.ok) {
        throw new Error('Failed to fetch artifact');
      }
      return res.json();
    },
    enabled: !!session?.user?.id && !!id,
  });
}

export function useCreateArtifact() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  return useMutation({
    mutationFn: async (input: CreateArtifactInput) => {
      const res = await fetch('/api/artifacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create artifact');
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artifacts', session?.user?.id] });
    },
  });
}

export function useUpdateArtifact() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateArtifactInput) => {
      const res = await fetch(`/api/artifacts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update artifact');
      }

      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['artifacts', session?.user?.id] });
      queryClient.invalidateQueries({ queryKey: ['artifact', variables.id] });
    },
  });
}

export function useDeleteArtifact() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/artifacts/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete artifact');
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artifacts', session?.user?.id] });
    },
  });
}

export function useResolveArtifacts() {
  return useMutation<ResolveArtifactsResponse, Error, string>({
    mutationFn: async (prompt: string) => {
      const res = await fetch('/api/artifacts/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      if (!res.ok) {
        throw new Error('Failed to resolve artifacts');
      }

      return res.json();
    },
  });
}
