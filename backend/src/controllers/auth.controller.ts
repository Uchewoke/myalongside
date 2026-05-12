import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../lib/prisma";

const JWT_SECRET = process.env.JWT_SECRET ?? "change-this-secret-in-production";
const REFRESH_SECRET = process.env.REFRESH_SECRET ?? "change-this-refresh-secret";
const ACCESS_EXPIRY = "15m";
const REFRESH_EXPIRY = "7d";

const signupSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  role: z.enum(["SEEKER", "MENTOR"]).optional().default("SEEKER"),
  lifeEventSlugs: z.array(z.string()).optional().default([]),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function issueAccessToken(userId: string, role: string) {
  return jwt.sign({ sub: userId, role }, JWT_SECRET, { expiresIn: ACCESS_EXPIRY });
}

function issueRefreshToken(userId: string) {
  return jwt.sign({ sub: userId }, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRY });
}

export async function signup(req: Request, res: Response): Promise<void> {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const { name, email, password, role, lifeEventSlugs } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: "Email already registered." });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role,
      userLifeEvents: {
        create: lifeEventSlugs.map((slug) => ({
          lifeEvent: { connect: { slug } },
        })),
      },
    },
    select: { id: true, name: true, email: true, role: true, avatar: true },
  });

  const accessToken = issueAccessToken(user.id, user.role);
  const rawRefresh = issueRefreshToken(user.id);
  const refreshHash = await bcrypt.hash(rawRefresh, 10);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: refreshHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  res.status(201).json({ user, accessToken, refreshToken: rawRefresh });
}

export async function login(req: Request, res: Response): Promise<void> {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid credentials." });
    return;
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    res.status(401).json({ error: "Invalid email or password." });
    return;
  }

  if (user.isBanned) {
    res.status(403).json({ error: "Account suspended." });
    return;
  }

  const accessToken = issueAccessToken(user.id, user.role);
  const rawRefresh = issueRefreshToken(user.id);
  const refreshHash = await bcrypt.hash(rawRefresh, 10);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: refreshHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  const { passwordHash: _ph, ...safeUser } = user;
  res.json({ user: safeUser, accessToken, refreshToken: rawRefresh });
}

export async function refreshToken(req: Request, res: Response): Promise<void> {
  const { refreshToken: token } = req.body as { refreshToken?: string };
  if (!token) {
    res.status(400).json({ error: "Refresh token required." });
    return;
  }

  let payload: jwt.JwtPayload;
  try {
    payload = jwt.verify(token, REFRESH_SECRET) as jwt.JwtPayload;
  } catch {
    res.status(401).json({ error: "Invalid or expired refresh token." });
    return;
  }

  const userId = payload.sub as string;
  const tokens = await prisma.refreshToken.findMany({
    where: { userId, expiresAt: { gt: new Date() } },
  });

  const matched = await Promise.any(
    tokens.map(async (t) => {
      const ok = await bcrypt.compare(token, t.tokenHash);
      if (ok) return t;
      throw new Error("no match");
    })
  ).catch(() => null);

  if (!matched) {
    res.status(401).json({ error: "Refresh token not recognised." });
    return;
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const newAccess = issueAccessToken(user.id, user.role);
  const newRaw = issueRefreshToken(user.id);
  const newHash = await bcrypt.hash(newRaw, 10);

  await prisma.refreshToken.delete({ where: { id: matched.id } });
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: newHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  res.json({ accessToken: newAccess, refreshToken: newRaw });
}

export async function logout(req: Request, res: Response): Promise<void> {
  const { refreshToken: token } = req.body as { refreshToken?: string };
  if (token) {
    try {
      const payload = jwt.verify(token, REFRESH_SECRET) as jwt.JwtPayload;
      const tokens = await prisma.refreshToken.findMany({
        where: { userId: payload.sub as string },
      });
      for (const t of tokens) {
        if (await bcrypt.compare(token, t.tokenHash)) {
          await prisma.refreshToken.delete({ where: { id: t.id } });
          break;
        }
      }
    } catch {
      /* silently ignore invalid token on logout */
    }
  }
  res.json({ ok: true });
}
