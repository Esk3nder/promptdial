'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, Play, AlertCircle, CheckCircle2, XCircle, Clock, Zap } from 'lucide-react';
import { OrchestrationResponse, OrchestrationState, OrchestrationEvent } from '@/lib/orchestrator/types';

interface OrchestrationInterfaceProps {
  userId?: string;
}

export function OrchestrationInterface({ userId }: OrchestrationInterfaceProps) {
  const [userGoal, setUserGoal] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [response, setResponse] = useState<OrchestrationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [events, setEvents] = useState<OrchestrationEvent[]>([]);

  const runOrchestration = useCallback(async () => {
    if (!userGoal.trim()) {
      setError('Please enter a goal');
      return;
    }

    setIsRunning(true);
    setError(null);
    setResponse(null);
    setEvents([]);

    try {
      const res = await fetch('/api/orchestrator/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userGoal,
          runId: runId || undefined,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Orchestration failed');
      }

      const data: OrchestrationResponse = await res.json();
      setResponse(data);
      setEvents(data.events || []);

      // If successful, clear the input
      if (data.next_action === 'done') {
        setUserGoal('');
        setRunId(null);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsRunning(false);
    }
  }, [userGoal, runId]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'done':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'execute':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'clarify':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getEventIcon = (type: string) => {
    if (type.includes('error')) return <XCircle className="h-3 w-3 text-red-500" />;
    if (type.includes('warning')) return <AlertCircle className="h-3 w-3 text-yellow-500" />;
    if (type.includes('completed')) return <CheckCircle2 className="h-3 w-3 text-green-500" />;
    return <Zap className="h-3 w-3 text-blue-500" />;
  };

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle>Prompt Dial Orchestrator</CardTitle>
          <CardDescription>
            Enter your goal and let the AI orchestrate a plan to achieve it
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Textarea
              placeholder="Enter your goal... (e.g., 'Research the latest AI developments and create a summary')"
              value={userGoal}
              onChange={(e) => setUserGoal(e.target.value)}
              disabled={isRunning}
              className="min-h-[100px]"
            />
            <Button 
              onClick={runOrchestration} 
              disabled={isRunning || !userGoal.trim()}
              className="w-full"
            >
              {isRunning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Orchestrating...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Run Orchestration
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Response Display */}
      {response && (
        <>
          {/* Status Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  Status
                  {getStatusIcon(response.next_action)}
                </CardTitle>
                <Badge variant={response.ok ? 'default' : 'destructive'}>
                  {response.next_action}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {response.final_answer && (
                <div className="space-y-2">
                  <h4 className="font-semibold">Final Answer:</h4>
                  <div className="p-4 bg-muted rounded-lg whitespace-pre-wrap">
                    {response.final_answer}
                  </div>
                </div>
              )}
              {response.refusal_reason && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Request Refused</AlertTitle>
                  <AlertDescription>{response.refusal_reason}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Plan Display */}
          {response.state?.plan && response.state.plan.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Execution Plan</CardTitle>
                <CardDescription>
                  Step {response.state.cursor + 1} of {response.state.plan.length}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {response.state.plan.map((step, index) => (
                    <div
                      key={step.id}
                      className={`flex items-start gap-3 p-3 rounded-lg ${
                        index < response.state.cursor
                          ? 'bg-green-50 dark:bg-green-950'
                          : index === response.state.cursor
                          ? 'bg-blue-50 dark:bg-blue-950'
                          : 'bg-muted'
                      }`}
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        {index < response.state.cursor ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : index === response.state.cursor ? (
                          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                        ) : (
                          <Clock className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{step.description}</p>
                        {step.toolCall && (
                          <Badge variant="outline" className="mt-1">
                            {step.toolCall.tool}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Events Timeline */}
          {events.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Event Timeline</CardTitle>
                <CardDescription>
                  {events.length} events recorded
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {events.map((event, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm">
                      <div className="flex-shrink-0 mt-0.5">
                        {getEventIcon(event.type)}
                      </div>
                      <div className="flex-1">
                        <span className="font-medium">{event.type}</span>
                        {event.data && (
                          <span className="text-muted-foreground ml-2">
                            {typeof event.data === 'string' 
                              ? event.data 
                              : JSON.stringify(event.data, null, 2).substring(0, 100)}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}