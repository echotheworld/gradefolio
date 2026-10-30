require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const prisma = new PrismaClient();

async function main() {
  console.log("Purging existing sample records and credentials...");
  await prisma.auditLog.deleteMany({});
  await prisma.gradeRecord.deleteMany({});
  await prisma.gradeItem.deleteMany({});
  await prisma.sectionStudent.deleteMany({});
  await prisma.student.deleteMany({});
  await prisma.importHistory.deleteMany({});
  await prisma.section.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.systemSetting.deleteMany({});

  console.log("Initializing secure platform settings...");
  await prisma.systemSetting.create({
    data: {
      id: "global",
      institutionName: "Gradefolio Portal",
      supportEmail: "support@gradefolio.com.ph",
      maxUploadSizeMb: 15,
      defaultShowFinalGrade: true,
      defaultShowBreakdown: true,
    },
  });

  // Read admin credentials from environment (.env) - zero secrets or hashes stored in source code
  const adminEmail = process.env.SUPERADMIN_EMAIL || "admin@gradefolio.com.ph";
  let adminPassword = process.env.SUPERADMIN_PASSWORD;

  if (!adminPassword) {
    // If no password provided in .env, dynamically generate a secure 16-character password
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=";
    const bytes = crypto.randomBytes(16);
    adminPassword = Array.from(bytes).map(b => chars[b % chars.length]).join("");
    console.log(`[SECURITY] No SUPERADMIN_PASSWORD found in .env. Generated temporary password: ${adminPassword}`);
  }

  // Hash password dynamically at runtime with bcrypt (salt rounds: 10)
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(adminPassword, salt);

  console.log(`Creating authorized Super Admin account (${adminEmail})...`);
  const superAdmin = await prisma.user.create({
    data: {
      email: adminEmail,
      displayName: "Super Admin",
      passwordHash: passwordHash,
      role: "SUPER_ADMIN",
      status: "ACTIVE",
    },
  });

  console.log("Recording initial platform audit log...");
  await prisma.auditLog.create({
    data: {
      actorId: superAdmin.id,
      actorEmail: superAdmin.email,
      action: "PLATFORM_INITIALIZED",
      targetType: "SYSTEM",
      targetId: "global",
      metadata: JSON.stringify({
        version: "1.2.0",
        initializedAt: new Date().toISOString(),
      }),
    },
  });

  console.log("Seed finished successfully: credentials loaded securely from environment.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
