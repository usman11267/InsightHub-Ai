"use client";

import * as React from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Bell, Trash2, CheckCheck, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from "@/features/notifications/actions";
import { toast } from "sonner";

type Notification = {
  id: string;
  title: string;
  body: string | null;
  href: string | null;
  read: boolean;
  createdAt: Date;
};

interface NotificationListProps {
  notifications: Notification[];
}

export function NotificationList({ notifications: initial }: NotificationListProps) {
  const [items, setItems] = React.useState(initial);

  const unreadCount = items.filter((n) => !n.read).length;

  async function handleMarkRead(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    await markNotificationRead({ id });
  }

  async function handleMarkAllRead() {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    const res = await markAllNotificationsRead();
    if (res.success) toast.success("All notifications marked as read");
  }

  async function handleDelete(id: string) {
    setItems((prev) => prev.filter((n) => n.id !== id));
    await deleteNotification({ id });
  }

  return (
    <div className="space-y-3">
      {unreadCount > 0 && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
            <CheckCheck className="size-3.5" />
            Mark all as read
          </Button>
        </div>
      )}

      <div className="space-y-2">
        {items.map((notif) => (
          <Card
            key={notif.id}
            className={cn(
              "group relative flex items-start gap-4 p-4 transition-colors",
              !notif.read && "border-primary/30 bg-primary/5"
            )}
          >
            {/* Unread dot */}
            {!notif.read && (
              <span className="absolute right-4 top-4 size-2 rounded-full bg-primary" />
            )}

            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Bell className="size-4 text-primary" />
            </div>

            <div className="min-w-0 flex-1">
              <p className={cn("text-sm", !notif.read && "font-semibold")}>{notif.title}</p>
              {notif.body && <p className="mt-0.5 text-xs text-muted-foreground">{notif.body}</p>}
              <p className="mt-1 text-[10px] text-muted-foreground">
                {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              {!notif.read && (
                <Button variant="ghost" size="icon" className="size-7" onClick={() => handleMarkRead(notif.id)}>
                  <CheckCheck className="size-3.5 text-success" />
                </Button>
              )}
              {notif.href && (
                <Button variant="ghost" size="icon" className="size-7" asChild>
                  <Link href={notif.href}>
                    <ExternalLink className="size-3.5" />
                  </Link>
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => handleDelete(notif.id)}
              >
                <Trash2 className="size-3.5 text-destructive" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
