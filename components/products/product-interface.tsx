'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Loader2, 
  Sparkles, 
  Copy, 
  ArrowRight, 
  Zap,
  Brain,
  Target,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { OrchestrationResponse } from '@/lib/orchestrator/types';

// Example prompts for quick start
const EXAMPLE_PROMPTS = [
  {
    title: "Email Writer",
    prompt: "Write a professional email to decline a meeting",
    icon: "✉️"
  },
  {
    title: "Code Helper",
    prompt: "Explain how to implement a binary search",
    icon: "💻"
  },
  {
    title: "Creative Writing",
    prompt: "Write a story about a time traveler",
    icon: "✨"
  },
  {
    title: "Business Strategy",
    prompt: "Create a marketing plan for a new product",
    icon: "📈"
  }
];

interface ProductInterfaceProps {
  userId: string;
  userCredits?: number;
}

export function ProductInterface({ userId, userCredits }: ProductInterfaceProps) {
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState('claude-3-haiku-20240307');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [orchestratorResponse, setOrchestratorResponse] = useState<OrchestrationResponse | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const optimizePrompt = async () => {
    setLoading(true);
    setError('');
    setResponse('');
    setOrchestratorResponse(null);

    try {
      const res = await fetch('/api/orchestrator/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userGoal: prompt,
          config: {
            model: model,
            maxIterations: 1,
          }
        })
      });

      const data: OrchestrationResponse = await res.json();
      
      if (res.ok) {
        setOrchestratorResponse(data);
        if (data.final_answer) {
          setResponse(data.final_answer);
        }
      } else {
        setError(data.error || 'Failed to optimize your prompt. Please try again.');
      }
    } catch (err) {
      setError('Unable to connect to our servers. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const selectExample = (examplePrompt: string) => {
    setPrompt(examplePrompt);
    setError('');
    setResponse('');
    setOrchestratorResponse(null);
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
        {userCredits !== undefined && (
          <div className="mt-4">
            <Badge variant="secondary" className="text-sm">
              {userCredits} credits remaining
            </Badge>
          </div>
        )}
      </div>
      
      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[450px_1fr] gap-6">
        {/* Left Column - Input */}
        <div className="lg:sticky lg:top-8 lg:self-start space-y-4">
          {/* Main Input Card */}
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
                  id="prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g., Write a compelling product description for eco-friendly water bottles..."
                  rows={6}
                  className="resize-none"
                />
              </div>

              {/* Optimize Button */}
              <Button 
                onClick={optimizePrompt} 
                disabled={loading || !prompt}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Optimizing Your Prompt...
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

          {/* Example Prompts */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Quick Examples</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {EXAMPLE_PROMPTS.map((example, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  className="w-full justify-start text-left"
                  size="sm"
                  onClick={() => selectExample(example.prompt)}
                >
                  <span className="mr-2">{example.icon}</span>
                  <span className="truncate">{example.title}</span>
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Results */}
        <div className="space-y-6 min-h-[600px]">
          {/* Default state */}
          {!loading && !error && !orchestratorResponse && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="rounded-full bg-orange-100 p-4 mb-4">
                  <Sparkles className="h-8 w-8 text-orange-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Ready to Optimize</h3>
                <p className="text-sm text-muted-foreground max-w-sm mb-4">
                  Enter your prompt or choose an example to see the magic happen
                </p>
                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    10x Better Results
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Instant Optimization
                  </div>
                </div>
              </CardContent>
            </Card>
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

          {/* Error display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success - Optimized Results */}
          {orchestratorResponse && (
            <div className="space-y-4">
              {/* Transformation Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    Optimization Complete!
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Before/After Comparison */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Your Original Prompt</Label>
                        <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-sm">
                          {prompt}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground flex items-center gap-2">
                          Optimized Version
                          <Badge variant="default" className="text-xs">Enhanced</Badge>
                        </Label>
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-sm relative">
                          {orchestratorResponse.synthesized_prompt || orchestratorResponse.final_answer?.substring(0, 150) + '...'}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="absolute top-2 right-2 h-6 w-6 p-0"
                            onClick={() => copyToClipboard(orchestratorResponse.synthesized_prompt || '')}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    {copiedPrompt && (
                      <div className="text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Copied to clipboard!
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Results Tabs */}
              <Tabs defaultValue="response" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="response">
                    <Sparkles className="h-4 w-4 mr-2" />
                    AI Response
                  </TabsTrigger>
                  <TabsTrigger value="tips">
                    <Brain className="h-4 w-4 mr-2" />
                    Optimization Tips
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="response" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Generated Response</CardTitle>
                      <CardDescription>
                        Here's what the AI created using your optimized prompt
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        <pre className="whitespace-pre-wrap text-sm">
                          {orchestratorResponse.final_answer || response}
                        </pre>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="tips" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>How We Improved Your Prompt</CardTitle>
                      <CardDescription>
                        Learn what makes a great AI prompt
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="rounded-full bg-blue-100 p-1 mt-0.5">
                            <Target className="h-3 w-3 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">Added Clear Objectives</p>
                            <p className="text-xs text-muted-foreground">
                              We specified exactly what output you need
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="rounded-full bg-purple-100 p-1 mt-0.5">
                            <Brain className="h-3 w-3 text-purple-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">Enhanced Context</p>
                            <p className="text-xs text-muted-foreground">
                              Added relevant background information for better results
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="rounded-full bg-green-100 p-1 mt-0.5">
                            <Zap className="h-3 w-3 text-green-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">Structured Format</p>
                            <p className="text-xs text-muted-foreground">
                              Organized your request for optimal AI understanding
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}