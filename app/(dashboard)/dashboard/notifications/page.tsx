import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { NotificationList } from "@/features/notifications/components/notification-list";
import { Bell } from "lucide-react";

export const metadata: Metadata = {
  title: "Notifications",
  description: "Your InsightHub AI notifications.",
};

export default async function NotificationsPage() {
  const user = await getCurrentDbUser();
  if (!user) redirect("/sign-in");

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, title: true, body: true, href: true, read: true, createdAt: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Notifications"
          description={`${notifications.filter((n) => !n.read).length} unread`}
        />
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications yet"
          description="You'll be notified when someone invites you to a project, or when a report is ready."
        />
      ) : (
        <NotificationList notifications={notifications} />
      )}
    </div>
  );
}
