import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";

const JWT_SECRET = process.env.JWT_SECRET ?? "change-this-secret-in-production";
const ADMIN_SERVICE_TOKEN = process.env.ADMIN_SERVICE_TOKEN;

export interface AuthPayload {
  sub: string;
  role: string;
}

export interface AuthRequest extends Request {
  auth?: AuthPayload;
}

export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthPayload;
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, isBanned: true, deletedAt: true },
    });

    if (!user) {
      res.status(401).json({ error: "Account not found." });
      return;
    }

    if (user.deletedAt) {
      res.status(410).json({ error: "Account deactivated." });
      return;
    }

    if (user.isBanned) {
      res.status(403).json({ error: "Account suspended." });
      return;
    }

    req.auth = payload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token." });
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      res.status(403).json({ error: "Insufficient permissions." });
      return;
    }
    next();
  };
}

export function requireAdminAccess(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const serviceToken = req.headers["x-admin-service-token"];
  if (
    typeof ADMIN_SERVICE_TOKEN === "string" &&
    ADMIN_SERVICE_TOKEN.length > 0 &&
    serviceToken === ADMIN_SERVICE_TOKEN
  ) {
    next();
    return;
  }

  requireAuth(req, res, () => {
    if (req.auth?.role !== "ADMIN") {
      res.status(403).json({ error: "Admin access required." });
      return;
    }

    next();
  });
}
