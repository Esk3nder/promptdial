'use client';

import { forwardRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Loader2,
  Sparkles,
  Zap,
  Brain,
  Target,
  PanelLeftClose,
  PanelLeft,
  Coins,
  Check,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface LeftPanelProps {
  // Input state
  prompt: string;
  onPromptChange: (value: string) => void;
  model: string;
  onModelChange: (value: string) => void;

  // Action
  onOptimize: () => void;
  isOptimizing: boolean;
  loadingPhase?: 'idle' | 'optimizing' | 'executing';

  // Layout
  isCollapsed: boolean;
  onToggleCollapse: () => void;

  // Credits
  credits?: number;
  isUnlimited?: boolean;

  // Disabled state
  disabled?: boolean;
}

export const LeftPanel = forwardRef<HTMLTextAreaElement, LeftPanelProps>(
  function LeftPanel(
    {
      prompt,
      onPromptChange,
      model,
      onModelChange,
      onOptimize,
      isOptimizing,
      loadingPhase = 'idle',
      isCollapsed,
      onToggleCollapse,
      credits,
      isUnlimited,
      disabled,
    },
    ref
  ) {
    // Get model abbreviation for collapsed state
    const getModelAbbrev = () => {
      if (model.includes('haiku')) return 'H';
      if (model.includes('sonnet')) return 'S';
      if (model.includes('opus')) return 'O';
      return 'H';
    };

    // Collapsed state
    if (isCollapsed) {
      return (
        <div className="w-[56px] h-full border-r border-border bg-background flex flex-col items-center py-6">
          {/* Expand button - centered */}
          <div className="flex-1 flex items-center justify-center">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onToggleCollapse}
                    className="h-10 w-10 rounded-lg"
                  >
                    <PanelLeft className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Expand panel</p>
                  {prompt && (
                    <p className="text-xs text-muted-foreground mt-1 max-w-[200px] truncate">
                      {prompt.substring(0, 50)}...
                    </p>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Model indicator */}
          <div className="mt-4">
            <span className="text-xs font-medium bg-muted rounded px-2 py-1">
              {getModelAbbrev()}
            </span>
          </div>

          {/* Content indicator */}
          {prompt && (
            <div className="mt-3">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            </div>
          )}
        </div>
      );
    }

    // Expanded state
    return (
      <div className="w-full min-w-[400px] max-w-[500px] h-full border-r border-border bg-background flex flex-col">
        {/* Header */}
        <div className="h-14 px-6 flex items-center justify-between border-b border-border">
          <h2 className="text-lg font-semibold">New Prompt</h2>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onToggleCollapse}
                  className="h-8 w-8 hidden lg:flex"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Collapse panel</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 space-y-4">
          {/* Model Selector */}
          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Select value={model} onValueChange={onModelChange} disabled={isOptimizing}>
              <SelectTrigger className="w-full h-11 rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="claude-3-haiku-20240307">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-muted-foreground" />
                    Claude Haiku (Fast)
                  </div>
                </SelectItem>
                <SelectItem value="claude-3-5-sonnet-20241022">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    Claude Sonnet (Balanced)
                  </div>
                </SelectItem>
                <SelectItem value="claude-3-opus-20240229">
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-muted-foreground" />
                    Claude Opus (Powerful)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Prompt Input */}
          <div className="space-y-2 flex-1">
            <Label htmlFor="prompt">Your Prompt</Label>
            <Textarea
              ref={ref}
              id="prompt"
              value={prompt}
              onChange={(e) => onPromptChange(e.target.value)}
              placeholder="Enter your prompt here...

You can use @mentions to inject context from your saved artifacts."
              className="min-h-[200px] max-h-[400px] font-mono text-sm resize-none leading-relaxed"
              disabled={isOptimizing}
            />
            <p className="text-xs text-muted-foreground">
              Tip: Use @ to insert artifact context
            </p>
          </div>

          {/* Optimize & Run Button */}
          <Button
            onClick={onOptimize}
            disabled={disabled || isOptimizing || !prompt.trim()}
            className="w-full h-12 rounded-lg text-base font-medium"
            size="lg"
          >
            {isOptimizing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {loadingPhase === 'optimizing' && 'Optimizing prompt...'}
                {loadingPhase === 'executing' && 'Generating response...'}
                {loadingPhase === 'idle' && 'Processing...'}
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Optimize & Run
              </>
            )}
          </Button>

          {/* Credits Display */}
          <div className="flex items-center justify-center text-sm text-muted-foreground">
            {isUnlimited ? (
              <>
                <Check className="h-4 w-4 mr-2 text-green-500" />
                Unlimited
              </>
            ) : credits !== undefined ? (
              <>
                <Coins className="h-4 w-4 mr-2" />
                <span className={credits === 0 ? 'text-destructive' : credits <= 10 ? 'text-yellow-600' : ''}>
                  {credits} credits remaining
                </span>
              </>
            ) : null}
          </div>
        </div>
      </div>
    );
  }
);
