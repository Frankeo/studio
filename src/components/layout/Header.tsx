
"use client";

import Link from 'next/link';
import { Clapperboard, LogOut, UserCircle, User as UserIcon } from 'lucide-react'; // Added UserIcon
import { useAuth } from '@/context/AuthContext'; // Use AuthContext
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from '@/hooks/use-toast';

export default function Header() {
  const { user, signOut } = useAuth(); // Get user and signOut from context
  const router = useRouter();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/login');
      toast({ title: 'Logged Out', description: 'You have been successfully logged out.' });
    } catch (error) {
      toast({
        title: 'Logout Failed',
        description: (error as Error).message || 'An unexpected error occurred during logout.',
        variant: 'destructive',
      });
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center space-x-2 text-primary hover:opacity-80 transition-opacity">
          <Clapperboard className="h-8 w-8" />
          <span className="text-2xl font-bold">StreamVerse</span>
        </Link>
        <nav className="flex items-center space-x-4">
          {user && (
            <Link href="/catalog" className="text-sm font-medium text-foreground/70 hover:text-primary transition-colors">
              Catalog
            </Link>
          )}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.photoURL || undefined} alt={user.displayName || user.email || 'User'} />
                    <AvatarFallback>
                      {user.displayName ? user.displayName.charAt(0).toUpperCase() : <UserCircle className="h-6 w-6" />}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.displayName || user.email}</p>
                    {user.displayName && user.email && <p className="text-xs leading-none text-muted-foreground">{user.email}</p>}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href="/profile">
                    <UserIcon className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild variant="default" size="sm">
              <Link href="/login">Login</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
