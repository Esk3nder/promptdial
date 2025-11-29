'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Loader2,
  Sparkles,
  Copy,
  Zap,
  Brain,
  Target,
  CheckCircle2,
  AlertCircle,
  Globe,
  Crown,
  Search,
  PanelLeftClose,
  PanelLeft,
  History,
  Play,
} from 'lucide-react';
import { useResolveArtifacts } from '@/hooks/useArtifacts';
import { useQueryClient } from '@tanstack/react-query';
import { HistoryPanel } from './history-panel';
import { HistoryDetailModal } from './history-detail-modal';
import { ArtifactsPanel } from './artifacts-panel';
import type { DialResult } from '@/lib/db/schema';

// Response type for the dial API
interface DialResponse {
  ok: boolean;
  next_action?: 'execute' | 'done' | 'clarify';
  confidence?: number;
  final_answer?: string;
  synthesized_prompt?: string;
  error?: string;
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
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState('claude-3-haiku-20240307');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dialResponse, setDialResponse] = useState<DialResponse | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  // Deep Dial state
  const [deepDialEnabled, setDeepDialEnabled] = useState(false);
  const [contextUrl, setContextUrl] = useState('');
  const [scrapingStatus, setScrapingStatus] = useState<'idle' | 'scraping' | 'done'>('idle');

  // Execute prompt state
  const [editableSynthesizedPrompt, setEditableSynthesizedPrompt] = useState('');
  const [executedResult, setExecutedResult] = useState('');
  const [executing, setExecuting] = useState(false);

  // Layout state
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);

  // History modal state
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<DialResult | null>(null);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  // Right panel tab state
  const [rightPanelTab, setRightPanelTab] = useState<'history' | 'artifacts'>('history');

  // Results panel tab state (when dialResponse exists)
  const [resultsTab, setResultsTab] = useState<'prompt' | 'response' | 'result'>('prompt');

  // Artifacts
  const resolveArtifacts = useResolveArtifacts();
  const queryClient = useQueryClient();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleInsertArtifact = useCallback((handle: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setPrompt((prev) => prev + ` @${handle}`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = prompt;
    const newText = text.substring(0, start) + `@${handle}` + text.substring(end);
    setPrompt(newText);

    // Focus back on textarea
    setTimeout(() => {
      textarea.focus();
      const newPos = start + handle.length + 1;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  }, [prompt]);

  const optimizePrompt = async () => {
    setLoading(true);
    setError('');
    setResponse('');
    setDialResponse(null);

    // Validate Deep Dial requirements
    if (deepDialEnabled && !contextUrl.trim()) {
      setError('Please enter a URL for Deep Dial context enrichment.');
      setLoading(false);
      return;
    }

    try {
      // First, resolve any @artifacts in the prompt
      let resolvedPrompt = prompt;
      if (prompt.includes('@')) {
        const resolveResult = await resolveArtifacts.mutateAsync(prompt);
        resolvedPrompt = resolveResult.resolvedPrompt;

        // Warn about invalid mentions
        if (resolveResult.invalidMentions.length > 0) {
          console.warn('Invalid @mentions:', resolveResult.invalidMentions);
        }
      }

      const endpoint = deepDialEnabled ? '/api/dial/deep' : '/api/dial';

      if (deepDialEnabled) {
        setScrapingStatus('scraping');
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userGoal: resolvedPrompt,
          ...(apiKey && { apiKey }),
          ...(deepDialEnabled && { contextUrl: contextUrl.trim() }),
          config: {
            model: model,
            maxIterations: 1,
          }
        })
      });

      setScrapingStatus('done');
      const data: DialResponse = await res.json();

      if (res.ok) {
        setDialResponse(data);
        if (data.final_answer) {
          setResponse(data.final_answer);
        }
        // Set editable synthesized prompt
        if (data.synthesized_prompt) {
          setEditableSynthesizedPrompt(data.synthesized_prompt);
        }
        // Reset executed result when new dial is performed
        setExecutedResult('');
        // Invalidate history cache to show new item
        queryClient.invalidateQueries({ queryKey: ['dialHistory'] });
      } else {
        // Show both error and message if available for better debugging
        const errorMsg = data.message
          ? `${data.error}: ${data.message}`
          : (data.error || 'Failed to optimize your prompt. Please try again.');
        setError(errorMsg);
      }
    } catch (err) {
      setError('Unable to connect to our servers. Please check your connection and try again.');
    } finally {
      setLoading(false);
      setScrapingStatus('idle');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const executePrompt = async () => {
    if (!editableSynthesizedPrompt.trim()) return;

    setExecuting(true);
    setError('');

    try {
      const res = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: editableSynthesizedPrompt,
          ...(apiKey && { apiKey }),
        })
      });

      const data = await res.json();

      if (res.ok && data.ok) {
        setExecutedResult(data.result);
        setResultsTab('result'); // Auto-switch to result tab
      } else {
        const errorMsg = data.message
          ? `${data.error}: ${data.message}`
          : (data.error || 'Failed to execute prompt');
        setError(errorMsg);
      }
    } catch (err) {
      setError('Failed to execute prompt. Please try again.');
    } finally {
      setExecuting(false);
    }
  };

  const handleSelectHistoryItem = (item: DialResult) => {
    setSelectedHistoryItem(item);
    setHistoryModalOpen(true);
  };

  const handleUsePrompt = (promptText: string) => {
    setPrompt(promptText);
    setError('');
    setDialResponse(null);
  };

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 max-w-7xl">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-3 flex items-center justify-center gap-3">
          <Sparkles className="h-8 w-8 text-orange-500" />
          AI Prompt Optimizer
        </h1>
        <p className="text-lg text-muted-foreground">
          Transform your ideas into powerful AI prompts that get better results
        </p>
      </div>

      {/* Two-column layout with collapsible left panel */}
      <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-6">
        {/* Left Column - Input (Collapsible) */}
        <div
          className={`
            lg:sticky lg:top-8 lg:self-start space-y-4 transition-all duration-300
            ${leftPanelCollapsed ? 'lg:w-[60px]' : 'lg:w-[450px]'}
          `}
        >
          {/* Collapse Toggle */}
          <div className="hidden lg:flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
              title={leftPanelCollapsed ? 'Expand panel' : 'Collapse panel'}
            >
              {leftPanelCollapsed ? (
                <PanelLeft className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Main Input Card */}
          {!leftPanelCollapsed && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Your Prompt
                </CardTitle>
                <CardDescription>
                  Tell us what you want to achieve and we'll optimize it for AI
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Deep Dial Toggle */}
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-purple-600" />
                    <div>
                      <Label htmlFor="deep-dial" className="text-sm font-medium cursor-pointer">
                        Deep Dial
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Enrich with real company data
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs bg-purple-100 text-purple-700 border-purple-300">
                      Premium
                    </Badge>
                    <Switch
                      id="deep-dial"
                      checked={deepDialEnabled}
                      onCheckedChange={setDeepDialEnabled}
                    />
                  </div>
                </div>

                {/* Deep Dial URL Input */}
                {deepDialEnabled && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    <Label htmlFor="context-url" className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Context URL
                    </Label>
                    <div className="relative">
                      <Input
                        id="context-url"
                        type="url"
                        value={contextUrl}
                        onChange={(e) => setContextUrl(e.target.value)}
                        placeholder="e.g., https://company.com"
                        className="pr-10"
                      />
                      {scrapingStatus === 'scraping' && (
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-pulse" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      We'll scrape this website to inject real context into your prompt
                    </p>
                  </div>
                )}

                {/* Model Selection */}
                <div className="space-y-2">
                  <Label htmlFor="model">AI Model</Label>
                  <Select value={model} onValueChange={setModel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="claude-3-haiku-20240307">
                        <div className="flex items-center gap-2">
                          <Zap className="h-3 w-3" />
                          Fast Mode (Claude Haiku)
                        </div>
                      </SelectItem>
                      <SelectItem value="claude-3-5-sonnet-20241022">
                        <div className="flex items-center gap-2">
                          <Target className="h-3 w-3" />
                          Balanced Mode (Claude Sonnet)
                        </div>
                      </SelectItem>
                      <SelectItem value="claude-3-opus-20240229">
                        <div className="flex items-center gap-2">
                          <Brain className="h-3 w-3" />
                          Power Mode (Claude Opus)
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Prompt Input */}
                <div className="space-y-2">
                  <Label htmlFor="prompt">What do you want to accomplish?</Label>
                  <Textarea
                    ref={textareaRef}
                    id="prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g., Write a compelling product description for eco-friendly water bottles...

Use @artifact to inject context (e.g., @mom, @acme-corp)"
                    rows={6}
                    className="resize-none"
                  />
                  {prompt.includes('@') && (
                    <p className="text-xs text-purple-600">
                      @mentions will be expanded with artifact content
                    </p>
                  )}
                </div>

                {/* Optimize Button */}
                <Button
                  onClick={optimizePrompt}
                  disabled={loading || !prompt || (deepDialEnabled && !contextUrl.trim())}
                  className={`w-full ${deepDialEnabled ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700' : ''}`}
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {scrapingStatus === 'scraping' ? 'Researching Context...' : 'Optimizing Your Prompt...'}
                    </>
                  ) : deepDialEnabled ? (
                    <>
                      <Crown className="mr-2 h-4 w-4" />
                      Deep Dial (5 credits)
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Optimize My Prompt
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Collapsed state shows just an icon */}
          {leftPanelCollapsed && (
            <Card className="p-4 flex flex-col items-center justify-center min-h-[200px]">
              <Brain className="h-6 w-6 text-muted-foreground mb-2" />
              <span className="text-xs text-muted-foreground text-center">Input</span>
            </Card>
          )}
        </div>

        {/* Right Column - Results + History/Artifacts */}
        <div className="space-y-6 min-h-[600px]">
          {/* Error display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Loading state */}
          {loading && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="relative">
                  <Loader2 className="h-12 w-12 animate-spin text-orange-500" />
                  <Sparkles className="h-6 w-6 absolute -top-1 -right-1 text-orange-400 animate-pulse" />
                </div>
                <p className="mt-4 text-sm text-muted-foreground">
                  Analyzing and optimizing your prompt...
                </p>
                <div className="mt-2 text-xs text-muted-foreground">
                  This usually takes 5-10 seconds
                </div>
              </CardContent>
            </Card>
          )}

          {/* Success - Single Unified Results Panel */}
          {dialResponse && !loading && (
            <Card className="flex flex-col min-h-[500px]">
              {/* Top Navigation Bar */}
              <div className="border-b px-4 py-3">
                <div className="flex items-center justify-between">
                  {/* Tabs */}
                  <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                    <button
                      onClick={() => setResultsTab('prompt')}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                        resultsTab === 'prompt'
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Sparkles className="h-4 w-4 inline mr-1.5" />
                      Prompt
                    </button>
                    <button
                      onClick={() => setResultsTab('response')}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                        resultsTab === 'response'
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Brain className="h-4 w-4 inline mr-1.5" />
                      Response
                    </button>
                    {executedResult && (
                      <button
                        onClick={() => setResultsTab('result')}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                          resultsTab === 'result'
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <CheckCircle2 className="h-4 w-4 inline mr-1.5" />
                        Result
                      </button>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (resultsTab === 'prompt') copyToClipboard(editableSynthesizedPrompt);
                        else if (resultsTab === 'response') copyToClipboard(dialResponse.final_answer || response);
                        else if (resultsTab === 'result') copyToClipboard(executedResult);
                      }}
                    >
                      {copiedPrompt ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    {resultsTab === 'prompt' && (
                      <Button
                        size="sm"
                        onClick={executePrompt}
                        disabled={executing || !editableSynthesizedPrompt.trim()}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {executing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Deep Dial Context Badge (if applicable) */}
                {dialResponse.deepDial && (
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <Crown className="h-3 w-3 text-purple-600" />
                    <span>{dialResponse.deepDial.company?.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {dialResponse.deepDial.enrichment.qualityScore}% quality
                    </Badge>
                  </div>
                )}
              </div>

              {/* Content Area */}
              <CardContent className="flex-1 p-4 overflow-auto">
                {/* Prompt Tab */}
                {resultsTab === 'prompt' && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Edit the optimized prompt, then click ▶ to execute
                    </p>
                    <Textarea
                      value={editableSynthesizedPrompt}
                      onChange={(e) => setEditableSynthesizedPrompt(e.target.value)}
                      rows={12}
                      className="resize-none font-mono text-sm"
                    />
                  </div>
                )}

                {/* Response Tab */}
                {resultsTab === 'response' && (
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <pre className="whitespace-pre-wrap text-sm bg-muted/50 p-4 rounded-lg">
                      {dialResponse.final_answer || response}
                    </pre>
                  </div>
                )}

                {/* Result Tab */}
                {resultsTab === 'result' && executedResult && (
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <pre className="whitespace-pre-wrap text-sm bg-muted/50 p-4 rounded-lg">
                      {executedResult}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* History/Artifacts Panel - Always visible */}
          <Tabs value={rightPanelTab} onValueChange={(v) => setRightPanelTab(v as 'history' | 'artifacts')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="history">
                <History className="h-4 w-4 mr-2" />
                History
              </TabsTrigger>
              <TabsTrigger value="artifacts">
                <Sparkles className="h-4 w-4 mr-2" />
                Artifacts
              </TabsTrigger>
            </TabsList>

            <TabsContent value="history" className="mt-4">
              <HistoryPanel
                onSelectItem={handleSelectHistoryItem}
                selectedItemId={selectedHistoryItem?.id}
              />
            </TabsContent>

            <TabsContent value="artifacts" className="mt-4">
              <ArtifactsPanel onInsertArtifact={handleInsertArtifact} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* History Detail Modal */}
      <HistoryDetailModal
        item={selectedHistoryItem}
        open={historyModalOpen}
        onOpenChange={setHistoryModalOpen}
        onUsePrompt={handleUsePrompt}
      />
    </div>
  );
}
