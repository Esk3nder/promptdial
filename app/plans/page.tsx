'use client';

import PricingTable from '@/components/autumn/pricing-table';
import StaticPricingTable from '@/components/static-pricing-table';
import { useSession } from '@/lib/auth-client';

// Static product details for unauthenticated users
const staticProducts = [
  {
    id: "free",
    name: "Starter",
    description: "Perfect for individuals and small projects",
    price: {
      primaryText: "Free",
      secondaryText: "No credit card required"
    },
    items: [
      { 
        primaryText: "1,000 API calls/month",
        secondaryText: "Across all supported LLMs"
      },
      {
        primaryText: "GPT-3.5 & Claude Haiku",
        secondaryText: "Access to cost-effective models"
      },
      {
        primaryText: "Basic conversation history",
        secondaryText: "Last 7 days of conversations"
      },
      {
        primaryText: "Community support",
        secondaryText: "Get help from our community"
      }
    ]
  },
  {
    id: "pro",
    name: "Pro",
    description: "For teams and growing startups",
    recommendText: "Most Popular",
    price: {
      primaryText: "$49/month",
      secondaryText: "billed monthly"
    },
    items: [
      { 
        primaryText: "50,000 API calls/month",
        secondaryText: "Across all supported LLMs"
      },
      {
        primaryText: "All LLM providers",
        secondaryText: "GPT-4, Claude 3, Gemini Pro & more"
      },
      {
        primaryText: "Advanced routing & optimization",
        secondaryText: "Intelligent model selection"
      },
      {
        primaryText: "Full conversation history",
        secondaryText: "Unlimited retention"
      },
      {
        primaryText: "Priority support",
        secondaryText: "Email & chat support"
      },
      {
        primaryText: "API access",
        secondaryText: "Integrate with your applications"
      }
    ]
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "For large organizations",
    price: {
      primaryText: "Custom",
      secondaryText: "Contact sales"
    },
    items: [
      { 
        primaryText: "Unlimited API calls",
        secondaryText: "No usage limits"
      },
      {
        primaryText: "Custom model selection",
        secondaryText: "Fine-tuned models & private deployments"
      },
      {
        primaryText: "Advanced analytics",
        secondaryText: "Detailed usage and cost reports"
      },
      {
        primaryText: "SLA & dedicated support",
        secondaryText: "99.9% uptime guarantee"
      },
      {
        primaryText: "SSO & compliance",
        secondaryText: "SAML, SOC2, HIPAA ready"
      }
    ]
  }
];

export default function PricingPage() {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-[3rem] lg:text-[4.5rem] font-bold tracking-tight mb-6">
            <span className="bg-gradient-to-tr from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Simple, transparent pricing
            </span>
          </h1>
          <p className="text-xl text-zinc-600 max-w-2xl mx-auto">
            Choose the perfect orchestration plan for your AI needs. Scale up or down anytime.
          </p>
          {session && (
            <p className="text-sm text-zinc-500 mt-4">
              Logged in as: {session.user?.email}
            </p>
          )}
        </div>

        <div className="bg-white rounded-[20px] shadow-xl p-8 border border-zinc-200">
          {/* Use static component for unauthenticated users to avoid API calls */}
          {session ? (
            <PricingTable />
          ) : (
            <StaticPricingTable products={staticProducts} />
          )}
        </div>
      </div>
    </div>
  );
}