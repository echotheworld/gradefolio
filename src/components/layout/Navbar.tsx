"use client";

import React from "react";

interface NavbarProps {
  user?: {
    displayName: string;
    email: string;
    role: "SUPER_ADMIN" | "PROFESSOR";
  } | null;
  studentSession?: {
    displayName: string;
    studentNumber: string;
    sectionCode: string;
  } | null;
}

export function Navbar({ user, studentSession }: NavbarProps) {
  // Global navbar is completely suppressed in favor of role-specific shells & standalone pages
  return null;
}
