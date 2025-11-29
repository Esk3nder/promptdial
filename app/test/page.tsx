import { Metadata } from 'next';
import { redirect, notFound } from 'next/navigation';
import { DialInterface } from '@/components/dial/dial-interface';

export const metadata: Metadata = {
  title: 'Test - PromptDial',
  description: 'Local testing page for prompt optimization',
};

/**
 * Test page for local development
 * Renders the dial interface without requiring authentication
 * Only available in development mode - returns 404 in production
 */
export default function TestPage() {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  return <DialInterface userId="test-user" userCredits={999} />;
}
