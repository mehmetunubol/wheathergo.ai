
"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Download, Share2, Plane, CalendarDays, MapPin, Info, CloudSun, Thermometer, ArrowLeft, Edit3, Mail, Clock, Repeat } from "lucide-react";
import { format, parseISO, differenceInCalendarDays, addDays, startOfDay, isWithinInterval, isBefore, isSameDay } from "date-fns";
import { fetchWeather } from "@/lib/weather-api";
import { suggestClothing, type ClothingSuggestionsOutput } from "@/ai/flows/clothing-suggestions";
import { suggestActivities, type ActivitySuggestionsOutput } from "@/ai/flows/activity-suggestions";
import type { TravelPlanItem, WeatherData, TripSegmentSuggestions } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { getWeatherIcon } from "@/components/icons";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

const DEFAULT_FAMILY_PROFILE_FOR_SUGGESTIONS = "An adult traveler.";

export default function TripDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.tripId as string;

  const { user, isAuthenticated, isLoading: authIsLoading } = useAuth();
  const [plan, setPlan] = React.useState<TravelPlanItem | null>(null);
  const [familyProfile, setFamilyProfile] = React.useState<string>(DEFAULT_FAMILY_PROFILE_FOR_SUGGESTIONS);
  const [segments, setSegments] = React.useState<TripSegmentSuggestions[]>([]);
  const [overallLoading, setOverallLoading] = React.useState(true);
  const [pageError, setPageError] = React.useState<string | null>(null);

  const { toast } = useToast();

  const getUniqueDateSegments = React.useCallback(() => {
    if (!plan) return [];

    const startDate = startOfDay(parseISO(plan.startDate));
    const endDate = startOfDay(parseISO(plan.endDate));
    const duration = differenceInCalendarDays(endDate, startDate);

    const potentialSegments: TripSegmentSuggestions[] = [];

    potentialSegments.push({
      date: startDate,
      id: 'start',
      label: `Start of Trip (${format(startDate, "MMM d, yyyy")})`,
      weatherData: null, clothingSuggestions: null, activitySuggestions: null, isLoading: true, error: null
    });

    if (duration >= 2) { 
      const middleOffset = Math.floor(duration / 2.0); 
      const middleDateCand = startOfDay(addDays(startDate, middleOffset));
      if (!isSameDay(middleDateCand, startDate) && !isSameDay(middleDateCand, endDate)) {
        potentialSegments.push({
          date: middleDateCand,
          id: 'middle',
          label: `Middle of Trip (${format(middleDateCand, "MMM d, yyyy")})`,
          weatherData: null, clothingSuggestions: null, activitySuggestions: null, isLoading: true, error: null
        });
      }
    }
    
    if (!isSameDay(endDate, startDate)) {
      potentialSegments.push({
        date: endDate,
        id: 'end',
        label: `End of Trip (${format(endDate, "MMM d, yyyy")})`,
        weatherData: null, clothingSuggestions: null, activitySuggestions: null, isLoading: true, error: null
      });
    }
    
    const uniqueSegmentsMap = new Map<string, TripSegmentSuggestions>();
    potentialSegments.forEach(segment => {
        const dateStr = format(segment.date, 'yyyy-MM-dd');
        if (!uniqueSegmentsMap.has(dateStr) || 
            (segment.id === 'start' && uniqueSegmentsMap.get(dateStr)?.id !== 'start') ||
            (segment.id === 'end' && uniqueSegmentsMap.get(dateStr)?.id !== 'end') ||
            (segment.id === 'middle' && uniqueSegmentsMap.get(dateStr)?.id !== 'start' && uniqueSegmentsMap.get(dateStr)?.id !== 'middle') 
        ) {
            uniqueSegmentsMap.set(dateStr, segment);
        }
    });

    return Array.from(uniqueSegmentsMap.values())
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map(dp => ({ ...dp, isLoading: true, error: null }));

  }, [plan]);

  React.useEffect(() => {
    const loadTripData = async () => {
      if (authIsLoading || !tripId) return;

      if (!isAuthenticated || !user) {
        setPageError("You must be logged in to view trip details.");
        setOverallLoading(false);
        // Optional: redirect to login
        // router.push(`/login?redirect=/trip/${tripId}`);
        return;
      }

      try {
        // Fetch Family Profile
        const profileRef = doc(db, "users", user.uid, "profile", "mainProfile");
        const profileSnap = await getDoc(profileRef);
        if (profileSnap.exists()) {
          setFamilyProfile(profileSnap.data().description || DEFAULT_FAMILY_PROFILE_FOR_SUGGESTIONS);
        } else {
          setFamilyProfile(DEFAULT_FAMILY_PROFILE_FOR_SUGGESTIONS);
        }

        // Fetch Travel Plan
        const planDocRef = doc(db, "users", user.uid, "travelPlans", tripId);
        const planSnap = await getDoc(planDocRef);

        if (planSnap.exists()) {
          setPlan({ id: planSnap.id, ...planSnap.data() } as TravelPlanItem);
        } else {
          setPageError("Travel plan not found or you do not have access.");
          setOverallLoading(false);
        }
      } catch (error) {
        console.error("Error loading trip data:", error);
        setPageError("Error loading travel plan data from the cloud.");
        setOverallLoading(false);
      }
    };
    loadTripData();
  }, [tripId, user, isAuthenticated, authIsLoading, router]);


  React.useEffect(() => {
    if (!plan || !user) return; // Ensure plan and user are loaded

    const initialSegments = getUniqueDateSegments();
    setSegments(initialSegments);
    
    if (initialSegments.length === 0) {
        setOverallLoading(false);
        return;
    }
    setOverallLoading(true); 

    const fetchAllSegmentData = async () => {
      let combinedProfileForAI = `Global Profile: ${familyProfile}.`;
      if (plan.tripContext && plan.tripContext.trim() !== "") {
        combinedProfileForAI += ` Trip Notes: ${plan.tripContext.trim()}`;
      } else {
        combinedProfileForAI += ` Trip Notes: None provided.`;
      }

      const promises = initialSegments.map(async (segment) => {
        let weather, clothing, activities;
        let segmentError: string | null = null;
        try {
          weather = await fetchWeather(plan.location, segment.date);
          if (!weather) {
            segmentError = "Weather data for this day is currently unavailable. Suggestions cannot be loaded.";
            setSegments(prev => prev.map(s => s.id === segment.id ? { ...s, error: segmentError, isLoading: false, weatherData: null } : s));
            return { ...segment, error: segmentError, isLoading: false, weatherData: null };
          }
          setSegments(prev => prev.map(s => s.id === segment.id ? { ...s, weatherData: weather } : s));

          try {
            const clothingInput = {
              weatherCondition: weather.condition,
              temperature: weather.temperature,
              familyProfile: combinedProfileForAI, 
              location: plan.location,
            };
            clothing = await suggestClothing(clothingInput);
            setSegments(prev => prev.map(s => s.id === segment.id ? { ...s, clothingSuggestions: clothing } : s));
          } catch (aiError: any) {
            console.error(`Error fetching clothing suggestions for segment ${segment.id}:`, aiError);
            clothing = null; 
            if (!segmentError) segmentError = "AI clothing suggestions are currently unavailable for this day.";
             setSegments(prev => prev.map(s => s.id === segment.id ? { ...s, clothingSuggestions: null, error: segmentError } : s));
          }
          
          try {
            const activityInput = {
              weatherCondition: weather.condition,
              temperature: weather.temperature,
              familyProfile: combinedProfileForAI,
              timeOfDay: "day", 
              locationPreferences: plan.location,
            };
            activities = await suggestActivities(activityInput);
            setSegments(prev => prev.map(s => s.id === segment.id ? { ...s, activitySuggestions: activities } : s));
          } catch (aiError: any) {
            console.error(`Error fetching activity suggestions for segment ${segment.id}:`, aiError);
            activities = null; 
            if (!segmentError) segmentError = "AI activity suggestions are currently unavailable for this day.";
            setSegments(prev => prev.map(s => s.id === segment.id ? { ...s, activitySuggestions: null, error: segmentError } : s));
          }
          
          setSegments(prev => prev.map(s => s.id === segment.id ? { ...s, isLoading: false, error: segmentError } : s));
          return { ...segment, weatherData: weather, clothingSuggestions: clothing, activitySuggestions: activities, isLoading: false, error: segmentError };
        } catch (err: any) { 
          console.error(`Error fetching weather data for segment ${segment.id} (${format(segment.date, "yyyy-MM-dd")}):`, err);
          segmentError = "Weather data for this day is currently unavailable. Suggestions cannot be loaded.";
          setSegments(prev => prev.map(s => s.id === segment.id ? { ...s, error: segmentError, isLoading: false, weatherData: null } : s));
          return { ...segment, error: segmentError, isLoading: false, weatherData: null };
        }
      });
      
      await Promise.all(promises);
      setOverallLoading(false);
    };
    
    fetchAllSegmentData();

  }, [plan, user, familyProfile, getUniqueDateSegments]); // Added user to dependencies


  const generateShareText = () => {
    if (!plan) return "Plan details are not loaded.";
    if (segments.some(s => s.isLoading || !s.weatherData)) return "Suggestions are loading or weather data is incomplete for some days.";
    
    let text = `Weatherugo Guide - Travel Plan: ${plan.tripName} to ${plan.location}\n`;
    text += `Dates: ${format(parseISO(plan.startDate), "PPP")} - ${format(parseISO(plan.endDate), "PPP")}\n`;
    if (plan.tripContext) text += `Trip Notes: ${plan.tripContext}\n`;
    text += `\nFamily Profile Used for Suggestions: ${familyProfile}\n\n`;

    segments.forEach(segment => {
      if (segment.weatherData) { 
        text += `--- ${segment.label} ---\n`;
        text += `Weather: ${segment.weatherData.temperature}°C, ${segment.weatherData.condition} (${segment.weatherData.description})\n`;
        if (segment.clothingSuggestions) text += `Outfit Ideas: ${segment.clothingSuggestions.suggestions.join(", ") || "N/A"}\n`;
        else text += `Outfit Ideas: Suggestions currently unavailable.\n`;
        if (segment.activitySuggestions) {
          text += `Activity Ideas:\n`;
          text += `  Indoor: ${segment.activitySuggestions.indoorActivities.join(", ") || "N/A"}\n`;
          text += `  Outdoor: ${segment.activitySuggestions.outdoorActivities.join(", ") || "N/A"}\n\n`;
        } else text += `Activity Ideas: Suggestions currently unavailable.\n\n`;
      } else if (segment.error) {
         text += `--- ${segment.label} ---\n`;
         text += `Weather and suggestions for this day are currently unavailable due to: ${segment.error}\n\n`;
      }
    });
    return text;
  };

  const handleDownload = () => {
    const text = generateShareText();
    const filename = `${plan?.tripName.replace(/\s+/g, '_') || 'travel_plan'}_suggestions.txt`;
    const blob = new Blob([text], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    toast({ title: "Download Started", description: "Suggestions are being downloaded." });
  };

  const handleShare = async () => {
    const textToShare = generateShareText();
    if (navigator.share) {
      try {
        await navigator.share({ title: `Travel Suggestions for ${plan?.tripName}`, text: textToShare });
        toast({ title: "Shared Successfully" });
      } catch (error) {
        console.error("Error sharing:", error);
        if ((error as DOMException)?.name !== 'AbortError') toast({ title: "Share Failed", variant: "destructive" });
      }
    } else {
      navigator.clipboard.writeText(textToShare).then(() => {
        toast({ title: "Copied to Clipboard", description: "Suggestions copied. Web Share API not available." });
      }).catch(err => {
        toast({ title: "Copy Failed", description: "Could not copy suggestions to clipboard.", variant: "destructive" });
      });
    }
  };
  
  const allSegmentsWeatherDataLoaded = !overallLoading && segments.length > 0 && segments.every(s => !s.isLoading && s.weatherData !== null);
  const someSuggestionsFailed = segments.some(s => s.weatherData && (!s.clothingSuggestions || !s.activitySuggestions) && !s.isLoading);


  if (authIsLoading || overallLoading && !plan) { // Show loading skeletons if auth or initial plan data is loading
     return (
        <div className="space-y-4 mt-4 py-4">
            <Skeleton className="h-10 w-1/4 mb-4" />
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-12 w-1/2 mt-6 mb-3" />
            <div className="space-y-3 p-1">
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-24 w-full rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-24 w-full rounded-md" />
            </div>
        </div>
     );
  }

  if (pageError) {
    return (
      <Card className="mt-4 shadow-lg">
        <CardHeader><CardTitle className="text-xl flex items-center gap-2 text-destructive"><AlertCircle /> Error</CardTitle></CardHeader>
        <CardContent>
          <p>{pageError}</p>
          <Button onClick={() => router.push('/notifications')} className="mt-4"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Travel Plans</Button>
        </CardContent>
      </Card>
    );
  }
  
  if (!plan) { // This case should ideally be covered by pageError if fetching failed
    return (
         <Card className="mt-4 shadow-lg">
            <CardHeader><CardTitle>Loading Plan Details...</CardTitle></CardHeader>
            <CardContent><p>If this takes too long, the plan might not exist or there was an issue loading it.</p>
             <Button onClick={() => router.push('/notifications')} className="mt-4"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Travel Plans</Button>
            </CardContent>
         </Card>
    );
  }

  return (
    <div className="space-y-6 py-4">
        <Button variant="outline" onClick={() => router.push('/notifications')} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to All Travel Plans
        </Button>

        <Card className="shadow-xl">
            <CardHeader className="bg-primary/10 rounded-t-lg p-6">
                <CardTitle className="text-2xl flex items-center gap-3"><Plane className="text-primary" /> {plan.tripName}</CardTitle>
                <CardDescription className="!mt-1 text-sm space-y-0.5">
                    <span className="flex items-center gap-2"><MapPin size={14}/> {plan.location}</span>
                    <span className="flex items-center gap-2"><CalendarDays size={14}/> {format(parseISO(plan.startDate), "PPP")} - {format(parseISO(plan.endDate), "PPP")}</span>
                     <span className="flex items-center gap-2"><Mail size={14}/> {plan.email}</span>
                     <span className="flex items-center gap-2 capitalize"><Repeat size={14}/> {plan.notificationFrequency} at {plan.notificationTimeLabel || plan.notificationTime}</span>
                     {plan.tripContext && (<span className="flex items-start gap-2 pt-1"><Info size={14} className="mt-0.5 shrink-0" /> <span className="italic">{plan.tripContext}</span></span>)}
                </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
                <h2 className="text-xl font-semibold mb-3">Daily Itinerary & AI Suggestions</h2>
                
                {overallLoading && segments.length === 0 && (
                  <div className="space-y-3 p-1">
                    <Skeleton className="h-10 w-full rounded-md" />
                    <Skeleton className="h-24 w-full rounded-md" />
                  </div>
                )}

                {!overallLoading && segments.length === 0 && (
                    <div className="text-center py-8 my-4 border rounded-md bg-card">
                        <Info size={48} className="mx-auto text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">No suggestion segments to display for this trip duration.</p>
                    </div>
                )}

                {segments.length > 0 && (
                  <Accordion type="multiple" defaultValue={segments.map(s => s.id)} className="w-full space-y-1 p-1 flex-1 min-h-0">
                    {segments.map((segment) => {
                        const WeatherIcon = segment.weatherData ? getWeatherIcon(segment.weatherData.conditionCode, segment.weatherData.condition) : CloudSun;
                        return (
                        <AccordionItem value={segment.id} key={segment.id} className="border-b-0">
                            <AccordionTrigger className="text-lg font-semibold hover:no-underline bg-card hover:bg-muted/80 px-4 py-3 rounded-md border shadow-sm data-[state=open]:rounded-b-none data-[state=open]:border-b-0 pr-3">
                            <span className="flex-1 text-left">{segment.label}</span>
                            {segment.isLoading && <Skeleton className="h-5 w-20 ml-auto" />}
                            {segment.error && !segment.weatherData && <AlertCircle className="h-5 w-5 text-destructive ml-auto" title="Weather data failed"/>}
                            {segment.error && segment.weatherData && <Info className="h-5 w-5 text-amber-600 ml-auto" title="AI suggestions failed"/>}
                            </AccordionTrigger>
                            <AccordionContent className="pt-0 pb-4 space-y-4 border border-t-0 rounded-b-md shadow-sm bg-card overflow-hidden">
                                <div className="p-4">
                                {segment.isLoading && (
                                    <div className="space-y-3 p-4 border rounded-md bg-background/50">
                                    <div className="flex justify-between items-center"><Skeleton className="h-8 w-1/2" /><Skeleton className="h-8 w-1/4" /></div>
                                    <Skeleton className="h-4 w-3/4" /><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" />
                                    </div>
                                )}
                                {segment.error && !segment.weatherData && (
                                    <div className="text-destructive p-4 border border-destructive/50 rounded-md bg-destructive/10">
                                    <p className="font-medium">Error loading data for this day:</p><p className="text-sm">{segment.error}</p>
                                    </div>
                                )}
                                {segment.weatherData && (
                                    <div className="p-1 border rounded-md bg-background/80 shadow-inner">
                                        <div className="flex items-center justify-between mb-3 pb-3 border-b">
                                            <div className="flex items-center gap-2">
                                                <WeatherIcon size={32} className="text-accent" data-ai-hint={`${segment.weatherData.condition} weather`} />
                                                <div>
                                                    <p className="text-xl font-bold">{segment.weatherData.temperature}°C</p>
                                                    <p className="text-xs text-muted-foreground capitalize">{segment.weatherData.description}</p>
                                                </div>
                                            </div>
                                            <div className="text-right text-sm">
                                                <p>Humidity: {segment.weatherData.humidity}%</p><p>Wind: {segment.weatherData.windSpeed} km/h</p>
                                            </div>
                                        </div>
                                        {segment.error && (segment.clothingSuggestions === null || segment.activitySuggestions === null) && (
                                            <div className="text-amber-700 p-3 my-2 border border-amber-300 rounded-md bg-amber-50 text-sm">
                                                <p><Info size={16} className="inline mr-1" /> {segment.error}</p>
                                            </div>
                                        )}
                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div>
                                            <h4 className="font-semibold mb-1 text-md flex items-center gap-1.5"><Thermometer size={18}/> Outfit Ideas</h4>
                                            {segment.clothingSuggestions ? (segment.clothingSuggestions.suggestions.length > 0 ? (<ul className="list-disc list-inside space-y-0.5 text-sm pl-1">{segment.clothingSuggestions.suggestions.map((item, index) => (<li key={`cloth-${segment.id}-${index}`}>{item}</li>))}</ul>) : <p className="text-sm text-muted-foreground">No specific outfits suggested.</p>) : <p className="text-sm text-muted-foreground">Outfit suggestions currently unavailable.</p>}
                                            {segment.clothingSuggestions?.reasoning && <p className="text-xs text-muted-foreground italic mt-1">{segment.clothingSuggestions.reasoning}</p>}
                                            </div>
                                            <div>
                                            <h4 className="font-semibold mb-1 text-md flex items-center gap-1.5"><CloudSun size={18}/> Activity Ideas</h4>
                                            {segment.activitySuggestions ? (<>{segment.activitySuggestions.indoorActivities.length > 0 && (<><p className="text-sm font-medium mt-1">Indoor:</p><ul className="list-disc list-inside space-y-0.5 text-sm pl-1">{segment.activitySuggestions.indoorActivities.map((item, index) => (<li key={`indoor-${segment.id}-${index}`}>{item}</li>))}</ul></>)}{segment.activitySuggestions.outdoorActivities.length > 0 && (<><p className="text-sm font-medium mt-1">Outdoor:</p><ul className="list-disc list-inside space-y-0.5 text-sm pl-1">{segment.activitySuggestions.outdoorActivities.map((item, index) => (<li key={`outdoor-${segment.id}-${index}`}>{item}</li>))}</ul></>)}{(segment.activitySuggestions.indoorActivities.length === 0 && segment.activitySuggestions.outdoorActivities.length === 0) && (<p className="text-sm text-muted-foreground">No activities suggested.</p>)}</>) : <p className="text-sm text-muted-foreground">Activity suggestions currently unavailable.</p>}
                                            </div>
                                        </div>
                                    </div>
                                )}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                        );
                    })}
                    </Accordion>
                )}

                {!overallLoading && segments.length > 0 && (someSuggestionsFailed || !allSegmentsWeatherDataLoaded) && (
                    <div className="text-center py-4 text-sm text-amber-700 bg-amber-50 p-3 rounded-md border border-amber-200 mt-4">
                        <p><Info size={16} className="inline mr-1" /> 
                        { !allSegmentsWeatherDataLoaded ? "Some weather data could not be loaded. Suggestions might be incomplete." : "Some AI suggestions could not be generated. Weather data is available."}
                        </p>
                    </div>
                )}

                <div className="flex justify-end space-x-2 mt-6 pt-6 border-t">
                    <Button onClick={handleDownload} disabled={!allSegmentsWeatherDataLoaded}><Download className="mr-2 h-4 w-4" /> Download</Button>
                    <Button onClick={handleShare} disabled={!allSegmentsWeatherDataLoaded}><Share2 className="mr-2 h-4 w-4" /> Share</Button>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
