
import Header from '@/components/layout/Header';
import { Skeleton } from '@/components/ui/skeleton';

export default function CatalogLoading() {
  const gridSkeletonCount = 12;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        {/* Skeleton for Featured Movie Banner Section */}
        <section className="mb-12">
            <div className="relative w-full aspect-[16/7] md:aspect-[16/6] lg:aspect-[16/5] overflow-hidden rounded-lg bg-card shadow-2xl">
                <Skeleton className="absolute inset-0 w-full h-full" />
                <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-10 lg:p-16 bg-gradient-to-t from-black/70 via-black/30 to-transparent">
                    <Skeleton className="h-10 w-3/4 md:w-1/2 mb-4 rounded" /> {/* Title Skeleton */}
                    <Skeleton className="h-5 w-full md:w-3/4 mb-2 rounded" /> {/* Description Line 1 Skeleton */}
                    <Skeleton className="h-5 w-2/3 md:w-1/2 mb-6 rounded" />   {/* Description Line 2 Skeleton */}
                    <div className="flex space-x-3">
                        <Skeleton className="h-12 w-28 rounded-md" /> {/* Play Button Skeleton */}
                        <Skeleton className="h-12 w-32 rounded-md" /> {/* More Info Button Skeleton */}
                    </div>
                </div>
            </div>
        </section>

        {/* Skeleton for Main Catalog Title */}
        <Skeleton className="h-10 w-1/3 mb-8" /> {/* Title: "Movie Catalog" */}
        
        {/* Skeleton for Main Movie Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
          {Array.from({ length: gridSkeletonCount }).map((_, index) => (
            <div key={`grid-skel-${index}`} className="flex flex-col space-y-3">
              <Skeleton className="aspect-[2/3] w-full rounded-xl" />
              <div className="space-y-2 mt-2">
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </main>
       <footer className="py-6 text-center text-sm text-muted-foreground border-t border-border">
        <Skeleton className="h-4 w-1/4 mx-auto" />
      </footer>
    </div>
  );
}
