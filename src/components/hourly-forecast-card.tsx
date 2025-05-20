"use client";

import * as React from "react";
import type { HourlyForecastData } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getWeatherIcon } from "@/components/icons";
import { Clock } from "lucide-react";
import { format as formatDateFns } from "date-fns";


interface HourlyForecastCardProps {
  forecastData: HourlyForecastData[] | undefined;
  isLoading: boolean;
  date: Date;
}

export function HourlyForecastCard({ forecastData, isLoading, date }: HourlyForecastCardProps) {
  const forecastTitle = `Forecast for ${formatDateFns(date, "MMM d")}`;

  React.useEffect(() => {
    // Helper style for no-scrollbar, can be added to globals.css if preferred
    const styleId = "no-scrollbar-style";
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.innerHTML = `
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none; 
          scrollbar-width: none; 
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  if (isLoading) {
    return (
      <Card className="shadow-md rounded-lg">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="text-primary" /> {forecastTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4 overflow-x-auto pb-2 no-scrollbar">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="flex flex-col items-center space-y-1 p-3 border rounded-lg min-w-[80px] bg-card">
                <Skeleton className="h-4 w-10 mb-1" /> {/* Time */}
                <Skeleton className="h-8 w-8 rounded-full my-1" /> {/* Icon */}
                <Skeleton className="h-4 w-8 mt-1" /> {/* Temp */}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!forecastData || forecastData.length === 0) {
    return (
      <Card className="shadow-md rounded-lg">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="text-primary" /> {forecastTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No further forecast details available for today, or for the selected date.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md rounded-lg">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
           <Clock className="text-primary" /> {forecastTitle}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex space-x-3 overflow-x-auto pb-2 no-scrollbar" role="list" aria-label="Hourly weather forecast">
          {forecastData.map((item, index) => {
            const IconComponent = getWeatherIcon(item.conditionCode, item.condition);
            return (
              <div
                key={index}
                className="flex flex-col items-center space-y-1 p-3 border rounded-lg min-w-[90px] bg-card shadow-sm text-center"
                role="listitem"
              >
                <p className="text-xs font-medium text-muted-foreground">{item.time}</p>
                <IconComponent size={32} className="text-accent my-1" data-ai-hint={`${item.condition} weather`} />
                <p className="text-sm font-semibold">{item.temperature}°C</p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
