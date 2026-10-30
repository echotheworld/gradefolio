/**
 * NIST SP 800-63B Password / Memorized Secret Guidelines
 *
 * Core Principles:
 * 1. Length over complexity: Minimum 8 characters (supports up to 64+).
 * 2. No arbitrary character composition rules (no forced uppercase/lowercase/symbol mixing).
 * 3. Screening against common/breached passwords, dictionary terms, and context words (user name, email, app name).
 * 4. Rejection of sequential and repetitive characters.
 * 5. Usability: Allow visibility toggling (unmasking) and password managers (paste friendly).
 */

const COMMON_BREACHED_PASSWORDS = new Set([
  "password", "password1", "password123", "12345678", "123456789", "1234567890",
  "qwertyuiop", "asdfghjkl", "zxcvbnm", "admin123", "administrator", "welcome",
  "welcome1", "letmein", "changeme", "iloveyou", "master123", "default123",
  "secret123", "sunshine", "princess", "football", "baseball", "trustno1",
  "superman", "batman123", "monkey123", "shadow123", "dragon123", "starwars",
  "faculty123", "professor", "professor123", "gradeview", "gradeviewz", "gradefolio"
]);

export interface NistValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  hasMinLength: boolean;
  isNotCommon: boolean;
  hasNoContextInfo: boolean;
  hasNoRepetition: boolean;
}

export interface PasswordContext {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  email?: string;
}

/**
 * Validates a password according to NIST SP 800-63B guidelines.
 */
export function validateNistPassword(password: string, context?: PasswordContext): NistValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const trimmed = (password || "").trim();
  const lower = trimmed.toLowerCase();

  // 1. Length Check (NIST minimum 8 characters, maximum 128)
  const hasMinLength = trimmed.length >= 8 && trimmed.length <= 128;
  if (trimmed.length < 8) {
    errors.push("Password must be at least 8 characters long (NIST standard).");
  } else if (trimmed.length > 128) {
    errors.push("Password cannot exceed 128 characters.");
  }

  // 2. Blocklist / Commonly Breached Passwords Check
  let isNotCommon = true;
  if (COMMON_BREACHED_PASSWORDS.has(lower)) {
    isNotCommon = false;
    errors.push("This password is on the common breach list. Please choose a more unique phrase.");
  }

  // 3. Sequential / Repetitive Patterns Check
  let hasNoRepetition = true;
  if (/^(.)\1{4,}$/.test(trimmed)) {
    // 5 or more identical repeating characters (e.g. aaaaa)
    hasNoRepetition = false;
    errors.push("Avoid repetitive characters (e.g., 'aaaaa').");
  } else if (/^(?:0123456|1234567|2345678|3456789|4567890|abcdefg|bcdefgh|cdefghi)$/i.test(trimmed)) {
    hasNoRepetition = false;
    errors.push("Avoid simple sequential characters (e.g., '1234567').");
  }

  // 4. Context-Specific Screening (User name, email handle, service name)
  let hasNoContextInfo = true;
  if (context && trimmed.length > 0) {
    const contextTerms: string[] = [];

    if (context.firstName && context.firstName.trim().length >= 3) {
      contextTerms.push(context.firstName.trim().toLowerCase());
    }
    if (context.lastName && context.lastName.trim().length >= 3) {
      contextTerms.push(context.lastName.trim().toLowerCase());
    }
    if (context.displayName && context.displayName.trim().length >= 3) {
      // Split display name into words
      context.displayName
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .forEach((w) => {
          if (w.length >= 3 && !w.startsWith("prof")) contextTerms.push(w);
        });
    }
    if (context.email) {
      const emailHandle = context.email.split("@")[0]?.toLowerCase();
      if (emailHandle && emailHandle.length >= 3) {
        contextTerms.push(emailHandle);
      }
    }

    for (const term of contextTerms) {
      if (lower.includes(term)) {
        hasNoContextInfo = false;
        errors.push(`Password must not contain your name or email handle ('${term}').`);
        break;
      }
    }
  }

  // Check for app name
  if (lower.includes("gradeview") || lower.includes("gradefolio")) {
    hasNoContextInfo = false;
    errors.push("Password must not contain the application name ('Gradefolio').");
  }

  const isValid = hasMinLength && isNotCommon && hasNoRepetition && hasNoContextInfo;

  return {
    isValid,
    errors,
    warnings,
    hasMinLength,
    isNotCommon,
    hasNoContextInfo,
    hasNoRepetition,
  };
}

/**
 * Generates a high-entropy, human-friendly passphrase complying with NIST SP 800-63B.
 * Format: [Adjective]-[Noun]-[4-digit Number]-[Symbol] e.g. "Cobalt-Falcon-8492!"
 */
const NIST_WORDS = [
  "Apex", "Beacon", "Cedar", "Cobalt", "Cosmic", "Delta", "Falcon", "Harbor",
  "Horizon", "Indigo", "Matrix", "Nova", "Orbit", "Prism", "Quasar", "Radar",
  "Sierra", "Solar", "Summit", "Timber", "Vortex", "Zephyr", "Lunar", "Glacier",
  "Breeze", "Canyon", "Echo", "Forest", "Island", "Kestrel", "Meadow", "Oasis"
];

const NIST_SYMBOLS = ["!", "#", "$", "%", "*", "+", "="];

export function generateNistPassword(): string {
  const w1 = NIST_WORDS[Math.floor(Math.random() * NIST_WORDS.length)];
  let w2 = NIST_WORDS[Math.floor(Math.random() * NIST_WORDS.length)];
  while (w2 === w1) {
    w2 = NIST_WORDS[Math.floor(Math.random() * NIST_WORDS.length)];
  }
  const num = Math.floor(1000 + Math.random() * 9000); // 4-digit number
  const sym = NIST_SYMBOLS[Math.floor(Math.random() * NIST_SYMBOLS.length)];

  return `${w1}-${w2}-${num}${sym}`;
}
