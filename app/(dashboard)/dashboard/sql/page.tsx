import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth";
import { listSavedQueries } from "@/features/sql/queries";
import { getProjectOptions } from "@/features/projects/queries";
import { SQLWorkspace } from "@/features/sql/components/sql-editor";
import { PageHeader } from "@/components/shared/page-header";

export const metadata: Metadata = {
  title: "SQL Workspace",
  description: "Write, run, and save SQL queries on your datasets.",
};

export default async function SQLPage() {
  const user = await getCurrentDbUser();
  if (!user) redirect("/sign-in");

  const [savedQueries, projects] = await Promise.all([
    listSavedQueries(user.id),
    getProjectOptions(user.id),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="SQL Workspace"
        description="Write queries, save favorites, and get AI explanations."
      />
      <SQLWorkspace savedQueries={savedQueries} projects={projects} />
    </div>
  );
}
