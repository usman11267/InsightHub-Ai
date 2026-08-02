import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SidebarProvider } from "@/components/layout/sidebar-context";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { CommandPalette } from "@/components/layout/command-palette";

/**
 * Authenticated shell. Middleware already blocks signed-out users; this
 * additionally guarantees a DB user row exists before any child page queries.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentDbUser();
  if (!user) redirect("/sign-in");

  let unreadCount = 0;
  if (user) {
    try {
      unreadCount = await prisma.notification.count({
        where: { userId: user.id, read: false },
      });
    } catch {
      unreadCount = 0;
    }
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar unreadCount={unreadCount} />
          <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">
            <div className="mx-auto w-full max-w-7xl page-enter">{children}</div>
          </main>
        </div>
      </div>
      <CommandPalette />
    </SidebarProvider>
  );
}
