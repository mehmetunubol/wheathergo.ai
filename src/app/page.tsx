
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
import type { WeatherData, LastKnownWeather, CachedWeatherData, CachedOutfitSuggestions, CachedActivitySuggestions } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { format, isToday, getHours, isValid, parseISO } from "date-fns";
import { HourlyForecastCard } from "@/components/hourly-forecast-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plane, LogIn, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";

const DEFAULT_LOCATION = "auto:ip";
const DEFAULT_FAMILY_PROFILE = "A single adult enjoying good weather.";
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

function getTimeOfDay(dateWithTime: Date): string {
  const hour = getHours(dateWithTime);
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
  
  const [isLoadingProfile, setIsLoadingProfile] = React.useState(true); 
  const [isLoadingPreferences, setIsLoadingPreferences] = React.useState(true); 

  const { toast } = useToast();
  const { isAuthenticated, user, isLoading: authIsLoading } = useAuth();

  React.useEffect(() => {
    const loadPreferences = async () => {
      if (authIsLoading) return;

      setIsLoadingPreferences(true);
      try { 
        if (isAuthenticated && user) {
          const prefsRef = doc(db, "users", user.uid, "preferences", "appState");
          const docSnap = await getDoc(prefsRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.lastLocation) {
              setLocation(data.lastLocation);
            } else {
              const storedLocation = localStorage.getItem("weatherugo-location");
              setLocation(storedLocation && storedLocation.toLowerCase() !== "auto:ip" ? storedLocation : DEFAULT_LOCATION);
            }
            if (data.lastSelectedDate) {
              const parsedDate = parseISO(data.lastSelectedDate);
              if (isValid(parsedDate)) {
                setSelectedDate(parsedDate);
              } else {
                setSelectedDate(new Date());
              }
            } else {
              setSelectedDate(new Date());
            }
          } else {
             const storedLocation = localStorage.getItem("weatherugo-location");
            setLocation(storedLocation && storedLocation.toLowerCase() !== "auto:ip" ? storedLocation : DEFAULT_LOCATION);
            setSelectedDate(new Date());
          }
        } else {
          const storedLocation = localStorage.getItem("weatherugo-location");
          setLocation(storedLocation && storedLocation.toLowerCase() !== "auto:ip" ? storedLocation : DEFAULT_LOCATION);
          setSelectedDate(new Date());
        }
      } catch (error) { 
        console.error("Error during preferences loading:", error);
        const storedLocation = localStorage.getItem("weatherugo-location");
        setLocation(storedLocation && storedLocation.toLowerCase() !== "auto:ip" ? storedLocation : DEFAULT_LOCATION);
        setSelectedDate(new Date());
      } finally { 
        setIsLoadingPreferences(false);
      }
    };
    loadPreferences();
  }, [isAuthenticated, user, authIsLoading]);

  React.useEffect(() => {
    if (location && location.toLowerCase() !== "auto:ip") {
      localStorage.setItem("weatherugo-location", location);
      if (isAuthenticated && user && !isLoadingPreferences && !authIsLoading) { 
        const prefsRef = doc(db, "users", user.uid, "preferences", "appState");
        setDoc(prefsRef, { lastLocation: location }, { merge: true })
          .catch(error => console.error("Error saving location to Firestore:", error));
      }
    }
  }, [location, isAuthenticated, user, isLoadingPreferences, authIsLoading]);

  React.useEffect(() => {
    if (isAuthenticated && user && !isLoadingPreferences && !authIsLoading && selectedDate) { 
      const prefsRef = doc(db, "users", user.uid, "preferences", "appState");
      setDoc(prefsRef, { lastSelectedDate: selectedDate.toISOString() }, { merge: true })
        .catch(error => console.error("Error saving selectedDate to Firestore:", error));
    }
  }, [selectedDate, isAuthenticated, user, isLoadingPreferences, authIsLoading]);


  React.useEffect(() => {
    async function getWeatherAndSuggestions() {
      if (authIsLoading || isLoadingProfile || isLoadingPreferences) return;
      if (!location || !selectedDate) return;

      const formattedDateForCacheKey = format(selectedDate, "yyyy-MM-dd-HH"); // Include hour in cache key
      const currentTime = new Date().getTime();
      let currentFetchedWeatherData: WeatherData | null = null;

      const weatherCacheKey = `weatherugo-cache-weather-${location}-${formattedDateForCacheKey}`;
      const cachedWeatherString = localStorage.getItem(weatherCacheKey);
      let weatherFromCache = false;

      if (cachedWeatherString) {
        try {
          const cached: CachedWeatherData = JSON.parse(cachedWeatherString);
          if (currentTime - cached.timestamp < CACHE_DURATION_MS) {
            setWeatherData(cached.data);
            currentFetchedWeatherData = cached.data;
            setIsLoadingWeather(false);
            weatherFromCache = true;
            if (location.toLowerCase() === "auto:ip" && cached.data.location && cached.data.location.toLowerCase() !== "auto:ip") {
              setLocation(cached.data.location);
            }
          }
        } catch (e) {
          console.error("Failed to parse cached weather data", e);
          localStorage.removeItem(weatherCacheKey);
        }
      }

      if (!weatherFromCache) {
        setIsLoadingWeather(true);
        setWeatherData(null); 
        try {
          const data = await fetchWeather(location, selectedDate); 
          setWeatherData(data);
          currentFetchedWeatherData = data;
          // Cache includes isGuessed flag from fetchWeather directly
          localStorage.setItem(weatherCacheKey, JSON.stringify({ timestamp: currentTime, data }));
          if (location.toLowerCase() === "auto:ip" && data.location && data.location.toLowerCase() !== "auto:ip") {
            setLocation(data.location); 
          }
          if (isToday(selectedDate) && !data.isGuessed) { // Only show diff toast for non-guessed, today's weather
            const todayStr = format(new Date(), "yyyy-MM-dd");
            const lastKnownWeatherStr = localStorage.getItem("weatherugo-lastKnownWeather");
            if (lastKnownWeatherStr) {
                const lastKnown: LastKnownWeather = JSON.parse(lastKnownWeatherStr);
                if (lastKnown.location === data.location && lastKnown.date === todayStr) { 
                    if (Math.abs(data.temperature - lastKnown.temperature) > 5 || data.condition !== lastKnown.condition) {
                        toast({
                            title: "Weather Update!",
                            description: `Weather in ${data.location} has changed. Currently ${data.temperature}°C and ${data.condition.toLowerCase()}.`,
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
        } catch (error: any) {
          console.error(`Client-side fetch weather error for "${location}":`, error.message);
          let toastDescription = error.message || `Could not retrieve weather data for "${location}". Please try a different location or check again later.`;
          if (error.message && error.message.toLowerCase().includes("api key")) {
             toastDescription = `Could not retrieve weather data: API key issue. Please contact support.`;
          } else if (error.message && error.message.toLowerCase().includes("no matching location found")) {
            toastDescription = `No weather data found for '${location}'. Please ensure the location is correct.`;
          }
          toast({ 
            title: "Weather Data Error", 
            description: toastDescription, 
            variant: "destructive" 
          });
          currentFetchedWeatherData = null;
          setWeatherData(null);
        } finally {
          setIsLoadingWeather(false);
        }
      }

      if (currentFetchedWeatherData && familyProfile) {
        // If weather is AI guessed, suggestions will be based on that guess.
        // The AI suggestion flows themselves don't need to know if the weather input was guessed.
        const currentTOD = getTimeOfDay(selectedDate);
        const outfitCacheKey = `weatherugo-cache-outfit-${currentFetchedWeatherData.location}-${formattedDateForCacheKey}-${familyProfile}-${currentFetchedWeatherData.isGuessed ? 'guessed' : 'real'}`;
        const activityCacheKey = `weatherugo-cache-activity-${currentFetchedWeatherData.location}-${formattedDateForCacheKey}-${familyProfile}-${currentTOD}-${currentFetchedWeatherData.isGuessed ? 'guessed' : 'real'}`;

        const cachedOutfitString = localStorage.getItem(outfitCacheKey);
        let outfitFromCache = false;
        if (cachedOutfitString) {
          try {
            const cached: CachedOutfitSuggestions = JSON.parse(cachedOutfitString);
            if (currentTime - cached.timestamp < CACHE_DURATION_MS) {
              setOutfitSuggestions(cached.data);
              setIsLoadingOutfit(false);
              outfitFromCache = true;
            }
          } catch (e) {
            console.error("Failed to parse cached outfit suggestions", e);
            localStorage.removeItem(outfitCacheKey);
          }
        }

        if (!outfitFromCache) {
          setIsLoadingOutfit(true);
          setOutfitSuggestions(null);
          try {
            const clothingInput = { weatherCondition: currentFetchedWeatherData.condition, temperature: currentFetchedWeatherData.temperature, familyProfile: familyProfile, location: currentFetchedWeatherData.location };
            const clothing = await suggestClothing(clothingInput);
            setOutfitSuggestions(clothing);
            localStorage.setItem(outfitCacheKey, JSON.stringify({ timestamp: currentTime, data: clothing }));
          } catch (error: any) {
            console.error("Failed to get outfit suggestions:", error);
            toast({ title: "Outfit Suggestion Error", description: error.message || "Could not fetch outfit suggestions. AI service may be unavailable.", variant: "destructive" });
            setOutfitSuggestions(null); // Clear on error
          } finally {
            setIsLoadingOutfit(false);
          }
        }

        const cachedActivityString = localStorage.getItem(activityCacheKey);
        let activityFromCache = false;
        if (cachedActivityString) {
          try {
            const cached: CachedActivitySuggestions = JSON.parse(cachedActivityString);
            if (currentTime - cached.timestamp < CACHE_DURATION_MS) {
              setActivitySuggestions(cached.data);
              setIsLoadingActivity(false);
              activityFromCache = true;
            }
          } catch (e) {
            console.error("Failed to parse cached activity suggestions", e);
            localStorage.removeItem(activityCacheKey);
          }
        }
        
        if (!activityFromCache) {
          setIsLoadingActivity(true);
          setActivitySuggestions(null);
          try {
            const activityInput = { weatherCondition: currentFetchedWeatherData.condition, temperature: currentFetchedWeatherData.temperature, familyProfile: familyProfile, timeOfDay: currentTOD, locationPreferences: currentFetchedWeatherData.location };
            const activities = await suggestActivities(activityInput);
setActivitySuggestions(activities);
            localStorage.setItem(activityCacheKey, JSON.stringify({ timestamp: currentTime, data: activities }));
          } catch (error: any) {
            console.error("Failed to get activity suggestions:", error);
            toast({ title: "Activity Suggestion Error", description: error.message || "Could not fetch activity suggestions. AI service may be unavailable.", variant: "destructive" });
            setActivitySuggestions(null); // Clear on error
          } finally {
            setIsLoadingActivity(false);
          }
        }
      } else {
        // If no weather data, clear suggestions
        setOutfitSuggestions(null);
        setActivitySuggestions(null);
        setIsLoadingOutfit(false);
        setIsLoadingActivity(false);
      }
    }
    getWeatherAndSuggestions();
  // Ensure all dependencies that trigger re-fetch are listed.
  }, [location, selectedDate, familyProfile, toast, authIsLoading, isLoadingProfile, isLoadingPreferences, user]);


  const handleDateChange = React.useCallback((date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
    } else {
      setSelectedDate(new Date()); 
    }
  }, []);
  
  const handleProfileUpdate = React.useCallback((newProfile: string) => {
    setFamilyProfile(newProfile); 
    setIsLoadingProfile(false); 
  }, []);


  const getFilteredHourlyForecast = () => {
    if (!weatherData?.forecast || weatherData.isGuessed) return []; // No hourly for guessed
    
    // For non-guessed weather, filter based on selectedDate's hour if it's today
    if (!isToday(selectedDate)) return weatherData.forecast;

    const currentHourToDisplayFrom = getHours(selectedDate); 
    return weatherData.forecast.filter(item => {
        // Assuming item.time is "1 AM", "11 PM", etc. from WeatherAPI
        const timeParts = item.time.match(/(\d+)\s*(AM|PM)/i);
        if (timeParts) {
            let itemHour = parseInt(timeParts[1]);
            const ampm = timeParts[2].toUpperCase();
            if (ampm === 'PM' && itemHour !== 12) itemHour += 12;
            if (ampm === 'AM' && itemHour === 12) itemHour = 0; // Midnight case
            return itemHour >= currentHourToDisplayFrom;
        }
        // Fallback if time format is different (should not happen with WeatherAPI structure)
        try {
          // Attempt to parse more complex time strings if necessary
          const fullItemTime = parseISO(`${format(selectedDate, 'yyyy-MM-dd')}T${item.time.replace(/( AM| PM)/i, ':00')}`); // This might be fragile
          if (isValid(fullItemTime)) {
            return getHours(fullItemTime) >= currentHourToDisplayFrom;
          }
        } catch { /* ignore parsing error for fallback */ }
        return true; // Default to show if parsing fails
    });
  };

  if (authIsLoading || isLoadingPreferences) {
    return (
      <div className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <Skeleton className="h-[230px] w-full" />
          <Skeleton className="h-[230px] w-full" />
        </div>
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[150px] w-full" />
        <Skeleton className="h-[180px] w-full" />
        <Skeleton className="h-[180px] w-full" />
      </div>
    );
  }

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
          onProfileSave={handleProfileUpdate} 
        />
      </div>

      <CurrentWeatherCard weatherData={weatherData} isLoading={isLoadingWeather} />
      
      { (weatherData || isLoadingWeather) && selectedDate && (
        <HourlyForecastCard
          forecastData={getFilteredHourlyForecast()}
          isLoading={isLoadingWeather}
          date={selectedDate}
          isParentGuessed={weatherData?.isGuessed}
        />
      )}
      
      {(weatherData || isLoadingOutfit || isLoadingActivity || isLoadingWeather ) && (
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
