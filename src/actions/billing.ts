"use server";

import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/client";
import { PLAN_CATALOG, type PlanId } from "@/lib/stripe/plans";

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export async function startCheckoutAction(formData: FormData) {
  const planId = formData.get("plan") as PlanId | null;
  const plan = PLAN_CATALOG.find((p) => p.id === planId);
  if (!plan) return;

  const priceId = process.env[plan.priceIdEnv];
  if (!priceId) throw new Error(`${plan.priceIdEnv} não configurado`);

  const ctx = await requireRole(["admin"]);
  const stripe = getStripe();
  const supabase = createAdminClient();

  const { data: ws } = await supabase
    .from("workspaces")
    .select("id, name, stripe_customer_id")
    .eq("id", ctx.workspace.id)
    .maybeSingle();
  const workspace = ws as {
    id: string;
    name: string;
    stripe_customer_id: string | null;
  } | null;
  if (!workspace) return;

  let customerId = workspace.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: ctx.user.email ?? undefined,
      name: workspace.name,
      metadata: { workspace_id: workspace.id },
    });
    customerId = customer.id;
    await supabase
      .from("workspaces")
      .update({ stripe_customer_id: customerId } as never)
      .eq("id", workspace.id);
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: "subscription",
    subscription_data: {
      trial_period_days: 14,
      metadata: { workspace_id: workspace.id },
    },
    success_url: `${getAppUrl()}/dashboard/billing?success=true`,
    cancel_url: `${getAppUrl()}/dashboard/billing?cancelled=true`,
    locale: "pt-BR",
    allow_promotion_codes: true,
  });

  if (session.url) redirect(session.url);
}

export async function openPortalAction() {
  const ctx = await requireRole(["admin"]);
  const stripe = getStripe();
  const supabase = createAdminClient();

  const { data: ws } = await supabase
    .from("workspaces")
    .select("stripe_customer_id")
    .eq("id", ctx.workspace.id)
    .maybeSingle();
  const customerId = (ws as { stripe_customer_id: string | null } | null)
    ?.stripe_customer_id;
  if (!customerId) return;

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${getAppUrl()}/dashboard/billing`,
  });
  redirect(session.url);
}
