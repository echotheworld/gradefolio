import { prisma } from "./prisma";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export async function checkRateLimit(key: string): Promise<{ allowed: boolean; remainingAttempts: number; retryAfterMinutes?: number }> {
  try {
    const attempt = await prisma.loginAttempt.findUnique({
      where: { key },
    });

    if (!attempt) {
      return { allowed: true, remainingAttempts: MAX_FAILED_ATTEMPTS };
    }

    if (attempt.lockedUntil && attempt.lockedUntil > new Date()) {
      const diffMs = attempt.lockedUntil.getTime() - Date.now();
      const retryAfterMinutes = Math.ceil(diffMs / (60 * 1000));
      return { allowed: false, remainingAttempts: 0, retryAfterMinutes };
    }

    // Lock has expired
    if (attempt.lockedUntil && attempt.lockedUntil <= new Date()) {
      await prisma.loginAttempt.update({
        where: { key },
        data: { count: 0, lockedUntil: null },
      });
      return { allowed: true, remainingAttempts: MAX_FAILED_ATTEMPTS };
    }

    const remainingAttempts = Math.max(0, MAX_FAILED_ATTEMPTS - attempt.count);
    return {
      allowed: attempt.count < MAX_FAILED_ATTEMPTS,
      remainingAttempts,
    };
  } catch (error) {
    console.error("Rate limit check error:", error);
    return { allowed: true, remainingAttempts: MAX_FAILED_ATTEMPTS };
  }
}

export async function recordFailedAttempt(key: string) {
  try {
    const attempt = await prisma.loginAttempt.findUnique({ where: { key } });

    if (!attempt) {
      await prisma.loginAttempt.create({
        data: { key, count: 1 },
      });
      return;
    }

    const newCount = attempt.count + 1;
    let lockedUntil: Date | null = null;

    if (newCount >= MAX_FAILED_ATTEMPTS) {
      lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
    }

    await prisma.loginAttempt.update({
      where: { key },
      data: {
        count: newCount,
        lockedUntil,
      },
    });
  } catch (error) {
    console.error("Record failed attempt error:", error);
  }
}

export async function clearRateLimit(key: string) {
  try {
    await prisma.loginAttempt.deleteMany({
      where: { key },
    });
  } catch (error) {
    console.error("Clear rate limit error:", error);
  }
}
