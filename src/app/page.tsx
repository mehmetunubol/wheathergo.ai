
"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from 'next/navigation';
import { LocationDateSelector } from "@/components/location-date-selector";
import { FamilyProfileEditor } from "@/components/family-profile-editor";
import { CurrentWeatherCard } from "@/components/current-weather-card";
import { SuggestionsTabs } from "@/components/suggestions-tabs";
import { fetchWeather } from "@/lib/weather-api";
import { suggestClothing, type ClothingSuggestionsOutput } from "@/ai/flows/clothing-suggestions";
import { suggestActivities, type ActivitySuggestionsOutput } from "@/ai/flows/activity-suggestions";
import type { WeatherData, LastKnownWeather, CachedWeatherData, CachedOutfitSuggestions, CachedActivitySuggestions, HourlyForecastData, User, DailyUsage, AppSettings } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { format, isToday as fnsIsToday, getHours, isValid, parseISO, startOfDay, addHours } from "date-fns";
import { HourlyForecastCard } from "@/components/hourly-forecast-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plane, LogIn, Sparkles, AlertTriangle, Info } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useAppSettings, DEFAULT_APP_SETTINGS } from "@/contexts/app-settings-context";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, updateDoc, runTransaction } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/contexts/language-context";
import { useTranslation } from "@/hooks/use-translation";
import { OutfitVisualizationCard } from "@/components/outfit-visualization-card";

function getTimeOfDay(dateWithTime: Date): string {
  const hour = getHours(dateWithTime);
  if (hour < 6) return "night"; 
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  if (hour < 22) return "evening";
  return "night"; 
}

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
  
  const [outfitLimitReached, setOutfitLimitReached] = React.useState(false);
  const [activityLimitReached, setActivityLimitReached] = React.useState(false);

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
    if (!appSettingsLoading && !isLoadingProfileFromEditor && familyProfile === "") {
        setFamilyProfile(appSettings.defaultFamilyProfile);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appSettingsLoading, appSettings.defaultFamilyProfile, isLoadingProfileFromEditor]);


  React.useEffect(() => {
    const loadPreferences = async () => {
      if (authIsLoading || appSettingsLoading) return;

      setIsLoadingPreferences(true);
      const userJustLoggedIn = isAuthenticated && user && user.uid !== prevUserUID.current;
      let initialLocationResolved = appSettings.defaultLocation || DEFAULT_APP_SETTINGS.defaultLocation;

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
             const storedLocation = localStorage.getItem("weatherugo-location");
             if (storedLocation && storedLocation.toLowerCase() !== "auto:ip") {
                initialLocationResolved = storedLocation;
             }
             setSelectedDate(new Date());
          }
        } else {
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
    const checkAndUpdateUsage = async (
      usageType: 'dailyOutfitSuggestions' | 'dailyActivitySuggestions'
    ): Promise<boolean> => {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const limits = user?.isPremium ? appSettings.premiumTierLimits : appSettings.freeTierLimits;
      const limitKey = usageType === 'dailyOutfitSuggestions' ? 'dailyOutfitSuggestions' : 'dailyActivitySuggestions';
      const currentLimit = limits[limitKey];
      const localStorageKey = `weatherugo-${usageType}`;

      if (!isAuthenticated || !user) {
        let storedUsage: DailyUsage = { date: '', count: 0 };
        const storedUsageRaw = localStorage.getItem(localStorageKey);
        if (storedUsageRaw) {
          try {
            storedUsage = JSON.parse(storedUsageRaw);
          } catch (e) {
            console.warn("Corrupted usage data in localStorage", e);
            localStorage.removeItem(localStorageKey);
          }
        }
        if (storedUsage.date === todayStr && storedUsage.count >= currentLimit) {
          toast({ title: t('limitReachedTitle'), description: t(limitKey === 'dailyOutfitSuggestions' ? 'dailyOutfitSuggestionsLimitReached' : 'dailyActivitySuggestionsLimitReached'), variant: "destructive" });
          return false;
        }
        return true;
      } else {
        const userDocRef = doc(db, "users", user.uid);
        try {
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data() as User;
            const usage = userData[usageType] || { count: 0, date: '' };
            if (usage.date === todayStr && usage.count >= currentLimit) {
              toast({ title: t('limitReachedTitle'), description: t(limitKey === 'dailyOutfitSuggestions' ? 'dailyOutfitSuggestionsLimitReached' : 'dailyActivitySuggestionsLimitReached'), variant: "destructive" });
              return false;
            }
          }
        } catch (error) {
          console.error(`Error checking ${usageType} limit:`, error);
          toast({ title: t('error'), description: "Could not verify usage limits.", variant: "destructive" });
          return false;
        }
        return true;
      }
    };

    const incrementUsageCount = async (
      usageType: 'dailyOutfitSuggestions' | 'dailyActivitySuggestions'
    ) => {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const localStorageKey = `weatherugo-${usageType}`;

      if (!isAuthenticated || !user) {
        let storedUsage: DailyUsage = { date: '', count: 0 };
        const storedUsageRaw = localStorage.getItem(localStorageKey);
        if (storedUsageRaw) {
          try {
            storedUsage = JSON.parse(storedUsageRaw);
          } catch (e) {
            console.warn("Corrupted usage data in localStorage for increment", e);
            localStorage.removeItem(localStorageKey);
          }
        }
        if (storedUsage.date === todayStr) {
          storedUsage.count += 1;
        } else {
          storedUsage = { date: todayStr, count: 1 };
        }
        localStorage.setItem(localStorageKey, JSON.stringify(storedUsage));
      } else {
        const userDocRef = doc(db, "users", user.uid);
        try {
          await runTransaction(db, async (transaction) => {
            const userDocSnap = await transaction.get(userDocRef);
            if (!userDocSnap.exists()) throw "User document does not exist!";
            const userData = userDocSnap.data() as User;
            const currentUsage = userData[usageType] || { count: 0, date: '' };
            const newCount = currentUsage.date === todayStr ? currentUsage.count + 1 : 1;
            transaction.update(userDocRef, { [usageType]: { count: newCount, date: todayStr } });
          });
        } catch (error) {
          console.error(`Error updating ${usageType} count:`, error);
        }
      }
    };

    async function getWeatherAndSuggestions() {
      if (authIsLoading || isLoadingProfileFromEditor || isLoadingPreferences || appSettingsLoading || !location || !selectedDate) return;

      const CACHE_DURATION_MS = appSettings.cacheDurationMs;
      const MAX_API_FORECAST_DAYS = appSettings.maxApiForecastDays;

      const formattedDateForCacheKey = format(selectedDate, "yyyy-MM-dd");
      const currentHourForCacheKey = getHours(selectedDate).toString().padStart(2, '0'); 
      const cacheKeySuffix = `${formattedDateForCacheKey}-${currentHourForCacheKey}-${selectedDate.getTimezoneOffset()}-${language}`;

      const currentTime = new Date().getTime();
      let currentFetchedWeatherData: WeatherData | null = null;

      setOutfitLimitReached(false);
      setActivityLimitReached(false);

      const weatherCacheKey = `weatherugo-cache-weather-${location}-${cacheKeySuffix}`;
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
          console.warn("Failed to parse cached weather data, removing item.", e);
          localStorage.removeItem(weatherCacheKey);
        }
      }

      if (!weatherFromCache) {
        setIsLoadingWeather(true);
        setWeatherData(null);
        setOutfitSuggestions(null); 
        setActivitySuggestions(null);
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
          if (error.message.includes("API key")) toastDescription = t('weatherApiApiKeyError');
          else if (error.message.toLowerCase().includes("no matching location found")) toastDescription = t('weatherApiNoLocationError', { location: location });
          
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
      const currentTOD = getTimeOfDay(selectedDate); 

      if (currentFetchedWeatherData && effectiveFamilyProfile) {
        const isGuessedSuffix = currentFetchedWeatherData.isGuessed ? 'guessed' : 'real';
        // Outfit Suggestions
        const outfitCacheKey = `weatherugo-cache-outfit-${currentFetchedWeatherData.location}-${cacheKeySuffix}-${effectiveFamilyProfile}-${isGuessedSuffix}`;
        const cachedOutfitString = localStorage.getItem(outfitCacheKey);
        let outfitFromCache = false;
        if (cachedOutfitString) {
          try {
            const cached: CachedOutfitSuggestions = JSON.parse(cachedOutfitString);
            if (currentTime - cached.timestamp < CACHE_DURATION_MS) {
              setOutfitSuggestions(cached.data);
              setIsLoadingOutfit(false);
              outfitFromCache = true;
            } else { localStorage.removeItem(outfitCacheKey); }
          } catch (e) { console.warn("Failed to parse cached outfit suggestions, removing item.", e); localStorage.removeItem(outfitCacheKey); }
        }

        if (!outfitFromCache) {
          setIsLoadingOutfit(true);
          setOutfitSuggestions(null);
          const canFetchOutfit = await checkAndUpdateUsage('dailyOutfitSuggestions');
          if (canFetchOutfit) {
            try {
              const clothingInput = { weatherCondition: currentFetchedWeatherData.condition, temperature: currentFetchedWeatherData.temperature, familyProfile: effectiveFamilyProfile, location: currentFetchedWeatherData.location, timeOfDay: currentTOD, language: language };
              const clothing = await suggestClothing(clothingInput);
              setOutfitSuggestions(clothing);
              localStorage.setItem(outfitCacheKey, JSON.stringify({ timestamp: currentTime, data: clothing }));
              await incrementUsageCount('dailyOutfitSuggestions');
            } catch (error: any) {
              console.error("Failed to get outfit suggestions:", error);
              toast({ title: t('outfitSuggestionErrorTitle'), description: error.message || t('outfitSuggestionErrorDefault'), variant: "destructive" });
              setOutfitSuggestions(null);
            } finally { setIsLoadingOutfit(false); }
          } else {
            setOutfitSuggestions(null); 
            setOutfitLimitReached(true);
            setIsLoadingOutfit(false);
          }
        }

        // Activity Suggestions
        const activityCacheKey = `weatherugo-cache-activity-${currentFetchedWeatherData.location}-${cacheKeySuffix}-${effectiveFamilyProfile}-${currentTOD}-${isGuessedSuffix}`;
        const cachedActivityString = localStorage.getItem(activityCacheKey);
        let activityFromCache = false;
        if (cachedActivityString) {
          try {
            const cached: CachedActivitySuggestions = JSON.parse(cachedActivityString);
            if (currentTime - cached.timestamp < CACHE_DURATION_MS) {
              setActivitySuggestions(cached.data);
              setIsLoadingActivity(false);
              activityFromCache = true;
            } else { localStorage.removeItem(activityCacheKey); }
          } catch (e) { console.warn("Failed to parse cached activity suggestions, removing item.", e); localStorage.removeItem(activityCacheKey); }
        }

        if (!activityFromCache) {
          setIsLoadingActivity(true);
          setActivitySuggestions(null);
          const canFetchActivity = await checkAndUpdateUsage('dailyActivitySuggestions');
          if (canFetchActivity) {
            try {
              const activityInput = { weatherCondition: currentFetchedWeatherData.condition, temperature: currentFetchedWeatherData.temperature, familyProfile: effectiveFamilyProfile, timeOfDay: currentTOD, locationPreferences: currentFetchedWeatherData.location, language: language };
              const activities = await suggestActivities(activityInput);
              const serviceBusyMsgEn = "AI suggestion service is currently busy. Please try again in a moment.";
              const serviceBusyMsgTr = t('aiServiceBusy');
              if (activities.indoorActivities.length === 1 && (activities.indoorActivities[0] === serviceBusyMsgEn || activities.indoorActivities[0] === serviceBusyMsgTr)) {
                toast({ title: t('activitySuggestionErrorTitle'), description: activities.indoorActivities[0], variant: "default" });
                setActivitySuggestions({ indoorActivities: [], outdoorActivities: [] });
              } else {
                setActivitySuggestions(activities);
              }
              localStorage.setItem(activityCacheKey, JSON.stringify({ timestamp: currentTime, data: activities }));
              await incrementUsageCount('dailyActivitySuggestions');
            } catch (error: any) {
              console.error("Failed to get activity suggestions:", error);
              toast({ title: t('activitySuggestionErrorTitle'), description: error.message || t('activitySuggestionErrorDefault'), variant: "destructive" });
              setActivitySuggestions(null);
            } finally { setIsLoadingActivity(false); }
          } else {
            setActivitySuggestions(null); 
            setActivityLimitReached(true);
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
  }, [location, selectedDate, familyProfile, authIsLoading, isLoadingProfileFromEditor, isLoadingPreferences, appSettingsLoading, language, t, appSettings.cacheDurationMs, appSettings.maxApiForecastDays, appSettings.freeTierLimits, appSettings.premiumTierLimits, toast, user, isAuthenticated]);


  const getFilteredHourlyForecast = (currentWeatherData: WeatherData | null, dateForFilter: Date): HourlyForecastData[] => {
    if (!currentWeatherData?.forecast || currentWeatherData.isGuessed) return [];

    if (!fnsIsToday(dateForFilter)) return currentWeatherData.forecast ?? [];

    const currentHourToDisplayFrom = getHours(dateForFilter);
    return (currentWeatherData.forecast ?? []).filter(item => {
        let itemHour = -1;
        const timeString = item.time;

        try {
          if (timeString.includes('T') || (timeString.includes('-') && timeString.includes(':'))) {
            const itemDateFromISO = parseISO(timeString);
            if (isValid(itemDateFromISO)) {
                itemHour = getHours(itemDateFromISO);
            }
          } else { 
            const timeParts = timeString.match(/(\d{1,2})(:\d{2})?\s*(AM|PM)?/i);
            if (timeParts) {
                itemHour = parseInt(timeParts[1], 10);
                const period = timeParts[3]?.toUpperCase();
                if (period === 'PM' && itemHour !== 12) {
                    itemHour += 12;
                } else if (period === 'AM' && itemHour === 12) { 
                    itemHour = 0;
                }
            }
          }
        } catch (e) { console.error("Error parsing hourly forecast time:", e); }
        
        if (itemHour !== -1) {
            return itemHour >= currentHourToDisplayFrom;
        }
        return true; 
    });
  };


  if (authIsLoading || isLoadingPreferences || appSettingsLoading) {
    return (
      <div>
        {/* Modern Hero Section Placeholder while loading */}
        <div className="bg-primary text-primary-foreground py-8 sm:py-10 md:py-12">
          <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <Skeleton className="h-8 w-3/4 mb-2" /> 
                <Skeleton className="h-4 w-full mb-1" /> 
                <Skeleton className="h-4 w-5/6 mb-4" /> 
                <Skeleton className="h-9 w-32" /> 
              </div>
              <div className="flex justify-center md:justify-end">
                <Skeleton className="h-40 w-full max-w-xs rounded-lg" /> 
              </div>
            </div>
          </div>
        </div>
        {/* Main content skeleton */}
        <div className="container mx-auto max-w-2xl p-4 space-y-6 mt-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Skeleton className="h-[230px] w-full" />
            <Skeleton className="h-[230px] w-full" />
          </div>
          <Skeleton className="h-[200px] w-full" />
          <Skeleton className="h-[150px] w-full" />
          <Skeleton className="h-[180px] w-full" />
          <Skeleton className="h-[180px] w-full" />
        </div>
      </div>
    );
  }

  const effectiveFamilyProfileForDisplay = familyProfile || appSettings.defaultFamilyProfile;
  const hourlyForecastToDisplay = getFilteredHourlyForecast(weatherData, selectedDate);

  return (
    <div>
      {/* Modern Hero Section */}
      <div className="bg-primary text-primary-foreground py-8 sm:py-10 md:py-12">
        <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6 items-center">
            <div className="text-center md:text-left">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
                Weatherugo
              </h1>
              <p className="mt-2 text-sm sm:text-base text-primary-foreground/90 max-w-2xl mx-auto md:mx-0">
                {t('heroDescription')}
              </p>
              <div className="mt-6 flex flex-col sm:flex-row sm:justify-center md:justify-start gap-2.5">
                <Button
                  size="default" 
                  className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg transform hover:scale-105 transition-transform duration-150 ease-in-out px-5 py-2 text-sm font-semibold"
                  asChild
                >
                  <Link href="#">{t('downloadAppButton')}</Link>
                </Button>
              </div>
            </div>
            <div className="flex justify-center md:justify-end">
              <div className="w-full max-w-[280px] sm:max-w-xs md:max-w-xs lg:max-w-sm rounded-xl overflow-hidden shadow-2xl transform hover:rotate-3 transition-transform duration-300 ease-out">
                <Image
                  src="https://placehold.co/400x320.png"
                  alt="App illustration or lifestyle image placeholder"
                  width={400}
                  height={320}
                  className="object-cover w-full h-full"
                  data-ai-hint="app interface mobile lifestyle"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Rest of the page content */}
      <div className="container mx-auto max-w-2xl p-4 space-y-6 mt-6">
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

        <CurrentWeatherCard 
          weatherData={weatherData} 
          isLoading={isLoadingWeather} 
        />

        {weatherData && hourlyForecastToDisplay.length > 0 && !weatherData.isGuessed && (
           <HourlyForecastCard 
            forecastData={hourlyForecastToDisplay} 
            isLoading={isLoadingWeather} 
            date={selectedDate}
            isParentGuessed={weatherData.isGuessed}
          />
        )}
        {weatherData && weatherData.isGuessed && (
          <Card className="shadow-md rounded-lg">
            <CardHeader>
               <CardTitle className="text-lg flex items-center gap-2">
                <Info className="text-amber-600" /> {t('hourlyForecastForDate', { date: format(selectedDate, "MMM d, yyyy", { locale: dateLocale })})}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{t('hourlyForecastNotAvailable')}</p>
            </CardContent>
          </Card>
        )}


        {(weatherData || isLoadingOutfit || isLoadingActivity || isLoadingWeather || outfitLimitReached || activityLimitReached) && (
          <SuggestionsTabs
            outfitSuggestions={outfitSuggestions}
            isOutfitLoading={isLoadingOutfit}
            activitySuggestions={activitySuggestions}
            isActivityLoading={isLoadingActivity}
            outfitLimitReached={outfitLimitReached}
            activityLimitReached={activityLimitReached}
          />
        )}

        {outfitSuggestions && weatherData && !isLoadingWeather && !isLoadingOutfit && !outfitLimitReached && (
          <OutfitVisualizationCard
              weatherData={weatherData}
              familyProfile={effectiveFamilyProfileForDisplay}
              clothingSuggestions={outfitSuggestions}
              language={language}
              isLoadingParentData={isLoadingWeather || isLoadingOutfit}
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
    </div>
  );
}

    