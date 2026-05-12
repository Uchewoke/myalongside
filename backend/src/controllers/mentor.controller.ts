import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middleware/auth.middleware";

const listSchema = z.object({
  lifeEvent: z.string().optional(),
  availability: z.enum(["true", "false"]).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export async function listMentors(req: Request, res: Response): Promise<void> {
  const parsed = listSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { lifeEvent, availability, page, limit } = parsed.data;

  const where = {
    role: "MENTOR" as const,
    isBanned: false,
    ...(availability !== undefined
      ? { mentorProfile: { isAvailable: availability === "true" } }
      : {}),
    ...(lifeEvent
      ? {
          userLifeEvents: {
            some: { lifeEvent: { slug: lifeEvent } },
          },
        }
      : {}),
  };

  const [mentors, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        name: true,
        avatar: true,
        location: true,
        languages: true,
        isVerified: true,
        mentorProfile: true,
        userLifeEvents: {
          select: {
            status: true,
            lifeEvent: { select: { slug: true, label: true, emoji: true } },
          },
        },
      },
      orderBy: { mentorProfile: { rating: "desc" } },
    }),
    prisma.user.count({ where }),
  ]);

  res.json({ mentors, total, page, pages: Math.ceil(total / limit) });
}

export async function getMentor(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };

  const mentor = await prisma.user.findFirst({
    where: { id, role: "MENTOR", isBanned: false },
    select: {
      id: true,
      name: true,
      avatar: true,
      bio: true,
      location: true,
      languages: true,
      isVerified: true,
      createdAt: true,
      mentorProfile: true,
      userLifeEvents: {
        select: {
          status: true,
          lifeEvent: { select: { slug: true, label: true, emoji: true, description: true } },
        },
      },
    },
  });

  if (!mentor) {
    res.status(404).json({ error: "Mentor not found." });
    return;
  }

  res.json(mentor);
}
