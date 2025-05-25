
"use client";

import * as React from "react";
import type { HourlyForecastData } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getWeatherIcon } from "@/components/icons";
import { Clock, Info } from "lucide-react";
import { format as formatDateFns, parseISO } from "date-fns"; // Added parseISO
import { useLanguage } from "@/contexts/language-context";
import { useTranslation } from "@/hooks/use-translation";


interface HourlyForecastCardProps {
  forecastData: HourlyForecastData[] | undefined;
  isLoading: boolean;
  date: Date; // This should be a Date object
  isParentGuessed?: boolean;
}

export function HourlyForecastCard({ forecastData, isLoading, date, isParentGuessed }: HourlyForecastCardProps) {
  const { dateLocale } = useLanguage();
  const { t } = useTranslation();
  
  // Ensure 'date' is a valid Date object before formatting
  const forecastTitle = isValidDate(date) ? t('hourlyForecastForDate', { date: formatDateFns(date, "MMM d, yyyy", { locale: dateLocale }) }) : t('hourlyForecastForDate', { date: '...' });


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
                ? t('hourlyForecastNotAvailable')
                : t('hourlyForecastNotAvailableForPeriod')
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
            let displayTime = item.time;
            // If time contains a date part (from next day forecasts), format it
            try {
              const parsedItemTime = parseISO(item.time); // Assuming item.time could be an ISO string for next day
              if (isValidDate(parsedItemTime)) {
                displayTime = formatDateFns(parsedItemTime, "MMM d, h a", { locale: dateLocale });
              } else {
                // Try parsing as just time if it's not a full ISO string
                const timeMatch = item.time.match(/(\d{1,2}:\d{2})\s*(AM|PM)?/i);
                if (timeMatch) {
                   displayTime = item.time; // Keep original if it's like "3 PM"
                }
              }
            } catch (e) {
              // Fallback to original item.time if parsing fails
            }

            return (
              <div
                key={index}
                className="flex flex-col items-center space-y-1 p-3 border rounded-lg min-w-[100px] bg-card shadow-sm text-center" 
                role="listitem"
              >
                <p className="text-xs font-medium text-muted-foreground">{displayTime}</p>
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

function isValidDate(d: any): d is Date {
  return d instanceof Date && !isNaN(d.getTime());
}
