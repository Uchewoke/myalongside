import { Router, Response } from "express";
import Stripe from "stripe";
import { prisma } from "../lib/prisma";
import { AuthRequest, requireAuth } from "../middleware/auth.middleware";

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2024-06-20",
});

const FRONTEND_URL = process.env.FRONTEND_URL ?? process.env.WEB_URL ?? "http://localhost:3000";

router.post("/create-checkout-session", requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.auth?.sub;
  const { priceId } = req.body as { priceId?: string };

  if (!userId) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }

  if (!priceId) {
    res.status(400).json({ error: "priceId is required." });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, stripeCustomerId: true },
  });

  if (!user) {
    res.status(404).json({ error: "User not found." });
    return;
  }

  try {
    let customerId = user.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id },
      });
      customerId = customer.id;

      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId },
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${FRONTEND_URL}/upgrade/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${FRONTEND_URL}/upgrade?canceled=1`,
      client_reference_id: user.id,
      metadata: {
        userId: user.id,
        priceId,
      },
    });

    res.json({ url: session.url });
  } catch {
    res.status(500).json({ error: "Failed to create checkout session." });
  }
});

export default router;
