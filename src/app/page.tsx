
"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from 'next/navigation';
import { LocationDateSelector } from "@/components/location-date-selector";
import { FamilyProfileEditor } from "@/components/family-profile-editor";
import { CurrentWeatherCard } from "@/components/current-weather-card";
import { SuggestionsTabs } from "@/components/suggestions-tabs";
import { fetchWeather } from "@/lib/weather-api";
import { suggestClothing, type ClothingSuggestionsOutput } from "@/ai/flows/clothing-suggestions";
import { suggestActivities, type ActivitySuggestionsOutput } from "@/ai/flows/activity-suggestions";
import type { WeatherData, LastKnownWeather, CachedWeatherData, CachedOutfitSuggestions, CachedActivitySuggestions, HourlyForecastData } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { format, isToday as fnsIsToday, getHours, isValid, parseISO } from "date-fns";
import { HourlyForecastCard } from "@/components/hourly-forecast-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plane, LogIn, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useAppSettings } from "@/contexts/app-settings-context"; // Import useAppSettings
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";

function getTimeOfDay(dateWithTime: Date): string {
  const hour = getHours(dateWithTime);
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

export default function HomePage() {
  const { settings: appSettings, isLoadingSettings: appSettingsLoading } = useAppSettings(); // Get app settings

  const [location, setLocation] = React.useState<string>(""); 
  const [selectedDate, setSelectedDate] = React.useState<Date>(new Date()); 
  
  const [familyProfile, setFamilyProfile] = React.useState<string>(appSettings.defaultFamilyProfile);
  
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
  const pathname = usePathname();
  const prevUserUID = React.useRef<string | undefined>(undefined);

  const handleProfileUpdate = React.useCallback((newProfile: string) => {
    setFamilyProfile(newProfile || appSettings.defaultFamilyProfile); 
    setIsLoadingProfile(false); 
  }, [appSettings.defaultFamilyProfile]);

  const handleDateChange = React.useCallback((date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
    } else {
      setSelectedDate(new Date()); 
    }
  }, []);

  React.useEffect(() => {
    // Update family profile if app settings change and no user profile is set
    if (!isLoadingProfile && (familyProfile === DEFAULT_APP_SETTINGS.defaultFamilyProfile || familyProfile === "")) {
        setFamilyProfile(appSettings.defaultFamilyProfile);
    }
  }, [appSettings.defaultFamilyProfile, isLoadingProfile, familyProfile]);


  React.useEffect(() => {
    const loadPreferences = async () => {
      if (authIsLoading || appSettingsLoading) return;

      setIsLoadingPreferences(true);
      const userJustLoggedIn = isAuthenticated && user && user.uid !== prevUserUID.current;
      let initialLocation = appSettings.defaultLocation; // Use app setting as base default

      try {
        if (isAuthenticated && user) {
          const prefsRef = doc(db, "users", user.uid, "preferences", "appState");
          const docSnap = await getDoc(prefsRef);

          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.lastLocation) {
              initialLocation = data.lastLocation;
            } // No user defaultLocation, appSettings.defaultLocation is the fallback
            
            if (userJustLoggedIn) {
              setSelectedDate(new Date()); 
            } else if (data.lastSelectedDate) {
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
            // No user preferences doc, check localStorage then app default
            const storedLocation = localStorage.getItem("weatherugo-location");
            if (storedLocation && storedLocation.toLowerCase() !== "auto:ip") {
              initialLocation = storedLocation;
            }
            setSelectedDate(new Date()); 
          }
        } else {
          // Not authenticated, load from localStorage then app default
          const storedLocation = localStorage.getItem("weatherugo-location");
          if (storedLocation && storedLocation.toLowerCase() !== "auto:ip") {
            initialLocation = storedLocation;
          }
          setSelectedDate(new Date());
        }
      } catch (error) {
        console.error("Error during preferences loading:", error);
        const storedLocation = localStorage.getItem("weatherugo-location");
        if (storedLocation && storedLocation.toLowerCase() !== "auto:ip") {
            initialLocation = storedLocation;
        }
        setSelectedDate(new Date());
      } finally {
        setLocation(initialLocation);
        setIsLoadingPreferences(false);
      }
    };

    if (!authIsLoading && !appSettingsLoading) { 
      loadPreferences();
    }
    
    if (!authIsLoading) {
        prevUserUID.current = user?.uid;
    }

  }, [isAuthenticated, user, authIsLoading, appSettingsLoading, appSettings.defaultLocation, pathname]);


  React.useEffect(() => {
    if (location && location.toLowerCase() !== "auto:ip") {
      localStorage.setItem("weatherugo-location", location);
      if (isAuthenticated && user && !isLoadingPreferences && !authIsLoading && !appSettingsLoading) { 
        const prefsRef = doc(db, "users", user.uid, "preferences", "appState");
        setDoc(prefsRef, { lastLocation: location }, { merge: true })
          .catch(error => console.error("Error saving location to Firestore:", error));
      }
    }
  }, [location, isAuthenticated, user, isLoadingPreferences, authIsLoading, appSettingsLoading]);

  React.useEffect(() => {
    if (isAuthenticated && user && !isLoadingPreferences && !authIsLoading && !appSettingsLoading && selectedDate) { 
      const prefsRef = doc(db, "users", user.uid, "preferences", "appState");
      setDoc(prefsRef, { lastSelectedDate: selectedDate.toISOString() }, { merge: true })
        .catch(error => console.error("Error saving selectedDate to Firestore:", error));
    }
  }, [selectedDate, isAuthenticated, user, isLoadingPreferences, authIsLoading, appSettingsLoading]);


  React.useEffect(() => {
    async function getWeatherAndSuggestions() {
      if (authIsLoading || isLoadingProfile || isLoadingPreferences || appSettingsLoading || !location) return; 
      if (!selectedDate) return;

      const CACHE_DURATION_MS = appSettings.cacheDurationMs;
      const MAX_API_FORECAST_DAYS = appSettings.maxApiForecastDays;

      const formattedDateForCacheKey = format(selectedDate, "yyyy-MM-dd");
      const formattedDateTimeForWeatherCacheKey = format(selectedDate, "yyyy-MM-dd-HH"); 
      const currentTime = new Date().getTime();
      let currentFetchedWeatherData: WeatherData | null = null;

      const weatherCacheKey = `weatherugo-cache-weather-${location}-${formattedDateTimeForWeatherCacheKey}-${selectedDate.getTimezoneOffset()}`;
      const cachedWeatherString = localStorage.getItem(weatherCacheKey);
      let weatherFromCache = false;

      if (cachedWeatherString) {
        try {
          const cached: CachedWeatherData = JSON.parse(cachedWeatherString);
          if (currentTime - cached.timestamp < CACHE_DURATION_MS && typeof cached.data.isGuessed === 'boolean') {
            setWeatherData(cached.data);
            currentFetchedWeatherData = cached.data;
            setIsLoadingWeather(false);
            weatherFromCache = true;
            if (location.toLowerCase() === "auto:ip" && cached.data.location && cached.data.location.toLowerCase() !== "auto:ip") {
              setLocation(cached.data.location);
            }
          } else {
             localStorage.removeItem(weatherCacheKey); 
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
          const data = await fetchWeather(location, selectedDate, MAX_API_FORECAST_DAYS); 
          setWeatherData(data);
          currentFetchedWeatherData = data;
          localStorage.setItem(weatherCacheKey, JSON.stringify({ timestamp: currentTime, data }));
          if (location.toLowerCase() === "auto:ip" && data.location && data.location.toLowerCase() !== "auto:ip") {
            setLocation(data.location); 
          }
          if (fnsIsToday(selectedDate) && !data.isGuessed) { 
            const todayStr = format(new Date(), "yyyy-MM-dd");
            const lastKnownWeatherStr = localStorage.getItem("weatherugo-lastKnownWeather");
            if (lastKnownWeatherStr) {
                try {
                    const lastKnown: LastKnownWeather = JSON.parse(lastKnownWeatherStr);
                    if (lastKnown.location === data.location && lastKnown.date === todayStr) { 
                        if (Math.abs(data.temperature - lastKnown.temperature) > 5 || data.condition !== lastKnown.condition) {
                            toast({
                                title: "Weather Update!",
                                description: `Weather in ${data.location} has changed. Currently ${data.temperature}°C and ${data.condition.toLowerCase()}.`,
                            });
                        }
                    }
                } catch (e) { localStorage.removeItem("weatherugo-lastKnownWeather"); }
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

      const effectiveFamilyProfile = familyProfile || appSettings.defaultFamilyProfile;

      if (currentFetchedWeatherData && effectiveFamilyProfile) {
        const currentTOD = getTimeOfDay(selectedDate);
        const outfitCacheKey = `weatherugo-cache-outfit-${currentFetchedWeatherData.location}-${formattedDateForCacheKey}-${effectiveFamilyProfile}-${currentFetchedWeatherData.isGuessed ? 'guessed' : 'real'}`;
        const activityCacheKey = `weatherugo-cache-activity-${currentFetchedWeatherData.location}-${formattedDateForCacheKey}-${effectiveFamilyProfile}-${currentTOD}-${currentFetchedWeatherData.isGuessed ? 'guessed' : 'real'}`;

        const cachedOutfitString = localStorage.getItem(outfitCacheKey);
        let outfitFromCache = false;
        if (cachedOutfitString) {
          try {
            const cached: CachedOutfitSuggestions = JSON.parse(cachedOutfitString);
            if (currentTime - cached.timestamp < CACHE_DURATION_MS) {
              setOutfitSuggestions(cached.data);
              setIsLoadingOutfit(false);
              outfitFromCache = true;
            } else {
              localStorage.removeItem(outfitCacheKey);
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
            const clothingInput = { weatherCondition: currentFetchedWeatherData.condition, temperature: currentFetchedWeatherData.temperature, familyProfile: effectiveFamilyProfile, location: currentFetchedWeatherData.location };
            const clothing = await suggestClothing(clothingInput);
            setOutfitSuggestions(clothing);
            localStorage.setItem(outfitCacheKey, JSON.stringify({ timestamp: currentTime, data: clothing }));
          } catch (error: any) {
            console.error("Failed to get outfit suggestions:", error);
            toast({ title: "Outfit Suggestion Error", description: error.message || "Could not fetch outfit suggestions. AI service may be unavailable.", variant: "destructive" });
            setOutfitSuggestions(null); 
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
            } else {
              localStorage.removeItem(activityCacheKey);
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
            const activityInput = { weatherCondition: currentFetchedWeatherData.condition, temperature: currentFetchedWeatherData.temperature, familyProfile: effectiveFamilyProfile, timeOfDay: currentTOD, locationPreferences: currentFetchedWeatherData.location };
            const activities = await suggestActivities(activityInput);
            setActivitySuggestions(activities);
            localStorage.setItem(activityCacheKey, JSON.stringify({ timestamp: currentTime, data: activities }));
          } catch (error: any) {
            console.error("Failed to get activity suggestions:", error);
            toast({ title: "Activity Suggestion Error", description: error.message || "Could not fetch activity suggestions. AI service may be unavailable.", variant: "destructive" });
            setActivitySuggestions(null); 
          } finally {
            setIsLoadingActivity(false);
          }
        }
      } else {
        setOutfitSuggestions(null);
        setActivitySuggestions(null);
        setIsLoadingOutfit(false);
        setIsLoadingActivity(false);
      }
    }

    if (!authIsLoading && !isLoadingProfile && !isLoadingPreferences && !appSettingsLoading && location) { 
      getWeatherAndSuggestions();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, selectedDate, familyProfile, toast, authIsLoading, isLoadingProfile, isLoadingPreferences, user, appSettingsLoading, appSettings.cacheDurationMs, appSettings.maxApiForecastDays, appSettings.defaultFamilyProfile]); 
  
  const getFilteredHourlyForecast = (): HourlyForecastData[] => {
    if (!weatherData?.forecast || weatherData.isGuessed) return []; 
    
    if (!fnsIsToday(selectedDate)) return weatherData.forecast;

    const currentHourToDisplayFrom = getHours(selectedDate); 
    return weatherData.forecast.filter(item => {
        let itemHour = -1;
        const timeParts = item.time.match(/(\d+)\s*(AM|PM)/i); 
        if (timeParts) {
            itemHour = parseInt(timeParts[1]);
            const ampm = timeParts[2].toUpperCase();
            if (ampm === 'PM' && itemHour !== 12) itemHour += 12;
            if (ampm === 'AM' && itemHour === 12) itemHour = 0; 
        } else { 
            const hourMatch = item.time.match(/^(\d{1,2})/); // Match 1 or 2 digits at the start
            if (hourMatch) {
                itemHour = parseInt(hourMatch[1]);
            }
        }
        
        if (itemHour !== -1) {
            return itemHour >= currentHourToDisplayFrom;
        }
        try {
          // Fallback for full ISO date strings if any
          const itemDate = parseISO(item.time); 
          if (isValid(itemDate)) {
             return getHours(itemDate) >= currentHourToDisplayFrom;
          }
        } catch { /* ignore parsing errors */ }
        return true; // If cannot parse, include it by default
    });
  };

  if (authIsLoading || isLoadingPreferences || appSettingsLoading) { 
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

  const filteredHourlyForecast = getFilteredHourlyForecast();
  const showHourlyForecast = !weatherData?.isGuessed && filteredHourlyForecast && filteredHourlyForecast.length > 0;


  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <LocationDateSelector
          location={location} 
          onLocationChange={setLocation}
          selectedDate={selectedDate}
          onDateChange={handleDateChange}
          maxApiForecastDays={appSettings.maxApiForecastDays} // Pass down setting
        />
        <FamilyProfileEditor
          profile={familyProfile} 
          onProfileSave={handleProfileUpdate} 
        />
      </div>

      <CurrentWeatherCard weatherData={weatherData} isLoading={isLoadingWeather} />
      
      {showHourlyForecast && (
        <HourlyForecastCard
          forecastData={filteredHourlyForecast}
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
