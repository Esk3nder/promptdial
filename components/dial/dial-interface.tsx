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
  Search
} from 'lucide-react';
// Response type for the dial API
interface DialResponse {
  ok: boolean;
  next_action?: 'execute' | 'done' | 'clarify';
  confidence?: number;
  final_answer?: string;
  synthesized_prompt?: string;
  error?: string;
  metadata?: {
    tokensUsed?: number;
    model?: string;
    stage?: string;
    creditCost?: number;
  };
  // Deep Dial specific fields
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

interface DialInterfaceProps {
  userId: string;
  userCredits?: number;
}

export function DialInterface({ userId, userCredits }: DialInterfaceProps) {
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
      const endpoint = deepDialEnabled ? '/api/dial/deep' : '/api/dial';

      if (deepDialEnabled) {
        setScrapingStatus('scraping');
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userGoal: prompt,
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
      } else {
        setError(data.error || 'Failed to optimize your prompt. Please try again.');
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

  const selectExample = (examplePrompt: string) => {
    setPrompt(examplePrompt);
    setError('');
    setResponse('');
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
          {!loading && !error && !dialResponse && (
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
          {dialResponse && (
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
                          {dialResponse.synthesized_prompt || dialResponse.final_answer?.substring(0, 150) + '...'}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="absolute top-2 right-2 h-6 w-6 p-0"
                            onClick={() => copyToClipboard(dialResponse.synthesized_prompt || '')}
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

              {/* Deep Dial Context Display */}
              {dialResponse.deepDial && (
                <Card className="border-purple-200 dark:border-purple-800 bg-gradient-to-r from-purple-50/50 to-blue-50/50 dark:from-purple-900/10 dark:to-blue-900/10">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Crown className="h-4 w-4 text-purple-600" />
                      Deep Dial Context
                      <Badge variant="outline" className="ml-auto text-xs">
                        Quality: {dialResponse.deepDial.enrichment.qualityScore}%
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {dialResponse.deepDial.company && (
                      <div className="flex items-center gap-3">
                        {dialResponse.deepDial.company.favicon && (
                          <img
                            src={dialResponse.deepDial.company.favicon}
                            alt=""
                            className="h-8 w-8 rounded"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        )}
                        <div>
                          <p className="font-medium text-sm">{dialResponse.deepDial.company.name}</p>
                          <p className="text-xs text-muted-foreground">{dialResponse.deepDial.company.industry}</p>
                        </div>
                        {dialResponse.deepDial.company.scraped && (
                          <Badge variant="secondary" className="ml-auto text-xs">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Scraped
                          </Badge>
                        )}
                      </div>
                    )}

                    {dialResponse.deepDial.enrichment.factors.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {dialResponse.deepDial.enrichment.factors.map((factor, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {factor}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {dialResponse.deepDial.enrichment.contextUsed.competitors && dialResponse.deepDial.enrichment.contextUsed.competitors.length > 0 && (
                      <div className="text-xs">
                        <span className="text-muted-foreground">Competitors found: </span>
                        <span className="font-medium">{dialResponse.deepDial.enrichment.contextUsed.competitors.join(', ')}</span>
                      </div>
                    )}

                    {dialResponse.deepDial.scrapeError && (
                      <Alert variant="destructive" className="py-2">
                        <AlertCircle className="h-3 w-3" />
                        <AlertDescription className="text-xs">
                          Scraping issue: {dialResponse.deepDial.scrapeError}
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              )}

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
                          {dialResponse.final_answer || response}
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