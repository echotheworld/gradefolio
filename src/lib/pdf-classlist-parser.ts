import zlib from "zlib";

export interface ParsedClasslistStudent {
  index: number;
  studentNumber: string;
  displayName: string;
  course?: string;
  strand?: string;
  gender?: string;
  email?: string;
  status?: string;
  dateEnrolled?: string;
}

export interface ClasslistSchedule {
  day: string;
  time: string;
  roomType: string;
  room: string;
}

export interface ClasslistParseResult {
  offeredTo?: string;
  schedules?: ClasslistSchedule[];
  success: boolean;
  academicYear: string;
  term: string;
  subjectName: string;
  subjectCode: string;
  sectionName: string;
  instructor?: string;
  classLimit?: number;
  students: ParsedClasslistStudent[];
  totalStudents: number;
  error?: string;
}

/**
 * Native, zero-dependency PDF stream text extractor using Node's built-in zlib
 */
export function extractTextFromPDFBuffer(buffer: Buffer): string {
  let fullText = "";
  const binStr = buffer.toString("binary");
  const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;

  let match: RegExpExecArray | null;
  while ((match = streamRegex.exec(binStr)) !== null) {
    const rawStream = Buffer.from(match[1], "binary");
    let decompressed: Buffer;

    try {
      decompressed = zlib.inflateSync(rawStream);
    } catch {
      try {
        decompressed = zlib.unzipSync(rawStream);
      } catch {
        decompressed = rawStream;
      }
    }

    const decStr = decompressed.toString("latin1");

    // Tj operator: (text) Tj
    const tjRegex = /\(([\s\S]*?)\)\s*Tj/g;
    let tj: RegExpExecArray | null;
    while ((tj = tjRegex.exec(decStr)) !== null) {
      const clean = tj[1]
        .replace(/\\\\/g, "\\")
        .replace(/\\\(/g, "(")
        .replace(/\\\)/g, ")");
      fullText += clean + "\n";
    }

    // TJ operator: [(text)] TJ
    const tjArrRegex = /\[([\s\S]*?)\]\s*TJ/g;
    let arr: RegExpExecArray | null;
    while ((arr = tjArrRegex.exec(decStr)) !== null) {
      const partsRegex = /\(([\s\S]*?)\)/g;
      let p: RegExpExecArray | null;
      let line = "";
      while ((p = partsRegex.exec(arr[1])) !== null) {
        const clean = p[1]
          .replace(/\\\\/g, "\\")
          .replace(/\\\(/g, "(")
          .replace(/\\\)/g, ")");
        line += clean;
      }
      fullText += line + "\n";
    }
  }

  return fullText;
}

/**
 * Parses raw text extracted from an official university Registrar classlist PDF
 */
export function parseClasslistText(fullText: string): ClasslistParseResult {
  const lines = fullText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  let academicYear = "2026-2027";
  let term = "Term 1";
  let subjectName = "";
  let subjectCode = "";
  let sectionName = "";
  let instructor = "";
  let classLimit = 40;
  let offeredTo = "";
  const students: ParsedClasslistStudent[] = [];
  const seenIds = new Set<string>();

  // 1. First pass: Header metadata
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];

    // AY & Term: e.g. "AY 2026 - 2027 2nd Term" or "AY 2025-2026 1st Term"
    const ayMatch = l.match(
      /AY\s*(\d{4}\s*-\s*\d{4})\s*(1st|2nd|3rd|Summer|Midyear|[0-9]+(?:st|nd|rd|th)?)\s*Term/i
    );
    if (ayMatch) {
      academicYear = ayMatch[1].replace(/\s+/g, "");
      const termRaw = ayMatch[2].toLowerCase();
      if (termRaw.includes("1")) term = "Term 1";
      else if (termRaw.includes("2")) term = "Term 2";
      else if (termRaw.includes("3")) term = "Term 3";
      else if (termRaw.includes("midyear") || termRaw.includes("summer")) term = "Midyear / Summer";
      else term = `${ayMatch[2]} Term`;
    }

    // Subject Name: e.g. line is 'Subject Name', next line is 'BAITBUSL: I.T. APPLICATION TOOLS IN BUSINESS'
    if (l.toLowerCase() === "subject name" && lines[i + 1]) {
      subjectName = lines[i + 1].trim();
      const codeMatch = subjectName.match(/^([A-Za-z0-9_-]{3,12})[:\-]\s*(.+)$/);
      if (codeMatch) subjectCode = codeMatch[1].trim();
    } else if (l.match(/^Subject\s+Name\s*:?\s*(.+)$/i)) {
      const m = l.match(/^Subject\s+Name\s*:?\s*(.+)$/i);
      subjectName = m![1].trim();
      const codeMatch = subjectName.match(/^([A-Za-z0-9_-]{3,12})[:\-]\s*(.+)$/);
      if (codeMatch) subjectCode = codeMatch[1].trim();
    }

    // Section: line is 'Section', next line is 'ACT261'
    if (l.toLowerCase() === "section" && lines[i + 1]) {
      sectionName = lines[i + 1].trim();
    } else if (l.match(/^Section\s*:?\s*([A-Za-z0-9_-]+)$/i)) {
      const m = l.match(/^Section\s*:?\s*([A-Za-z0-9_-]+)$/i);
      sectionName = m![1].trim();
    }

    // Instructor: line is 'Instructor', next line is '26-05121: MR. JERICHO JAN M. FEOLINO'
    if (l.toLowerCase() === "instructor" && lines[i + 1]) {
      instructor = lines[i + 1].trim();
    } else if (l.match(/^Instructor\s*:?\s*(.+)$/i)) {
      const m = l.match(/^Instructor\s*:?\s*(.+)$/i);
      instructor = m![1].trim();
    }

    // Class Limit
    if (l.toLowerCase() === "class limit" && lines[i + 1]) {
      const num = parseInt(lines[i + 1], 10);
      if (!isNaN(num)) classLimit = num;
    }

    // Offered To: line is 'Offered To', next line is 'Continuing'
    if (l.toLowerCase() === "offered to" && lines[i + 1]) {
      offeredTo = lines[i + 1].trim();
    } else if (l.match(/^Offered\s+To\s*:?\s*(.+)$/i)) {
      offeredTo = l.match(/^Offered\s+To\s*:?\s*(.+)$/i)![1].trim();
    }
  }

  // Subject schedules: rows of "#, Day, Time, Room Type, Room" between headers
  const schedules: ClasslistSchedule[] = [];
  const schedStart = lines.findIndex((l) => /^SUBJECT SCHEDULES$/i.test(l));
  const schedEnd = lines.findIndex((l) => /^LIST OF STUDENTS$/i.test(l));
  if (schedStart >= 0) {
    const end = schedEnd > schedStart ? schedEnd : lines.length;
    let k = schedStart + 1;
    // skip header labels
    while (k < end && /^(#|Day|Time|Room Type|Room)$/i.test(lines[k])) k++;
    while (k + 4 < end) {
      if (!/^\d+$/.test(lines[k] || "")) break;
      schedules.push({
        day: lines[k + 1] || "",
        time: lines[k + 2] || "",
        roomType: lines[k + 3] || "",
        room: lines[k + 4] || "",
      });
      k += 5;
    }
  }

  // 2. Second pass: Multi-line student extraction (standard Registrar PDF layout)
  const studentIdRegex = /^([0-9]{4}-[0-9]{5,8}|[0-9]{7,10})$/;

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];

    if (studentIdRegex.test(l)) {
      const studentNumber = l;
      if (seenIds.has(studentNumber)) continue;
      seenIds.add(studentNumber);

      const prev = lines[i - 1];
      const index = prev && /^\d+$/.test(prev) ? parseInt(prev, 10) : students.length + 1;

      const displayName = lines[i + 1] || "";
      const course = lines[i + 2] || "";
      const strand = lines[i + 3] || "";
      const gender = lines[i + 4] || "";
      const email = lines[i + 5] || "";

      let status = "Enrolled";
      let dateEnrolled = "";
      for (let j = 1; j <= 4; j++) {
        const candidate = lines[i + 5 + j];
        if (candidate && /^\d{4}-\d{2}-\d{2}$/.test(candidate)) {
          dateEnrolled = candidate;
        }
        if (candidate && /^(Enrolled|Registered|Official)$/i.test(candidate)) {
          status = candidate;
          break;
        }
        if (candidate && studentIdRegex.test(candidate)) break;
      }

      students.push({
        index,
        studentNumber,
        displayName,
        course,
        strand,
        gender: gender.toUpperCase(),
        email,
        status,
        dateEnrolled,
      });
    }
  }

  // 3. Fallback: Single-line regex if multi-line didn't match
  if (students.length === 0) {
    const singleLineRegex =
      /^\s*(\d+)?\s*([0-9]{4}-[0-9]{5,8}|[0-9]{7,10})\s+(.+?)\s+([A-Za-z0-9_-]+)\s+(STEM|ABM|HUMSS|GAS|TVL|ICT|ARTS|[A-Z]{2,10})?\s*(FEMALE|MALE)?\s+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i;

    for (const line of lines) {
      const match = line.match(singleLineRegex);
      if (match) {
        const studentNumber = match[2].trim();
        if (!seenIds.has(studentNumber)) {
          seenIds.add(studentNumber);
          students.push({
            index: match[1] ? parseInt(match[1], 10) : students.length + 1,
            studentNumber,
            displayName: match[3].trim(),
            course: match[4] ? match[4].trim() : "",
            strand: match[5] ? match[5].trim() : "",
            gender: match[6] ? match[6].trim().toUpperCase() : "",
            email: match[7] ? match[7].trim() : "",
            status: "Enrolled",
          });
        }
      }
    }
  }

  // Sort students by index
  students.sort((a, b) => a.index - b.index);

  return {
    success: true,
    academicYear: academicYear || "2026-2027",
    term: term || "Term 1",
    subjectName: subjectName || "I.T. Application Tools in Business",
    subjectCode: subjectCode || sectionName,
    sectionName: sectionName || "Section 1",
    instructor,
    classLimit,
    offeredTo,
    schedules,
    students,
    totalStudents: students.length,
  };
}

/**
 * Parses a PDF buffer into structured classlist data (pure native Node.js)
 */
export async function parseClasslistPDF(buffer: Buffer): Promise<ClasslistParseResult> {
  try {
    const rawText = extractTextFromPDFBuffer(buffer);
    if (!rawText || rawText.trim().length === 0) {
      return {
        success: false,
        academicYear: "2026-2027",
        term: "Term 1",
        subjectName: "",
        subjectCode: "",
        sectionName: "",
        students: [],
        totalStudents: 0,
        error: "Unable to extract readable text from PDF. The document may be scanned or image-only.",
      };
    }

    return parseClasslistText(rawText);
  } catch (err: any) {
    console.error("PDF classlist parsing error:", err);
    return {
      success: false,
      academicYear: "2026-2027",
      term: "Term 1",
      subjectName: "",
      subjectCode: "",
      sectionName: "",
      students: [],
      totalStudents: 0,
      error: err?.message || "Failed to parse PDF document.",
    };
  }
}
