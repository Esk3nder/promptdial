'use client';

import { useState } from 'react';
import { useArtifacts, useDeleteArtifact } from '@/hooks/useArtifacts';
import { Button } from '@/components/ui/button';
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
  AtSign,
  Plus,
  Pencil,
  Trash2,
  Loader2,
} from 'lucide-react';
import { ArtifactEditor } from './artifact-editor';
import type { Artifact } from '@/lib/db/schema';

interface ArtifactsTabProps {
  onInsertArtifact: (handle: string) => void;
}

export function ArtifactsTab({ onInsertArtifact }: ArtifactsTabProps) {
  const { data: artifacts = [], isLoading, error } = useArtifacts();
  const deleteArtifact = useDeleteArtifact();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingArtifact, setEditingArtifact] = useState<Artifact | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [artifactToDelete, setArtifactToDelete] = useState<string | null>(null);

  const handleCreate = () => {
    setEditingArtifact(null);
    setEditorOpen(true);
  };

  const handleEdit = (artifact: Artifact) => {
    setEditingArtifact(artifact);
    setEditorOpen(true);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setArtifactToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (artifactToDelete) {
      await deleteArtifact.mutateAsync(artifactToDelete);
      setDeleteDialogOpen(false);
      setArtifactToDelete(null);
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
        Failed to load artifacts
      </div>
    );
  }

  // Empty state
  if (artifacts.length === 0) {
    return (
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between h-12 mb-6">
          <h3 className="text-lg font-semibold">Your Profiles</h3>
          <Button size="sm" onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-1" />
            New
          </Button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
          <AtSign className="h-16 w-16 text-muted-foreground/30" />
          <h3 className="text-xl font-semibold mt-4">No Artifacts Yet</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-md">
            Create context profiles to inject into your prompts using @mentions.
          </p>
          <ul className="text-sm text-muted-foreground mt-6 space-y-2 text-left">
            <li>• @company - Your company details</li>
            <li>• @audience - Target audience info</li>
            <li>• @competitor - Competitor analysis</li>
          </ul>
          <Button onClick={handleCreate} className="mt-6">
            <Plus className="h-4 w-4 mr-2" />
            Create First Artifact
          </Button>
        </div>

        <ArtifactEditor
          open={editorOpen}
          onOpenChange={setEditorOpen}
          artifact={editingArtifact}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between h-12 mb-6">
        <h3 className="text-lg font-semibold">Your Profiles</h3>
        <Button size="sm" onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-1" />
          New
        </Button>
      </div>

      {/* Artifacts Grid */}
      <ScrollArea className="flex-1">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
          {artifacts.map((artifact) => (
            <div
              key={artifact.id}
              className="min-h-[180px] p-4 border rounded-lg bg-background hover:border-primary/50 transition-colors flex flex-col"
            >
              {/* Handle */}
              <div className="font-mono text-sm font-medium text-primary flex items-center">
                <AtSign className="h-4 w-4 mr-0.5" />
                {artifact.handle}
              </div>

              {/* Display Name */}
              <p className="text-base font-medium mt-1 truncate">
                {artifact.displayName}
              </p>

              {/* Content Preview */}
              <p className="text-sm text-muted-foreground mt-3 line-clamp-3 flex-1">
                "{artifact.content.substring(0, 100)}{artifact.content.length > 100 ? '...' : ''}"
              </p>

              {/* Actions */}
              <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onInsertArtifact(artifact.handle)}
                >
                  <AtSign className="h-4 w-4 mr-1" />
                  Insert @
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleEdit(artifact)}
                >
                  <Pencil className="h-4 w-4 text-muted-foreground" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => handleDelete(e, artifact.id)}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                </Button>
              </div>
            </div>
          ))}

          {/* Add New Card */}
          <div
            onClick={handleCreate}
            className="min-h-[180px] p-4 border-2 border-dashed rounded-lg bg-muted/20 hover:bg-muted/40 hover:border-primary/30 transition-colors cursor-pointer flex flex-col items-center justify-center"
          >
            <Plus className="h-8 w-8 text-muted-foreground" />
            <p className="font-medium mt-2">Add New</p>
            <p className="text-sm text-muted-foreground text-center mt-1">
              Click to create a new context profile
            </p>
          </div>
        </div>
      </ScrollArea>

      {/* Artifact Editor Modal */}
      <ArtifactEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        artifact={editingArtifact}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this artifact?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this artifact. Any prompts using this @mention will no longer resolve.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteArtifact.isPending ? (
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
