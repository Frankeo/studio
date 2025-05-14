import Header from '@/components/layout/Header';
import { Skeleton } from '@/components/ui/skeleton';

export default function PlayerLoading() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="mb-6">
           <Skeleton className="h-9 w-36" />
        </div>
        
        <Skeleton className="aspect-video w-full rounded-lg" />

        <div className="mt-8 p-6 bg-card rounded-lg shadow-lg">
          <Skeleton className="h-10 w-3/5 mb-3" />
          <div className="flex items-center space-x-4 mb-4">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-12" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-24" />
          </div>
          <Skeleton className="h-5 w-full mb-2" />
          <Skeleton className="h-5 w-full mb-2" />
          <Skeleton className="h-5 w-4/5" />
        </div>
      </main>
       <footer className="py-6 text-center text-sm text-muted-foreground border-t border-border">
        <Skeleton className="h-4 w-1/4 mx-auto" />
      </footer>
    </div>
  );
}
