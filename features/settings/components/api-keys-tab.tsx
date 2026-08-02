"use client";

import * as React from "react";
import { useState } from "react";
import { Plus, Key, Trash2, Copy, Check, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createApiKey, revokeApiKey } from "@/features/settings/actions";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

type ApiKey = {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: Date | null;
  createdAt: Date;
};

interface ApiKeysTabProps {
  apiKeys: ApiKey[];
}

export function ApiKeysTab({ apiKeys: initial }: ApiKeysTabProps) {
  const [keys, setKeys] = useState(initial);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setLoading(true);
    try {
      const res = await createApiKey({ name: newName });
      if (res.success) {
        const { key, ...created } = res.data;
        setNewKey(key);
        setKeys((prev) => [{ ...created, lastUsedAt: null }, ...prev]);
        setNewName("");
        toast.success("API key created — copy it now, it won't be shown again");
      } else {
        toast.error(res.error);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleRevoke(id: string) {
    if (!confirm("Revoke this API key? Applications using it will stop working.")) return;
    setRevoking(id);
    try {
      const res = await revokeApiKey({ id });
      if (res.success) {
        setKeys((k) => k.filter((key) => key.id !== id));
        toast.success("API key revoked");
      } else {
        toast.error(res.error);
      }
    } finally {
      setRevoking(null);
    }
  }

  function copyKey() {
    if (!newKey) return;
    navigator.clipboard.writeText(newKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="max-w-xl space-y-4">
      {/* New key reveal */}
      {newKey && (
        <Card className="border-success/30 bg-success/5">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertTriangle className="size-4 shrink-0 text-warning" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-warning">Copy your key now — you won&apos;t see it again</p>
              <code className="mt-1 block truncate rounded bg-muted/50 px-2 py-1 font-mono text-xs">
                {newKey}
              </code>
            </div>
            <Button variant="outline" size="sm" onClick={copyKey}>
              {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Key className="size-4" />
            API Keys
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleCreate} className="flex gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Key name (e.g. Production)"
              maxLength={80}
              required
              className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <Button type="submit" variant="gradient" size="sm" disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Create
            </Button>
          </form>

          {keys.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No API keys yet.</p>
          ) : (
            <div className="space-y-2">
              {keys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{key.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">{key.prefix}</p>
                    <p className="text-xs text-muted-foreground">
                      Created {formatDistanceToNow(new Date(key.createdAt), { addSuffix: true })}
                      {key.lastUsedAt
                        ? ` · Last used ${formatDistanceToNow(new Date(key.lastUsedAt), { addSuffix: true })}`
                        : " · Never used"}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-destructive hover:text-destructive"
                    disabled={revoking === key.id}
                    onClick={() => handleRevoke(key.id)}
                  >
                    {revoking === key.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="size-3.5" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
