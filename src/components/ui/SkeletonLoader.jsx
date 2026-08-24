/**
 * SkeletonLoader — Placeholder cards shown while dashboard loads.
 * Provides visual feedback instead of a blank screen.
 */

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-5 border border-slate-200 animate-pulse">
      <div className="flex justify-between items-start mb-3 pb-3 border-b border-blue-100">
        <div>
          <div className="h-6 w-36 bg-slate-200 rounded mb-2" />
          <div className="h-4 w-24 bg-slate-100 rounded" />
        </div>
        <div className="h-6 w-12 bg-blue-100 rounded-full" />
      </div>
      <div className="space-y-2">
        <div className="h-12 bg-slate-100 rounded-lg" />
        <div className="h-12 bg-slate-100 rounded-lg" />
      </div>
      <div className="grid grid-cols-2 gap-2 mt-4">
        <div className="h-10 bg-slate-100 rounded-xl" />
        <div className="h-10 bg-slate-100 rounded-xl" />
      </div>
    </div>
  );
}

function SkeletonQueueRow() {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-100 bg-white animate-pulse">
      <div className="w-8 h-8 bg-slate-200 rounded-full" />
      <div className="flex-1">
        <div className="h-4 w-24 bg-slate-200 rounded mb-1" />
        <div className="h-3 w-32 bg-slate-100 rounded" />
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats bar skeleton */}
      <div className="h-10 bg-slate-100 rounded-xl animate-pulse" />
      
      {/* Courts skeleton */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>

      {/* Queue skeleton */}
      <div className="space-y-2">
        <div className="h-9 bg-slate-100 rounded-lg animate-pulse" />
        {[...Array(5)].map((_, i) => (
          <SkeletonQueueRow key={i} />
        ))}
      </div>
    </div>
  );
}

export default DashboardSkeleton;
