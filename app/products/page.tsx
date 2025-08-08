import { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { ProductInterface } from '@/components/products/product-interface';

export const metadata: Metadata = {
  title: 'AI Prompt Optimizer - PromptDial',
  description: 'Transform your ideas into powerful AI prompts that get 10x better results',
};

export default async function ProductsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect('/login');
  }

  // TODO: Fetch user credits from database
  // For now, we'll pass undefined and handle it in the component
  const userCredits = undefined;

  return <ProductInterface userId={session.user.id} userCredits={userCredits} />;
}