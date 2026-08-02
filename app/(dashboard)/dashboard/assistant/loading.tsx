import { Skeleton } from "@/components/ui/skeleton";

export default function AssistantLoading() {
  return (
    <div className="flex h-[calc(100vh-9rem)] gap-6">
      <div className="hidden w-64 space-y-3 lg:block">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 rounded-lg" />
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
      </div>
      <Skeleton className="flex-1 rounded-2xl" />
    </div>
  );
}
