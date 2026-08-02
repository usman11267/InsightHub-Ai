import Link from "next/link";
import { Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatRelativeTime, initials } from "@/lib/utils";
import { activityLabel, activityTarget } from "@/features/dashboard/activity-labels";
import type { getRecentActivity } from "@/features/dashboard/queries";

type ActivityItem = Awaited<ReturnType<typeof getRecentActivity>>[number];

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <Activity className="size-4 text-muted-foreground" />
          Activity
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1">
        {items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No activity yet. Actions you and your team take will show up here.
          </p>
        ) : (
          <ol className="space-y-4">
            {items.map((item) => {
              const name =
                [item.actor.firstName, item.actor.lastName].filter(Boolean).join(" ") ||
                item.actor.email;
              const target = activityTarget(item.metadata);

              return (
                <li key={item.id} className="flex gap-3">
                  <Avatar size="sm" className="mt-0.5 shrink-0">
                    {item.actor.imageUrl && (
                      <AvatarImage src={item.actor.imageUrl} alt="" />
                    )}
                    <AvatarFallback>
                      {initials(item.actor.firstName, item.actor.lastName, item.actor.email)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-snug">
                      <span className="font-medium">{name}</span>{" "}
                      <span className="text-muted-foreground">
                        {activityLabel(item.action)}
                      </span>
                      {target && <span className="font-medium"> {target}</span>}
                      {item.project && (
                        <>
                          <span className="text-muted-foreground"> in </span>
                          <Link
                            href={`/dashboard/projects/${item.project.id}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {item.project.name}
                          </Link>
                        </>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatRelativeTime(item.createdAt)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
