'use client';

import { useState, useEffect } from 'react';
import { notFound } from 'next/navigation';
import { DialInterface } from '@/components/dial/dial-interface';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Key } from 'lucide-react';

/**
 * Test page for local development
 * Renders the dial interface without requiring authentication
 * Only available in development mode - returns 404 in production
 */
export default function TestPage() {
  const [apiKey, setApiKey] = useState('');
  const [mounted, setMounted] = useState(false);

  // Only allow in development (checked client-side since we're a client component)
  useEffect(() => {
    setMounted(true);
    // Load saved key from localStorage
    const saved = localStorage.getItem('dev-anthropic-key');
    if (saved) setApiKey(saved);
  }, []);

  const handleKeyChange = (key: string) => {
    setApiKey(key);
    localStorage.setItem('dev-anthropic-key', key);
  };

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen">
      {/* Dev API Key Banner */}
      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800">
        <div className="container mx-auto max-w-7xl">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
              <Key className="h-4 w-4" />
              <Label htmlFor="api-key" className="text-sm font-medium whitespace-nowrap">
                Anthropic API Key (dev only)
              </Label>
            </div>
            <Input
              id="api-key"
              type="password"
              value={apiKey}
              onChange={(e) => handleKeyChange(e.target.value)}
              placeholder="sk-ant-..."
              className="max-w-md bg-white dark:bg-gray-900"
            />
            {apiKey && (
              <span className="text-xs text-green-600 dark:text-green-400 whitespace-nowrap">
                Key saved
              </span>
            )}
          </div>
        </div>
      </div>

      <DialInterface userId="test-user" userCredits={999} apiKey={apiKey} />
    </div>
  );
}
