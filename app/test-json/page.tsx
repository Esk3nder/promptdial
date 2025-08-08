'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

export default function TestJSONPage() {
  const [prompt, setPrompt] = useState('tell me a joke');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);

  const testMinimalJSON = async () => {
    setLoading(true);
    setResponse(null);
    
    try {
      const res = await fetch('/api/test-json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      
      const data = await res.json();
      setResponse(data);
    } catch (err) {
      setResponse({ error: String(err) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Test JSON Output</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Minimal JSON Test</CardTitle>
          <CardDescription>Testing if Claude can output pure JSON</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter test prompt..."
            rows={3}
          />
          
          <Button 
            onClick={testMinimalJSON}
            disabled={loading || !prompt}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              'Test Minimal JSON'
            )}
          </Button>
        </CardContent>
      </Card>

      {response && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Result
              {response.success ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {response.success ? (
              <div className="space-y-4">
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Successfully parsed as JSON!
                  </AlertDescription>
                </Alert>
                
                <div>
                  <h3 className="font-semibold mb-2">Parsed JSON:</h3>
                  <pre className="bg-gray-100 p-4 rounded overflow-x-auto">
                    {JSON.stringify(response.parsed, null, 2)}
                  </pre>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2">Raw Response:</h3>
                  <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-sm">
                    {response.raw}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Alert className="border-red-200 bg-red-50">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    Failed to parse as JSON: {response.error}
                  </AlertDescription>
                </Alert>
                
                <div>
                  <h3 className="font-semibold mb-2">Raw Response:</h3>
                  <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-sm">
                    {response.raw}
                  </pre>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}