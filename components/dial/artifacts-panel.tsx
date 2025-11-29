'use client';

import { useState } from 'react';
import { useArtifacts, useDeleteArtifact } from '@/hooks/useArtifacts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Sparkles, Plus, Trash2, Edit, Loader2, AtSign } from 'lucide-react';
import { ArtifactEditor } from './artifact-editor';
import type { Artifact } from '@/lib/db/schema';

interface ArtifactsPanelProps {
  onInsertArtifact?: (handle: string) => void;
}

export function ArtifactsPanel({ onInsertArtifact }: ArtifactsPanelProps) {
  const { data, isLoading, error } = useArtifacts();
  const deleteArtifact = useDeleteArtifact();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingArtifact, setEditingArtifact] = useState<Artifact | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [artifactToDelete, setArtifactToDelete] = useState<string | null>(null);

  const handleEdit = (artifact: Artifact) => {
    setEditingArtifact(artifact);
    setEditorOpen(true);
  };

  const handleCreate = () => {
    setEditingArtifact(null);
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

  const handleInsert = (handle: string) => {
    if (onInsertArtifact) {
      onInsertArtifact(handle);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Artifacts
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Artifacts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-500">Failed to load artifacts</p>
        </CardContent>
      </Card>
    );
  }

  const artifacts = data?.data || [];

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Artifacts
              {artifacts.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {artifacts.length}
                </Badge>
              )}
            </CardTitle>
            <Button size="sm" variant="outline" onClick={handleCreate}>
              <Plus className="h-3 w-3 mr-1" />
              New
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {artifacts.length === 0 ? (
            <div className="px-4 pb-4 text-center">
              <p className="text-sm text-muted-foreground mb-3">
                Create artifacts to inject context into your prompts using @mentions.
              </p>
              <Button size="sm" onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Artifact
              </Button>
            </div>
          ) : (
            <ScrollArea className="h-[200px]">
              <div className="space-y-1 p-2">
                {artifacts.map((artifact) => (
                  <div
                    key={artifact.id}
                    className="group relative p-3 rounded-md hover:bg-accent transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => handleInsert(artifact.handle)}
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs font-mono">
                            <AtSign className="h-3 w-3 mr-0.5" />
                            {artifact.handle}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium mt-1">
                          {artifact.displayName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {artifact.content.substring(0, 50)}...
                        </p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleEdit(artifact)}
                        >
                          <Edit className="h-3 w-3 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => handleDelete(e, artifact.id)}
                        >
                          <Trash2 className="h-3 w-3 text-muted-foreground hover:text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <ArtifactEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        artifact={editingArtifact}
      />

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
              className="bg-red-500 hover:bg-red-600"
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
    </>
  );
}
