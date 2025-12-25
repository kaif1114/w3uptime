import "server-only";
import { cookies } from "next/headers";
import { prisma } from "db/client";

export async function getSessionOnServer() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("sessionId")?.value;
  if (!sessionId) {
    return { success: false, authenticated: false };
  }
  const session = await prisma.session.findUnique({
    where: { sessionId },
    include: {
      user: {
        select: {
          id: true,
          walletAddress: true,
          createdAt: true,
          updatedAt: true,
          balance: true
        },
      },
    },
  });



  if (!session) {
    return { success: false, authenticated: false };
  }

  if (new Date() > session.expiresAt) {
    console.log("Server session expired");
    return { success: false, authenticated: false };
  }

  return {
    success: true,
    authenticated: true,
    user: {
      ...session.user,
      balance: session.user.balance ? BigInt(session.user.balance.toString()).toString() : "0"
    },
    session: {
      id: session.id,
      walletAddress: session.walletAddress,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      userAgent: session.userAgent ?? undefined,
      ipAddress: session.ipAddress ?? undefined,
    },
  };
}


