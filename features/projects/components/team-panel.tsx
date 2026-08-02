"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Crown, UserPlus, Users, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { initials } from "@/lib/utils";
import {
  inviteMember,
  removeMember,
  updateMemberRole,
} from "@/features/projects/actions";
import { inviteMemberSchema, type InviteMemberInput } from "@/features/projects/schemas";
import type { ProjectDetail } from "@/features/projects/queries";

const ROLE_HINTS: Record<string, string> = {
  ADMIN: "Full access, including members and settings",
  EDITOR: "Can upload data, run analysis, and write reports",
  VIEWER: "Read-only access to data and reports",
};

/**
 * Team roster + invite flow.
 *
 * The owner row is synthesized rather than stored as a TeamMember, so it's
 * rendered separately and can never be edited or removed.
 */
export function TeamPanel({
  project,
  currentUserId,
  canManage,
}: {
  project: ProjectDetail;
  currentUserId: string;
  canManage: boolean;
}) {
  const router = useRouter();
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  const form = useForm<InviteMemberInput>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: { projectId: project.id, email: "", role: "VIEWER" },
  });

  // useWatch subscribes without returning an unmemoizable function, which keeps
  // the React Compiler able to optimize this component.
  const selectedRole = useWatch({ control: form.control, name: "role" }) ?? "VIEWER";

  const onInvite = form.handleSubmit(async (values) => {
    const result = await inviteMember(values);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(`${values.email} added to the project`);
    form.reset({ projectId: project.id, email: "", role: "VIEWER" });
    setInviteOpen(false);
    router.refresh();
  });

  async function changeRole(memberId: string, role: string) {
    setPendingId(memberId);
    const result = await updateMemberRole({ projectId: project.id, memberId, role });
    setPendingId(null);

    if (result.success) {
      toast.success("Role updated");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  async function handleRemove(memberId: string, label: string) {
    setPendingId(memberId);
    const result = await removeMember({ projectId: project.id, memberId });
    setPendingId(null);

    if (result.success) {
      toast.success(`${label} removed`);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <Users className="size-4 text-muted-foreground" />
            Team
            <Badge variant="muted">{project.members.length + 1}</Badge>
          </CardTitle>

          {canManage && (
            <Button size="sm" variant="outline" onClick={() => setInviteOpen(true)}>
              <UserPlus />
              Invite
            </Button>
          )}
        </CardHeader>

        <CardContent>
          <ul className="divide-y divide-border">
            <li className="flex items-center gap-3 py-3 first:pt-0">
              <Avatar size="sm" className="shrink-0">
                {project.owner.imageUrl && <AvatarImage src={project.owner.imageUrl} alt="" />}
                <AvatarFallback>
                  {initials(
                    project.owner.firstName,
                    project.owner.lastName,
                    project.owner.email
                  )}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {[project.owner.firstName, project.owner.lastName]
                    .filter(Boolean)
                    .join(" ") || project.owner.email}
                  {project.owner.id === currentUserId && (
                    <span className="text-muted-foreground"> (you)</span>
                  )}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {project.owner.email}
                </p>
              </div>
              <Badge variant="default" className="shrink-0">
                <Crown />
                Owner
              </Badge>
            </li>

            {project.members.map((member) => {
              const name =
                [member.user.firstName, member.user.lastName].filter(Boolean).join(" ") ||
                member.user.email;
              const isSelf = member.user.id === currentUserId;
              const busy = pendingId === member.id;

              return (
                <li key={member.id} className="flex items-center gap-3 py-3">
                  <Avatar size="sm" className="shrink-0">
                    {member.user.imageUrl && <AvatarImage src={member.user.imageUrl} alt="" />}
                    <AvatarFallback>
                      {initials(
                        member.user.firstName,
                        member.user.lastName,
                        member.user.email
                      )}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {name}
                      {isSelf && <span className="text-muted-foreground"> (you)</span>}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {member.user.email}
                    </p>
                  </div>

                  {canManage ? (
                    <Select
                      value={member.role}
                      disabled={busy}
                      onValueChange={(role) => changeRole(member.id, role)}
                    >
                      <SelectTrigger
                        className="h-8 w-[110px] shrink-0 text-xs"
                        aria-label={`Role for ${name}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                        <SelectItem value="EDITOR">Editor</SelectItem>
                        <SelectItem value="VIEWER">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="secondary" className="shrink-0">
                      {member.role.toLowerCase()}
                    </Badge>
                  )}

                  {(canManage || isSelf) && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={busy}
                      onClick={() => handleRemove(member.id, isSelf ? "You were" : name)}
                      aria-label={isSelf ? "Leave project" : `Remove ${name}`}
                    >
                      <X className="text-muted-foreground" />
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>

          {project.members.length === 0 && (
            <p className="pt-3 text-sm text-muted-foreground">
              {canManage
                ? "Invite teammates to collaborate on this project."
                : "No other members yet."}
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite a teammate</DialogTitle>
            <DialogDescription>
              They need an existing InsightHub account. We&apos;ll notify them once they
              have access.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={onInvite} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email address</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="teammate@company.com"
                autoFocus
                aria-invalid={Boolean(form.formState.errors.email)}
                {...form.register("email")}
              />
              {form.formState.errors.email && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-role">Role</Label>
              <Select
                value={selectedRole}
                onValueChange={(value) =>
                  form.setValue("role", value as InviteMemberInput["role"])
                }
              >
                <SelectTrigger id="invite-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="EDITOR">Editor</SelectItem>
                  <SelectItem value="VIEWER">Viewer</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{ROLE_HINTS[selectedRole]}</p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setInviteOpen(false)}
                disabled={form.formState.isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="gradient"
                loading={form.formState.isSubmitting}
              >
                Send invite
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
