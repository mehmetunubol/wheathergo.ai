
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
  const [isLoadingProfile, setIsLoadingProfile] = React.useState(true); // For FamilyProfileEditor's initial load
  const [isLoadingPreferences, setIsLoadingPreferences] = React.useState(true); // For location/date preferences from Firestore

  const { toast } = useToast();
  const { isAuthenticated, user, isLoading: authIsLoading } = useAuth();

  // Effect for loading family profile (via FamilyProfileEditor's readiness)
  // FamilyProfileEditor handles its own Firestore loading and calls onProfileSave
  // This effect mainly tracks when the profile editor considers itself loaded.
  React.useEffect(() => {
    if (!authIsLoading) {
      // setIsLoadingProfile(true) is handled by FamilyProfileEditor's internal state if needed
      // For non-auth, profile is loaded from localStorage by FamilyProfileEditor
      // For auth, FamilyProfileEditor fetches from Firestore
      // We set isLoadingProfile to false when the parent (HomePage) is notified of a profile
      // OR if auth state is determined and no profile load is pending.
      // This is now mostly driven by onProfileSave callback from FamilyProfileEditor
    }
  }, [authIsLoading]);


  // Effect for loading user preferences (location, selectedDate) from Firestore or localStorage
  React.useEffect(() => {
    const loadPreferences = async () => {
      if (authIsLoading) return; // Wait for auth state to be known

      setIsLoadingPreferences(true);
      try { // Added try block here
        if (isAuthenticated && user) {
          const prefsRef = doc(db, "users", user.uid, "preferences", "appState");
          const docSnap = await getDoc(prefsRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.lastLocation) {
              setLocation(data.lastLocation);
            } else {
              const storedLocation = localStorage.getItem("weatherugo-location");
              if (storedLocation && storedLocation.toLowerCase() !== "auto:ip") {
                setLocation(storedLocation);
              } else {
                setLocation(DEFAULT_LOCATION);
              }
            }
            if (data.lastSelectedDate) {
              const parsedDate = parseISO(data.lastSelectedDate);
              if (isValid(parsedDate)) {
                setSelectedDate(parsedDate);
              }
            }
            // Family profile is handled by FamilyProfileEditor loading logic
          } else {
            // No Firestore prefs, try localStorage for location
            const storedLocation = localStorage.getItem("weatherugo-location");
            if (storedLocation && storedLocation.toLowerCase() !== "auto:ip") {
              setLocation(storedLocation);
            } else {
              setLocation(DEFAULT_LOCATION);
            }
          }
        } else {
          // Not authenticated, load location from localStorage
          const storedLocation = localStorage.getItem("weatherugo-location");
          if (storedLocation && storedLocation.toLowerCase() !== "auto:ip") {
            setLocation(storedLocation);
          } else {
            setLocation(DEFAULT_LOCATION);
          }
        }
      } catch (error) { // Added catch block here
        console.error("Error during preferences loading:", error);
        // Fallback to defaults or localStorage in case of any error
        const storedLocation = localStorage.getItem("weatherugo-location");
        if (storedLocation && storedLocation.toLowerCase() !== "auto:ip") {
          setLocation(storedLocation);
        } else {
          setLocation(DEFAULT_LOCATION);
        }
      } finally { // Ensure isLoadingPreferences is always set to false
        setIsLoadingPreferences(false);
      }
    };
    loadPreferences();
  }, [isAuthenticated, user, authIsLoading]);

  // Effect for saving location
  React.useEffect(() => {
    if (location && location.toLowerCase() !== "auto:ip") {
      localStorage.setItem("weatherugo-location", location);
      if (isAuthenticated && user && !isLoadingPreferences && !authIsLoading) { // Ensure preferences are loaded before saving
        const prefsRef = doc(db, "users", user.uid, "preferences", "appState");
        setDoc(prefsRef, { lastLocation: location }, { merge: true })
          .catch(error => console.error("Error saving location to Firestore:", error));
      }
    }
  }, [location, isAuthenticated, user, isLoadingPreferences, authIsLoading]);

  // Effect for saving selectedDate
  React.useEffect(() => {
    if (isAuthenticated && user && !isLoadingPreferences && !authIsLoading && selectedDate) { // Ensure preferences are loaded & date is valid
      const prefsRef = doc(db, "users", user.uid, "preferences", "appState");
      setDoc(prefsRef, { lastSelectedDate: selectedDate.toISOString() }, { merge: true })
        .catch(error => console.error("Error saving selectedDate to Firestore:", error));
    }
  }, [selectedDate, isAuthenticated, user, isLoadingPreferences, authIsLoading]);


  React.useEffect(() => {
    async function getWeather() {
      // Wait for auth, profile, and preferences loading to complete.
      if (authIsLoading || isLoadingProfile || isLoadingPreferences) return; 
      if (!location || !selectedDate) return;
      
      setIsLoadingWeather(true);
      setWeatherData(null); 
      setOutfitSuggestions(null); 
      setActivitySuggestions(null); 

      const locationForQuery = location; 

      try {
        const data = await fetchWeather(locationForQuery, selectedDate);
        if (data) {
            setWeatherData(data);
            // If location was "auto:ip" and API resolved it, update location state
            if (locationForQuery.toLowerCase() === "auto:ip" && data.location && data.location.toLowerCase() !== "auto:ip") {
              setLocation(data.location); 
            }

            if (isToday(selectedDate)) {
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
        } else {
             toast({ 
                title: "Error Fetching Weather", 
                description: `Could not retrieve weather data for "${locationForQuery}". The service might be temporarily unavailable, the location might be invalid, or there could be an issue with the API key configuration. Please try again later or enter a different location.`, 
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
  }, [location, selectedDate, toast, authIsLoading, isLoadingProfile, isLoadingPreferences]);

  React.useEffect(() => {
    async function getSuggestions() {
      if (!weatherData || !familyProfile || authIsLoading || isLoadingProfile || isLoadingPreferences) return;

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
      } catch (error: any) {
        console.error("Failed to get outfit suggestions:", error);
        toast({
          title: "Outfit Suggestion Error",
          description: error.message || "Could not fetch outfit suggestions. The AI service may be temporarily unavailable. Please try again later.",
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
      } catch (error: any) {
        console.error("Failed to get activity suggestions:", error);
        toast({
          title: "Activity Suggestion Error",
          description: error.message || "Could not fetch activity suggestions. The AI service may be temporarily unavailable. Please try again later.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingActivity(false);
      }
    }

    if (weatherData && !isLoadingProfile && !isLoadingPreferences) { 
      getSuggestions();
    }
  }, [weatherData, familyProfile, toast, authIsLoading, isLoadingProfile, isLoadingPreferences]);


  const handleDateChange = React.useCallback((date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
    }
  }, []); // setSelectedDate is stable
  
  const handleProfileUpdate = React.useCallback((newProfile: string) => {
    setFamilyProfile(newProfile); 
    setIsLoadingProfile(false); // Consider profile loaded once parent is notified
  }, []); // setFamilyProfile and setIsLoadingProfile are stable


  const getFilteredHourlyForecast = () => {
    if (!weatherData?.forecast) return [];
    
    // If the selected date is not today, show all 24 hours for that date
    if (!isToday(selectedDate)) return weatherData.forecast;

    // If it is today, filter for hours from the current hour onwards
    const currentHour = getHours(new Date());
    return weatherData.forecast.filter(item => {
        // WeatherAPI time format for hourly is "YYYY-MM-DD HH:MM"
        const itemDateTime = parseISO(`${format(selectedDate, 'yyyy-MM-dd')}T${item.time.replace(/ (AM|PM)/, ':00')}`); // Reconstruct ISO
        if (!isValid(itemDateTime)) { // Basic check if parsing failed
            // Attempt to parse "H AM/PM" format as fallback
            const timeOnlyMatch = item.time.match(/(\d+)\s*(AM|PM)/i);
            if (timeOnlyMatch) {
                let itemHour = parseInt(timeOnlyMatch[1]);
                const ampm = timeOnlyMatch[2].toUpperCase();
                if (ampm === 'PM' && itemHour !== 12) itemHour += 12;
                if (ampm === 'AM' && itemHour === 12) itemHour = 0; // Midnight
                return itemHour >= currentHour;
            }
            return true; // Fallback: include if unsure
        }
        
        const itemHourOnSelectedDate = getHours(itemDateTime);
        return itemHourOnSelectedDate >= currentHour;
    });
  };

  // Show skeleton for the whole page if auth, profile, or preferences are loading initially.
  if (authIsLoading || isLoadingProfile || isLoadingPreferences) {
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

    