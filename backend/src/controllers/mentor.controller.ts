import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middleware/auth.middleware";
import { rankMentors } from "../lib/mentor-ranking";

const listSchema = z.object({
  lifeEvent: z.string().optional(),
  availability: z.enum(["true", "false"]).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const rankedSearchSchema = z.object({
  q: z.string().trim().max(300).optional(),
  lifeEvents: z.string().optional(),
  availability: z.enum(["AVAILABLE", "ANY"]).optional(),
  limit: z.coerce.number().int().min(1).max(30).default(12),
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

export async function rankedMentorSearch(req: AuthRequest, res: Response): Promise<void> {
  const parsed = rankedSearchSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const seekerId = req.auth!.sub;
  const { q, lifeEvents, availability, limit } = parsed.data;
  const selectedLifeEvents = lifeEvents
    ? lifeEvents
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
    : [];

  const [seeker, mentors] = await Promise.all([
    prisma.user.findUnique({
      where: { id: seekerId },
      select: {
        bio: true,
        languages: true,
        userLifeEvents: { select: { lifeEvent: { select: { slug: true } } } },
      },
    }),
    prisma.user.findMany({
      where: { role: "MENTOR", isBanned: false },
      select: {
        id: true,
        name: true,
        avatar: true,
        bio: true,
        location: true,
        languages: true,
        isVerified: true,
        mentorProfile: {
          select: {
            tagline: true,
            yearsExperience: true,
            isAvailable: true,
            rating: true,
            reviewCount: true,
          },
        },
        userLifeEvents: {
          select: {
            status: true,
            lifeEvent: { select: { slug: true, label: true, description: true } },
          },
        },
      },
    }),
  ]);

  if (!seeker) {
    res.status(404).json({ error: "Seeker profile not found." });
    return;
  }

  const ranked = rankMentors({
    seeker: {
      bio: seeker.bio,
      languages: seeker.languages,
      lifeEvents: seeker.userLifeEvents.map((entry) => entry.lifeEvent.slug),
    },
    mentors: mentors.map((mentor) => ({
      id: mentor.id,
      name: mentor.name,
      avatar: mentor.avatar,
      bio: mentor.bio,
      location: mentor.location,
      languages: mentor.languages,
      isVerified: mentor.isVerified,
      tagline: mentor.mentorProfile?.tagline,
      rating: mentor.mentorProfile?.rating,
      reviewCount: mentor.mentorProfile?.reviewCount,
      yearsExperience: mentor.mentorProfile?.yearsExperience,
      isAvailable: mentor.mentorProfile?.isAvailable ?? false,
      lifeEvents: mentor.userLifeEvents.map((entry) => ({
        slug: entry.lifeEvent.slug,
        label: entry.lifeEvent.label,
        status: entry.status,
        description: entry.lifeEvent.description,
      })),
    })),
    query: q,
    selectedLifeEvents,
    onlyAvailable: availability === "AVAILABLE",
    limit,
  });

  res.json({
    query: q ?? "",
    filters: { selectedLifeEvents, availability: availability ?? "ANY" },
    interpretation: ranked.interpretation,
    mentors: ranked.mentors,
  });
}
