'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Loader2,
  Sparkles,
  Copy,
  Check,
  Save,
  Play,
} from 'lucide-react';

interface PromptTabProps {
  // Content
  optimizedPrompt: string;
  onPromptChange: (value: string) => void;

  // Actions
  onRun: () => void;
  onSave: () => void;

  // States
  isOptimizing: boolean;
  isRunning: boolean;
  hasUnsavedChanges: boolean;
  isSaved: boolean;

  // Empty state
  isEmpty: boolean;
}

export function PromptTab({
  optimizedPrompt,
  onPromptChange,
  onRun,
  onSave,
  isOptimizing,
  isRunning,
  hasUnsavedChanges,
  isSaved,
  isEmpty,
}: PromptTabProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(optimizedPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Loading state
  if (isOptimizing) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-lg font-medium mt-4">Optimizing your prompt...</p>
        <p className="text-sm text-muted-foreground mt-2">
          This usually takes 5-10 seconds
        </p>
      </div>
    );
  }

  // Empty state
  if (isEmpty) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
        <Sparkles className="h-16 w-16 text-muted-foreground/30" />
        <h3 className="text-xl font-semibold mt-4">Ready to Optimize</h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-md">
          Enter your prompt in the left panel and click "Optimize" to transform it into an academically rigorous, optimized version.
        </p>
        <ul className="text-sm text-muted-foreground mt-6 space-y-2">
          <li>• Clearer structure</li>
          <li>• Better context</li>
          <li>• Improved specificity</li>
        </ul>
      </div>
    );
  }

  // Content state
  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between h-12 mb-4">
        {/* Status indicator */}
        <div className="text-sm">
          {hasUnsavedChanges && (
            <span className="text-yellow-600 flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-yellow-600 animate-pulse" />
              Unsaved
            </span>
          )}
          {isSaved && !hasUnsavedChanges && (
            <span className="text-muted-foreground flex items-center gap-1">
              <Check className="h-4 w-4" />
              Saved
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            disabled={!optimizedPrompt}
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onSave}
            disabled={!hasUnsavedChanges || !optimizedPrompt}
          >
            <Save className="h-4 w-4" />
          </Button>

          <Button
            size="sm"
            onClick={onRun}
            disabled={isRunning || !optimizedPrompt.trim()}
            className="bg-green-600 hover:bg-green-700"
          >
            {isRunning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Play className="h-4 w-4 mr-1" />
                Run
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Editable Prompt */}
      <Textarea
        value={optimizedPrompt}
        onChange={(e) => onPromptChange(e.target.value)}
        className="flex-1 min-h-[300px] font-mono text-sm leading-relaxed p-4 border rounded-lg bg-muted/20 resize-none"
        placeholder="Your optimized prompt will appear here after optimization.

Click 'Optimize Prompt' in the left panel to get started."
      />
    </div>
  );
}
