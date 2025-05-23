
"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Download, Share2, Plane, CalendarDays, MapPin, Info, CloudSun, Thermometer, ArrowLeft, Mail, Clock, Repeat, RefreshCw, Edit3, Eye, AlertTriangle } from "lucide-react";
import { format, parseISO, differenceInCalendarDays, addDays, startOfDay, isSameDay, isValid, isBefore } from "date-fns";
import { fetchWeather } from "@/lib/weather-api";
import { suggestClothing, type ClothingSuggestionsOutput } from "@/ai/flows/clothing-suggestions";
import { suggestActivities, type ActivitySuggestionsOutput } from "@/ai/flows/activity-suggestions";
import type { TravelPlanItem, WeatherData, TripSegmentSuggestions, StoredTripSegmentData } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { getWeatherIcon } from "@/components/icons";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HourlyForecastCard } from "@/components/hourly-forecast-card"; // Added import

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
  const [isRegenerating, setIsRegenerating] = React.useState(false);


  const { toast } = useToast();

  const getUniqueDateSegments = React.useCallback((currentPlan: TravelPlanItem | null): TripSegmentSuggestions[] => {
    if (!currentPlan) return [];
    
    let parsedStartDate, parsedEndDate;
    try {
        parsedStartDate = startOfDay(parseISO(currentPlan.startDate));
        parsedEndDate = startOfDay(parseISO(currentPlan.endDate));
    } catch (e) {
        console.error("Invalid date format in travel plan during parsing:", currentPlan, e);
        setPageError("Invalid date format in travel plan. Cannot display suggestions.");
        return [];
    }

    if (!isValid(parsedStartDate) || !isValid(parsedEndDate)) {
        console.error("Invalid start or end date in travel plan:", currentPlan);
        setPageError("Invalid date format in travel plan. Cannot display suggestions.");
        return [];
    }

    const duration = differenceInCalendarDays(parsedEndDate, parsedStartDate);
    if (duration < 0) {
        console.error("End date is before start date:", currentPlan);
        setPageError("Trip end date cannot be before the start date.");
        return [];
    }
    
    const potentialSegments: TripSegmentSuggestions[] = [];

    // Start Date
    potentialSegments.push({
      date: parsedStartDate,
      id: 'start',
      label: `Start of Trip (${format(parsedStartDate, "MMM d, yyyy")})`,
      weatherData: null, clothingSuggestions: null, activitySuggestions: null, isLoading: true, error: null
    });

    // Middle Date
    if (duration >= 2) { 
      const middleOffset = Math.floor(duration / 2); 
      const middleDateCand = startOfDay(addDays(parsedStartDate, middleOffset));
      if (!isSameDay(middleDateCand, parsedStartDate) && !isSameDay(middleDateCand, parsedEndDate)) {
        potentialSegments.push({
          date: middleDateCand,
          id: 'middle',
          label: `Middle of Trip (${format(middleDateCand, "MMM d, yyyy")})`,
          weatherData: null, clothingSuggestions: null, activitySuggestions: null, isLoading: true, error: null
        });
      }
    }
    
    // End Date
    if (!isSameDay(parsedEndDate, parsedStartDate)) {
      potentialSegments.push({
        date: parsedEndDate,
        id: 'end',
        label: `End of Trip (${format(parsedEndDate, "MMM d, yyyy")})`,
        weatherData: null, clothingSuggestions: null, activitySuggestions: null, isLoading: true, error: null
      });
    }
    
    const uniqueSegmentsMap = new Map<string, TripSegmentSuggestions>();
    potentialSegments.forEach(segment => {
        const dateStr = format(segment.date, 'yyyy-MM-dd');
        if (!uniqueSegmentsMap.has(dateStr) || 
            (segment.id === 'start') ||
            (segment.id === 'end' && uniqueSegmentsMap.get(dateStr)?.id !== 'start') ||
            (segment.id === 'middle' && !['start', 'end'].includes(uniqueSegmentsMap.get(dateStr)?.id || ''))
        ) {
            uniqueSegmentsMap.set(dateStr, segment);
        }
    });

    return Array.from(uniqueSegmentsMap.values())
                .sort((a, b) => a.date.getTime() - b.date.getTime())
                .map(s => ({ ...s, isLoading: true, error: null, source: undefined }));

  }, []);

  React.useEffect(() => {
    const loadTripData = async () => {
      if (authIsLoading || !tripId) return;

      if (!isAuthenticated || !user) {
        setPageError("You must be logged in to view trip details.");
        setOverallLoading(false);
        return;
      }

      setOverallLoading(true);
      try {
        const profileRef = doc(db, "users", user.uid, "profile", "mainProfile");
        const profileSnap = await getDoc(profileRef);
        setFamilyProfile(profileSnap.exists() ? profileSnap.data().description || DEFAULT_FAMILY_PROFILE_FOR_SUGGESTIONS : DEFAULT_FAMILY_PROFILE_FOR_SUGGESTIONS);

        const planDocRef = doc(db, "users", user.uid, "travelPlans", tripId);
        const planSnap = await getDoc(planDocRef);

        if (planSnap.exists()) {
          setPlan({ id: planSnap.id, ...planSnap.data() } as TravelPlanItem);
          setPageError(null);
        } else {
          setPageError("Travel plan not found or you do not have access.");
          setPlan(null);
        }
      } catch (error) {
        console.error("Error loading trip data from Firestore:", error);
        setPageError("Error loading travel plan data from the cloud.");
        setPlan(null);
      } finally {
        setOverallLoading(false); 
      }
    };
    loadTripData();
  }, [tripId, user, isAuthenticated, authIsLoading, router]);


  React.useEffect(() => {
    if (overallLoading || !plan || !user || !familyProfile) {
      return;
    }

    const relevantSegmentsForUI = getUniqueDateSegments(plan);
    setSegments(prevSegments => {
        if (!isRegenerating && prevSegments.length === relevantSegmentsForUI.length) {
            return prevSegments.map((ps, index) => ({
                ...relevantSegmentsForUI[index],
                weatherData: ps.weatherData, 
                clothingSuggestions: ps.clothingSuggestions,
                activitySuggestions: ps.activitySuggestions,
                isLoading: isRegenerating ? true : ps.isLoading, 
                error: isRegenerating ? null : ps.error,
                source: isRegenerating ? undefined : ps.source,
            }));
        }
        return relevantSegmentsForUI;
    });

    const processAllSegments = async () => {
      const planDocRef = doc(db, "users", user.uid, "travelPlans", tripId);
      let newStoredSuggestionsArray: StoredTripSegmentData[] = isRegenerating ? [] : [...(plan.storedSuggestions || [])];
      let wasFirestoreUpdated = false;

      const combinedProfileForAI = `Global Profile: ${familyProfile}. ${plan.tripContext ? `Trip Notes: ${plan.tripContext.trim()}` : 'Trip Notes: None provided.'}`;

      const segmentPromises = relevantSegmentsForUI.map(async (uiSegment) => {
        let segmentDataToUse: Partial<TripSegmentSuggestions> = { isLoading: true, error: null };

        const existingStoredSegment = !isRegenerating ? plan.storedSuggestions?.find(
          (ss) => ss.segmentId === uiSegment.id && isValid(parseISO(ss.date)) && isSameDay(parseISO(ss.date), uiSegment.date)
        ) : undefined;

        if (existingStoredSegment) {
          segmentDataToUse = { 
            weatherData: existingStoredSegment.weatherData,
            clothingSuggestions: existingStoredSegment.clothingSuggestions,
            activitySuggestions: existingStoredSegment.activitySuggestions,
            isLoading: false, error: null, source: 'stored' 
          };
        } else {
          try {
            const weather = await fetchWeather(plan.location, uiSegment.date);
            segmentDataToUse.weatherData = weather; 

            let clothing: ClothingSuggestionsOutput | null = null;
            let activities: ActivitySuggestionsOutput | null = null;
            let segmentError: string | null = null;

            if (weather) { 
              try {
                clothing = await suggestClothing({ weatherCondition: weather.condition, temperature: weather.temperature, familyProfile: combinedProfileForAI, location: plan.location });
              } catch (aiError: any) { 
                console.error(`Error fetching clothing suggestions for segment ${uiSegment.id}:`, aiError);
                segmentError = "AI clothing suggestions unavailable.";
              }
              segmentDataToUse.clothingSuggestions = clothing;
              
              try {
                activities = await suggestActivities({ weatherCondition: weather.condition, temperature: weather.temperature, familyProfile: combinedProfileForAI, timeOfDay: "day", locationPreferences: plan.location }); 
              } catch (aiError: any) { 
                console.error(`Error fetching activity suggestions for segment ${uiSegment.id}:`, aiError);
                if (segmentError) segmentError += " Activity suggestions also unavailable."; else segmentError = "AI activity suggestions unavailable.";
              }
              segmentDataToUse.activitySuggestions = activities;
            } else {
                 segmentError = "Weather data unavailable for this day. Suggestions cannot be loaded.";
            }
            
            segmentDataToUse.isLoading = false;
            segmentDataToUse.error = segmentError;
            segmentDataToUse.source = 'newly-fetched';
            
            if (weather && ( (clothing && activities && segmentError === null) || weather.isGuessed) ) { 
              const newSegmentDataToStore: StoredTripSegmentData = {
                segmentId: uiSegment.id,
                date: uiSegment.date.toISOString(),
                weatherData: weather, 
                clothingSuggestions: clothing!, 
                activitySuggestions: activities!,
                fetchedAt: new Date().toISOString(),
              };
              
              const existingIndex = newStoredSuggestionsArray.findIndex(s => s.segmentId === uiSegment.id && isValid(parseISO(s.date)) && isSameDay(parseISO(s.date), uiSegment.date));
              if (existingIndex > -1) {
                newStoredSuggestionsArray[existingIndex] = newSegmentDataToStore;
              } else {
                newStoredSuggestionsArray.push(newSegmentDataToStore);
              }
              wasFirestoreUpdated = true;
            }

          } catch (err: any) {
            console.error(`Error processing segment ${uiSegment.id}:`, err);
            segmentDataToUse.isLoading = false;
            segmentDataToUse.error = err.message || "Failed to load data for this day.";
            segmentDataToUse.weatherData = null; 
          }
        }
        
        setSegments(prev => prev.map(s => s.id === uiSegment.id && s.date.getTime() === uiSegment.date.getTime() ? { ...s, ...segmentDataToUse } : s));
      });

      await Promise.all(segmentPromises);

      if (wasFirestoreUpdated) {
        try {
          await updateDoc(planDocRef, { storedSuggestions: newStoredSuggestionsArray });
          setPlan(prevPlan => prevPlan ? { ...prevPlan, storedSuggestions: newStoredSuggestionsArray } : null);
          console.log("Successfully updated Firestore with new suggestions.");
          if (isRegenerating) {
            toast({ title: "Suggestions Regenerated", description: "Fresh suggestions have been fetched and saved."});
          }
        } catch (firestoreError) {
          console.error("Failed to update Firestore with suggestions:", firestoreError);
          toast({ title: "Storage Error", description: "Could not save new suggestions to the cloud.", variant: "destructive"});
        }
      }
      if (isRegenerating) {
          setIsRegenerating(false);
      }
    };
    
    processAllSegments();

  }, [plan, user, familyProfile, getUniqueDateSegments, overallLoading, tripId, toast, isRegenerating]); 


  const handleRegenerateSuggestions = async () => {
    if (!plan || !user) return;
    const confirmed = window.confirm("Are you sure you want to regenerate all suggestions for this trip? This will fetch fresh data and overwrite any stored suggestions.");
    if (confirmed) {
        setIsRegenerating(true); 
    }
  };

  const generateShareText = () => {
    if (!plan) return "Plan details are not loaded.";
    if (segments.some(s => s.isLoading || (!s.weatherData && !s.error && !s.weatherData?.isGuessed) )) return "Suggestions are loading or weather data is incomplete for some days.";

    let text = `Weatherugo Guide - Travel Plan: ${plan.tripName} to ${plan.location}\n`;
    text += `Dates: ${format(parseISO(plan.startDate), "PPP")} - ${format(parseISO(plan.endDate), "PPP")}\n`;
    if (plan.tripContext) text += `Trip Notes: ${plan.tripContext}\n`;
    text += `\nFamily Profile Used for Suggestions: ${familyProfile}\n\n`;

    segments.forEach(segment => {
      text += `--- ${segment.label} ---\n`;
      if (segment.weatherData) {
        text += `Weather: ${segment.weatherData.temperature}°C, ${segment.weatherData.condition} (${segment.weatherData.description})${segment.weatherData.isGuessed ? " (AI Estimate)" : ""}\n`;
        if (segment.weatherData.forecast && segment.weatherData.forecast.length > 0 && !segment.weatherData.isGuessed) {
          text += ` Hourly: ${segment.weatherData.forecast.map(f => `${f.time}: ${f.temperature}°C, ${f.condition}`).slice(0,5).join('; ')}...\n`; // Show first few hours
        }
        if (segment.clothingSuggestions) text += `Outfit Ideas: ${segment.clothingSuggestions.suggestions.join(", ") || "N/A"}\n`;
        else text += `Outfit Ideas: Suggestions currently unavailable for this day.\n`;
        if (segment.activitySuggestions) {
          text += `Activity Ideas:\n`;
          text += `  Indoor: ${segment.activitySuggestions.indoorActivities.join(", ") || "N/A"}\n`;
          text += `  Outdoor: ${segment.activitySuggestions.outdoorActivities.join(", ") || "N/A"}\n\n`;
        } else text += `Activity Ideas: Suggestions currently unavailable for this day.\n\n`;
      } else if (segment.error) {
         text += `Weather and suggestions for this day are currently unavailable: ${segment.error}\n\n`;
      } else {
         text += `Weather data or suggestions are still loading for this day.\n\n`;
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
  
  const allSegmentsProcessed = segments.length > 0 && segments.every(s => !s.isLoading);
  const someSuggestionsFailed = allSegmentsProcessed && segments.some(s => s.weatherData && (!s.clothingSuggestions || !s.activitySuggestions) && !s.error?.includes("Weather data unavailable.") && !s.weatherData?.isGuessed);
  const someWeatherFailed = allSegmentsProcessed && segments.some(s => !s.weatherData && s.error && !s.weatherData?.isGuessed);


  if (authIsLoading || overallLoading) {
     return (
        <div className="space-y-4 mt-4 py-4">
            <Skeleton className="h-10 w-1/4 mb-4" />
            <Card className="shadow-xl">
              <CardHeader className="bg-primary/10 rounded-t-lg p-6">
                  <Skeleton className="h-8 w-3/4" />
                  <Skeleton className="h-4 w-1/2 mt-2" />
                  <Skeleton className="h-4 w-1/2 mt-1" />
                  <Skeleton className="h-4 w-1/2 mt-1" />
              </CardHeader>
              <CardContent className="pt-6">
                  <Skeleton className="h-8 w-1/2 mb-3" />
                  <div className="space-y-3 p-1">
                    <Skeleton className="h-10 w-full rounded-md" />
                    <Skeleton className="h-24 w-full rounded-md" />
                    <Skeleton className="h-10 w-full rounded-md" />
                    <Skeleton className="h-24 w-full rounded-md" />
                  </div>
              </CardContent>
            </Card>
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

  if (!plan) {
    return (
         <Card className="mt-4 shadow-lg">
            <CardHeader><CardTitle>Loading Plan Details...</CardTitle></CardHeader>
            <CardContent><p>If this takes too long, the plan might not exist or there was an issue loading it. Check console for errors.</p>
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
            <CardContent className="pt-6 flex flex-col">
                <h2 className="text-xl font-semibold mb-3">Daily Itinerary & AI Suggestions</h2>

                {segments.length === 0 && !overallLoading && ( 
                    <div className="text-center py-8 my-4 border rounded-md bg-card">
                        <Info size={48} className="mx-auto text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">No suggestion segments to display for this trip duration.</p>
                         <p className="text-xs text-muted-foreground mt-1">This can happen for very short trips or if dates are invalid.</p>
                    </div>
                )}

                {segments.length > 0 && (
                  <Accordion type="multiple" defaultValue={segments.map(s => s.id)} className="w-full space-y-1 p-0 md:p-1 flex-1 min-h-0">
                    {segments.map((segment) => {
                        const WeatherIconToUse = segment.weatherData ? getWeatherIcon(segment.weatherData.conditionCode, segment.weatherData.condition, segment.weatherData.isDay) : CloudSun;
                        const showHourlyForecast = segment.weatherData && !segment.weatherData.isGuessed && segment.weatherData.forecast && segment.weatherData.forecast.length > 0;
                        return (
                        <AccordionItem value={segment.id} key={`${segment.id}-${segment.date.toISOString()}`} className="border-b-0">
                            <AccordionTrigger className="text-lg font-semibold hover:no-underline bg-card hover:bg-muted/80 px-4 py-3 rounded-md border shadow-sm data-[state=open]:rounded-b-none data-[state=open]:border-b-0 pr-3">
                            <span className="flex-1 text-left">{segment.label}</span>
                            {segment.isLoading && <Skeleton className="h-5 w-20 ml-auto" />}
                            {segment.error && !segment.weatherData && <AlertCircle className="h-5 w-5 text-destructive ml-auto" title="Data loading failed for this day"/>}
                            {segment.error && segment.weatherData && <Info className="h-5 w-5 text-amber-600 ml-auto" title="AI suggestions failed for this day"/>}
                            </AccordionTrigger>
                            <AccordionContent className="pt-0 pb-4 space-y-4 border border-t-0 rounded-b-md shadow-sm bg-card overflow-hidden">
                                <div className="p-4">
                                {segment.isLoading && !segment.weatherData && ( 
                                    <div className="space-y-3 p-4 border rounded-md bg-background/50">
                                    <div className="flex justify-between items-center"><Skeleton className="h-8 w-1/2" /><Skeleton className="h-8 w-1/4" /></div>
                                    <Skeleton className="h-4 w-3/4" /><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" />
                                    </div>
                                )}
                                {segment.error && !segment.weatherData && ( 
                                    <Alert variant="destructive" className="my-2">
                                      <AlertTriangle className="h-4 w-4" />
                                      <AlertTitle>Error Loading Data for this Day</AlertTitle>
                                      <AlertDescription>{segment.error}</AlertDescription>
                                    </Alert>
                                )}
                                {segment.weatherData && ( 
                                    <div className="space-y-4">
                                      <div className="p-3 border rounded-md bg-background/80 shadow-inner">
                                          <div className="flex items-center justify-between mb-3 pb-3 border-b">
                                              <div className="flex items-center gap-2">
                                                  <WeatherIconToUse size={32} className="text-accent" data-ai-hint={`${segment.weatherData.condition} weather ${segment.weatherData.isDay ? "day" : "night"}`} />
                                                  <div>
                                                      <p className="text-xl font-bold">{segment.weatherData.temperature}°C</p>
                                                      <p className="text-xs text-muted-foreground capitalize">{segment.weatherData.description}</p>
                                                  </div>
                                              </div>
                                              <div className="text-right text-sm">
                                                  <p>Humidity: {segment.weatherData.humidity}%</p><p>Wind: {segment.weatherData.windSpeed} km/h</p>
                                                  {segment.weatherData.isGuessed && (
                                                      <TooltipProvider>
                                                          <Tooltip delayDuration={100}>
                                                              <TooltipTrigger asChild>
                                                                  <span className="mt-1 inline-flex items-center text-xs text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full border border-amber-300 cursor-help">
                                                                      <Info size={12} className="mr-1" /> AI Estimate
                                                                  </span>
                                                              </TooltipTrigger>
                                                              <TooltipContent side="bottom" className="max-w-xs bg-background border-border shadow-lg p-2">
                                                                  <p className="text-xs">This is an AI-generated estimate. For an official forecast, please check closer to the date.</p>
                                                              </TooltipContent>
                                                          </Tooltip>
                                                      </TooltipProvider>
                                                  )}
                                              </div>
                                          </div>
                                          
                                          {segment.isLoading && (segment.clothingSuggestions === null || segment.activitySuggestions === null) && ( 
                                              <div className="grid md:grid-cols-2 gap-4 mt-2">
                                                  <div><h4 className="font-semibold mb-1 text-md flex items-center gap-1.5"><Thermometer size={18}/> Outfit Ideas</h4><Skeleton className="h-10 w-full"/></div>
                                                  <div><h4 className="font-semibold mb-1 text-md flex items-center gap-1.5"><CloudSun size={18}/> Activity Ideas</h4><Skeleton className="h-10 w-full"/></div>
                                              </div>
                                          )}

                                          {segment.error && (segment.clothingSuggestions === null || segment.activitySuggestions === null) && !segment.isLoading && ( 
                                              <Alert variant="default" className="my-2 border-amber-300 bg-amber-50 text-amber-700 [&>svg~*]:pl-7 [&>svg]:text-amber-600">
                                                  <Info className="h-4 w-4" />
                                                  <AlertTitle className="font-semibold">Suggestion Error</AlertTitle>
                                                  <AlertDescription>{segment.error}</AlertDescription>
                                              </Alert>
                                          )}

                                          {(!segment.isLoading || segment.clothingSuggestions || segment.activitySuggestions) && ( 
                                              <div className="grid md:grid-cols-2 gap-4">
                                                  <div>
                                                  <h4 className="font-semibold mb-1 text-md flex items-center gap-1.5"><Thermometer size={18}/> Outfit Ideas</h4>
                                                  {segment.clothingSuggestions ? (segment.clothingSuggestions.suggestions.length > 0 ? (<ul className="list-disc list-inside space-y-0.5 text-sm pl-1">{segment.clothingSuggestions.suggestions.map((item, index) => (<li key={`cloth-${segment.id}-${index}`}>{item}</li>))}</ul>) : <p className="text-sm text-muted-foreground">No specific outfits suggested.</p>) : (!segment.isLoading && <p className="text-sm text-muted-foreground">Outfit suggestions unavailable.</p>)}
                                                  {segment.clothingSuggestions?.reasoning && <p className="text-xs text-muted-foreground italic mt-1">{segment.clothingSuggestions.reasoning}</p>}
                                                  </div>
                                                  <div>
                                                  <h4 className="font-semibold mb-1 text-md flex items-center gap-1.5"><CloudSun size={18}/> Activity Ideas</h4>
                                                  {segment.activitySuggestions ? (<>{segment.activitySuggestions.indoorActivities.length > 0 && (<><p className="text-sm font-medium mt-1">Indoor:</p><ul className="list-disc list-inside space-y-0.5 text-sm pl-1">{segment.activitySuggestions.indoorActivities.map((item, index) => (<li key={`indoor-${segment.id}-${index}`}>{item}</li>))}</ul></>)}{segment.activitySuggestions.outdoorActivities.length > 0 && (<><p className="text-sm font-medium mt-1">Outdoor:</p><ul className="list-disc list-inside space-y-0.5 text-sm pl-1">{segment.activitySuggestions.outdoorActivities.map((item, index) => (<li key={`outdoor-${segment.id}-${index}`}>{item}</li>))}</ul></>)}{(segment.activitySuggestions.indoorActivities.length === 0 && segment.activitySuggestions.outdoorActivities.length === 0) && (<p className="text-sm text-muted-foreground">No activities suggested.</p>)}</>) : (!segment.isLoading && <p className="text-sm text-muted-foreground">Activity suggestions unavailable.</p>)}
                                                  </div>
                                              </div>
                                          )}
                                      </div>
                                       {showHourlyForecast && (
                                        <HourlyForecastCard
                                          forecastData={segment.weatherData.forecast}
                                          isLoading={segment.isLoading} // Pass segment's loading state for hourly
                                          date={segment.date}
                                          isParentGuessed={segment.weatherData.isGuessed}
                                        />
                                      )}
                                    </div>
                                )}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                        );
                    })}
                    </Accordion>
                )}

                {(allSegmentsProcessed && (someSuggestionsFailed || someWeatherFailed)) && (
                     <Alert variant="default" className="mt-4 border-amber-300 bg-amber-50 text-amber-700 [&>svg~*]:pl-7 [&>svg]:text-amber-600">
                        <Info className="h-4 w-4" />
                        <AlertTitle className="font-semibold">Partial Data</AlertTitle>
                        <AlertDescription>
                        { someWeatherFailed ? "Some weather data could not be loaded. Suggestions might be incomplete." : "Some AI suggestions could not be generated for all days. Weather data is available."}
                        </AlertDescription>
                    </Alert>
                )}

                <div className="flex justify-end space-x-2 mt-6 pt-6 border-t">
                    <Button variant="outline" onClick={handleRegenerateSuggestions} disabled={segments.length === 0 || isRegenerating || overallLoading || pageError !== null || segments.some(s => s.isLoading)}>
                        <RefreshCw className="mr-2 h-4 w-4" /> {isRegenerating ? "Regenerating..." : "Regenerate All Suggestions"}
                    </Button>
                    <Button onClick={handleDownload} disabled={!allSegmentsProcessed || segments.length === 0 || isRegenerating}><Download className="mr-2 h-4 w-4" /> Download</Button>
                    <Button onClick={handleShare} disabled={!allSegmentsProcessed || segments.length === 0 || isRegenerating}><Share2 className="mr-2 h-4 w-4" /> Share</Button>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}


    