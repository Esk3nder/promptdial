'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Sparkles,
  Play,
  History,
  AtSign,
  AlertCircle,
} from 'lucide-react';
import { useResolveArtifacts } from '@/hooks/useArtifacts';
import { useQueryClient } from '@tanstack/react-query';

// New components
import { LeftPanel } from './left-panel';
import { PromptTab } from './prompt-tab';
import { RunTab } from './run-tab';
import { HistoryTab } from './history-tab';
import { ArtifactsTab } from './artifacts-tab';

// Response type for the dial API
interface DialResponse {
  ok: boolean;
  next_action?: 'execute' | 'done' | 'clarify';
  confidence?: number;
  final_answer?: string;
  synthesized_prompt?: string;
  error?: string;
  message?: string;
  historyId?: string;
  metadata?: {
    tokensUsed?: number;
    model?: string;
    stage?: string;
    creditCost?: number;
  };
  deepDial?: {
    contextUrl: string;
    company?: {
      name: string;
      industry: string;
      scraped: boolean;
      favicon?: string;
    };
    enrichment: {
      level: 'basic' | 'deep';
      qualityScore: number;
      factors: string[];
      contextUsed: {
        companyName?: string;
        industry?: string;
        keywords?: string[];
        competitors?: string[];
      };
    };
    scrapeError?: string;
  };
}

interface DialInterfaceProps {
  userId: string;
  userCredits?: number;
  apiKey?: string;
}

export function DialInterface({ userId, userCredits, apiKey }: DialInterfaceProps) {
  // Input state
  const [inputPrompt, setInputPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState('claude-3-haiku-20240307');

  // Output state
  const [optimizedPrompt, setOptimizedPrompt] = useState('');
  const [editedPrompt, setEditedPrompt] = useState('');
  const [originalOptimizedPrompt, setOriginalOptimizedPrompt] = useState('');

  // Execution state
  const [executionResult, setExecutionResult] = useState('');
  const [executionError, setExecutionError] = useState<string | null>(null);

  // Loading states
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState<'idle' | 'optimizing' | 'executing'>('idle');

  // UI state
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'prompt' | 'run' | 'history' | 'artifacts'>('prompt');
  const [error, setError] = useState('');

  // Save state
  const [isSaved, setIsSaved] = useState(false);

  // Progressive disclosure state (hydration-safe)
  const [hasUsedDial, setHasUsedDial] = useState(false);

  // Load progressive disclosure flag on client only
  useEffect(() => {
    const used = localStorage.getItem('promptdial_has_used') === 'true';
    setHasUsedDial(used);
  }, []);

  // Refs and hooks
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const resolveArtifacts = useResolveArtifacts();
  const queryClient = useQueryClient();

  // Computed values
  const hasUnsavedChanges = editedPrompt !== originalOptimizedPrompt && editedPrompt !== '';
  const hasPromptToRun = editedPrompt.trim().length > 0;
  const isPromptEmpty = !optimizedPrompt && !editedPrompt;

  // Handle artifact insertion
  const handleInsertArtifact = useCallback((handle: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setInputPrompt((prev) => prev + ` @${handle}`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = inputPrompt;
    const newText = text.substring(0, start) + `@${handle}` + text.substring(end);
    setInputPrompt(newText);

    // Focus back on textarea
    setTimeout(() => {
      textarea.focus();
      const newPos = start + handle.length + 1;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  }, [inputPrompt]);

  // Optimize AND Run prompt in one action
  const handleOptimizeAndRun = async () => {
    setIsOptimizing(true);
    setLoadingPhase('optimizing');
    setError('');
    setExecutionResult('');
    setExecutionError(null);

    try {
      // First, resolve any @artifacts in the prompt
      let resolvedPrompt = inputPrompt;
      if (inputPrompt.includes('@')) {
        const resolveResult = await resolveArtifacts.mutateAsync(inputPrompt);
        resolvedPrompt = resolveResult.resolvedPrompt;

        if (resolveResult.invalidMentions.length > 0) {
          console.warn('Invalid @mentions:', resolveResult.invalidMentions);
        }
      }

      // Step 1: Optimize the prompt
      const dialRes = await fetch('/api/dial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userGoal: resolvedPrompt,
          ...(apiKey && { apiKey }),
          config: {
            model: selectedModel,
            maxIterations: 1,
          }
        })
      });

      const dialData: DialResponse = await dialRes.json();

      if (!dialRes.ok || !dialData.synthesized_prompt) {
        const errorMsg = dialData.message
          ? `${dialData.error}: ${dialData.message}`
          : (dialData.error || 'Failed to optimize your prompt. Please try again.');
        setError(errorMsg);
        setIsOptimizing(false);
        return;
      }

      // Update prompt state
      const optimized = dialData.synthesized_prompt;
      setOptimizedPrompt(optimized);
      setEditedPrompt(optimized);
      setOriginalOptimizedPrompt(optimized);
      setIsSaved(true);
      setActiveTab('prompt'); // Show optimized prompt first

      // Invalidate history cache
      queryClient.invalidateQueries({ queryKey: ['dialHistory'] });

      // Mark first use for progressive disclosure
      if (typeof window !== 'undefined') {
        localStorage.setItem('promptdial_has_used', 'true');
        setHasUsedDial(true);
      }

      // Step 2: Execute the optimized prompt (in background)
      setIsOptimizing(false);
      setIsExecuting(true);
      setLoadingPhase('executing');

      const execRes = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: optimized,
          model: selectedModel, // Use same model for execution
          ...(apiKey && { apiKey }),
        })
      });

      const execData = await execRes.json();

      if (execRes.ok && execData.ok) {
        setExecutionResult(execData.result);
      } else {
        const errorMsg = execData.message
          ? `${execData.error}: ${execData.message}`
          : (execData.error || 'Optimization succeeded but execution failed');
        setExecutionError(errorMsg);
      }
    } catch (err) {
      setError('Unable to connect to our servers. Please check your connection and try again.');
    } finally {
      setIsOptimizing(false);
      setIsExecuting(false);
      setLoadingPhase('idle');
    }
  };

  // Execute prompt (re-run with current edited prompt)
  const handleExecute = async () => {
    if (!editedPrompt.trim()) return;

    setIsExecuting(true);
    setExecutionError(null);
    setActiveTab('run'); // Switch to run tab

    try {
      const res = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: editedPrompt,
          model: selectedModel, // Use global model
          ...(apiKey && { apiKey }),
        })
      });

      const data = await res.json();

      if (res.ok && data.ok) {
        setExecutionResult(data.result);
      } else {
        const errorMsg = data.message
          ? `${data.error}: ${data.message}`
          : (data.error || 'Failed to execute prompt');
        setExecutionError(errorMsg);
      }
    } catch (err) {
      setExecutionError('Failed to execute prompt. Please try again.');
    } finally {
      setIsExecuting(false);
    }
  };

  // Handle prompt changes in the prompt tab
  const handlePromptChange = (value: string) => {
    setEditedPrompt(value);
    setIsSaved(false);
  };

  // Handle save
  const handleSave = async () => {
    // In this implementation, prompts are auto-saved when optimized
    // This could be extended to save edited versions separately
    setIsSaved(true);
    setOriginalOptimizedPrompt(editedPrompt);
  };

  // Handle load from history
  const handleLoadToInput = (prompt: string) => {
    setInputPrompt(prompt);
    // Optionally expand left panel if collapsed
    if (isLeftPanelCollapsed) {
      setIsLeftPanelCollapsed(false);
    }
  };

  const handleLoadToPromptTab = (prompt: string) => {
    setOptimizedPrompt(prompt);
    setEditedPrompt(prompt);
    setOriginalOptimizedPrompt(prompt);
    setIsSaved(true);
    setActiveTab('prompt');
  };

  // Handle run button from prompt tab
  const handleRunFromPromptTab = () => {
    handleExecute();
  };

  // Handle retry from run tab
  const handleRetry = () => {
    setExecutionError(null);
    handleExecute();
  };

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Left Panel - Input */}
      <LeftPanel
        ref={textareaRef}
        prompt={inputPrompt}
        onPromptChange={setInputPrompt}
        model={selectedModel}
        onModelChange={setSelectedModel}
        onOptimize={handleOptimizeAndRun}
        isOptimizing={isOptimizing || isExecuting}
        loadingPhase={loadingPhase}
        isCollapsed={isLeftPanelCollapsed}
        onToggleCollapse={() => setIsLeftPanelCollapsed(!isLeftPanelCollapsed)}
        credits={userCredits}
        disabled={!inputPrompt.trim()}
      />

      {/* Right Panel - Tabs */}
      <div className="flex-1 flex flex-col p-6 overflow-hidden">
        {/* Error display */}
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Tab Navigation */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as typeof activeTab)}
          className="flex-1 flex flex-col"
        >
          <div className="bg-muted/30 rounded-lg p-1 mb-4">
            <TabsList className={`grid w-full bg-transparent ${hasUsedDial ? 'grid-cols-4' : 'grid-cols-2'}`}>
              <TabsTrigger
                value="prompt"
                className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Prompt
              </TabsTrigger>
              <TabsTrigger
                value="run"
                className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <Play className="h-4 w-4 mr-2" />
                Run
              </TabsTrigger>
              {hasUsedDial && (
                <>
                  <TabsTrigger
                    value="history"
                    className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
                  >
                    <History className="h-4 w-4 mr-2" />
                    History
                  </TabsTrigger>
                  <TabsTrigger
                    value="artifacts"
                    className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
                  >
                    <AtSign className="h-4 w-4 mr-2" />
                    Artifacts
                  </TabsTrigger>
                </>
              )}
            </TabsList>
          </div>

          {/* Tab Contents */}
          <TabsContent value="prompt" className="flex-1 flex flex-col mt-0">
            <PromptTab
              optimizedPrompt={editedPrompt}
              onPromptChange={handlePromptChange}
              onRun={handleRunFromPromptTab}
              onSave={handleSave}
              isOptimizing={isOptimizing}
              isRunning={isExecuting}
              hasUnsavedChanges={hasUnsavedChanges}
              isSaved={isSaved}
              isEmpty={isPromptEmpty}
            />
          </TabsContent>

          <TabsContent value="run" className="flex-1 flex flex-col mt-0">
            <RunTab
              result={executionResult}
              error={executionError}
              model={selectedModel}
              onExecute={handleExecute}
              onRetry={handleRetry}
              isExecuting={isExecuting}
              hasPromptToRun={hasPromptToRun}
            />
          </TabsContent>

          <TabsContent value="history" className="flex-1 flex flex-col mt-0">
            <HistoryTab
              onLoadToInput={handleLoadToInput}
              onLoadToPromptTab={handleLoadToPromptTab}
            />
          </TabsContent>

          <TabsContent value="artifacts" className="flex-1 flex flex-col mt-0">
            <ArtifactsTab onInsertArtifact={handleInsertArtifact} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
