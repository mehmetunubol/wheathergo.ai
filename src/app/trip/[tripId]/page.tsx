
"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Download, Share2, Plane, CalendarDays, MapPin, Info, CloudSun, Thermometer, ArrowLeft, Mail, Clock, Repeat } from "lucide-react";
import { format, parseISO, differenceInCalendarDays, addDays, startOfDay, isSameDay } from "date-fns";
import { fetchWeather } from "@/lib/weather-api";
import { suggestClothing, type ClothingSuggestionsOutput } from "@/ai/flows/clothing-suggestions";
import { suggestActivities, type ActivitySuggestionsOutput } from "@/ai/flows/activity-suggestions";
import type { TravelPlanItem, WeatherData, TripSegmentSuggestions, StoredTripSegmentData } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { getWeatherIcon } from "@/components/icons";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";

const DEFAULT_FAMILY_PROFILE_FOR_SUGGESTIONS = "An adult traveler.";

export default function TripDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.tripId as string;

  const { user, isAuthenticated, isLoading: authIsLoading } = useAuth();
  const [plan, setPlan] = React.useState<TravelPlanItem | null>(null);
  const [familyProfile, setFamilyProfile] = React.useState<string>(DEFAULT_FAMILY_PROFILE_FOR_SUGGESTIONS);
  
  // UI state for segments, including loading/error status
  const [segments, setSegments] = React.useState<TripSegmentSuggestions[]>([]);
  
  const [overallLoading, setOverallLoading] = React.useState(true); // For initial plan and profile load
  const [pageError, setPageError] = React.useState<string | null>(null);

  const { toast } = useToast();

  const getUniqueDateSegments = React.useCallback((currentPlan: TravelPlanItem | null): TripSegmentSuggestions[] => {
    if (!currentPlan) return [];

    const startDate = startOfDay(parseISO(currentPlan.startDate));
    const endDate = startOfDay(parseISO(currentPlan.endDate));
    
    // Ensure dates are valid before proceeding
    if (!startDate || !endDate || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        console.error("Invalid start or end date in travel plan:", currentPlan);
        setPageError("Invalid date format in travel plan. Cannot display suggestions.");
        return [];
    }
    const duration = differenceInCalendarDays(endDate, startDate);

    const potentialSegments: TripSegmentSuggestions[] = [];

    // Start Date
    potentialSegments.push({
      date: startDate,
      id: 'start',
      label: `Start of Trip (${format(startDate, "MMM d, yyyy")})`,
      weatherData: null, clothingSuggestions: null, activitySuggestions: null, isLoading: true, error: null
    });

    // Middle Date
    if (duration >= 2) { // Only for trips of 3 days or longer (e.g., 0, 1, 2 -> duration is 2)
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
    
    // End Date
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
            (segment.id === 'start') ||
            (segment.id === 'end' && uniqueSegmentsMap.get(dateStr)?.id !== 'start') ||
            (segment.id === 'middle' && !['start', 'end'].includes(uniqueSegmentsMap.get(dateStr)?.id || ''))
        ) {
            uniqueSegmentsMap.set(dateStr, segment);
        }
    });

    return Array.from(uniqueSegmentsMap.values())
                .sort((a, b) => a.date.getTime() - b.date.getTime())
                .map(s => ({ ...s, isLoading: true, error: null, source: undefined })); // Initialize UI state

  }, []);

  // Effect to load initial plan and family profile
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


  // Effect to process segments (load from store or fetch new)
  React.useEffect(() => {
    if (overallLoading || !plan || !user || !familyProfile) {
      return;
    }

    const relevantSegmentsForUI = getUniqueDateSegments(plan);
    setSegments(relevantSegmentsForUI); // Initialize UI segments with loading states

    const processAllSegments = async () => {
      const planDocRef = doc(db, "users", user.uid, "travelPlans", tripId);
      let newStoredSuggestionsArray: StoredTripSegmentData[] = [...(plan.storedSuggestions || [])];
      let wasFirestoreUpdated = false;

      const combinedProfileForAI = `Global Profile: ${familyProfile}. ${plan.tripContext ? `Trip Notes: ${plan.tripContext.trim()}` : 'Trip Notes: None provided.'}`;

      const segmentPromises = relevantSegmentsForUI.map(async (uiSegment) => {
        const existingStoredSegment = plan.storedSuggestions?.find(
          (ss) => ss.segmentId === uiSegment.id && isSameDay(parseISO(ss.date), uiSegment.date)
        );

        if (existingStoredSegment) {
          setSegments(prev => prev.map(s => s.id === uiSegment.id ? { 
            ...s, 
            weatherData: existingStoredSegment.weatherData,
            clothingSuggestions: existingStoredSegment.clothingSuggestions,
            activitySuggestions: existingStoredSegment.activitySuggestions,
            isLoading: false, 
            error: null,
            source: 'stored' 
          } : s));
          return; // Use stored data
        }

        // No stored data, or it's stale (add staleness check later if needed), fetch new
        try {
          const weather = await fetchWeather(plan.location, uiSegment.date);
          if (!weather) {
            throw new Error("Weather data unavailable.");
          }
          setSegments(prev => prev.map(s => s.id === uiSegment.id ? { ...s, weatherData: weather } : s));

          let clothing: ClothingSuggestionsOutput | null = null;
          let activities: ActivitySuggestionsOutput | null = null;
          let segmentError: string | null = null;

          try {
            clothing = await suggestClothing({ weatherCondition: weather.condition, temperature: weather.temperature, familyProfile: combinedProfileForAI, location: plan.location });
          } catch (aiError: any) { 
            console.error(`Error fetching clothing suggestions for segment ${uiSegment.id}:`, aiError);
            segmentError = "AI clothing suggestions unavailable.";
          }
          setSegments(prev => prev.map(s => s.id === uiSegment.id ? { ...s, clothingSuggestions: clothing } : s));
          
          try {
            activities = await suggestActivities({ weatherCondition: weather.condition, temperature: weather.temperature, familyProfile: combinedProfileForAI, timeOfDay: "day", locationPreferences: plan.location });
          } catch (aiError: any) { 
            console.error(`Error fetching activity suggestions for segment ${uiSegment.id}:`, aiError);
            if (segmentError) segmentError += " Activity suggestions also unavailable."; else segmentError = "AI activity suggestions unavailable.";
          }
          setSegments(prev => prev.map(s => s.id === uiSegment.id ? { ...s, activitySuggestions: activities, isLoading: false, error: segmentError, source: 'newly-fetched' } : s));
          
          // If successful and all suggestions are present, prepare for storage
          if (weather && clothing && activities) {
            const newSegmentDataToStore: StoredTripSegmentData = {
              segmentId: uiSegment.id,
              date: uiSegment.date.toISOString(),
              weatherData: weather,
              clothingSuggestions: clothing,
              activitySuggestions: activities,
              fetchedAt: new Date().toISOString(),
            };
            // Update or add to newStoredSuggestionsArray
            const existingIndex = newStoredSuggestionsArray.findIndex(s => s.segmentId === uiSegment.id && isSameDay(parseISO(s.date), uiSegment.date));
            if (existingIndex > -1) {
              newStoredSuggestionsArray[existingIndex] = newSegmentDataToStore;
            } else {
              newStoredSuggestionsArray.push(newSegmentDataToStore);
            }
            wasFirestoreUpdated = true;
          }

        } catch (err: any) {
          console.error(`Error processing segment ${uiSegment.id}:`, err);
          setSegments(prev => prev.map(s => s.id === uiSegment.id ? { ...s, isLoading: false, error: err.message || "Failed to load data for this day." } : s));
        }
      });

      await Promise.all(segmentPromises);

      if (wasFirestoreUpdated) {
        try {
          await updateDoc(planDocRef, { storedSuggestions: newStoredSuggestionsArray });
          // Optionally, update local 'plan' state to reflect stored suggestions
          setPlan(prevPlan => prevPlan ? { ...prevPlan, storedSuggestions: newStoredSuggestionsArray } : null);
          console.log("Successfully updated Firestore with new suggestions.");
        } catch (firestoreError) {
          console.error("Failed to update Firestore with suggestions:", firestoreError);
          toast({ title: "Storage Error", description: "Could not save new suggestions to the cloud.", variant: "destructive"});
        }
      }
    };
    
    processAllSegments();

  }, [plan, user, familyProfile, getUniqueDateSegments, overallLoading, tripId, toast]); // Added tripId and toast


  const generateShareText = () => {
    if (!plan) return "Plan details are not loaded.";
    if (segments.some(s => s.isLoading || (!s.weatherData && !s.error) )) return "Suggestions are loading or weather data is incomplete for some days.";

    let text = `Weatherugo Guide - Travel Plan: ${plan.tripName} to ${plan.location}\n`;
    text += `Dates: ${format(parseISO(plan.startDate), "PPP")} - ${format(parseISO(plan.endDate), "PPP")}\n`;
    if (plan.tripContext) text += `Trip Notes: ${plan.tripContext}\n`;
    text += `\nFamily Profile Used for Suggestions: ${familyProfile}\n\n`;

    segments.forEach(segment => {
      text += `--- ${segment.label} ---\n`;
      if (segment.weatherData) {
        text += `Weather: ${segment.weatherData.temperature}°C, ${segment.weatherData.condition} (${segment.weatherData.description})\n`;
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
  const someSuggestionsFailed = allSegmentsProcessed && segments.some(s => s.weatherData && (!s.clothingSuggestions || !s.activitySuggestions) && !s.error?.includes("Weather data unavailable"));
  const someWeatherFailed = allSegmentsProcessed && segments.some(s => !s.weatherData && s.error);


  if (authIsLoading || overallLoading) { // Simplified initial loading check
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

  if (!plan) { // If overallLoading is false and plan is still null, it means it wasn't found or an error occurred handled by pageError.
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
                        const WeatherIcon = segment.weatherData ? getWeatherIcon(segment.weatherData.conditionCode, segment.weatherData.condition) : CloudSun;
                        return (
                        <AccordionItem value={segment.id} key={segment.id} className="border-b-0">
                            <AccordionTrigger className="text-lg font-semibold hover:no-underline bg-card hover:bg-muted/80 px-4 py-3 rounded-md border shadow-sm data-[state=open]:rounded-b-none data-[state=open]:border-b-0 pr-3">
                            <span className="flex-1 text-left">{segment.label}</span>
                            {segment.isLoading && <Skeleton className="h-5 w-20 ml-auto" />}
                            {segment.error && !segment.weatherData && <AlertCircle className="h-5 w-5 text-destructive ml-auto" title="Data loading failed for this day"/>}
                            {segment.error && segment.weatherData && <Info className="h-5 w-5 text-amber-600 ml-auto" title="AI suggestions failed for this day"/>}
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
                                            {segment.clothingSuggestions ? (segment.clothingSuggestions.suggestions.length > 0 ? (<ul className="list-disc list-inside space-y-0.5 text-sm pl-1">{segment.clothingSuggestions.suggestions.map((item, index) => (<li key={`cloth-${segment.id}-${index}`}>{item}</li>))}</ul>) : <p className="text-sm text-muted-foreground">No specific outfits suggested.</p>) : (segment.isLoading ? <Skeleton className="h-10 w-full"/> :<p className="text-sm text-muted-foreground">Outfit suggestions unavailable.</p>)}
                                            {segment.clothingSuggestions?.reasoning && <p className="text-xs text-muted-foreground italic mt-1">{segment.clothingSuggestions.reasoning}</p>}
                                            </div>
                                            <div>
                                            <h4 className="font-semibold mb-1 text-md flex items-center gap-1.5"><CloudSun size={18}/> Activity Ideas</h4>
                                            {segment.activitySuggestions ? (<>{segment.activitySuggestions.indoorActivities.length > 0 && (<><p className="text-sm font-medium mt-1">Indoor:</p><ul className="list-disc list-inside space-y-0.5 text-sm pl-1">{segment.activitySuggestions.indoorActivities.map((item, index) => (<li key={`indoor-${segment.id}-${index}`}>{item}</li>))}</ul></>)}{segment.activitySuggestions.outdoorActivities.length > 0 && (<><p className="text-sm font-medium mt-1">Outdoor:</p><ul className="list-disc list-inside space-y-0.5 text-sm pl-1">{segment.activitySuggestions.outdoorActivities.map((item, index) => (<li key={`outdoor-${segment.id}-${index}`}>{item}</li>))}</ul></>)}{(segment.activitySuggestions.indoorActivities.length === 0 && segment.activitySuggestions.outdoorActivities.length === 0) && (<p className="text-sm text-muted-foreground">No activities suggested.</p>)}</>) : (segment.isLoading ? <Skeleton className="h-10 w-full"/> : <p className="text-sm text-muted-foreground">Activity suggestions unavailable.</p>)}
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

                {(allSegmentsProcessed && (someSuggestionsFailed || someWeatherFailed)) && (
                    <div className="text-center py-4 text-sm text-amber-700 bg-amber-50 p-3 rounded-md border border-amber-200 mt-4">
                        <p><Info size={16} className="inline mr-1" />
                        { someWeatherFailed ? "Some weather data could not be loaded. Suggestions might be incomplete." : "Some AI suggestions could not be generated. Weather data is available."}
                        </p>
                    </div>
                )}

                <div className="flex justify-end space-x-2 mt-6 pt-6 border-t">
                    <Button onClick={handleDownload} disabled={!allSegmentsProcessed || segments.length === 0}><Download className="mr-2 h-4 w-4" /> Download</Button>
                    <Button onClick={handleShare} disabled={!allSegmentsProcessed || segments.length === 0}><Share2 className="mr-2 h-4 w-4" /> Share</Button>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}

