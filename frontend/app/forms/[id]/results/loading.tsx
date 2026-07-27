'use client';

export default function ResultsLoading() {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white">
      {/* Top Nav Skeleton */}
      <nav className="nav justify-between px-4" style={{ height: 64, borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.95)' }}>
        <div className="flex items-center gap-4">
          <div className="w-5 h-5 bg-gray-200 rounded animate-pulse" />
          <div className="w-40 h-7 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="flex items-center gap-3">
          <div className="w-28 h-9 bg-gray-100 rounded-lg animate-pulse" />
          <div className="w-28 h-9 bg-gray-100 rounded-lg animate-pulse" />
        </div>
      </nav>

      {/* Content Skeleton */}
      <div className="max-w-6xl mx-auto w-full px-6 py-8">
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 animate-pulse">
              <div className="w-24 h-3 bg-gray-200 rounded mb-3" />
              <div className="w-16 h-8 bg-gray-200 rounded" />
            </div>
          ))}
        </div>

        {/* Tab Skeleton */}
        <div className="flex gap-4 mb-6">
          <div className="w-24 h-10 bg-gray-200 rounded-lg animate-pulse" />
          <div className="w-24 h-10 bg-gray-100 rounded-lg animate-pulse" />
        </div>

        {/* Table Skeleton */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex-1 h-4 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="p-4 border-b border-gray-50 flex gap-4">
              {[1, 2, 3, 4].map(j => (
                <div key={j} className="flex-1 h-4 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
