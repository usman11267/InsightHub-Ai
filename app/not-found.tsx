import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
        <Compass className="size-5 text-primary" />
      </div>

      <p className="mt-5 font-mono text-sm text-muted-foreground">404</p>
      <h1 className="mt-1 text-xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist, or you don&apos;t have access to it.
      </p>

      <div className="mt-6 flex items-center gap-2">
        <Button asChild variant="gradient">
          <Link href="/dashboard">Go to dashboard</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Home</Link>
        </Button>
      </div>
    </div>
  );
}
