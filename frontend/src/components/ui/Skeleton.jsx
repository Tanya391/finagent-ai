export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-slate-200 dark:bg-[#1e1e30] rounded-xl ${className}`} />;
}

export function SkeletonCard({ lines = 3 }) {
  return (
    <div className="p-5 rounded-2xl border bg-white dark:bg-[#13131f] border-slate-200 dark:border-[#1e1e30] space-y-3">
      <Skeleton className="h-4 w-1/3" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-3 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  );
}

export function SkeletonStat() {
  return (
    <div className="p-5 rounded-2xl border bg-white dark:bg-[#13131f] border-slate-200 dark:border-[#1e1e30]">
      <Skeleton className="h-3 w-16 mb-3" />
      <Skeleton className="h-8 w-24 mb-2" />
      <Skeleton className="h-2 w-12" />
    </div>
  );
}
