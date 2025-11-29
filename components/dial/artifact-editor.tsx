'use client';

import { useState, useEffect } from 'react';
import { useCreateArtifact, useUpdateArtifact } from '@/hooks/useArtifacts';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AtSign, AlertCircle } from 'lucide-react';
import type { Artifact } from '@/lib/db/schema';

interface ArtifactEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  artifact: Artifact | null; // null for create, artifact for edit
}

export function ArtifactEditor({ open, onOpenChange, artifact }: ArtifactEditorProps) {
  const [handle, setHandle] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState('');

  const createArtifact = useCreateArtifact();
  const updateArtifact = useUpdateArtifact();

  const isEditing = !!artifact;

  // Reset form when dialog opens/closes or artifact changes
  useEffect(() => {
    if (open) {
      if (artifact) {
        setHandle(artifact.handle);
        setDisplayName(artifact.displayName);
        setContent(artifact.content);
      } else {
        setHandle('');
        setDisplayName('');
        setContent('');
      }
      setError('');
    }
  }, [open, artifact]);

  // Auto-generate handle from displayName
  const handleDisplayNameChange = (value: string) => {
    setDisplayName(value);
    if (!isEditing && !handle) {
      // Auto-generate handle from display name
      const autoHandle = value
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 30);
      setHandle(autoHandle);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!handle.trim()) {
      setError('Handle is required');
      return;
    }
    if (!displayName.trim()) {
      setError('Display name is required');
      return;
    }
    if (!content.trim()) {
      setError('Content is required');
      return;
    }

    try {
      if (isEditing) {
        await updateArtifact.mutateAsync({
          id: artifact.id,
          displayName: displayName.trim(),
          content: content.trim(),
        });
      } else {
        await createArtifact.mutateAsync({
          handle: handle.trim().toLowerCase(),
          displayName: displayName.trim(),
          content: content.trim(),
        });
      }
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save artifact');
    }
  };

  const isPending = createArtifact.isPending || updateArtifact.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Artifact' : 'Create Artifact'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update your artifact profile.'
              : 'Create a reusable context profile that you can inject into prompts using @mentions.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => handleDisplayNameChange(e.target.value)}
              placeholder="e.g., Mom, Acme Corp, Q4 Report"
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="handle" className="flex items-center gap-2">
              <AtSign className="h-4 w-4" />
              Handle
            </Label>
            <Input
              id="handle"
              value={handle}
              onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              placeholder="e.g., mom, acme-corp, q4-report"
              disabled={isPending || isEditing}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              {isEditing
                ? 'Handle cannot be changed after creation'
                : 'Lowercase letters, numbers, and hyphens only. Use this in prompts as @' + (handle || 'handle')}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Profile Content</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={`Describe the artifact in detail. For example:

My mother Sarah, 65 years old, retired school teacher.
She prefers warm but clear communication.
Enjoys gardening and reading mystery novels.
Lives in Portland, Oregon.`}
              rows={8}
              disabled={isPending}
            />
            <p className="text-xs text-muted-foreground">
              This content will be injected into your prompts when you use @{handle || 'handle'}
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : isEditing ? (
                'Update Artifact'
              ) : (
                'Create Artifact'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
