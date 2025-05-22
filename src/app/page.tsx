
"use client";

import * as React from "react";
import Link from "next/link";
import { LocationDateSelector } from "@/components/location-date-selector";
import { FamilyProfileEditor } from "@/components/family-profile-editor";
import { CurrentWeatherCard } from "@/components/current-weather-card";
import { SuggestionsTabs } from "@/components/suggestions-tabs";
import { fetchWeather } from "@/lib/weather-api";
import { suggestClothing, type ClothingSuggestionsOutput } from "@/ai/flows/clothing-suggestions";
import { suggestActivities, type ActivitySuggestionsOutput } from "@/ai/flows/activity-suggestions";
import type { WeatherData, LastKnownWeather } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { format, isToday, parseISO, getHours } from "date-fns";
import { HourlyForecastCard } from "@/components/hourly-forecast-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plane, LogIn, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const DEFAULT_LOCATION = "New York";
const DEFAULT_FAMILY_PROFILE = "A single adult enjoying good weather.";

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

export default function HomePage() {
  const [location, setLocation] = React.useState<string>(DEFAULT_LOCATION);
  const [selectedDate, setSelectedDate] = React.useState<Date>(new Date());
  const [familyProfile, setFamilyProfile] = React.useState<string>(DEFAULT_FAMILY_PROFILE);
  
  const [weatherData, setWeatherData] = React.useState<WeatherData | null>(null);
  const [outfitSuggestions, setOutfitSuggestions] = React.useState<ClothingSuggestionsOutput | null>(null);
  const [activitySuggestions, setActivitySuggestions] = React.useState<ActivitySuggestionsOutput | null>(null);

  const [isLoadingWeather, setIsLoadingWeather] = React.useState(true);
  const [isLoadingOutfit, setIsLoadingOutfit] = React.useState(false);
  const [isLoadingActivity, setIsLoadingActivity] = React.useState(false);

  const { toast } = useToast();
  const { isAuthenticated } = useAuth();

  React.useEffect(() => {
    const storedLocation = localStorage.getItem("weatherugo-location");
    if (storedLocation) setLocation(storedLocation);

    const storedProfile = localStorage.getItem("weatherugo-familyProfile");
    if (storedProfile) setFamilyProfile(storedProfile);
    
    setIsLoadingWeather(true); 
  }, []);

  React.useEffect(() => {
    localStorage.setItem("weatherugo-location", location);
  }, [location]);

  React.useEffect(() => {
    localStorage.setItem("weatherugo-familyProfile", familyProfile);
  }, [familyProfile]);

  React.useEffect(() => {
    async function getWeather() {
      if (!location || !selectedDate) return;
      setIsLoadingWeather(true);
      setWeatherData(null); 
      setOutfitSuggestions(null); 
      setActivitySuggestions(null); 
      try {
        const data = await fetchWeather(location, selectedDate);
        if (data) {
            setWeatherData(data);

            if (isToday(selectedDate)) {
                const todayStr = format(new Date(), "yyyy-MM-dd");
                const lastKnownWeatherStr = localStorage.getItem("weatherugo-lastKnownWeather");
                if (lastKnownWeatherStr) {
                    const lastKnown: LastKnownWeather = JSON.parse(lastKnownWeatherStr);
                    if (lastKnown.location === location && lastKnown.date === todayStr) {
                        if (Math.abs(data.temperature - lastKnown.temperature) > 5 || data.condition !== lastKnown.condition) {
                            toast({
                                title: "Weather Update!",
                                description: `Weather in ${location} has changed. Currently ${data.temperature}°C and ${data.condition.toLowerCase()}.`,
                            });
                        }
                    }
                }
                localStorage.setItem("weatherugo-lastKnownWeather", JSON.stringify({ 
                    location: data.location, 
                    temperature: data.temperature, 
                    condition: data.condition,
                    date: todayStr 
                }));
            }
        } else {
             toast({ 
                title: "Error Fetching Weather", 
                description: "Could not retrieve weather data. The service might be temporarily unavailable or there might be an issue with the location or API key configuration. Please try again later.", 
                variant: "destructive" 
            });
            setWeatherData(null);
        }
      } catch (error) {
        console.error("Failed to fetch weather:", error);
        toast({ 
            title: "Error Fetching Weather", 
            description: "An unexpected error occurred while fetching weather data. Please check your connection or try again.", 
            variant: "destructive" 
        });
        setWeatherData(null);
      } finally {
        setIsLoadingWeather(false);
      }
    }
    getWeather();
  }, [location, selectedDate, toast]);

  React.useEffect(() => {
    async function getSuggestions() {
      if (!weatherData || !familyProfile) return;

      setIsLoadingOutfit(true);
      setIsLoadingActivity(true);
      setOutfitSuggestions(null);
      setActivitySuggestions(null);

      try {
        const clothingInput = {
          weatherCondition: weatherData.condition,
          temperature: weatherData.temperature,
          familyProfile: familyProfile,
          location: weatherData.location,
        };
        const clothing = await suggestClothing(clothingInput);
        setOutfitSuggestions(clothing);
      } catch (error) {
        console.error("Failed to get outfit suggestions:", error);
        toast({
          title: "Outfit Suggestion Error",
          description: "Could not fetch outfit suggestions. The AI service may be temporarily unavailable. Please try again later.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingOutfit(false);
      }

      try {
        const activityInput = {
          weatherCondition: weatherData.condition,
          temperature: weatherData.temperature,
          familyProfile: familyProfile,
          timeOfDay: getTimeOfDay(),
          locationPreferences: weatherData.location,
        };
        const activities = await suggestActivities(activityInput);
        setActivitySuggestions(activities);
      } catch (error) {
        console.error("Failed to get activity suggestions:", error);
        toast({
          title: "Activity Suggestion Error",
          description: "Could not fetch activity suggestions. The AI service may be temporarily unavailable. Please try again later.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingActivity(false);
      }
    }

    if (weatherData) {
      getSuggestions();
    }
  }, [weatherData, familyProfile, toast]);


  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
    }
  };
  
  // Filter hourly forecast to show only future hours for today
  const getFilteredHourlyForecast = () => {
    if (!weatherData?.forecast) return [];
    if (!isToday(selectedDate)) return weatherData.forecast;

    const currentHour = getHours(new Date());
    return weatherData.forecast.filter(item => {
      // Assuming item.time is "H AM/PM" e.g. "1 PM", "10 AM"
      // This parsing is a bit naive and might need improvement if time formats vary more
      const itemHourMatch = item.time.match(/(\d+)\s*(AM|PM)/i);
      if (itemHourMatch) {
        let itemHour = parseInt(itemHourMatch[1]);
        const ampm = itemHourMatch[2].toUpperCase();
        if (ampm === 'PM' && itemHour !== 12) itemHour += 12;
        if (ampm === 'AM' && itemHour === 12) itemHour = 0; // Midnight case
        return itemHour >= currentHour;
      }
      return true; // If time format is unexpected, include it
    });
  };


  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <LocationDateSelector
          location={location}
          onLocationChange={setLocation}
          selectedDate={selectedDate}
          onDateChange={handleDateChange}
        />
        <FamilyProfileEditor
          profile={familyProfile}
          onProfileSave={setFamilyProfile}
        />
      </div>

      <CurrentWeatherCard weatherData={weatherData} isLoading={isLoadingWeather} />
      
      { (weatherData || isLoadingWeather) && selectedDate && (
        <HourlyForecastCard
          forecastData={getFilteredHourlyForecast()}
          isLoading={isLoadingWeather}
          date={selectedDate}
        />
      )}
      
      {(weatherData || isLoadingOutfit || isLoadingActivity) && (
        <SuggestionsTabs
          outfitSuggestions={outfitSuggestions}
          isOutfitLoading={isLoadingOutfit}
          activitySuggestions={activitySuggestions}
          isActivityLoading={isLoadingActivity}
        />
      )}

      <Card className="shadow-lg bg-primary/10 border-primary/30">
        <CardHeader className="text-center">
          <CardTitle className="text-xl md:text-2xl font-bold flex items-center justify-center gap-2">
            <Sparkles className="text-accent h-6 w-6" />
            Ready for an Adventure?
            <Sparkles className="text-accent h-6 w-6" />
          </CardTitle>
          <CardDescription className="!mt-2 text-foreground/90">
            Use our <strong className="font-semibold text-primary">Travel Planner</strong> to get daily weather forecasts and AI-powered suggestions for your entire trip!
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            Plan your packing and activities with ease. {!isAuthenticated && "Sign up or log in to save your plans and enable (simulated) email notifications!"}
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-3 pt-2">
            <Link href="/notifications" passHref>
              <Button className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground">
                <Plane className="mr-2 h-5 w-5" /> Explore Travel Plans
              </Button>
            </Link>
            {!isAuthenticated && (
              <Link href="/login" passHref>
                <Button variant="outline" className="w-full sm:w-auto">
                  <LogIn className="mr-2 h-5 w-5" /> Sign Up / Log In
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
