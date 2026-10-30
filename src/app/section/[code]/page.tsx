import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusChip } from "@/components/ui/Badge";
import {
  GraduationCap,
  Calendar,
  User,
  Megaphone,
  Lock,
  ArrowRight,
  ShieldAlert,
  ArrowLeft,
  Clock,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface PageProps {
  params: Promise<{ code: string }>;
}

export default async function SectionOverviewPage({ params }: PageProps) {
  const { code } = await params;
  const sectionCode = code.toUpperCase();

  const section = await prisma.section.findUnique({
    where: { sectionCode },
    include: {
      ownerProfessor: {
        select: {
          displayName: true,
          email: true,
        },
      },
    },
  });

  if (!section) {
    notFound();
  }

  const isPublished = section.status === "PUBLISHED";

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-6 py-6 sm:py-10">
      {/* Back button */}
      <div className="mb-4 sm:mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </Link>
      </div>

      <Card className="shadow-lg border-slate-200">
        <CardHeader className="bg-slate-900 text-white p-5 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-2.5 mb-2">
            <span className="font-mono text-xs px-2.5 py-1 rounded bg-slate-800 text-teal-400 font-bold border border-slate-700">
              {section.sectionCode}
            </span>
            <StatusChip status={section.status} />
          </div>

          <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-white mt-1 break-words">
            {section.subjectName}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">Section: {section.sectionName}</p>
        </CardHeader>

        <CardContent className="p-4 sm:p-8 space-y-5 sm:space-y-6">
          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 pb-5 sm:pb-6 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] sm:text-xs text-slate-400 uppercase font-medium tracking-wider">Term & Academic Year</p>
                <p className="text-xs sm:text-sm font-semibold text-slate-900">
                  {section.term} &bull; {section.academicYear}
                </p>
              </div>
            </div>

            <div className="py-0.5">
              <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Course Professor</p>
              <p className="text-xs sm:text-sm font-semibold text-slate-900 tracking-tight mt-0.5">{section.ownerProfessor.displayName}</p>
            </div>
          </div>

          {/* Professor Announcement */}
          {section.announcement && (
            <div className="rounded-xl bg-teal-50/70 border border-teal-200/80 p-3.5 sm:p-4 flex items-start gap-3">
              <Megaphone className="w-4 h-4 sm:w-5 sm:h-5 text-teal-700 shrink-0 mt-0.5" />
              <div className="text-xs text-teal-900 leading-relaxed">
                <span className="font-semibold block mb-0.5">Professor Announcement:</span>
                {section.announcement}
              </div>
            </div>
          )}

          {/* Publication State Alert */}
          {!isPublished && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5 sm:p-4 flex items-start gap-3">
              <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800 leading-relaxed">
                <span className="font-semibold block mb-0.5">Draft Notice:</span>
                Grades for this section are currently in draft or under review. Students cannot sign in until the professor publishes the final records.
              </div>
            </div>
          )}

          {/* Action Card */}
          <div className="bg-slate-50 rounded-xl p-4 sm:p-6 border border-slate-200/90 text-center space-y-4">
            <div>
              <h3 className="text-sm sm:text-base font-semibold text-slate-900">View Your Grade Breakdown</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                Authenticate with your Student ID and individual password to view your private academic report.
              </p>
            </div>

            {isPublished ? (
              <Link href={`/section/${section.sectionCode}/login`} className="block sm:inline-block">
                <Button size="lg" className="w-full sm:w-auto gap-2 px-6 sm:px-8 font-semibold shadow-md text-sm">
                  <Lock className="w-4 h-4 text-teal-400" />
                  <span>View My Grades</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            ) : (
              <Button size="lg" disabled className="w-full sm:w-auto gap-2 px-6 sm:px-8 text-sm">
                <Lock className="w-4 h-4" />
                <span>Not Yet Published</span>
              </Button>
            )}

            <div className="text-[10px] sm:text-[11px] text-slate-400 pt-1 flex items-center justify-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Last updated: {formatDate(section.updatedAt)}</span>
            </div>
          </div>
        </CardContent>

        <CardFooter className="bg-slate-50/80 border-t border-slate-200/60 px-4 sm:px-6 py-3.5 sm:py-4 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2 text-center sm:text-left">
          <span>Need help? Contact {section.ownerProfessor.email}</span>
          <span className="font-mono text-[11px]">Privacy Level: Zero Public Disclosure</span>
        </CardFooter>
      </Card>
    </div>
  );
}
