
"use client";

import Link from "next/link";
import { Cloud, CalendarDays, Plane, Menu as MenuIcon, Newspaper, Settings, CreditCard, LogOut, LogIn, ShieldCheck } from "lucide-react";
import { UserNav } from "./user-nav";
import { usePathname } from 'next/navigation';
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/use-translation";
import { useIsMobile } from "@/hooks/use-mobile";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
  SheetFooter,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function MainNav() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const isMobileForTagline = useIsMobile(); 
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const { isAuthenticated, user, logout, isAdmin } = useAuth();

  const appNavItems = [
    { href: "/", labelKey: "weather" as const, icon: <CalendarDays className="h-5 w-5" /> },
    { href: "/travelplanner", labelKey: "travelPlans" as const, icon: <Plane className="h-5 w-5" /> },
    { href: "/blog", labelKey: "blogTitle" as const, icon: <Newspaper className="h-5 w-5" /> },
  ];

  const userAccountNavItems = isAuthenticated ? [
    { href: "/subscription", labelKey: "subscriptionBilling" as const, icon: <CreditCard className="h-5 w-5" /> },
    { href: "/settings", labelKey: "settings" as const, icon: <Settings className="h-5 w-5" /> },
    ...(isAdmin ? [{ href: "/admin", labelKey: "adminPanel" as const, icon: <ShieldCheck className="h-5 w-5" /> }] : []),
  ] : [];

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center px-4">
        <Link href="/" className="flex items-center space-x-2">
          <Cloud className="h-7 w-7 text-primary" />
          <div>
            <span className="font-bold text-lg">Weatherugo</span>
            <span className={cn(
              "text-xs text-muted-foreground ml-2",
               isMobileForTagline ? "hidden" : "inline"
            )}>
              - {t('appTagline')}
            </span>
          </div>
        </Link>

        <div className="flex-grow" />

        {/* Desktop-only Icon Links */}
        <nav className="hidden md:flex items-center space-x-1 mr-2">
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/travelplanner" passHref>
                  <Button variant="ghost" size="icon" aria-label={t('travelPlans')}>
                    <Plane />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent><p>{t('travelPlans')}</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/blog" passHref>
                  <Button variant="ghost" size="icon" aria-label={t('blogTitle')}>
                    <Newspaper />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent><p>{t('blogTitle')}</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </nav>

        <div className="flex items-center">
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={t('openMenu')}>
                <MenuIcon className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] p-0 flex flex-col">
              <SheetHeader className="p-4 border-b">
                <SheetTitle className="text-left flex items-center gap-2">
                   <Cloud className="h-6 w-6 text-primary" /> Weatherugo
                </SheetTitle>
              </SheetHeader>

              {!isAuthenticated && (
                <div className="p-4 border-b">
                  <SheetClose asChild>
                    <Link href="/login" passHref>
                      <Button className="w-full" onClick={closeMenu}>
                         <LogIn className="mr-2 h-4 w-4" />
                        {t('loginButton')}
                      </Button>
                    </Link>
                  </SheetClose>
                </div>
              )}

              {isAuthenticated && user && (
                <div className="p-4 border-b flex items-center gap-3">
                  <UserNav />
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-sm font-medium truncate" title={user.displayName || t('user')}>{user.displayName || t('user')}</span>
                    {user.email && <span className="text-xs text-muted-foreground truncate" title={user.email}>{user.email}</span>}
                  </div>
                </div>
              )}
              
              <nav className="flex-1 flex flex-col space-y-1 p-4 overflow-y-auto">
                {appNavItems.map((item) => (
                  <SheetClose asChild key={`menu-item-${item.href}`}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-3 text-base font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                        pathname === item.href ? "bg-accent text-accent-foreground" : "text-foreground/80"
                      )}
                      onClick={closeMenu}
                    >
                      {item.icon}
                      {t(item.labelKey)}
                    </Link>
                  </SheetClose>
                ))}

                {isAuthenticated && userAccountNavItems.length > 0 && <Separator className="my-3" />}

                {isAuthenticated && userAccountNavItems.map((item) => (
                   <SheetClose asChild key={`menu-user-item-${item.href}`}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-3 text-base font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                        pathname === item.href ? "bg-accent text-accent-foreground" : "text-foreground/80"
                      )}
                      onClick={closeMenu}
                    >
                      {item.icon}
                      {t(item.labelKey)}
                    </Link>
                  </SheetClose>
                ))}
              </nav>

              {isAuthenticated && (
                <SheetFooter className="p-4 border-t mt-auto">
                  <SheetClose asChild>
                    <Button variant="outline" className="w-full" onClick={() => { logout(); closeMenu(); }}>
                      <LogOut className="mr-2 h-4 w-4" />
                      {t('logout')}
                    </Button>
                  </SheetClose>
                </SheetFooter>
              )}
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
    