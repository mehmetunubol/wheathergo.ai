
"use client";

import Link from "next/link";
import { Cloud, CalendarDays, Plane } from "lucide-react";
import { UserNav } from "./user-nav";
import { usePathname } from 'next/navigation';
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/use-translation";

export function MainNav() {
  const pathname = usePathname();
  const { t } = useTranslation();

  const navItems = [
    { href: "/", labelKey: "weather" as const, icon: <CalendarDays className="h-4 w-4" /> },
    { href: "/notifications", labelKey: "travelPlans" as const, icon: <Plane className="h-4 w-4" /> },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center justify-between px-4">
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <Cloud className="h-7 w-7 text-primary" />
          <div>
            <span className="font-bold text-lg sm:inline-block">
              Weatherugo
            </span>
            <p className="text-xs text-muted-foreground hidden sm:block">
              Your personal weather & travel companion.
            </p>
          </div>
        </Link>
        
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
      </div>
    </header>
  );
}
