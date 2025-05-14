import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getUserInitials(user: { displayName?: string | null }) {
  if (!user.displayName) {
    return null;
  }

  const words = user.displayName.split(' ');

  return words.length >= 2 ? `${words[0].charAt(0)}${words[1].charAt(0)}`.toUpperCase() : null;
}
