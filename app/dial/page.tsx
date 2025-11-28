import { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { DialInterface } from '@/components/dial/dial-interface';

export const metadata: Metadata = {
  title: 'Dial In Your Prompt - PromptDial',
  description: 'Transform lazy prompts into powerful, optimized AI prompts that get 10x better results',
};

export default async function DialPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect('/login');
  }

  // TODO: Fetch user credits from database
  // For now, we'll pass undefined and handle it in the component
  const userCredits = undefined;

  return <DialInterface userId={session.user.id} userCredits={userCredits} />;
}