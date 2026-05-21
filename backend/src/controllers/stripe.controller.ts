import { Request, Response } from "express";
import Stripe from "stripe";
import { prisma } from "../lib/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2024-06-20",
});

function tierFromPriceId(priceId?: string | null): "FREE" | "PREMIUM" | "PRO" {
  if (!priceId) return "PREMIUM";

  const premiumPriceId = process.env.STRIPE_PRICE_PREMIUM;
  const proPriceId = process.env.STRIPE_PRICE_PRO;

  if (proPriceId && priceId === proPriceId) return "PRO";
  if (premiumPriceId && priceId === premiumPriceId) return "PREMIUM";
  if (priceId.toLowerCase().includes("pro")) return "PRO";

  return "PREMIUM";
}

export async function handleStripeWebhook(req: Request, res: Response): Promise<void> {
  const signature = req.headers["stripe-signature"];

  if (typeof signature !== "string") {
    res.status(400).send("Missing Stripe signature header.");
    return;
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET as string
    );
  } catch (err) {
    res.status(400).send(`Webhook Error: ${(err as Error).message}`);
    return;
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId =
        session.client_reference_id ??
        (typeof session.metadata?.userId === "string" ? session.metadata.userId : undefined);

      let priceId: string | null =
        typeof session.metadata?.priceId === "string" ? session.metadata.priceId : null;

      if (!priceId) {
        const withItems = await stripe.checkout.sessions.retrieve(session.id, {
          expand: ["line_items.data.price"],
        });
        const firstItem = withItems.line_items?.data?.[0];
        priceId = typeof firstItem?.price === "string" ? firstItem.price : firstItem?.price?.id ?? null;
      }

      if (userId) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            subscriptionTier: tierFromPriceId(priceId),
            stripeCustomerId:
              typeof session.customer === "string" ? session.customer : undefined,
          },
        });
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      if (typeof subscription.customer === "string") {
        await prisma.user.updateMany({
          where: { stripeCustomerId: subscription.customer },
          data: { subscriptionTier: "FREE" },
        });
      }
    }

    res.json({ received: true });
  } catch {
    res.status(500).json({ error: "Failed to process Stripe webhook." });
  }
}
