import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ForecastPanel } from "@/features/forecasting/components/forecast-panel";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Database } from "lucide-react";

export const metadata: Metadata = {
  title: "Forecasting",
  description: "AI-powered predictions and trend forecasting.",
};

interface PageProps {
  searchParams: Promise<Record<string, string>>;
}

export default async function ForecastingPage({ searchParams }: PageProps) {
  const user = await getCurrentDbUser();
  if (!user) redirect("/sign-in");

  const sp = await searchParams;
  const datasetId = sp.datasetId;

  let datasets: Array<{
    id: string;
    name: string;
    fileType: string;
    rowCount: number;
    schemaJson: unknown;
    previewJson: unknown;
  }> = [];

  try {
    datasets = await prisma.dataset.findMany({
      where: {
        status: "READY",
        project: {
          OR: [{ ownerId: user.id }, { members: { some: { userId: user.id } } }],
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, name: true, fileType: true, rowCount: true, schemaJson: true, previewJson: true },
    });
  } catch {
    datasets = [];
  }

  if (datasets.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Forecasting"
          description="AI-powered trend analysis and predictions from your data."
        />
        <EmptyState
          icon={Database}
          title="No datasets available"
          description="Upload a dataset with numeric data to generate forecasts."
          action={{ label: "Upload dataset", href: "/dashboard/datasets?upload=1" }}
        />
      </div>
    );
  }

  const selected = datasetId
    ? datasets.find((d) => d.id === datasetId) ?? datasets[0]
    : datasets[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Forecasting"
        description="AI-powered trend analysis and predictions from your data."
      />
      <ForecastPanel datasets={datasets} selectedDataset={selected} />
    </div>
  );
}
