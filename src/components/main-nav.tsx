
"use client";

import Link from "next/link";
import { Cloud, CalendarDays, Plane, Menu as MenuIcon } from "lucide-react";
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
} from "@/components/ui/sheet";

export function MainNav() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const navItems = [
    { href: "/", labelKey: "weather" as const, icon: <CalendarDays className="h-5 w-5" /> },
    { href: "/notifications", labelKey: "travelPlans" as const, icon: <Plane className="h-5 w-5" /> },
  ];

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  // Placeholder for initial render while isMobile is undefined to prevent hydration errors / layout shifts
  if (isMobile === undefined) {
    return (
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 max-w-screen-2xl items-center justify-between px-4">
          <Link href="/" className="flex items-center space-x-2">
            <Cloud className="h-7 w-7 text-primary" />
            <div>
              <span className="font-bold text-lg">Weatherugo</span>
            </div>
          </Link>
          {/* Minimalistic placeholder for the right side */}
          <div className="h-8 w-20"></div>
        </div>
      </header>
    );
  }

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

        {isMobile ? (
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={t('openMenu')}>
                <MenuIcon className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[240px] p-0 flex flex-col"> {/* Reduced width */}
              <SheetHeader className="p-4 border-b">
                <SheetTitle className="text-left flex items-center gap-2">
                   <Cloud className="h-6 w-6 text-primary" /> Weatherugo
                </SheetTitle>
              </SheetHeader>
              <div className="p-4 border-b flex flex-col items-center"> {/* Centered UserNav */}
                <UserNav />
              </div>
              <nav className="flex flex-col space-y-1 p-4">
                {navItems.map((item) => (
                  <SheetClose asChild key={item.href}>
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
            </SheetContent>
          </Sheet>
        ) : (
          <div className="flex items-center space-x-4">
            <nav className="flex items-center gap-4 text-sm lg:gap-6">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "transition-colors hover:text-foreground/80 flex items-center gap-1",
                    pathname === item.href ? "text-foreground font-semibold" : "text-foreground/60"
                  )}
                >
                  {item.icon}
                  {t(item.labelKey)}
                </Link>
              ))}
            </nav>
            <UserNav />
          </div>
        )}
      </div>
    </header>
  );
}
