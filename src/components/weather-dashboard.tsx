"use client";

import * as React from "react";
import { AppHeader } from "./app-header";
import { LocationDateSelector } from "./location-date-selector";
import { FamilyProfileEditor } from "./family-profile-editor";
import { CurrentWeatherCard } from "./current-weather-card";
import { SuggestionsTabs } from "./suggestions-tabs";
import { fetchWeather } from "@/lib/weather-api";
import { suggestClothing, type ClothingSuggestionsOutput } from "@/ai/flows/clothing-suggestions";
import { suggestActivities, type ActivitySuggestionsOutput } from "@/ai/flows/activity-suggestions";
import type { WeatherData, LastKnownWeather } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { format, isToday } from "date-fns";

const DEFAULT_LOCATION = "New York";
const DEFAULT_FAMILY_PROFILE = "A single adult enjoying good weather.";

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

export function WeatherDashboard() {
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

  // Load initial state from localStorage
  React.useEffect(() => {
    const storedLocation = localStorage.getItem("weatherwise-location");
    if (storedLocation) setLocation(storedLocation);

    const storedProfile = localStorage.getItem("weatherwise-familyProfile");
    if (storedProfile) setFamilyProfile(storedProfile);
    
    // Set initial loading to true to fetch data on first load
    setIsLoadingWeather(true); 
  }, []);

  // Save location and profile to localStorage
  React.useEffect(() => {
    localStorage.setItem("weatherwise-location", location);
  }, [location]);

  React.useEffect(() => {
    localStorage.setItem("weatherwise-familyProfile", familyProfile);
  }, [familyProfile]);

  // Fetch weather data
  React.useEffect(() => {
    async function getWeather() {
      if (!location || !selectedDate) return;
      setIsLoadingWeather(true);
      setWeatherData(null); // Clear previous data
      setOutfitSuggestions(null); // Clear suggestions
      setActivitySuggestions(null); // Clear suggestions
      try {
        const data = await fetchWeather(location, selectedDate);
        setWeatherData(data);

        // Notification logic only for today's weather
        if (isToday(selectedDate)) {
            const todayStr = format(new Date(), "yyyy-MM-dd");
            const lastKnownWeatherStr = localStorage.getItem("weatherwise-lastKnownWeather");
            if (lastKnownWeatherStr) {
                const lastKnown: LastKnownWeather = JSON.parse(lastKnownWeatherStr);
                if (lastKnown.location === location && lastKnown.date === todayStr) {
                    if (Math.abs(data.temperature - lastKnown.temperature) > 5 || data.condition !== lastKnown.condition) {
                        toast({
                            title: "Weather Update!",
                            description: `Weather in ${location} has changed. Currently ${data.temperature}°C and ${data.condition.toLowerCase()}.`,
                            variant: "default", 
                        });
                    }
                }
            }
            localStorage.setItem("weatherwise-lastKnownWeather", JSON.stringify({ 
                location: data.location, 
                temperature: data.temperature, 
                condition: data.condition,
                date: todayStr 
            }));
        }
      } catch (error) {
        console.error("Failed to fetch weather:", error);
        toast({ title: "Error", description: "Could not fetch weather data.", variant: "destructive" });
        setWeatherData(null);
      } finally {
        setIsLoadingWeather(false);
      }
    }
    getWeather();
  }, [location, selectedDate, toast]);

  // Fetch AI suggestions
  React.useEffect(() => {
    async function getSuggestions() {
      if (!weatherData || !familyProfile) return;

      setIsLoadingOutfit(true);
      setIsLoadingActivity(true);

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
        toast({ title: "AI Error", description: "Could not get outfit suggestions.", variant: "destructive" });
        setOutfitSuggestions(null);
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
        toast({ title: "AI Error", description: "Could not get activity suggestions.", variant: "destructive" });
        setActivitySuggestions(null);
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

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <AppHeader />
      <main className="flex-grow container mx-auto max-w-2xl p-4 space-y-6">
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
        
        {(weatherData || isLoadingOutfit || isLoadingActivity) && (
          <SuggestionsTabs
            outfitSuggestions={outfitSuggestions}
            isOutfitLoading={isLoadingOutfit}
            activitySuggestions={activitySuggestions}
            isActivityLoading={isLoadingActivity}
          />
        )}
      </main>
      <footer className="text-center py-4 text-sm text-muted-foreground border-t">
        WeatherWise Guide &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
