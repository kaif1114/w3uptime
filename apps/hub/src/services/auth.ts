


const { prisma } = require("db/client");
import express, { Request, Response, NextFunction } from "express";

export async function checkAuthentication(req: express.Request): Promise<string | null> {
  const sessionId = req.cookies?.sessionId;
  console.log(sessionId);
  if (!sessionId) {
    return null;
  }

  try {
    const session = await prisma.session.findUnique({
      where: {  sessionId }
    });

    if (!session || session.expiresAt < new Date()) {
      return null;
    }

    return session.userId;
  } catch (error) {
    console.error("Authentication error:", error);
    return null;
  }
}

declare global {
  namespace Express {
    interface Request {
      userId: string;
    }
  }
}

export const authenticateUser = async (req: Request, res: Response, next: NextFunction) => {
  const userId = await checkAuthentication(req);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  req.userId = userId;
  next();
};