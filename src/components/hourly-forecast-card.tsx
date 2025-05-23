
"use client";

import * as React from "react";
import type { HourlyForecastData, WeatherData } from "@/types"; // Added WeatherData
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getWeatherIcon } from "@/components/icons";
import { Clock, Info } from "lucide-react"; // Added Info
import { format as formatDateFns } from "date-fns";


interface HourlyForecastCardProps {
  forecastData: HourlyForecastData[] | undefined;
  isLoading: boolean;
  date: Date;
  isParentGuessed?: boolean; // To know if the main weather data was an AI guess
}

export function HourlyForecastCard({ forecastData, isLoading, date, isParentGuessed }: HourlyForecastCardProps) {
  const forecastTitle = `Forecast for ${formatDateFns(date, "MMM d, yyyy")}`;

  if (isLoading) {
    return (
      <Card className="shadow-md rounded-lg">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="text-primary" /> {forecastTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4 overflow-x-auto pb-2">
            {[...Array(12)].map((_, index) => ( 
              <div key={index} className="flex flex-col items-center space-y-1 p-3 border rounded-lg min-w-[100px] bg-card">
                <Skeleton className="h-4 w-16 mb-1" /> 
                <Skeleton className="h-8 w-8 rounded-full my-1" /> 
                <Skeleton className="h-4 w-8 mt-1" /> 
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isParentGuessed || !forecastData || forecastData.length === 0) {
    return (
      <Card className="shadow-md rounded-lg">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="text-primary" /> {forecastTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground p-4 border rounded-md bg-muted/50">
            <Info size={18} />
            <span>
              {isParentGuessed 
                ? "Detailed hourly forecast is not available for AI-estimated weather."
                : "No detailed hourly forecast available for this period."
              }
            </span>
          </div>
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
        <div className="flex space-x-3 overflow-x-auto pb-2" role="list" aria-label="Hourly weather forecast">
          {forecastData.map((item, index) => {
            const isDayForIcon = typeof item.isDay === 'boolean' ? item.isDay : true;
            const IconComponent = getWeatherIcon(item.conditionCode, item.condition, isDayForIcon);
            return (
              <div
                key={index}
                className="flex flex-col items-center space-y-1 p-3 border rounded-lg min-w-[100px] bg-card shadow-sm text-center" 
                role="listitem"
              >
                <p className="text-xs font-medium text-muted-foreground">{item.time}</p>
                <IconComponent size={32} className="text-accent my-1" data-ai-hint={`${item.condition} weather ${isDayForIcon ? "day" : "night"}`} />
                <p className="text-sm font-semibold">{item.temperature}°C</p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
