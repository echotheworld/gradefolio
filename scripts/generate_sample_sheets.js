const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

const outDir = path.join(__dirname, "../public/samples");
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// 1. Clean valid gradebook
const cleanData = [
  ["Student ID", "Student Name", "Quiz 1", "Quiz 2", "Midterm Exam", "Final Project", "Final Exam", "Final Grade"],
  ["2024-00201", "Gomez, Antonio", 45, 48, 88, 92, 90, 88.6],
  ["2024-00202", "Burgos, Jose", 40, 42, 82, 85, 84, 82.5],
  ["2024-00203", "Zamora, Jacinto", 49, 50, 95, 98, 96, 95.8],
  ["2024-00204", "Silang, Gabriela", 46, 47, 91, 94, 93, 92.2],
  ["2024-00205", "Aquino, Melchora", 44, 45, 86, 89, 87, 86.8],
  ["2024-00206", "Luna, Juan", 48, 49, 94, 96, 95, 94.4],
  ["2024-00207", "Del Pilar, Marcelo", 41, 43, 80, 83, 82, 81.6],
  ["2024-00208", "Mabini, Apolinario", 50, 50, 99, 100, 98, 99.0],
];

const wbClean = XLSX.utils.book_new();
const wsClean = XLSX.utils.aoa_to_sheet(cleanData);
XLSX.utils.book_append_sheet(wbClean, wsClean, "GradeSheet_CS101");
XLSX.writeFile(wbClean, path.join(outDir, "sample_cs101_gradebook.xlsx"));

// Also CSV
const csvContent = cleanData.map((row) => row.join(",")).join("\n");
fs.writeFileSync(path.join(outDir, "sample_cs101_gradebook.csv"), csvContent);

// 2. Sample with validation errors
const errorData = [
  ["Student ID", "Student Name", "Quiz 1", "Quiz 2", "Midterm Exam", "Final Grade"],
  ["2024-00301", "Rizal, Jose", 48, 50, 95, 96],
  ["2024-00302", "Bonifacio, Andres", 45, 44, 88, 87],
  ["2024-00301", "Rizal, Jose (DUPLICATE)", 48, 50, 95, 96], // Duplicate ID error
  ["", "Anonymous Student", 40, 42, 80, 80], // Missing ID error
  ["2024-00305", "Valenzuela, Pio", "ABS", 45, 85, 85], // Non-numeric score
  ["2024-00306", "Jacinto, Emilio", 50, 150, 92, 98], // Score exceeds max limit (150 > 50)
];

const wbError = XLSX.utils.book_new();
const wsError = XLSX.utils.aoa_to_sheet(errorData);
XLSX.utils.book_append_sheet(wbError, wsError, "SectionGrades");
XLSX.writeFile(wbError, path.join(outDir, "sample_with_validation_errors.xlsx"));

console.log("Sample spreadsheets generated in public/samples/");
