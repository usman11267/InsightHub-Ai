import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth";
import { PageHeader } from "@/components/shared/page-header";
import { listProjects, getProjectTags } from "@/features/projects/queries";
import { projectFiltersSchema } from "@/features/projects/schemas";
import { ProjectsGrid } from "@/features/projects/components/projects-grid";

export const metadata: Metadata = {
  title: "Projects",
  description: "Group your datasets, reports, and dashboards into projects.",
};

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentDbUser();
  if (!user) redirect("/sign-in");

  const raw = await searchParams;

  // Malformed query strings fall back to defaults rather than 500ing — a URL is
  // user-editable input.
  const parsed = projectFiltersSchema.safeParse(raw);
  const filters = parsed.success ? parsed.data : projectFiltersSchema.parse({});

  const [{ items, total, pageCount }, tags] = await Promise.all([
    listProjects(user.id, filters),
    getProjectTags(user.id),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description={
          total > 0
            ? `${total} project${total === 1 ? "" : "s"} you own or collaborate on.`
            : "Create a project to start analyzing data."
        }
      />

      <ProjectsGrid
        projects={items}
        tags={tags}
        filters={filters}
        pageCount={pageCount}
        total={total}
        openCreateOnMount={raw.new === "1"}
      />
    </div>
  );
}
