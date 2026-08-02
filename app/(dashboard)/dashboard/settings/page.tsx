import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileTab } from "@/features/settings/components/profile-tab";
import { ApiKeysTab } from "@/features/settings/components/api-keys-tab";
import { AppearanceTab } from "@/features/settings/components/appearance-tab";

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage your account, API keys, and preferences.",
};

interface PageProps {
  searchParams: Promise<Record<string, string>>;
}

export default async function SettingsPage({ searchParams }: PageProps) {
  const user = await getCurrentDbUser();
  if (!user) redirect("/sign-in");

  const sp = await searchParams;
  const tab = sp.tab ?? "profile";

  const apiKeys = await prisma.apiKey.findMany({
    where: { userId: user.id, revokedAt: null },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, prefix: true, lastUsedAt: true, createdAt: true },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Manage your account and preferences." />

      <Tabs defaultValue={tab}>
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <ProfileTab user={user} />
        </TabsContent>

        <TabsContent value="api-keys" className="mt-6">
          <ApiKeysTab apiKeys={apiKeys} />
        </TabsContent>

        <TabsContent value="appearance" className="mt-6">
          <AppearanceTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
