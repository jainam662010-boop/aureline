import * as React from "react";
import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("skeleton-shimmer rounded-2xl", className)} {...props} />;
}

/** Full page-height skeleton used by loading.tsx files. */
function PageSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="mx-auto w-full max-w-7xl px-gutter lg:px-gutter-lg py-space-xl space-y-space-md">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-4 w-96 max-w-full" />
      <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2 lg:grid-cols-4 pt-space-md">
        {Array.from({ length: lines * 2 }).map((_, i) => (
          <Skeleton key={i} className="h-80" />
        ))}
      </div>
    </div>
  );
}

export { Skeleton, PageSkeleton };
