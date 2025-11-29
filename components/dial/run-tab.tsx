'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Loader2,
  Play,
  Copy,
  Check,
  AlertCircle,
  Zap,
  Target,
  Brain,
} from 'lucide-react';

interface RunTabProps {
  // Content
  result: string;
  error: string | null;

  // Model (read-only, controlled globally)
  model: string;

  // Actions
  onExecute: () => void;
  onRetry: () => void;

  // States
  isExecuting: boolean;
  hasPromptToRun: boolean;

  // Metadata
  tokenCount?: number;
}

// Helper to get model display name and icon
function getModelInfo(model: string) {
  if (model.includes('haiku')) return { name: 'Claude Haiku', Icon: Zap };
  if (model.includes('sonnet')) return { name: 'Claude Sonnet', Icon: Target };
  if (model.includes('opus')) return { name: 'Claude Opus', Icon: Brain };
  return { name: 'Claude', Icon: Target };
}

export function RunTab({
  result,
  error,
  model,
  onExecute,
  onRetry,
  isExecuting,
  hasPromptToRun,
  tokenCount,
}: RunTabProps) {
  const { name: modelName, Icon: ModelIcon } = getModelInfo(model);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Error state
  if (error) {
    return (
      <div className="flex-1 flex flex-col">
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="ml-2">
            <p className="font-medium">Error executing prompt</p>
            <p className="text-sm mt-1">{error}</p>
          </AlertDescription>
        </Alert>
        <div className="flex justify-center">
          <Button variant="outline" onClick={onRetry}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Loading state
  if (isExecuting) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-green-600" />
        <p className="text-lg font-medium mt-4">Executing prompt...</p>
        <p className="text-sm text-muted-foreground mt-2">
          Generating response...
        </p>
      </div>
    );
  }

  // Empty state
  if (!result) {
    return (
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between h-12 mb-4">
          {/* Model display (read-only) */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg">
            <ModelIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{modelName}</span>
          </div>

          <Button
            onClick={onExecute}
            disabled={!hasPromptToRun}
            className="w-[120px] bg-green-600 hover:bg-green-700"
          >
            <Play className="h-4 w-4 mr-2" />
            Re-run
          </Button>
        </div>

        {/* Empty state content */}
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
          <Play className="h-16 w-16 text-muted-foreground/30" />
          <h3 className="text-xl font-semibold mt-4">Execution Results</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-md">
            Results from "Optimize & Run" will appear here.
          </p>
          {!hasPromptToRun && (
            <p className="text-sm text-muted-foreground mt-4">
              Enter a prompt in the left panel and click "Optimize & Run" to get started.
            </p>
          )}
        </div>
      </div>
    );
  }

  // Result state
  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between h-12 mb-4">
        {/* Model display (read-only) */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg">
          <ModelIcon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{modelName}</span>
        </div>

        <Button
          onClick={onExecute}
          disabled={!hasPromptToRun || isExecuting}
          className="w-[120px] bg-green-600 hover:bg-green-700"
        >
          <Play className="h-4 w-4 mr-2" />
          Re-run
        </Button>
      </div>

      {/* Result display */}
      <div className="flex-1 min-h-[300px] overflow-y-auto p-6 bg-muted/20 border rounded-lg">
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <pre className="whitespace-pre-wrap text-sm font-sans">
            {result}
          </pre>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between h-10 mt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          disabled={!result}
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 mr-2 text-green-500" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 mr-2" />
              Copy Result
            </>
          )}
        </Button>

        {tokenCount !== undefined && (
          <span className="text-sm text-muted-foreground">
            Tokens: {tokenCount.toLocaleString()}
          </span>
        )}
      </div>
    </div>
  );
}
