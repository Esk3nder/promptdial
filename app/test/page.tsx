'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, AlertCircle, CheckCircle2, Clock, Code, MessageSquare, Settings } from 'lucide-react';
import { OrchestrationResponse, OrchestrationEvent } from '@/lib/orchestrator/types';

export default function TestAnthropicPage() {
  const [prompt, setPrompt] = useState('Tell me a joke');
  const [model, setModel] = useState('claude-3-haiku-20240307');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fullTestMode, setFullTestMode] = useState(false);
  const [orchestratorResponse, setOrchestratorResponse] = useState<OrchestrationResponse | null>(null);
  const [events, setEvents] = useState<OrchestrationEvent[]>([]);

  const testAPI = async () => {
    setLoading(true);
    setError('');
    setResponse('');
    setOrchestratorResponse(null);
    setEvents([]);

    try {
      if (fullTestMode) {
        // Test through the real orchestrator endpoint
        const res = await fetch('/api/orchestrator/plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            userGoal: prompt,
            config: {
              model: model,
              maxIterations: 1, // For testing, limit to 1 iteration
            }
          })
        });

        const data: OrchestrationResponse = await res.json();
        
        if (res.ok) {
          setOrchestratorResponse(data);
          setEvents(data.events || []);
          if (data.final_answer) {
            setResponse(data.final_answer);
          }
        } else {
          setError(data.error || 'Failed to get orchestrator response');
        }
      } else {
        // Test direct API
        const res = await fetch('/api/test-anthropic', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, model })
        });

        const data = await res.json();
        
        if (res.ok) {
          setResponse(data.response);
        } else {
          setError(data.error || 'Failed to get response');
        }
      }
    } catch (err) {
      setError('Network error: ' + err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 max-w-7xl">
      <h1 className="text-3xl font-bold mb-6 lg:mb-8">Prompt Synthesizer Test</h1>
      
      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] xl:grid-cols-[450px_1fr] gap-6">
        {/* Left Column - Configuration */}
        <div className="lg:sticky lg:top-8 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle>API Configuration</CardTitle>
              <CardDescription>Test the Academic-Grade Prompt Synthesizer with different models</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="full-test" className="flex flex-col space-y-1">
                  <span>Full Test Mode</span>
                  <span className="text-sm text-muted-foreground font-normal">
                    Test through the orchestrator flow instead of direct API
                  </span>
                </Label>
                <Switch
                  id="full-test"
                  checked={fullTestMode}
                  onCheckedChange={setFullTestMode}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="claude-3-haiku-20240307">Claude 3 Haiku</SelectItem>
                    <SelectItem value="claude-3-sonnet-20240229">Claude 3 Sonnet</SelectItem>
                    <SelectItem value="claude-3-opus-20240229">Claude 3 Opus</SelectItem>
                    <SelectItem value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="prompt">Prompt</Label>
                <Textarea
                  id="prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Enter your prompt here..."
                  rows={6}
                  className="resize-none"
                />
              </div>

              <Button 
                onClick={testAPI} 
                disabled={loading || !prompt}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {fullTestMode ? 'Testing Orchestrator...' : 'Testing API...'}
                  </>
                ) : (
                  fullTestMode ? 'Test Orchestrator' : 'Test API'
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Results */}
        <div className="space-y-6 min-h-[600px]">
          {/* Default state when no action taken */}
          {!loading && !error && !response && !orchestratorResponse && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Ready to Test</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Configure your settings and enter a prompt to test the Academic-Grade Prompt Synthesizer
                </p>
              </CardContent>
            </Card>
          )}

          {/* Loading state */}
          {loading && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-sm text-muted-foreground">
                  {fullTestMode ? 'Processing with orchestrator...' : 'Sending request to API...'}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Error display */}
          {error && (
            <Card className="border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800">
              <CardHeader>
                <CardTitle className="text-red-700 dark:text-red-400 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Error
                </CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-red-600 dark:text-red-400 whitespace-pre-wrap text-sm">{error}</pre>
              </CardContent>
            </Card>
          )}

          {/* Simple response for direct API mode */}
          {response && !fullTestMode && (
            <Card className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
              <CardHeader>
                <CardTitle className="text-green-700 dark:text-green-400 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  Response
                </CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="whitespace-pre-wrap text-sm">{response}</pre>
              </CardContent>
            </Card>
          )}

          {/* Orchestrator-specific output with tabs */}
          {fullTestMode && orchestratorResponse && (
            <Tabs defaultValue="prompt" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="prompt" className="flex items-center gap-2">
                <Code className="h-4 w-4" />
                Optimized Prompt
              </TabsTrigger>
              <TabsTrigger value="response" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Response
              </TabsTrigger>
              <TabsTrigger value="details" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Details
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Optimized Prompt */}
            <TabsContent value="prompt" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Synthesized Prompt</CardTitle>
                  <CardDescription>The optimized prompt generated by the Academic-Grade Prompt Synthesizer</CardDescription>
                </CardHeader>
                <CardContent>
                  {orchestratorResponse.synthesized_prompt ? (
                    <div className="space-y-4">
                      <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                        <pre className="whitespace-pre-wrap text-sm font-mono">
                          {orchestratorResponse.synthesized_prompt}
                        </pre>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Preset: <Badge variant="outline">{orchestratorResponse.dials?.preset}</Badge></span>
                        <span>Confidence: {((orchestratorResponse.confidence || 0) * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  ) : (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        No synthesized prompt available. The model may not have generated one.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab 2: Response */}
            <TabsContent value="response" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Final Response</CardTitle>
                  <CardDescription>The answer generated using the optimized prompt</CardDescription>
                </CardHeader>
                <CardContent>
                  {orchestratorResponse.final_answer ? (
                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                      <pre className="whitespace-pre-wrap">{orchestratorResponse.final_answer}</pre>
                    </div>
                  ) : (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        No final answer available.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab 3: Details */}
            <TabsContent value="details" className="space-y-4">
              {/* Status Card */}
              <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Orchestrator Status</CardTitle>
                  <Badge variant={orchestratorResponse.ok ? 'default' : 'destructive'}>
                    {orchestratorResponse.next_action}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {orchestratorResponse.state && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Goal: {orchestratorResponse.state.userGoal}
                    </p>
                    {orchestratorResponse.state.plan && orchestratorResponse.state.plan.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">Execution Plan:</p>
                        <div className="space-y-1">
                          {orchestratorResponse.state.plan.map((step, index) => (
                            <div key={step.id} className="flex items-center gap-2 text-sm">
                              {index < orchestratorResponse.state.cursor ? (
                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                              ) : index === orchestratorResponse.state.cursor ? (
                                <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                              ) : (
                                <Clock className="h-3 w-3 text-gray-400" />
                              )}
                              <span>{step.description}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Add Certainty and Confidence */}
                    {orchestratorResponse.state.certainty !== undefined && (
                      <p className="text-sm text-muted-foreground">
                        Certainty: {(orchestratorResponse.state.certainty * 100).toFixed(0)}%
                      </p>
                    )}
                    {orchestratorResponse.confidence !== undefined && (
                      <p className="text-sm text-muted-foreground">
                        Confidence: {(orchestratorResponse.confidence * 100).toFixed(0)}%
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Prompt Dials Card */}
            {orchestratorResponse.dials && (
              <Card>
                <CardHeader>
                  <CardTitle>Prompt Dials</CardTitle>
                  <CardDescription>Meta-prompting control parameters</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Preset: <Badge variant="outline">{orchestratorResponse.dials.preset}</Badge></div>
                    <div>Depth: {orchestratorResponse.dials.depth}/5</div>
                    <div>Breadth: {orchestratorResponse.dials.breadth}/5</div>
                    <div>Verbosity: {orchestratorResponse.dials.verbosity}/5</div>
                    <div>Creativity: {orchestratorResponse.dials.creativity}/5</div>
                    <div>Evidence: {orchestratorResponse.dials.evidence_strictness}/5</div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Prompt Blueprint Card */}
            {orchestratorResponse.prompt_blueprint && (
              <Card>
                <CardHeader>
                  <CardTitle>Prompt Blueprint</CardTitle>
                  <CardDescription>P-I-R-O Structure</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <p className="text-sm font-medium">Purpose:</p>
                    <p className="text-sm text-muted-foreground">{orchestratorResponse.prompt_blueprint.purpose}</p>
                  </div>
                  {orchestratorResponse.prompt_blueprint.instructions?.length > 0 && (
                    <div>
                      <p className="text-sm font-medium">Instructions:</p>
                      <ul className="text-sm text-muted-foreground list-disc list-inside">
                        {orchestratorResponse.prompt_blueprint.instructions.map((inst: string, i: number) => (
                          <li key={i}>{inst}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {orchestratorResponse.public_rationale && (
                    <div>
                      <p className="text-sm font-medium">Rationale:</p>
                      <p className="text-sm text-muted-foreground">{orchestratorResponse.public_rationale}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Events Timeline */}
            {events.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Event Timeline</CardTitle>
                  <CardDescription>{events.length} events recorded</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {events.map((event, index) => (
                      <div key={index} className="flex items-start gap-2 text-sm">
                        <span className="font-medium">{event.type}:</span>
                        <span className="text-muted-foreground">
                          {typeof event.data === 'string' 
                            ? event.data 
                            : JSON.stringify(event.data, null, 2).substring(0, 100)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            </TabsContent>
          </Tabs>
          )}
        </div>
      </div>
    </div>
  );
}