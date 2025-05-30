
"use client";

import Link from "next/link";
import { Cloud, CalendarDays, Plane, Menu as MenuIcon, Newspaper, Settings, CreditCard, LogOut, LogIn, ShieldCheck, UserCircle, Home } from "lucide-react";
import { UserNav } from "./user-nav"; // UserNav is now just for Avatar
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
import { Avatar } from "./ui/avatar"; // Import Avatar if UserNav only returns Avatar component

export function MainNav() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const { isAuthenticated, user, logout, isAdmin, isLoading } = useAuth();

  const appNavItems = [
    { href: "/", labelKey: "weather" as const, icon: <CalendarDays className="h-5 w-5" /> },
    { href: "/travelplanner", labelKey: "travelPlans" as const, icon: <Plane className="h-5 w-5" /> },
    { href: "/blog", labelKey: "blogTitle" as const, icon: <Newspaper className="h-5 w-5" /> },
  ];

  const userNavItems = isAuthenticated ? [
    { href: "/subscription", labelKey: "subscriptionBilling" as const, icon: <CreditCard className="h-5 w-5" /> },
    { href: "/settings", labelKey: "settings" as const, icon: <Settings className="h-5 w-5" /> },
    ...(isAdmin ? [{ href: "/admin", labelKey: "adminPanel" as const, icon: <ShieldCheck className="h-5 w-5" /> }] : []),
  ] : [];


  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center justify-between px-4">
        <Link href="/" className="flex items-center space-x-2 mr-4">
          <Cloud className="h-7 w-7 text-primary" />
          <div>
            <span className="font-bold text-lg">Weatherugo</span>
            <span className={cn(
              "text-xs text-muted-foreground ml-2",
               isMobile ? "hidden" : "inline" 
            )}>
              - {t('appTagline')}
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        {!isMobile && (
          <div className="flex-1 flex items-center justify-end space-x-4">
            <nav className="flex items-center gap-4 text-sm lg:gap-5">
              {appNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "transition-colors hover:text-foreground/80 flex items-center gap-1.5",
                    pathname === item.href ? "text-foreground font-semibold" : "text-foreground/60"
                  )}
                >
                  {item.icon}
                  {t(item.labelKey)}
                </Link>
              ))}
            </nav>
            
            <div className="flex items-center gap-3">
              {isAuthenticated && userNavItems.map((item) => (
                 <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "transition-colors hover:text-foreground/80 text-sm flex items-center gap-1.5",
                      pathname === item.href ? "text-foreground font-semibold" : "text-foreground/60"
                    )}
                  >
                    {item.icon}
                    {t(item.labelKey)}
                  </Link>
              ))}
              {isAuthenticated ? (
                <>
                  <UserNav /> {/* Simplified UserNav for avatar */}
                  <Button variant="ghost" size="sm" onClick={logout} className="text-foreground/60 hover:text-foreground/80">
                    <LogOut className="mr-1.5 h-4 w-4" />
                    {t('logout')}
                  </Button>
                </>
              ) : (
                <Link href="/login" passHref>
                  <Button variant="outline" size="sm">
                    <LogIn className="mr-1.5 h-4 w-4" />
                    {t('loginButton')}
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Mobile Navigation Trigger */}
        {isMobile && (
          <div className="flex items-center">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
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

                {isAuthenticated && user && (
                  <div className="p-4 border-b flex items-center gap-3">
                    <UserNav /> {/* Avatar */}
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{user.displayName || t('user')}</span>
                      {user.email && <span className="text-xs text-muted-foreground">{user.email}</span>}
                    </div>
                  </div>
                )}
                
                <nav className="flex-1 flex flex-col space-y-1 p-4 overflow-y-auto">
                  {appNavItems.map((item) => (
                    <SheetClose asChild key={`mobile-${item.href}`}>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-3 py-3 text-base font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                          pathname === item.href ? "bg-accent text-accent-foreground" : "text-foreground/80"
                        )}
                        onClick={closeMobileMenu}
                      >
                        {item.icon}
                        {t(item.labelKey)}
                      </Link>
                    </SheetClose>
                  ))}

                  {isAuthenticated && userNavItems.length > 0 && <Separator className="my-3" />}

                  {isAuthenticated && userNavItems.map((item) => (
                     <SheetClose asChild key={`mobile-user-${item.href}`}>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-3 py-3 text-base font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                          pathname === item.href ? "bg-accent text-accent-foreground" : "text-foreground/80"
                        )}
                        onClick={closeMobileMenu}
                      >
                        {item.icon}
                        {t(item.labelKey)}
                      </Link>
                    </SheetClose>
                  ))}
                </nav>

                <SheetFooter className="p-4 border-t mt-auto">
                  {isAuthenticated ? (
                    <SheetClose asChild>
                      <Button variant="outline" className="w-full" onClick={() => { logout(); closeMobileMenu(); }}>
                        <LogOut className="mr-2 h-4 w-4" />
                        {t('logout')}
                      </Button>
                    </SheetClose>
                  ) : (
                    <SheetClose asChild>
                      <Link href="/login" passHref>
                        <Button className="w-full" onClick={closeMobileMenu}>
                           <LogIn className="mr-2 h-4 w-4" />
                          {t('loginButton')}
                        </Button>
                      </Link>
                    </SheetClose>
                  )}
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </div>
        )}
      </div>
    </header>
  );
}
