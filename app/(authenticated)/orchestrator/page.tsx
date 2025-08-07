import { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { OrchestrationInterface } from '@/components/orchestrator/orchestration-interface';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InfoIcon } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Prompt Dial Orchestrator',
  description: 'AI-powered task orchestration with planning, execution, and verification',
};

export default async function OrchestratorPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect('/sign-in');
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Prompt Dial Orchestrator</h1>
          <p className="text-muted-foreground mt-2">
            Transform your goals into actionable plans with AI-driven orchestration
          </p>
        </div>

        <Alert>
          <InfoIcon className="h-4 w-4" />
          <AlertDescription>
            The orchestrator uses a three-stage process: Planning (breaks down your goal), 
            Execution (carries out the plan), and Verification (ensures quality and safety). 
            Each orchestration consumes credits based on token usage.
          </AlertDescription>
        </Alert>

        <OrchestrationInterface userId={session.user.id} />
      </div>
    </div>
  );
}