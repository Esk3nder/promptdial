import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/lib/auth-client';
import type { Artifact } from '@/lib/db/schema';
import {
  getArtifacts,
  getArtifact,
  createArtifact,
  updateArtifact,
  deleteArtifact,
  resolveArtifacts,
} from '@/lib/actions/artifacts';

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

  return useQuery<Artifact[]>({
    queryKey: ['artifacts', session?.user?.id],
    queryFn: async () => {
      return getArtifacts();
    },
    enabled: !!session?.user?.id,
  });
}

export function useArtifact(id: string | null) {
  const { data: session } = useSession();

  return useQuery<Artifact>({
    queryKey: ['artifact', id],
    queryFn: async () => {
      if (!id) throw new Error('No artifact ID');
      return getArtifact(id);
    },
    enabled: !!session?.user?.id && !!id,
  });
}

export function useCreateArtifact() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  return useMutation({
    mutationFn: async (input: CreateArtifactInput) => {
      return createArtifact(input);
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
      return updateArtifact({ id, ...data });
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
      return deleteArtifact(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artifacts', session?.user?.id] });
    },
  });
}

export function useResolveArtifacts() {
  return useMutation<ResolveArtifactsResponse, Error, string>({
    mutationFn: async (prompt: string) => {
      return resolveArtifacts(prompt);
    },
  });
}
