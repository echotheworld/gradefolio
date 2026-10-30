import React from "react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminSidebarLayout } from "@/components/layout/AdminSidebarLayout";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSession();

  if (!user || user.role !== "SUPER_ADMIN") {
    redirect("/");
  }

  return <AdminSidebarLayout user={user}>{children}</AdminSidebarLayout>;
}
