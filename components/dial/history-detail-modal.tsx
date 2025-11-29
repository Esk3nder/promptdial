'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, CheckCircle2, Crown, Clock, ArrowRight } from 'lucide-react';
import type { DialResult } from '@/lib/db/schema';

interface HistoryDetailModalProps {
  item: DialResult | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUsePrompt: (prompt: string) => void;
}

function formatDate(date: Date | string | null): string {
  if (!date) return '';
  return new Date(date).toLocaleString();
}

export function HistoryDetailModal({
  item,
  open,
  onOpenChange,
  onUsePrompt,
}: HistoryDetailModalProps) {
  const [editedPrompt, setEditedPrompt] = useState('');
  const [copiedOriginal, setCopiedOriginal] = useState(false);
  const [copiedOptimized, setCopiedOptimized] = useState(false);

  // Reset edited prompt when item changes
  useState(() => {
    if (item) {
      setEditedPrompt(item.originalPrompt);
    }
  });

  const handleCopy = async (text: string, type: 'original' | 'optimized') => {
    await navigator.clipboard.writeText(text);
    if (type === 'original') {
      setCopiedOriginal(true);
      setTimeout(() => setCopiedOriginal(false), 2000);
    } else {
      setCopiedOptimized(true);
      setTimeout(() => setCopiedOptimized(false), 2000);
    }
  };

  const handleUsePrompt = () => {
    onUsePrompt(editedPrompt || item?.originalPrompt || '');
    onOpenChange(false);
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {item.title}
            {item.isDeepDial && (
              <Badge variant="outline" className="text-xs">
                <Crown className="h-3 w-3 mr-1 text-purple-600" />
                Deep Dial
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <Clock className="h-3 w-3" />
            {formatDate(item.createdAt)}
            {item.contextUrl && (
              <span className="text-xs">
                • Context: {item.contextUrl}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="original" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="original">Original Prompt</TabsTrigger>
            <TabsTrigger value="optimized">Optimized Result</TabsTrigger>
          </TabsList>

          <TabsContent value="original" className="flex-1 overflow-auto mt-4 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Your Original Prompt</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(item.originalPrompt, 'original')}
                >
                  {copiedOriginal ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <Textarea
                value={editedPrompt || item.originalPrompt}
                onChange={(e) => setEditedPrompt(e.target.value)}
                rows={8}
                className="resize-none"
                placeholder="Edit your prompt here..."
              />
              <p className="text-xs text-muted-foreground">
                You can edit this prompt before using it again
              </p>
            </div>
          </TabsContent>

          <TabsContent value="optimized" className="flex-1 overflow-auto mt-4 space-y-4">
            {item.synthesizedPrompt && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Optimized Prompt</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(item.synthesizedPrompt!, 'optimized')}
                  >
                    {copiedOptimized ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <pre className="whitespace-pre-wrap text-sm">
                    {item.synthesizedPrompt}
                  </pre>
                </div>
              </div>
            )}

            {item.finalAnswer && (
              <div className="space-y-2">
                <Label>AI Response</Label>
                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border max-h-[200px] overflow-auto">
                  <pre className="whitespace-pre-wrap text-sm">
                    {item.finalAnswer}
                  </pre>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handleUsePrompt}>
            <ArrowRight className="h-4 w-4 mr-2" />
            Use This Prompt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
