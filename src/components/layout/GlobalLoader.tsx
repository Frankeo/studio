
import { Clapperboard } from 'lucide-react';

export default function GlobalLoader() {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-background space-y-4">
      <Clapperboard className="h-20 w-20 text-primary animate-pulse" />
      <span className="sr-only">Loading StreamVerse...</span>
    </div>
  );
}
