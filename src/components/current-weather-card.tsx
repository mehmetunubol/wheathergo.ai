
"use client";

import type { WeatherData } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Droplets, Wind, Compass, Info } from "lucide-react";
import { getWeatherIcon } from "@/components/icons";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/language-context";
import { useTranslation } from "@/hooks/use-translation";

interface CurrentWeatherCardProps {
  weatherData: WeatherData | null;
  isLoading: boolean;
}

export function CurrentWeatherCard({ weatherData, isLoading }: CurrentWeatherCardProps) {
  const { dateLocale } = useLanguage();
  const { t } = useTranslation();

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
          <CardTitle className="text-xl">{t('weatherInLocation', { location: '...' })}</CardTitle>
          <CardDescription>{t('currentWeatherLoading')}</CardDescription>
        </CardHeader>
         <CardContent><p>{t('currentWeatherLoading')}</p></CardContent>
      </Card>
    );
  }

  const isDayForIcon = typeof weatherData.isDay === 'boolean' ? weatherData.isDay : true;
  const IconComponent = getWeatherIcon(weatherData.conditionCode, weatherData.condition, isDayForIcon);
  const formattedDate = format(parseISO(weatherData.date), "EEEE, MMMM do, yyyy", { locale: dateLocale });

  return (
    <Card className="shadow-lg bg-card">
      <CardHeader>
        <CardTitle className="text-xl text-primary-foreground bg-primary -m-6 p-6 rounded-t-lg flex items-center justify-between">
          <span>{t('weatherInLocation', { location: weatherData.location })}</span>
          <Compass />
        </CardTitle>
        <CardDescription className="pt-4 text-sm">
          {formattedDate}
           {weatherData.isGuessed && (
             <Popover>
                <PopoverTrigger asChild>
                    <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        className="ml-2 mt-0 p-0 h-auto appearance-none focus:outline-none focus:ring-1 focus:ring-amber-500 focus:ring-offset-1 inline-flex items-center text-xs text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full border border-amber-300 cursor-help hover:bg-amber-200"
                        aria-label="AI Estimated Forecast Information"
                    >
                        <Info size={12} className="mr-1" /> AI
                    </Button>
                </PopoverTrigger>
                <PopoverContent side="bottom" className="max-w-xs bg-background border-border shadow-lg p-3 text-xs">
                    <p>{t('aiEstimateTooltip')}</p>
                </PopoverContent>
            </Popover>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <IconComponent size={64} className="text-accent" data-ai-hint={`${weatherData.condition} weather ${isDayForIcon ? "day" : "night"}`} />
          <div className="text-right">
            <p className="text-5xl font-bold">{weatherData.temperature}°C</p>
            <p className="text-muted-foreground capitalize">{weatherData.description}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border mt-4">
          <div className="flex items-center gap-2 mt-4">
            <Droplets className="text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">{t('humidity')}</p>
              <p className="font-semibold">{weatherData.humidity}%</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <Wind className="text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">{t('wind')}</p>
              <p className="font-semibold">{weatherData.windSpeed} km/h</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
