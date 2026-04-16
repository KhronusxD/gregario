import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlanFromPriceId } from "@/lib/stripe/plans";
import { sendWhatsAppText } from "@/lib/whatsapp/evolution";

export const runtime = "nodejs";

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const workspaceId = subscription.metadata.workspace_id;
  if (!workspaceId) return;
  const priceId = subscription.items.data[0]?.price.id;
  if (!priceId) return;
  const plan = getPlanFromPriceId(priceId);

  const supabase = createAdminClient();
  const trialEnd = subscription.trial_end
    ? new Date(subscription.trial_end * 1000).toISOString()
    : null;
  const planStatus: "trial" | "active" | "past_due" | "canceled" =
    subscription.status === "trialing"
      ? "trial"
      : subscription.status === "active"
        ? "active"
        : subscription.status === "past_due"
          ? "past_due"
          : subscription.status === "canceled"
            ? "canceled"
            : "active";

  await supabase
    .from("workspaces")
    .update({
      stripe_subscription_id: subscription.id,
      plan,
      plan_status: planStatus,
      trial_ends_at: trialEnd,
    } as never)
    .eq("id", workspaceId);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const workspaceId = subscription.metadata.workspace_id;
  if (!workspaceId) return;
  const supabase = createAdminClient();
  await supabase
    .from("workspaces")
    .update({
      plan_status: "canceled",
      ia_active: false,
      whatsapp_active: false,
    } as never)
    .eq("id", workspaceId);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = typeof invoice.customer === "string" ? invoice.customer : null;
  if (!customerId) return;

  const supabase = createAdminClient();
  const { data: ws } = await supabase
    .from("workspaces")
    .select("id, evolution_instance, phone")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  const workspace = ws as {
    id: string;
    evolution_instance: string | null;
    phone: string | null;
  } | null;
  if (!workspace) return;

  await supabase
    .from("workspaces")
    .update({ plan_status: "past_due" } as never)
    .eq("id", workspace.id);

  if (workspace.evolution_instance && workspace.phone) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    try {
      await sendWhatsAppText({
        instanceName: workspace.evolution_instance,
        phone: workspace.phone,
        text: `⚠️ *Gregário — Pagamento não processado*\n\nHouve um problema com o pagamento da sua assinatura. Acesse o painel para atualizar seu método de pagamento e evitar interrupção do serviço.\n\n${appUrl}/dashboard/billing`,
      });
    } catch (err) {
      console.error("[stripe webhook] notify admin failed:", err);
    }
  }
}

export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) {
    return new Response("Webhook signature missing", { status: 400 });
  }

  const body = await req.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch (err) {
    console.error("[stripe webhook] signature error:", err);
    return new Response("Webhook signature invalid", { status: 400 });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
    }
  } catch (err) {
    console.error("[stripe webhook] handler error:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
