
"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Home, LogOut, ShieldAlert, ShieldCheck } from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isAdmin, isLoading, logout } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push(`/login?redirect=${pathname}`); 
      } else if (!isAdmin) {
        router.push("/"); 
      }
    }
  }, [isAuthenticated, isAdmin, isLoading, router, pathname]);

  if (isLoading || !isAuthenticated || !isAdmin) {
    return (
      <div className="flex flex-col min-h-screen">
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-14 max-w-screen-2xl items-center justify-between px-4">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-8 w-20" />
          </div>
        </header>
        <main className="flex-grow container mx-auto p-4">
          <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
            <ShieldAlert className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {isLoading ? t('verifyingAccess') : t('accessDeniedOrLoading')}
            </p>
             {!isLoading && !isAuthenticated && (
                <Link href={`/login?redirect=${pathname}`} passHref>
                    <Button variant="link" className="mt-2">{t('goToLogin')}</Button>
                </Link>
             )}
             {!isLoading && isAuthenticated && !isAdmin && (
                 <Link href="/" passHref>
                    <Button variant="link" className="mt-2">{t('goToHomepage')}</Button>
                </Link>
             )}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 max-w-screen-2xl items-center justify-between px-4">
          <Link href="/admin" className="flex items-center space-x-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">{t('adminSiteName')}</span>
          </Link>
          <nav className="flex items-center space-x-4">
            <Link href="/" passHref>
              <Button variant="ghost" size="sm">
                <Home className="mr-2 h-4 w-4" />
                {t('mainSiteNav')}
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              {t('logout')}
            </Button>
          </nav>
        </div>
      </header>
      <main className="flex-grow container mx-auto max-w-4xl p-6">
        {children}
      </main>
       <footer className="text-center py-4 text-xs text-muted-foreground border-t mt-auto">
            <p>{t('adminFooter', { year: new Date().getFullYear() })}</p>
        </footer>
    </div>
  );
}
