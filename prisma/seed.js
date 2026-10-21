const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function hash(pw) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(pw, salt);
}

async function main() {
  console.log("Cleaning existing records...");
  await prisma.auditLog.deleteMany({});
  await prisma.gradeRecord.deleteMany({});
  await prisma.gradeItem.deleteMany({});
  await prisma.sectionStudent.deleteMany({});
  await prisma.student.deleteMany({});
  await prisma.importHistory.deleteMany({});
  await prisma.section.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.systemSetting.deleteMany({});

  console.log("Creating default system settings...");
  await prisma.systemSetting.create({
    data: {
      id: "global",
      institutionName: "GradeView University Portal",
      supportEmail: "support@gradeview.edu",
      maxUploadSizeMb: 15,
      defaultShowFinalGrade: true,
      defaultShowBreakdown: true,
    },
  });

  console.log("Creating users...");
  const adminPassword = await hash("AdminPass123!");
  const profPassword = await hash("ProfessorPass123!");

  const superAdmin = await prisma.user.create({
    data: {
      email: "admin@gradeview.edu",
      displayName: "Dr. Eleanor Vance (Super Admin)",
      passwordHash: adminPassword,
      role: "SUPER_ADMIN",
      status: "ACTIVE",
    },
  });

  const profReyes = await prisma.user.create({
    data: {
      email: "prof.reyes@gradeview.edu",
      displayName: "Prof. Alan Reyes",
      passwordHash: profPassword,
      role: "PROFESSOR",
      status: "ACTIVE",
    },
  });

  const profSantos = await prisma.user.create({
    data: {
      email: "prof.santos@gradeview.edu",
      displayName: "Prof. Maria Santos",
      passwordHash: profPassword,
      role: "PROFESSOR",
      status: "ACTIVE",
    },
  });

  console.log("Creating sections for Prof. Reyes...");
  const cs101 = await prisma.section.create({
    data: {
      ownerProfessorId: profReyes.id,
      sectionCode: "CS101-2026A",
      sectionName: "BSCS 2-A",
      subjectName: "CS 101 - Data Structures and Algorithms",
      academicYear: "2026-2027",
      term: "1st Semester",
      announcement: "Final grades have been computed and verified. Please review your breakdown below.",
      status: "PUBLISHED",
      publishedAt: new Date(),
      showFinalGrade: true,
      showBreakdown: true,
      showProvisionalNotice: false,
    },
  });

  const cs201 = await prisma.section.create({
    data: {
      ownerProfessorId: profReyes.id,
      sectionCode: "CS201-2026B",
      sectionName: "BSCS 3-B",
      subjectName: "CS 201 - Advanced Web Architecture",
      academicYear: "2026-2027",
      term: "1st Semester",
      announcement: "Draft section. Currently validating project submissions.",
      status: "DRAFT",
      showFinalGrade: true,
      showBreakdown: true,
      showProvisionalNotice: true,
    },
  });

  console.log("Creating sections for Prof. Santos...");
  const math101 = await prisma.section.create({
    data: {
      ownerProfessorId: profSantos.id,
      sectionCode: "MATH101-2026",
      sectionName: "ENG 1-C",
      subjectName: "MATH 101 - Differential Calculus",
      academicYear: "2026-2027",
      term: "1st Semester",
      announcement: "Midterm grades published. Final exam consultation is on Friday.",
      status: "PUBLISHED",
      publishedAt: new Date(),
      showFinalGrade: true,
      showBreakdown: true,
      showProvisionalNotice: true,
    },
  });

  console.log("Creating grade items for CS101...");
  const itemQ1 = await prisma.gradeItem.create({
    data: { sectionId: cs101.id, name: "Quiz 1: Array & Linked Lists", category: "Quizzes", maxScore: 50, displayOrder: 1 },
  });
  const itemQ2 = await prisma.gradeItem.create({
    data: { sectionId: cs101.id, name: "Quiz 2: Stacks & Queues", category: "Quizzes", maxScore: 50, displayOrder: 2 },
  });
  const itemMid = await prisma.gradeItem.create({
    data: { sectionId: cs101.id, name: "Midterm Exam", category: "Exams", maxScore: 100, displayOrder: 3 },
  });
  const itemProj = await prisma.gradeItem.create({
    data: { sectionId: cs101.id, name: "Course Project: Graph Engine", category: "Projects", maxScore: 100, displayOrder: 4 },
  });
  const itemFinal = await prisma.gradeItem.create({
    data: { sectionId: cs101.id, name: "Final Examination", category: "Exams", maxScore: 100, displayOrder: 5 },
  });

  console.log("Enrolling students in CS101...");
  const studentsData = [
    {
      num: "2024-00101",
      name: "Juan Dela Cruz",
      cred: "GV-2024-PASS1",
      final: "92.5",
      finalStatus: "FINAL",
      remarks: "Excellent laboratory performance.",
      scores: [48, 45, 92, 95, 91],
    },
    {
      num: "2024-00102",
      name: "Maria Clara Santos",
      cred: "GV-2024-PASS2",
      final: "88.0",
      finalStatus: "FINAL",
      remarks: "Strong theoretical understanding.",
      scores: [42, 44, 85, 90, 89],
    },
    {
      num: "2024-00103",
      name: "Crisostomo Ibarra",
      cred: "GV-2024-PASS3",
      final: "96.0",
      finalStatus: "FINAL",
      remarks: "Top performer in algorithmic design.",
      scores: [50, 49, 98, 97, 95],
    },
    {
      num: "2024-00104",
      name: "Basilio Rizal",
      cred: "GV-2024-PASS4",
      final: "79.5",
      finalStatus: "PROVISIONAL",
      remarks: "Pending final project defense.",
      scores: [38, 35, 76, 82, 80],
    },
  ];

  for (const s of studentsData) {
    let student = await prisma.student.findUnique({ where: { studentNumber: s.num } });
    if (!student) {
      student = await prisma.student.create({
        data: {
          studentNumber: s.num,
          displayName: s.name,
        },
      });
    }

    const hashedCred = await hash(s.cred);

    const secStudent = await prisma.sectionStudent.create({
      data: {
        sectionId: cs101.id,
        studentId: student.id,
        credentialHash: hashedCred,
        credentialStatus: "ACTIVE",
        finalGrade: s.final,
        finalGradeStatus: s.finalStatus,
        remarks: s.remarks,
      },
    });

    const items = [itemQ1, itemQ2, itemMid, itemProj, itemFinal];
    for (let i = 0; i < items.length; i++) {
      await prisma.gradeRecord.create({
        data: {
          sectionStudentId: secStudent.id,
          gradeItemId: items[i].id,
          score: s.scores[i],
          status: "RECORDED",
        },
      });
    }
  }

  console.log("Recording initial audit log...");
  await prisma.auditLog.create({
    data: {
      actorId: superAdmin.id,
      actorEmail: superAdmin.email,
      action: "PLATFORM_INITIALIZED",
      targetType: "SYSTEM",
      targetId: "global",
      metadata: JSON.stringify({ version: "1.1.0", seeded: true }),
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: profReyes.id,
      actorEmail: profReyes.email,
      action: "GRADES_PUBLISHED",
      targetType: "SECTION",
      targetId: cs101.id,
      metadata: JSON.stringify({ sectionCode: cs101.sectionCode, studentCount: studentsData.length }),
    },
  });

  console.log("Seed finished successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
