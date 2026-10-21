import { prisma } from "./prisma";

export interface AuditParams {
  actorId?: string | null;
  actorEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown> | null;
}

export async function recordAuditLog(params: AuditParams) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: params.actorId || null,
        actorEmail: params.actorEmail,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      },
    });
  } catch (error) {
    console.error("Failed to record audit log:", error);
  }
}
