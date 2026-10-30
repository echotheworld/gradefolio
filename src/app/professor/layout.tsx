import React from "react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ProfessorSidebarLayout } from "@/components/layout/ProfessorSidebarLayout";

export default async function ProfessorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSession();

  if (!user || (user.role !== "PROFESSOR" && user.role !== "SUPER_ADMIN")) {
    redirect("/");
  }

  return <ProfessorSidebarLayout user={user}>{children}</ProfessorSidebarLayout>;
}
