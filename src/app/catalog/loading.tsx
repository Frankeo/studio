
import Header from '@/components/layout/Header';
import { Skeleton } from '@/components/ui/skeleton';

export default function CatalogLoading() {
  const featuredSkeletonCount = 4;
  const gridSkeletonCount = 12;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        {/* Skeleton for Featured Movies Section */}
        <Skeleton className="h-8 w-1/3 mb-6" /> {/* Title: "Featured Movies" */}
        <div className="flex space-x-4 overflow-hidden mb-12 pb-4"> {/* Horizontal container */}
          {Array.from({ length: featuredSkeletonCount }).map((_, index) => (
            <div key={`featured-skel-${index}`} className="flex-shrink-0 w-48 md:w-56">
              <Skeleton className="aspect-[2/3] w-full rounded-xl" />
              <div className="space-y-2 mt-2">
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-3 w-4/6" />
              </div>
            </div>
          ))}
        </div>

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
