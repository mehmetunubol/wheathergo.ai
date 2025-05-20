"use client";

import { Zap } from "lucide-react"; // Using Zap as a weather-related icon

export function AppHeader() {
  return (
    <header className="bg-primary text-primary-foreground py-4 px-6 shadow-md rounded-b-lg">
      <div className="container mx-auto flex items-center gap-2">
        <Zap className="h-8 w-8" />
        <h1 className="text-2xl font-bold">WeatherWise Guide</h1>
      </div>
    </header>
  );
}
