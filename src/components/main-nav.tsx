
"use client";

import Link from "next/link";
import { Zap, CalendarDays, Plane } from "lucide-react"; // Changed Bell to Plane
import { UserNav } from "./user-nav";
import { usePathname } from 'next/navigation';
import { cn } from "@/lib/utils";

export function MainNav() {
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "Weather", icon: <CalendarDays className="h-4 w-4" /> },
    { href: "/notifications", label: "Travel Plans", icon: <Plane className="h-4 w-4" /> }, // Updated label and icon
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <Zap className="h-6 w-6 text-primary" />
          <span className="font-bold sm:inline-block">
            WeatherWise
          </span>
        </Link>
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
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex flex-1 items-center justify-end space-x-2">
          <UserNav />
        </div>
      </div>
    </header>
  );
}
