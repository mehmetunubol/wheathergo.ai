
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/hooks/use-translation"; // Added import
import Link from "next/link";
import { Button } from "./ui/button";
import { LogIn } from "lucide-react";

export function UserNav() {
  const { isAuthenticated, user, isLoading } = useAuth();
  const { t } = useTranslation(); 

  if (isLoading) {
    return <Skeleton className="h-8 w-8 rounded-full" />;
  }

  if (!isAuthenticated || !user) {
    // In the new design, the Login button is part of MainNav.
    // This component might just return null or a placeholder if not authenticated,
    // or MainNav won't render it. For simplicity, let's assume MainNav handles this.
    // However, if UserNav is always rendered, it needs a non-auth state.
    // For now, this specific return path will likely not be hit if MainNav controls rendering.
    // If it's meant to be a standalone avatar display, it should only show if authenticated.
    return null; 
  }

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <Avatar className="h-8 w-8">
      <AvatarImage src={user.photoURL || `https://placehold.co/40x40.png?text=${getInitials(user.displayName)}`} alt={user.displayName || t('user')} data-ai-hint="user avatar" />
      <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
    </Avatar>
  );
}
