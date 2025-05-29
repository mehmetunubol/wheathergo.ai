
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
import { useAppSettings, DEFAULT_APP_SETTINGS } from "@/contexts/app-settings-context";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/contexts/language-context";
import { useTranslation } from "@/hooks/use-translation";

function getTimeOfDay(dateWithTime: Date): string {
  const hour = getHours(dateWithTime);
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

const DEFAULT_LOCATION_FALLBACK = "auto:ip"; 

export default function HomePage() {
  const { settings: appSettings, isLoadingSettings: appSettingsLoading } = useAppSettings(); 
  const { language, dateLocale } = useLanguage();
  const { t } = useTranslation();
  const pathname = usePathname();

  const [location, setLocation] = React.useState<string>(""); 
  const [selectedDate, setSelectedDate] = React.useState<Date>(new Date()); 
  
  const [familyProfile, setFamilyProfile] = React.useState<string>("");
  const [isLoadingProfileFromEditor, setIsLoadingProfileFromEditor] = React.useState(true); 
  
  const [weatherData, setWeatherData] = React.useState<WeatherData | null>(null);
  const [outfitSuggestions, setOutfitSuggestions] = React.useState<ClothingSuggestionsOutput | null>(null);
  const [activitySuggestions, setActivitySuggestions] = React.useState<ActivitySuggestionsOutput | null>(null);

  const [isLoadingWeather, setIsLoadingWeather] = React.useState(true);
  const [isLoadingOutfit, setIsLoadingOutfit] = React.useState(false);
  const [isLoadingActivity, setIsLoadingActivity] = React.useState(false); 
  
  const [isLoadingPreferences, setIsLoadingPreferences] = React.useState(true); 

  const { toast } = useToast();
  const { isAuthenticated, user, isLoading: authIsLoading } = useAuth();
  const prevUserUID = React.useRef<string | undefined>(undefined);


  const handleProfileUpdate = React.useCallback((newProfile: string) => {
    setFamilyProfile(newProfile);
    setIsLoadingProfileFromEditor(false);
  }, []);

  const handleDateChange = React.useCallback((date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
    } else {
      setSelectedDate(new Date()); 
    }
  }, []);


  React.useEffect(() => {
    const loadPreferences = async () => {
      if (authIsLoading || appSettingsLoading) return;

      setIsLoadingPreferences(true);
      const userJustLoggedIn = isAuthenticated && user && user.uid !== prevUserUID.current;
      let initialLocationResolved = appSettings.defaultLocation || DEFAULT_LOCATION_FALLBACK; 

      try {
        if (isAuthenticated && user) {
          const prefsRef = doc(db, "users", user.uid, "preferences", "appState");
          const docSnap = await getDoc(prefsRef);

          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.lastLocation) {
              initialLocationResolved = data.lastLocation;
            } 
            
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
            // No Firestore prefs, check localStorage for location if it was set before login
            const storedLocation = localStorage.getItem("weatherugo-location");
            if (storedLocation && storedLocation.toLowerCase() !== "auto:ip") {
              initialLocationResolved = storedLocation;
            }
            setSelectedDate(new Date()); 
          }
        } else { // Not authenticated
          const storedLocation = localStorage.getItem("weatherugo-location");
          if (storedLocation && storedLocation.toLowerCase() !== "auto:ip") {
            initialLocationResolved = storedLocation;
          }
          setSelectedDate(new Date());
        }
      } catch (error) {
        console.error("Error during preferences loading:", error);
        const storedLocation = localStorage.getItem("weatherugo-location");
        if (storedLocation && storedLocation.toLowerCase() !== "auto:ip") {
            initialLocationResolved = storedLocation;
        }
        setSelectedDate(new Date());
      } finally {
        setLocation(initialLocationResolved);
        setIsLoadingPreferences(false);
      }
    };

    if (!authIsLoading && !appSettingsLoading) { 
      loadPreferences();
    }
    
    if (!authIsLoading) {
        prevUserUID.current = user?.uid;
    }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.uid, authIsLoading, appSettingsLoading, appSettings.defaultLocation, pathname]);


  React.useEffect(() => {
    if (location && location.toLowerCase() !== "auto:ip" && !isLoadingPreferences && !authIsLoading && !appSettingsLoading) {
      localStorage.setItem("weatherugo-location", location);
      if (isAuthenticated && user) { 
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
      if (authIsLoading || isLoadingProfileFromEditor || isLoadingPreferences || appSettingsLoading || !location || !selectedDate) return; 

      const CACHE_DURATION_MS = appSettings.cacheDurationMs;
      const MAX_API_FORECAST_DAYS = appSettings.maxApiForecastDays;

      const formattedDateForCacheKey = format(selectedDate, "yyyy-MM-dd");
      const formattedDateTimeForWeatherCacheKey = format(selectedDate, "yyyy-MM-dd-HH"); 
      const currentTime = new Date().getTime();
      let currentFetchedWeatherData: WeatherData | null = null;

      const weatherCacheKey = `weatherugo-cache-weather-${location}-${formattedDateTimeForWeatherCacheKey}-${selectedDate.getTimezoneOffset()}-${language}`;
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
          const data = await fetchWeather(location, selectedDate, MAX_API_FORECAST_DAYS, language); 
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
                                title: t('weather') + " " + t('success') + "!", 
                                description: `${t('weatherInLocation', { location: data.location })} ${t('weatherHasChanged')} ${data.temperature}°C ${t('and')} ${data.condition.toLowerCase()}.`,
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
          let toastDescription = error.message || t('weatherApiDefaultError');
           if (error.message && error.message.toLowerCase().includes("api key")) {
             toastDescription = t('weatherApiApiKeyError');
          } else if (error.message && error.message.toLowerCase().includes("no matching location found")) {
            toastDescription = t('weatherApiNoLocationError', {location: location});
          }
          toast({ 
            title: t('weatherApiErrorTitle'), 
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
        const outfitCacheKey = `weatherugo-cache-outfit-${currentFetchedWeatherData.location}-${formattedDateForCacheKey}-${effectiveFamilyProfile}-${currentFetchedWeatherData.isGuessed ? 'guessed' : 'real'}-${language}`;
        const activityCacheKey = `weatherugo-cache-activity-${currentFetchedWeatherData.location}-${formattedDateForCacheKey}-${effectiveFamilyProfile}-${currentTOD}-${currentFetchedWeatherData.isGuessed ? 'guessed' : 'real'}-${language}`;

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
            const clothingInput = { weatherCondition: currentFetchedWeatherData.condition, temperature: currentFetchedWeatherData.temperature, familyProfile: effectiveFamilyProfile, location: currentFetchedWeatherData.location, language: language };
            const clothing = await suggestClothing(clothingInput);
            setOutfitSuggestions(clothing);
            localStorage.setItem(outfitCacheKey, JSON.stringify({ timestamp: currentTime, data: clothing }));
          } catch (error: any) {
            console.error("Failed to get outfit suggestions:", error);
            toast({ title: t('outfitSuggestionErrorTitle'), description: error.message || t('outfitSuggestionErrorDefault'), variant: "destructive" });
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
            const activityInput = { weatherCondition: currentFetchedWeatherData.condition, temperature: currentFetchedWeatherData.temperature, familyProfile: effectiveFamilyProfile, timeOfDay: currentTOD, locationPreferences: currentFetchedWeatherData.location, language: language };
            const activities = await suggestActivities(activityInput);

            const serviceBusyMsgEn = "AI suggestion service is currently busy. Please try again in a moment.";
            const serviceBusyMsgTr = t('aiServiceBusy'); 

            if (activities.indoorActivities.length === 1 && 
                (activities.indoorActivities[0] === serviceBusyMsgEn || activities.indoorActivities[0] === serviceBusyMsgTr)) {
                
                toast({ 
                    title: t('activitySuggestionErrorTitle'),
                    description: activities.indoorActivities[0], 
                    variant: "default" 
                });
                setActivitySuggestions({ indoorActivities: [], outdoorActivities: [] });
            } else {
                setActivitySuggestions(activities);
            }
            localStorage.setItem(activityCacheKey, JSON.stringify({ timestamp: currentTime, data: activities }));
          } catch (error: any) {
            console.error("Failed to get activity suggestions:", error);
            toast({ title: t('activitySuggestionErrorTitle'), description: error.message || t('activitySuggestionErrorDefault'), variant: "destructive" });
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

    if (!authIsLoading && !isLoadingProfileFromEditor && !isLoadingPreferences && !appSettingsLoading && location) { 
      getWeatherAndSuggestions();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, selectedDate, familyProfile, authIsLoading, isLoadingProfileFromEditor, isLoadingPreferences, appSettingsLoading, language, appSettings.cacheDurationMs, appSettings.maxApiForecastDays, t]); // Added t to deps for toast
  
  const getFilteredHourlyForecast = (): HourlyForecastData[] => {
    if (!weatherData?.forecast || weatherData.isGuessed) return []; 
    
    if (!fnsIsToday(selectedDate)) return weatherData.forecast;

    const currentHourToDisplayFrom = getHours(selectedDate); 
    return weatherData.forecast.filter(item => {
        let itemHour = -1;
        const timeString = item.time;

        // Try parsing ISO-like datetime string first (e.g., "2023-05-20T15:00")
        try {
          const itemDateFromISO = parseISO(timeString);
          if (isValid(itemDateFromISO)) {
            itemHour = getHours(itemDateFromISO);
          }
        } catch (e) { /* ignore */ }

        // If ISO parsing failed or didn't yield a valid hour, try "h a" format
        if (itemHour === -1) {
            const match = timeString.match(/(\d{1,2})\s*(AM|PM)/i); // Handles "3 PM" or "10 AM"
            if (match) {
                itemHour = parseInt(match[1], 10);
                const period = match[2]?.toUpperCase();
                if (period === 'PM' && itemHour !== 12) {
                    itemHour += 12;
                } else if (period === 'AM' && itemHour === 12) { 
                    itemHour = 0;
                }
            }
        }
        
        // Fallback for simple "HH:mm" or just hour if all else fails
        if (itemHour === -1) {
            try {
              // This regex tries to match HH:mm or HH at the beginning of the string
              const plainHourMatch = timeString.match(/^(\d{1,2})(:\d{2})?/);
              if (plainHourMatch && plainHourMatch[1]) {
                itemHour = parseInt(plainHourMatch[1], 10);
              }
            } catch { /* ignore */ }
        }
        
        if (itemHour !== -1) {
            return itemHour >= currentHourToDisplayFrom;
        }
        return true; // If time cannot be parsed, include it by default to be safe
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
        <Skeleton className="h-[180px]w-full" />
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
          maxApiForecastDays={appSettings.maxApiForecastDays} 
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
            {t('readyForAdventure')}
            <Sparkles className="text-accent h-6 w-6" />
          </CardTitle>
          <CardDescription className="!mt-2 text-foreground/90">
            {t('travelPlannerPrompt')}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            {t('travelPlannerSubPrompt', { authPrompt: !isAuthenticated ? t('travelPlannerAuthPrompt') : ''})}
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-3 pt-2">
            <Link href="/travelplanner" passHref>
              <Button className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground">
                <Plane className="mr-2 h-5 w-5" /> {t('exploreTravelPlans')}
              </Button>
            </Link>
            {!isAuthenticated && (
              <Link href="/login" passHref>
                <Button variant="outline" className="w-full sm:w-auto">
                  <LogIn className="mr-2 h-5 w-5" /> {t('signUpLogin')}
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

    