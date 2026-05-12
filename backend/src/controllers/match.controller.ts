import { Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middleware/auth.middleware";

const createSchema = z.object({
  mentorId: z.string().cuid(),
  lifeEventSlug: z.string().optional(),
  note: z.string().max(500).optional(),
});

const statusSchema = z.object({
  status: z.enum(["ACTIVE", "PAUSED", "COMPLETED", "DECLINED"]),
});

export async function createMatch(req: AuthRequest, res: Response): Promise<void> {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const seekerId = req.auth!.sub;
  const { mentorId, lifeEventSlug, note } = parsed.data;

  if (seekerId === mentorId) {
    res.status(400).json({ error: "Cannot match with yourself." });
    return;
  }

  const mentor = await prisma.user.findFirst({
    where: { id: mentorId, role: "MENTOR", isBanned: false },
  });
  if (!mentor) {
    res.status(404).json({ error: "Mentor not found." });
    return;
  }

  const existing = await prisma.match.findUnique({
    where: { seekerId_mentorId: { seekerId, mentorId } },
  });
  if (existing) {
    res.status(409).json({ error: "Match already exists.", match: existing });
    return;
  }

  let lifeEventId: string | undefined;
  if (lifeEventSlug) {
    const le = await prisma.lifeEvent.findUnique({ where: { slug: lifeEventSlug } });
    if (le) lifeEventId = le.id;
  }

  const match = await prisma.match.create({
    data: {
      seekerId,
      mentorId,
      lifeEventId,
      initiatorNote: note,
      conversation: { create: {} },
    },
    include: { conversation: true },
  });

  res.status(201).json(match);
}

export async function listMyMatches(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.auth!.sub;
  const role = req.auth!.role;

  const matches = await prisma.match.findMany({
    where:
      role === "MENTOR"
        ? { mentorId: userId }
        : { seekerId: userId },
    include: {
      seeker: { select: { id: true, name: true, avatar: true } },
      mentor: {
        select: {
          id: true,
          name: true,
          avatar: true,
          mentorProfile: { select: { tagline: true, rating: true } },
        },
      },
      conversation: { select: { id: true, updatedAt: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  res.json(matches);
}

export async function updateMatchStatus(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const userId = req.auth!.sub;
  const match = await prisma.match.findUnique({ where: { id } });

  if (!match) {
    res.status(404).json({ error: "Match not found." });
    return;
  }

  if (match.seekerId !== userId && match.mentorId !== userId) {
    res.status(403).json({ error: "Not your match." });
    return;
  }

  const updated = await prisma.match.update({
    where: { id },
    data: { status: parsed.data.status },
  });

  res.json(updated);
}
