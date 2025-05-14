
import { Clapperboard, Loader2 } from 'lucide-react';

export default function GlobalLoader() {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-background space-y-4">
      <Clapperboard className="h-20 w-20 text-primary animate-pulse" />
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <span className="sr-only">Loading StreamVerse...</span>
    </div>
  );
}
