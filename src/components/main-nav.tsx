
"use client";

import Link from "next/link";
import { Cloud, CalendarDays, Plane } from "lucide-react"; // Changed Bell to Plane
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
        <Link href="/" className="mr-4 flex items-center space-x-2">
          <Cloud className="h-6 w-6 text-primary" />
          <span className="font-bold sm:inline-block">
            Weatherugo
          </span>
        </Link>
        
        {/* Wrapper for right-aligned items */}
        <div className="ml-auto flex items-center space-x-4">
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
          
          <div className="flex items-center">
            <UserNav />
          </div>
        </div>
      </div>
    </header>
  );
}

