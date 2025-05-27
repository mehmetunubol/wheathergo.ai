
"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { AlertCircle, Download, Share2, Plane, CalendarDays, MapPin, Info, CloudSun, Thermometer, ArrowLeft, Mail, Clock, Repeat, RefreshCw, Edit3, Eye, AlertTriangle, Building, Tent } from "lucide-react";
import { format, parseISO, differenceInCalendarDays, addDays, startOfDay, isSameDay, isValid, isBefore, endOfDay } from "date-fns"; 
import { fetchWeather } from "@/lib/weather-api";
import { suggestClothing, type ClothingSuggestionsOutput } from "@/ai/flows/clothing-suggestions";
import { suggestActivities, type ActivitySuggestionsOutput } from "@/ai/flows/activity-suggestions";
import type { TravelPlanItem, WeatherData, TripSegmentSuggestions, StoredTripSegmentData, Language } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { getWeatherIcon } from "@/components/icons";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { HourlyForecastCard } from "@/components/hourly-forecast-card";
import { useLanguage } from "@/contexts/language-context";
import { useTranslation } from "@/hooks/use-translation";
import { useAppSettings } from "@/contexts/app-settings-context";


const DEFAULT_FAMILY_PROFILE_FOR_SUGGESTIONS = "An adult traveler.";

export default function TripDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.tripId as string;

  const { user, isAuthenticated, isLoading: authIsLoading } = useAuth();
  const { language, dateLocale } = useLanguage();
  const { t } = useTranslation();
  const { settings: appSettings, isLoadingSettings: appSettingsLoading } = useAppSettings();

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
        setPageError(t('errorLoadingDataForDay')); 
        return [];
    }

    if (!isValid(parsedStartDate) || !isValid(parsedEndDate)) {
        console.error("Invalid start or end date in travel plan:", currentPlan);
        setPageError(t('errorLoadingDataForDay'));
        return [];
    }

    const duration = differenceInCalendarDays(parsedEndDate, parsedStartDate);
    if (duration < 0) {
        console.error("End date is before start date:", currentPlan);
        setPageError(t('error')); 
        return [];
    }
    
    const segmentsMap = new Map<string, TripSegmentSuggestions>();

    const addOrUpdateSegment = (date: Date, id: 'start' | 'middle' | 'end', labelPrefixKey: string) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const label = `${t(labelPrefixKey as any)} (${format(date, "MMM d, yyyy", { locale: dateLocale })})`;
        
        const existingSegment = segmentsMap.get(dateStr);
        const priorityOrder = { start: 1, middle: 2, end: 3 };

        if (!existingSegment || priorityOrder[id] < priorityOrder[existingSegment.id as 'start' | 'middle' | 'end']) {
            segmentsMap.set(dateStr, {
              date: date,
              id: id,
              label: label,
              weatherData: null, clothingSuggestions: null, activitySuggestions: null, isLoading: true, error: null, source: undefined
            });
        }
    };
    
    addOrUpdateSegment(parsedStartDate, 'start', 'Start of Trip');

    if (duration >= 2) { 
      const middleOffset = Math.floor(duration / 2.0);
      const middleDateCand = startOfDay(addDays(parsedStartDate, middleOffset));
      if (!isSameDay(middleDateCand, parsedStartDate) && !isSameDay(middleDateCand, parsedEndDate)) {
         addOrUpdateSegment(middleDateCand, 'middle', 'Middle of Trip');
      }
    }
    
    if (!isSameDay(parsedEndDate, parsedStartDate)) {
      addOrUpdateSegment(parsedEndDate, 'end', 'End of Trip');
    }
    
    return Array.from(segmentsMap.values())
                .sort((a, b) => a.date.getTime() - b.date.getTime());

  }, [t, dateLocale]);

  React.useEffect(() => {
    const loadTripData = async () => {
      if (authIsLoading || !tripId || appSettingsLoading) return;

      if (!isAuthenticated || !user) {
        setPageError(t('loginToManageTravelPlans'));
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
          setPageError(t('travelPlanNotFound')); 
          setPlan(null);
        }
      } catch (error) {
        console.error("Error loading trip data from Firestore:", error);
        setPageError(t('storageErrorDesc'));
        setPlan(null);
      } finally {
        setOverallLoading(false); 
      }
    };
    if (!appSettingsLoading) loadTripData();
  }, [tripId, user, isAuthenticated, authIsLoading, router, t, appSettingsLoading]);


  React.useEffect(() => {
    if (!plan || !user || !familyProfile || appSettingsLoading) {
      setSegments([]); 
      return;
    }
  
    const initialUiSegmentsBase = getUniqueDateSegments(plan);
  
    if (isRegenerating) {
      setSegments(initialUiSegmentsBase.map(seg => ({ ...seg, isLoading: true, error: null, source: undefined })));
    } else {
      const newSegments = initialUiSegmentsBase.map(uiSeg => {
        const stored = plan.storedSuggestions?.find(ss => ss.segmentId === uiSeg.id && isValid(parseISO(ss.date)) && isSameDay(parseISO(ss.date), uiSeg.date));
        if (stored) {
          return {
            id: uiSeg.id,
            label: uiSeg.label,
            date: uiSeg.date, 
            weatherData: stored.weatherData,
            clothingSuggestions: stored.clothingSuggestions,
            activitySuggestions: stored.activitySuggestions,
            isLoading: false, error: null, source: 'stored' as const
          };
        }
        return { ...uiSeg, isLoading: true, error: null, source: undefined };
      });
      setSegments(newSegments);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps  
  }, [plan, user, familyProfile, isRegenerating, appSettingsLoading]); 


  React.useEffect(() => {
    if (!plan || !user || !familyProfile || segments.length === 0 || appSettingsLoading) return;

    const segmentsToFetch = segments.filter(s => s.isLoading);
    if (segmentsToFetch.length === 0) {
      if (isRegenerating) setIsRegenerating(false);
      return;
    }

    let activeFetches = true;

    const processAllSegments = async () => {
      let newStoredSuggestionsArray: StoredTripSegmentData[] = isRegenerating ? [] : [...(plan.storedSuggestions || [])];
      let wasFirestoreUpdated = false;

      const combinedProfileForAI = `Global Profile: ${familyProfile}. ${plan.tripContext ? `Trip Notes: ${plan.tripContext.trim()}` : `Trip Notes: ${t('noneProvided') || 'None provided.'}`}`;

      const segmentPromises = segmentsToFetch.map(async (uiSegment) => {
        if (!activeFetches) return null; 
        let segmentDataToUse: Partial<TripSegmentSuggestions> = { isLoading: true, error: null };
        try {
          const weather = await fetchWeather(plan.location, uiSegment.date, appSettings.maxApiForecastDays, language);
          segmentDataToUse.weatherData = weather; 

          let clothing: ClothingSuggestionsOutput | null = null;
          let activities: ActivitySuggestionsOutput | null = null;
          let segmentError: string | null = null;

          if (weather) { 
            try {
              clothing = await suggestClothing({ weatherCondition: weather.condition, temperature: weather.temperature, familyProfile: combinedProfileForAI, location: plan.location, language: language });
            } catch (aiError: any) { 
              console.error(`Error fetching clothing suggestions for segment ${uiSegment.id}:`, aiError);
              segmentError = t('outfitSuggestionErrorDefault');
            }
            segmentDataToUse.clothingSuggestions = clothing;
            
            try {
              activities = await suggestActivities({ weatherCondition: weather.condition, temperature: weather.temperature, familyProfile: combinedProfileForAI, timeOfDay: "day", locationPreferences: plan.location, language: language }); 
              
              const serviceBusyMsgEn = "AI suggestion service is currently busy. Please try again in a moment.";
              const serviceBusyMsgTr = t('aiServiceBusy'); 
              
              if (activities && activities.indoorActivities.length === 1 && 
                  (activities.indoorActivities[0] === serviceBusyMsgEn || activities.indoorActivities[0] === serviceBusyMsgTr)) {
                toast({ 
                    title: t('activitySuggestionErrorTitle'),
                    description: activities.indoorActivities[0], 
                    variant: "default" 
                });
                activities = { indoorActivities: [], outdoorActivities: [] }; // Treat as empty
                segmentError = segmentError ? `${segmentError} ${t('aiServiceBusy')}` : t('aiServiceBusy'); // Append or set error
              }

            } catch (aiError: any) { 
              console.error(`Error fetching activity suggestions for segment ${uiSegment.id}:`, aiError);
              if (segmentError) segmentError += ` ${t('activitySuggestionErrorDefault')}`; else segmentError = t('activitySuggestionErrorDefault');
            }
            segmentDataToUse.activitySuggestions = activities;
          } else {
               segmentError = t('weatherDataUnavailableForDay');
          }
          
          segmentDataToUse.isLoading = false;
          segmentDataToUse.error = segmentError;
          segmentDataToUse.source = 'newly-fetched';
          
          if (weather && ( (clothing && activities && segmentError === null) || weather.isGuessed) ) { 
            const newSegmentDataToStore: StoredTripSegmentData = {
              segmentId: uiSegment.id as 'start' | 'middle' | 'end',
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
          segmentDataToUse.error = err.message || t('errorLoadingDataForDay');
          segmentDataToUse.weatherData = null; 
        }
        
        if (activeFetches) {
          setSegments(prev => prev.map(s => s.id === uiSegment.id && s.date.getTime() === uiSegment.date.getTime() ? { ...s, ...segmentDataToUse } : s));
        }
        return null; 
      });

      await Promise.all(segmentPromises);
      if (!activeFetches) return;


      if (wasFirestoreUpdated) {
        try {
          const planDocRef = doc(db, "users", user.uid, "travelPlans", tripId);
          await updateDoc(planDocRef, { storedSuggestions: newStoredSuggestionsArray });
          setPlan(prevPlan => prevPlan ? { ...prevPlan, storedSuggestions: newStoredSuggestionsArray } : null);
          console.log("Successfully updated Firestore with new suggestions.");
          if (isRegenerating) {
            toast({ title: t('suggestionsRegenerated'), description: t('suggestionsRegeneratedDesc')});
          }
        } catch (firestoreError) {
          console.error("Failed to update Firestore with suggestions:", firestoreError);
          toast({ title: t('storageError'), description: t('storageErrorDesc'), variant: "destructive"});
        }
      }
      if (isRegenerating) {
          setIsRegenerating(false);
      }
    };
    
    processAllSegments();

    return () => {
      activeFetches = false; 
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segments, tripId, user, familyProfile, language, t, appSettings.maxApiForecastDays, appSettingsLoading]); 


  const handleRegenerateSuggestions = async () => {
    if (!plan || !user) return;
    const confirmed = window.confirm(t('confirmRegenerate') || "Are you sure you want to regenerate all suggestions for this trip? This will fetch fresh data and overwrite any stored suggestions.");
    if (confirmed) {
        setIsRegenerating(true); 
    }
  };

  const generateShareText = () => {
    if (!plan) return "Plan details are not loaded.";
    if (segments.some(s => s.isLoading || (!s.weatherData && !s.error && !s.weatherData?.isGuessed) )) return "Suggestions are loading or weather data is incomplete for some days.";

    let text = `${t('weatherugoGuide')} - ${t('travelPlans')}: ${plan.tripName} ${t('toLocation')} ${plan.location}\n`;
    text += `${t('dates')}: ${format(parseISO(plan.startDate), "PPP", { locale: dateLocale })} - ${format(parseISO(plan.endDate), "PPP", { locale: dateLocale })}\n`;
    if (plan.tripContext) text += `${t('tripNotes')}: ${plan.tripContext}\n`;
    text += `\n${t('familyProfileUsed')}: ${familyProfile}\n\n`;

    segments.forEach(segment => {
      text += `--- ${segment.label} ---\n`;
      if (segment.weatherData) {
        text += `${t('weather')}: ${segment.weatherData.temperature}°C, ${segment.weatherData.condition} (${segment.weatherData.description})${segment.weatherData.isGuessed ? ` (${t('aiEst')})` : ""}\n`;
        if (segment.weatherData.forecast && segment.weatherData.forecast.length > 0 && !segment.weatherData.isGuessed) {
          text += ` ${t('hourly')}: ${segment.weatherData.forecast.map(f => `${f.time}: ${f.temperature}°C, ${f.condition}`).slice(0,5).join('; ')}...\n`;
        }
        if (segment.clothingSuggestions) text += ` ${t('outfitIdeas')}: ${segment.clothingSuggestions.suggestions.join(", ") || t('na')}\n`;
        else text += ` ${t('outfitIdeas')}: ${t('suggestionsUnavailable')}\n`;
        if (segment.activitySuggestions) {
          text += ` ${t('activityIdeas')}:\n`;
          text += `  ${t('indoor')}: ${segment.activitySuggestions.indoorActivities.join(", ") || t('na')}\n`;
          text += `  ${t('outdoor')}: ${segment.activitySuggestions.outdoorActivities.join(", ") || t('na')}\n\n`;
        } else text += ` ${t('activityIdeas')}: ${t('suggestionsUnavailable')}\n\n`;
      } else if (segment.error) {
         text += `${t('weatherAndSuggestionsUnavailable')}: ${segment.error}\n\n`;
      } else {
         text += `${t('weatherOrSuggestionsLoading')}\n\n`;
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
    toast({ title: t('downloadStarted'), description: t('downloadStartedDesc') });
  };

  const handleShare = async () => {
    const textToShare = generateShareText();
    if (navigator.share) {
      try {
        await navigator.share({ title: `${t('travelSuggestionsFor')} ${plan?.tripName}`, text: textToShare });
        toast({ title: t('sharedSuccessfully') });
      } catch (error) {
        console.error("Error sharing:", error);
        if ((error as DOMException)?.name !== 'AbortError') toast({ title: t('shareFailed'), variant: "destructive" });
      }
    } else {
      navigator.clipboard.writeText(textToShare).then(() => {
        toast({ title: t('copiedToClipboard'), description: t('copiedToClipboardDesc') });
      }).catch(err => {
        toast({ title: t('copyFailed'), description: t('copyFailedDesc'), variant: "destructive" });
      });
    }
  };
  
  const allSegmentsProcessed = segments.length > 0 && segments.every(s => !s.isLoading);
  const someSuggestionsFailed = allSegmentsProcessed && segments.some(s => s.weatherData && (!s.clothingSuggestions || !s.activitySuggestions) && !s.error?.includes(t('weatherDataUnavailableForDay')) && !s.weatherData?.isGuessed);
  const someWeatherFailed = allSegmentsProcessed && segments.some(s => !s.weatherData && s.error && !s.weatherData?.isGuessed);


  if (authIsLoading || overallLoading || appSettingsLoading) {
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
        <CardHeader><CardTitle className="text-xl flex items-center gap-2 text-destructive"><AlertCircle /> {t('error')}</CardTitle></CardHeader>
        <CardContent>
          <p>{pageError}</p>
          <Button onClick={() => router.push('/travelplanner')} className="mt-4"><ArrowLeft className="mr-2 h-4 w-4" /> {t('backToTravelPlans')}</Button>
        </CardContent>
      </Card>
    );
  }

  if (!plan) {
    return (
         <Card className="mt-4 shadow-lg">
            <CardHeader><CardTitle>{t('loadingPlanDetails')}</CardTitle></CardHeader>
            <CardContent><p>{t('loadingPlanDetailsError')}</p>
             <Button onClick={() => router.push('/travelplanner')} className="mt-4"><ArrowLeft className="mr-2 h-4 w-4" /> {t('backToTravelPlans')}</Button>
            </CardContent>
         </Card>
    );
  }
  
  return (
    <div className="space-y-6 py-4">
        <Button variant="outline" onClick={() => router.push('/travelplanner')} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> {t('backToTravelPlans')}
        </Button>

        <Card className="shadow-xl">
            <CardHeader className="bg-primary/10 rounded-t-lg p-6">
                <CardTitle className="text-2xl flex items-center gap-3"><Plane className="text-primary" /> {plan.tripName}</CardTitle>
                <CardDescription className="!mt-1 text-sm space-y-0.5">
                    <span className="flex items-center gap-2"><MapPin size={14}/> {plan.location}</span>
                    <span className="flex items-center gap-2"><CalendarDays size={14}/> {format(parseISO(plan.startDate), "PPP", { locale: dateLocale })} - {format(parseISO(plan.endDate), "PPP", { locale: dateLocale })}</span>
                     <span className="flex items-center gap-2"><Mail size={14}/> {plan.email}</span>
                     <span className="flex items-center gap-2 capitalize"><Repeat size={14}/> {plan.notificationFrequency === 'daily' ? t('daily') : t('weekly')} at {plan.notificationTimeLabel || plan.notificationTime}</span>
                     {plan.tripContext && (<span className="flex items-start gap-2 pt-1"><Info size={14} className="mt-0.5 shrink-0" /> <span className="italic">{plan.tripContext}</span></span>)}
                </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 flex flex-col">
                <h2 className="text-xl font-semibold mb-3">{t('dailyItineraryAISuggestions')}</h2>

                {segments.length === 0 && !overallLoading && ( 
                    <div className="text-center py-8 my-4 border rounded-md bg-card">
                        <Info size={48} className="mx-auto text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">{t('noSuggestionSegments')}</p>
                         <p className="text-xs text-muted-foreground mt-1">{t('noSuggestionSegmentsHint')}</p>
                    </div>
                )}

                {segments.length > 0 && (
                  <Accordion type="multiple" defaultValue={segments.map(s => s.id)} className="w-full space-y-1 p-0 md:p-1 flex-1 min-h-0">
                    {segments.map((segment) => {
                        const WeatherIconToUse = segment.weatherData ? getWeatherIcon(segment.weatherData.conditionCode, segment.weatherData.condition, segment.weatherData.isDay) : CloudSun;
                        const showHourlyForecastSegment = segment.weatherData && !segment.weatherData.isGuessed && segment.weatherData.forecast && segment.weatherData.forecast.length > 0;
                        return (
                        <AccordionItem value={segment.id} key={`${segment.id}-${segment.date.toISOString()}`} className="border-b-0">
                            <AccordionTrigger className="text-lg font-semibold hover:no-underline bg-card hover:bg-muted/80 px-4 py-3 rounded-md border shadow-sm data-[state=open]:rounded-b-none data-[state=open]:border-b-0 pr-3">
                            <span className="flex-1 text-left">{segment.label}</span>
                            {segment.isLoading && <Skeleton className="h-5 w-20 ml-auto" />}
                            {segment.error && !segment.weatherData && <AlertCircle className="h-5 w-5 text-destructive ml-auto" title={t('errorLoadingDataForDay')}/>}
                            {segment.error && segment.weatherData && <Info className="h-5 w-5 text-amber-600 ml-auto" title={t('aiSuggestionErrorForDay')}/>}
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
                                      <AlertTitle>{t('errorLoadingDataForDay')}</AlertTitle>
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
                                                  <p>{t('humidity')}: {segment.weatherData.humidity}%</p><p>{t('wind')}: {segment.weatherData.windSpeed} km/h</p>
                                                  {segment.weatherData.isGuessed && (
                                                       <Popover>
                                                            <PopoverTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    type="button"
                                                                    className="ml-2 mt-1 p-0 h-auto appearance-none focus:outline-none focus:ring-1 focus:ring-amber-500 focus:ring-offset-1 inline-flex items-center text-xs text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full border border-amber-300 cursor-help hover:bg-amber-200"
                                                                    aria-label="AI Estimated Forecast Information"
                                                                >
                                                                    <Info size={12} className="mr-1" /> AI
                                                                </Button>
                                                            </PopoverTrigger>
                                                            <PopoverContent side="bottom" className="max-w-xs bg-background border-border shadow-lg p-3 text-xs">
                                                                <p>{t('aiEstimateTooltip')}</p>
                                                            </PopoverContent>
                                                        </Popover>
                                                  )}
                                              </div>
                                          </div>
                                          
                                          {segment.isLoading && (segment.clothingSuggestions === null || segment.activitySuggestions === null) && ( 
                                              <div className="grid md:grid-cols-2 gap-4 mt-2">
                                                  <div><h4 className="font-semibold mb-1 text-md flex items-center gap-1.5"><Thermometer size={18}/> {t('outfitIdeas')}</h4><Skeleton className="h-10 w-full"/></div>
                                                  <div><h4 className="font-semibold mb-1 text-md flex items-center gap-1.5"><CloudSun size={18}/> {t('activityIdeas')}</h4><Skeleton className="h-10 w-full"/></div>
                                              </div>
                                          )}

                                          {segment.error && (segment.clothingSuggestions === null || segment.activitySuggestions === null) && !segment.isLoading && ( 
                                              <Alert variant="default" className="my-2 border-amber-300 bg-amber-50 text-amber-700 [&>svg~*]:pl-7 [&>svg]:text-amber-600">
                                                  <Info className="h-4 w-4" />
                                                  <AlertTitle className="font-semibold">{t('aiSuggestionErrorForDay')}</AlertTitle>
                                                  <AlertDescription>{segment.error}</AlertDescription>
                                              </Alert>
                                          )}

                                          {(!segment.isLoading || segment.clothingSuggestions || segment.activitySuggestions) && ( 
                                              <div className="grid md:grid-cols-2 gap-4">
                                                  <div>
                                                  <h4 className="font-semibold mb-1 text-md flex items-center gap-1.5"><Thermometer size={18}/> {t('outfitIdeas')}</h4>
                                                  {segment.clothingSuggestions ? (segment.clothingSuggestions.suggestions.length > 0 ? (<ul className="list-disc list-inside space-y-0.5 text-sm pl-1">{segment.clothingSuggestions.suggestions.map((item, index) => (<li key={`cloth-${segment.id}-${index}`}>{item}</li>))}</ul>) : <p className="text-sm text-muted-foreground">{t('noOutfitItemsSuggested')}</p>) : (!segment.isLoading && <p className="text-sm text-muted-foreground">{t('outfitSuggestionsUnavailable')}</p>)}
                                                  {segment.clothingSuggestions?.reasoning && <p className="text-xs text-muted-foreground italic mt-1">{segment.clothingSuggestions.reasoning}</p>}
                                                  </div>
                                                  <div>
                                                  <h4 className="font-semibold mb-1 text-md flex items-center gap-1.5"><CloudSun size={18}/> {t('activityIdeas')}</h4>
                                                  {segment.activitySuggestions ? (<>{segment.activitySuggestions.indoorActivities.length > 0 && (<><p className="text-sm font-medium mt-1 flex items-center gap-1"><Building size={14}/> {t('indoor')}</p><ul className="list-disc list-inside space-y-0.5 text-sm pl-1">{segment.activitySuggestions.indoorActivities.map((item, index) => (<li key={`indoor-${segment.id}-${index}`}>{item}</li>))}</ul></>)}{segment.activitySuggestions.outdoorActivities.length > 0 && (<><p className="text-sm font-medium mt-1 flex items-center gap-1"><Tent size={14}/> {t('outdoor')}</p><ul className="list-disc list-inside space-y-0.5 text-sm pl-1">{segment.activitySuggestions.outdoorActivities.map((item, index) => (<li key={`outdoor-${segment.id}-${index}`}>{item}</li>))}</ul></>)}{(segment.activitySuggestions.indoorActivities.length === 0 && segment.activitySuggestions.outdoorActivities.length === 0) && (<p className="text-sm text-muted-foreground">{t('noActivitiesSuggested')}</p>)}</>) : (!segment.isLoading && <p className="text-sm text-muted-foreground">{t('activitySuggestionsUnavailable')}</p>)}
                                                  </div>
                                              </div>
                                          )}
                                      </div>
                                       {showHourlyForecastSegment && (
                                        <HourlyForecastCard
                                          forecastData={segment.weatherData.forecast}
                                          isLoading={segment.isLoading && !segment.weatherData.forecast}
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
                        <AlertTitle className="font-semibold">{t('partialData')}</AlertTitle>
                        <AlertDescription>
                        { someWeatherFailed ? t('partialDataWeatherError') : t('partialDataAIError')}
                        </AlertDescription>
                    </Alert>
                )}

                <div className="flex justify-end space-x-2 mt-6 pt-6 border-t">
                    <Button variant="outline" onClick={handleRegenerateSuggestions} disabled={segments.length === 0 || isRegenerating || overallLoading || pageError !== null || segments.some(s => s.isLoading)}>
                        <RefreshCw className="mr-2 h-4 w-4" /> {isRegenerating ? t('regenerating') : t('regenerateAllSuggestions')}
                    </Button>
                    <Button onClick={handleDownload} disabled={!allSegmentsProcessed || segments.length === 0 || isRegenerating}><Download className="mr-2 h-4 w-4" /> {t('download')}</Button>
                    <Button onClick={handleShare} disabled={!allSegmentsProcessed || segments.length === 0 || isRegenerating}><Share2 className="mr-2 h-4 w-4" /> {t('share')}</Button>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}

