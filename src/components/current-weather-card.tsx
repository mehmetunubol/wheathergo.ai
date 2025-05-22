
"use client";

import type { WeatherData } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Thermometer, Droplets, Wind, Compass } from "lucide-react";
import { getWeatherIcon } from "@/components/icons";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

interface CurrentWeatherCardProps {
  weatherData: WeatherData | null;
  isLoading: boolean;
}

export function CurrentWeatherCard({ weatherData, isLoading }: CurrentWeatherCardProps) {
  if (isLoading) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2 mt-1" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-16 w-16 rounded-full" />
            <Skeleton className="h-12 w-24" />
          </div>
          <Skeleton className="h-4 w-full" />
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="space-y-1">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-6 w-16" />
            </div>
            <div className="space-y-1">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-6 w-16" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!weatherData) {
    return (
       <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl">Weather Information</CardTitle>
          <CardDescription>No weather data available. Please select a location and date.</CardDescription>
        </CardHeader>
         <CardContent><p>Select a location and date to see weather details.</p></CardContent>
      </Card>
    );
  }

  const IconComponent = getWeatherIcon(weatherData.conditionCode, weatherData.condition, weatherData.isDay);
  const formattedDate = format(new Date(weatherData.date), "EEEE, MMMM do, yyyy");

  return (
    <Card className="shadow-lg bg-card">
      <CardHeader>
        <CardTitle className="text-xl text-primary-foreground bg-primary -m-6 p-6 rounded-t-lg flex items-center justify-between">
          <span>Weather in {weatherData.location}</span>
          <Compass />
        </CardTitle>
        <CardDescription className="pt-4 text-sm">
          {formattedDate}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <IconComponent size={64} className="text-accent" data-ai-hint={`${weatherData.condition} weather ${weatherData.isDay ? "day" : "night"}`} />
          <div className="text-right">
            <p className="text-5xl font-bold">{weatherData.temperature}°C</p>
            <p className="text-muted-foreground capitalize">{weatherData.description}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border mt-4">
          <div className="flex items-center gap-2 mt-4">
            <Droplets className="text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Humidity</p>
              <p className="font-semibold">{weatherData.humidity}%</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <Wind className="text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Wind</p>
              <p className="font-semibold">{weatherData.windSpeed} km/h</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
