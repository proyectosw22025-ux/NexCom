export function ProductoCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden animate-pulse">
      <div className="bg-slate-200 aspect-square w-full" />
      <div className="p-3.5 space-y-2.5">
        <div className="h-2.5 bg-slate-200 rounded w-1/3" />
        <div className="h-3.5 bg-slate-200 rounded w-3/4" />
        <div className="h-3 bg-slate-200 rounded w-1/2" />
        <div className="flex items-center justify-between mt-2 pt-2">
          <div className="h-4 bg-slate-200 rounded w-1/4" />
          <div className="h-8 bg-slate-200 rounded-xl w-24" />
        </div>
      </div>
    </div>
  );
}
