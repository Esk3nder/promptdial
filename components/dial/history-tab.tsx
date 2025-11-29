'use client';

import { useState } from 'react';
import { useDialHistory, useDeleteDialResult } from '@/hooks/useDialHistory';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  History,
  Search,
  FileText,
  Clock,
  X,
  Loader2,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import type { DialResult } from '@/lib/db/schema';

interface HistoryTabProps {
  onLoadToInput: (prompt: string) => void;
  onLoadToPromptTab: (prompt: string) => void;
}

// Format relative time
function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return then.toLocaleDateString();
}

export function HistoryTab({ onLoadToInput, onLoadToPromptTab }: HistoryTabProps) {
  const { data, isLoading, error } = useDialHistory();
  const deleteResult = useDeleteDialResult();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<DialResult | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const items = data?.data || [];

  // Filter items by search query
  const filteredItems = searchQuery
    ? items.filter(
        (item) =>
          item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.originalPrompt?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : items;

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setItemToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (itemToDelete) {
      await deleteResult.mutateAsync(itemToDelete);
      setDeleteDialogOpen(false);
      setItemToDelete(null);
      // Clear selection if deleted item was selected
      if (selectedItem?.id === itemToDelete) {
        setSelectedItem(null);
      }
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-destructive">
        Failed to load history
      </div>
    );
  }

  // Empty state
  if (items.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
        <History className="h-16 w-16 text-muted-foreground/30" />
        <h3 className="text-xl font-semibold mt-4">No History Yet</h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-md">
          Your optimization history will appear here after you optimize your first prompt.
        </p>
      </div>
    );
  }

  // Search empty state
  if (filteredItems.length === 0 && searchQuery) {
    return (
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between h-12 mb-4">
          <h3 className="text-lg font-semibold">Optimization History</h3>
          <div className="relative w-[250px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search prompts..."
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
          <Search className="h-16 w-16 text-muted-foreground/30" />
          <h3 className="text-xl font-semibold mt-4">No results found</h3>
          <p className="text-sm text-muted-foreground mt-2">
            No prompts match "{searchQuery}"
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSearchQuery('')}
            className="mt-4"
          >
            Clear search
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between h-12 mb-4">
        <h3 className="text-lg font-semibold">Optimization History</h3>
        <div className="relative w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search prompts..."
            className="pl-9"
          />
        </div>
      </div>

      {/* Split Preview (when item selected) */}
      {selectedItem && (
        <div className="h-[300px] border rounded-lg bg-muted/10 mb-4 grid grid-cols-2">
          {/* Left - Original Input */}
          <div className="flex flex-col border-r">
            <div className="h-10 px-4 bg-muted/30 border-b flex items-center">
              <span className="text-sm font-medium text-muted-foreground">
                ORIGINAL INPUT
              </span>
            </div>
            <ScrollArea className="flex-1 p-4">
              <pre className="whitespace-pre-wrap text-sm font-mono">
                {selectedItem.originalPrompt}
              </pre>
            </ScrollArea>
            <div className="h-12 px-4 border-t flex items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onLoadToInput(selectedItem.originalPrompt);
                  setSelectedItem(null);
                }}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Load to Input
              </Button>
            </div>
          </div>

          {/* Right - Optimized Output */}
          <div className="flex flex-col">
            <div className="h-10 px-4 bg-muted/30 border-b flex items-center">
              <span className="text-sm font-medium text-muted-foreground">
                OPTIMIZED OUTPUT
              </span>
            </div>
            <ScrollArea className="flex-1 p-4">
              <pre className="whitespace-pre-wrap text-sm font-mono">
                {selectedItem.synthesizedPrompt || 'No optimized prompt available'}
              </pre>
            </ScrollArea>
            <div className="h-12 px-4 border-t flex items-center justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (selectedItem.synthesizedPrompt) {
                    onLoadToPromptTab(selectedItem.synthesizedPrompt);
                  }
                  setSelectedItem(null);
                }}
                disabled={!selectedItem.synthesizedPrompt}
              >
                Load to Prompt
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* History List */}
      <ScrollArea className="flex-1">
        <div className="space-y-1">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedItem(item)}
              className={`
                group relative h-14 px-4 flex items-center cursor-pointer border-b
                hover:bg-muted/50 transition-colors
                ${selectedItem?.id === item.id ? 'bg-muted border-l-2 border-l-primary' : ''}
              `}
            >
              <FileText className="h-4 w-4 text-muted-foreground mr-3 flex-shrink-0" />
              <span className="flex-1 text-sm truncate">
                {item.title || item.originalPrompt?.substring(0, 50) + '...'}
              </span>
              <span className="text-xs text-muted-foreground mx-4 flex items-center gap-1 flex-shrink-0">
                <Clock className="h-3 w-3" />
                {formatRelativeTime(item.createdAt!)}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                onClick={(e) => handleDelete(e, item.id)}
              >
                <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this optimization?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this item from your history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteResult.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
