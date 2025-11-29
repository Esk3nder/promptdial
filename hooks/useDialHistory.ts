import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/lib/auth-client';
import type { DialResult } from '@/lib/db/schema';

interface DialHistoryResponse {
  data: DialResult[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
}

export function useDialHistory(limit = 50, offset = 0) {
  const { data: session } = useSession();

  return useQuery<DialHistoryResponse>({
    queryKey: ['dialHistory', session?.user?.id, limit, offset],
    queryFn: async () => {
      const res = await fetch(`/api/dial/history?limit=${limit}&offset=${offset}`);
      if (!res.ok) {
        throw new Error('Failed to fetch dial history');
      }
      return res.json();
    },
    enabled: !!session?.user?.id,
  });
}

export function useDialResult(id: string | null) {
  const { data: session } = useSession();

  return useQuery<DialResult>({
    queryKey: ['dialResult', id],
    queryFn: async () => {
      const res = await fetch(`/api/dial/history/${id}`);
      if (!res.ok) {
        throw new Error('Failed to fetch dial result');
      }
      return res.json();
    },
    enabled: !!session?.user?.id && !!id,
  });
}

export function useDeleteDialResult() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/dial/history/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete dial result');
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dialHistory', session?.user?.id] });
    },
  });
}
