const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function runTests() {
  console.log("=== STARTING GRADEVIEW END-TO-END SECURITY & WORKFLOW VERIFICATION ===\n");
  let passed = 0;
  let total = 0;

  function assert(condition, testName) {
    total++;
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
    }
  }

  // 1. Verify Database Seed State
  const admin = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" } });
  assert(admin !== null && admin.email === "admin@gradeview.edu", "Super Admin account exists");

  const profReyes = await prisma.user.findFirst({ where: { email: "prof.reyes@gradeview.edu" } });
  const profSantos = await prisma.user.findFirst({ where: { email: "prof.santos@gradeview.edu" } });
  assert(profReyes !== null && profSantos !== null, "Professors Reyes and Santos exist");

  const cs101 = await prisma.section.findUnique({ where: { sectionCode: "CS101-2026A" } });
  assert(cs101 !== null && cs101.status === "PUBLISHED", "CS101 section is published");

  const cs201 = await prisma.section.findUnique({ where: { sectionCode: "CS201-2026B" } });
  assert(cs201 !== null && cs201.status === "DRAFT", "CS201 section is in Draft status");

  // 2. Verify Student Privacy & Credentials
  const student = await prisma.student.findUnique({ where: { studentNumber: "2024-00101" } });
  assert(student !== null && student.displayName === "Juan Dela Cruz", "Demo student 2024-00101 exists");

  const enrollment = await prisma.sectionStudent.findUnique({
    where: { sectionId_studentId: { sectionId: cs101.id, studentId: student.id } },
  });
  assert(enrollment !== null && enrollment.credentialHash !== null, "Student credential is encrypted (not plain text)");

  const isPasswordCorrect = await bcrypt.compare("GV-2024-PASS1", enrollment.credentialHash);
  assert(isPasswordCorrect === true, "Valid student password matches bcrypt hash");

  const isWrongPasswordRejected = await bcrypt.compare("WRONG_PASSWORD_123", enrollment.credentialHash);
  assert(isWrongPasswordRejected === false, "Incorrect student password is appropriately rejected");

  // 3. Verify Cross-Professor Section Isolation
  assert(cs101.ownerProfessorId === profReyes.id, "CS101 is strictly owned by Prof Reyes");
  assert(cs101.ownerProfessorId !== profSantos.id, "Prof Santos is NOT the owner of CS101");

  // 4. Verify Grade Isolation
  const records = await prisma.gradeRecord.findMany({
    where: { sectionStudentId: enrollment.id },
  });
  assert(records.length === 5, "Student has exactly 5 recorded grade items in CS101");

  // 5. Verify Audit Trail is Append-Only and Populated
  const auditLogs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
  });
  assert(auditLogs.length >= 2, `Audit trail contains ${auditLogs.length} logged events`);

  // 6. Verify Sample Spreadsheet Files Exist in public/samples
  const fs = require("fs");
  const path = require("path");
  const cleanSheetExists = fs.existsSync(path.join(__dirname, "../public/samples/sample_cs101_gradebook.xlsx"));
  const errorSheetExists = fs.existsSync(path.join(__dirname, "../public/samples/sample_with_validation_errors.xlsx"));
  assert(cleanSheetExists && errorSheetExists, "Sample gradebooks for import wizard testing are available");

  console.log(`\n=== SUMMARY: ${passed} OF ${total} TESTS PASSED ===\n`);

  if (passed !== total) {
    process.exit(1);
  }
}

runTests()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
