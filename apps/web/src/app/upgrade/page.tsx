"use client";

import React, { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { API_BASE } from "@/lib/constants";
import { useAuthStore } from "@/store/useAuthStore";

type Tier = "FREE" | "PREMIUM" | "PRO";

const plans: Array<{
  name: "PREMIUM" | "PRO";
  label: string;
  price: string;
  features: string[];
  priceId: string;
}> = [
  {
    name: "PREMIUM",
    label: "Premium",
    price: "$19/mo",
    features: [
      "Mentor Copilot (AI)",
      "Empathy Drafting",
      "Follow-up Suggestions",
      "Boundary Language Checker",
      "Resource Recommendations",
      "Priority Support",
    ],
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PREMIUM ?? "price_1Premium",
  },
  {
    name: "PRO",
    label: "Pro",
    price: "$49/mo",
    features: [
      "All Premium features",
      "API Access",
      "Priority Matching",
      "Early Access to New Tools",
    ],
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO ?? "price_1Pro",
  },
];

export default function UpgradePage() {
  const params = useSearchParams();
  const canceled = params.get("canceled") === "1";

  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);

  const [loadingPlan, setLoadingPlan] = useState<null | "PREMIUM" | "PRO">(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentTier: Tier = (user?.subscriptionTier as Tier) ?? "FREE";
  const hasPaidPlan = currentTier === "PREMIUM" || currentTier === "PRO";

  const statusText = useMemo(() => {
    if (currentTier === "PRO") return "You are on Pro.";
    if (currentTier === "PREMIUM") return "You are on Premium.";
    return "You are on Free.";
  }, [currentTier]);

  const authHeaders = token
    ? {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      }
    : { "Content-Type": "application/json" };

  const handleUpgrade = async (plan: (typeof plans)[number]) => {
    if (!token) {
      setError("Please sign in to upgrade your subscription.");
      return;
    }

    setLoadingPlan(plan.name);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/stripe/create-checkout-session`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ priceId: plan.priceId }),
      });

      const data = await response.json();

      if (!response.ok || !data.url) {
        throw new Error(data.error ?? "Unable to start checkout.");
      }

      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start checkout.");
      setLoadingPlan(null);
    }
  };

  const handleManageSubscription = async () => {
    if (!token) {
      setError("Please sign in to manage your subscription.");
      return;
    }

    setPortalLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_BASE}/api/stripe-portal/create-customer-portal-session`,
        {
          method: "POST",
          headers: authHeaders,
        }
      );

      const data = await response.json();

      if (!response.ok || !data.url) {
        throw new Error(data.error ?? "Unable to open billing portal.");
      }

      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to open billing portal.");
      setPortalLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-stone-900">Upgrade Your Plan</h1>
        <p className="text-stone-600">Choose the plan that matches your mentorship goals.</p>
      </div>

      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-center">
        <p className="font-medium text-blue-900">Current plan: {currentTier}</p>
        <p className="text-sm text-blue-700">{statusText}</p>
      </div>

      {canceled && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-800">
          Checkout was canceled. Your subscription has not changed.
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-rose-800">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {plans.map((plan) => {
          const isCurrent = currentTier === plan.name;
          const isLoading = loadingPlan === plan.name;

          return (
            <div
              key={plan.name}
              className="border rounded-2xl p-6 shadow-sm bg-white flex flex-col gap-4"
            >
              <div>
                <h2 className="text-xl font-semibold text-stone-900">{plan.label}</h2>
                <p className="text-2xl font-bold text-stone-900 mt-1">{plan.price}</p>
              </div>

              <ul className="list-disc list-inside text-stone-700 space-y-1 text-sm">
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>

              <button
                className="mt-auto bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-5 py-2.5 rounded-lg shadow hover:shadow-md transition disabled:opacity-60 disabled:cursor-not-allowed"
                onClick={() => handleUpgrade(plan)}
                disabled={isCurrent || isLoading}
              >
                {isCurrent ? "Current Plan" : isLoading ? "Redirecting..." : `Choose ${plan.label}`}
              </button>
            </div>
          );
        })}
      </div>

      {hasPaidPlan && (
        <div className="text-center pt-2">
          <button
            className="bg-stone-800 text-white px-6 py-2.5 rounded-lg shadow hover:bg-stone-900 transition disabled:opacity-60"
            onClick={handleManageSubscription}
            disabled={portalLoading}
          >
            {portalLoading ? "Opening billing portal..." : "Manage Subscription (Downgrade/Cancel)"}
          </button>
        </div>
      )}
    </div>
  );
}
