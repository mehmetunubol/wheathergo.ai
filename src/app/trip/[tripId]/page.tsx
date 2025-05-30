
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
import type { TravelPlanItem, WeatherData, TripSegmentSuggestions as TripSegmentSuggestionsType, StoredTripSegmentData, Language, TranslationKey, User, DailyUsage } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { getWeatherIcon } from "@/components/icons";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, runTransaction } from "firebase/firestore";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useLanguage } from "@/contexts/language-context";
import { useTranslation } from "@/hooks/use-translation";
import { useAppSettings } from "@/contexts/app-settings-context";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface ExtendedTripSegmentSuggestions extends TripSegmentSuggestionsType {
  isPristine: boolean; 
}

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
  
  const [segments, setSegments] = React.useState<ExtendedTripSegmentSuggestions[]>([]);
  
  const [overallLoading, setOverallLoading] = React.useState(true);
  const [pageError, setPageError] = React.useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = React.useState(false);
  const [tripDetailLimitReachedForPage, setTripDetailLimitReachedForPage] = React.useState(false);

  const { toast } = useToast();

  const getUniqueDateSegments = React.useCallback((currentPlan: TravelPlanItem | null): ExtendedTripSegmentSuggestions[] => {
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
    
    const segmentsMap = new Map<string, ExtendedTripSegmentSuggestions>();

    const addOrUpdateSegment = (date: Date, id: 'start' | 'middle' | 'end', labelPrefixKey: TranslationKey) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const label = `${t(labelPrefixKey)} (${format(date, "MMM d, yyyy", { locale: dateLocale })})`;
        
        const existingSegment = segmentsMap.get(dateStr);
        const priorityOrder = { start: 1, middle: 2, end: 3 };

        if (!existingSegment || priorityOrder[id] < priorityOrder[existingSegment.id as 'start' | 'middle' | 'end']) {
            segmentsMap.set(dateStr, {
              date: date,
              id: id,
              label: label,
              weatherData: null, clothingSuggestions: null, activitySuggestions: null, 
              isLoading: false, 
              error: null, 
              source: undefined,
              isPristine: true, 
            });
        }
    };
    
    addOrUpdateSegment(parsedStartDate, 'start', 'startOfTripLabel');

    if (duration >= 2) { 
      const middleOffset = Math.floor(duration / 2.0);
      const middleDateCand = startOfDay(addDays(parsedStartDate, middleOffset));
      if (!isSameDay(middleDateCand, parsedStartDate) && !isSameDay(middleDateCand, parsedEndDate)) {
         addOrUpdateSegment(middleDateCand, 'middle', 'middleOfTripLabel');
      }
    }
    
    if (!isSameDay(parsedEndDate, parsedStartDate)) {
      addOrUpdateSegment(parsedEndDate, 'end', 'endOfTripLabel');
    }
    
    return Array.from(segmentsMap.values())
                .sort((a, b) => a.date.getTime() - b.date.getTime());

  }, [t, dateLocale]);

  const checkAndUpdateTripSegmentUsage = React.useCallback(async (): Promise<boolean> => {
    if (!isAuthenticated || !user || appSettingsLoading) return false; 

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const limits = user.isPremium ? appSettings.premiumTierLimits : appSettings.freeTierLimits;
    const currentLimit = limits.dailyTripDetailsSuggestions;
    
    const userDocRef = doc(db, "users", user.uid);
    try {
      const userDocSnap = await getDoc(userDocRef); 
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data() as User;
        const usage = userData.dailyTripDetailsSuggestions || { count: 0, date: '' };
        if (usage.date === todayStr && usage.count >= currentLimit) {
          setTripDetailLimitReachedForPage(true); 
          return false; 
        }
      }
      return true; 
    } catch (error) {
      console.error("Error checking dailyTripDetailsSuggestions limit:", error);
      toast({ title: t('error'), description: "Could not verify usage limits.", variant: "destructive" });
      return false; 
    }
  }, [isAuthenticated, user, appSettings, appSettingsLoading, toast, t]);

  const incrementTripSegmentUsage = React.useCallback(async () => {
    if (!isAuthenticated || !user) return;

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const userDocRef = doc(db, "users", user.uid);
    try {
      await runTransaction(db, async (transaction) => {
        const userDocSnap = await transaction.get(userDocRef);
        if (!userDocSnap.exists()) throw "User document does not exist!";
        const userData = userDocSnap.data() as User;
        const currentUsage = userData.dailyTripDetailsSuggestions || { count: 0, date: '' };
        const newCount = currentUsage.date === todayStr ? currentUsage.count + 1 : 1;
        transaction.update(userDocRef, { dailyTripDetailsSuggestions: { count: newCount, date: todayStr } });
      });
    } catch (error) {
      console.error("Error updating dailyTripDetailsSuggestions count:", error);
    }
  }, [isAuthenticated, user]);

  React.useEffect(() => {
    const loadTripData = async () => {
      if (authIsLoading || !tripId || appSettingsLoading) return;

      if (!isAuthenticated || !user) {
        setPageError(t('loginToManageTravelPlans'));
        setOverallLoading(false);
        return;
      }

      setOverallLoading(true);
      setTripDetailLimitReachedForPage(false); 
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
    if (isRegenerating) return; 

    const baseUiSegments = getUniqueDateSegments(plan);
    const newSegments = baseUiSegments.map(uiSeg => {
      const stored = plan.storedSuggestions?.find(ss => ss.segmentId === uiSeg.id && isValid(parseISO(ss.date)) && isSameDay(parseISO(ss.date), uiSeg.date));
      if (stored) {
        return {
          ...uiSeg,
          weatherData: stored.weatherData,
          clothingSuggestions: stored.clothingSuggestions,
          activitySuggestions: stored.activitySuggestions,
          isLoading: false,
          error: null,
          source: 'stored' as const,
          isPristine: false,
        };
      }
      return { ...uiSeg, isLoading: false, isPristine: true, weatherData: null, clothingSuggestions: null, activitySuggestions: null, error: null, source: undefined };
    });
    setSegments(newSegments);
  // eslint-disable-next-line react-hooks/exhaustive-deps  
  }, [plan, user, familyProfile, appSettingsLoading, getUniqueDateSegments]);

  React.useEffect(() => {
    if (authIsLoading || appSettingsLoading || !plan || !user || !familyProfile) {
      if (isRegenerating && (!plan || !user || !familyProfile)) {
        setIsRegenerating(false);
      }
      return;
    }
  
    let activeFetches = true;
    const combinedProfileForAI = `Global Profile: ${familyProfile}. ${plan.tripContext ? `Trip Notes: ${plan.tripContext.trim()}` : `Trip Notes: ${t('noneProvided') || 'None provided.'}`}`;
  
    if (isRegenerating) {
      const regenerateAllData = async () => {
        const baseUiSegments = getUniqueDateSegments(plan);
        if (baseUiSegments.length === 0) {
          setSegments([]);
          setIsRegenerating(false);
          toast({ title: t('suggestionsRegenerated'), description: "No segments to regenerate." });
          return;
        }
  
        setSegments(baseUiSegments.map(s => ({ ...s, isLoading: true, isPristine: false, error: null, weatherData: null, clothingSuggestions: null, activitySuggestions: null, source: 'newly-fetched' })));
  
        const allSegmentPromises = baseUiSegments.map(async (uiSegment) => {
          const canFetchAISuggestionsForThisSegment = await checkAndUpdateTripSegmentUsage();
          if (!canFetchAISuggestionsForThisSegment) {
            return {
              ...uiSegment, isLoading: false, error: t('dailyTripDetailsSuggestionsLimitReached'),
              weatherData: null, clothingSuggestions: null, activitySuggestions: null,
              source: 'limit-reached' as const, isPristine: false,
            };
          }
  
          try {
            const weather = await fetchWeather(plan.location, uiSegment.date, appSettings.maxApiForecastDays, language);
            let clothing: ClothingSuggestionsOutput | null = null;
            let activities: ActivitySuggestionsOutput | null = null;
            let segmentError: string | null = null;
  
            if (weather) {
              try { clothing = await suggestClothing({ weatherCondition: weather.condition, temperature: weather.temperature, familyProfile: combinedProfileForAI, location: plan.location, language: language }); } catch (aiError: any) { segmentError = t('outfitSuggestionErrorDefault'); }
              try { 
                activities = await suggestActivities({ weatherCondition: weather.condition, temperature: weather.temperature, familyProfile: combinedProfileForAI, timeOfDay: "day", locationPreferences: plan.location, language: language });
                const serviceBusyMsgEn = "AI suggestion service is currently busy. Please try again in a moment.";
                const serviceBusyMsgTr = t('aiServiceBusy');
                if (activities && activities.indoorActivities.length === 1 && (activities.indoorActivities[0] === serviceBusyMsgEn || activities.indoorActivities[0] === serviceBusyMsgTr)) {
                  toast({ title: t('activitySuggestionErrorTitle'), description: activities.indoorActivities[0], variant: "default" });
                  activities = { indoorActivities: [], outdoorActivities: [] };
                  segmentError = segmentError ? `${segmentError} ${t('aiServiceBusy')}` : t('aiServiceBusy');
                }
              } catch (aiError: any) { if (segmentError) segmentError += ` ${t('activitySuggestionErrorDefault')}`; else segmentError = t('activitySuggestionErrorDefault'); }
              
              if (weather && (clothing || activities || weather.isGuessed)) { await incrementTripSegmentUsage(); }
  
              return { ...uiSegment, weatherData: weather, clothingSuggestions: clothing, activitySuggestions: activities, isLoading: false, error: segmentError, source: 'newly-fetched' as const, isPristine: false };
            } else {
              return { ...uiSegment, isLoading: false, error: t('weatherDataUnavailableForDay'), weatherData: null, clothingSuggestions: null, activitySuggestions: null, isPristine: false, source: 'newly-fetched' as const };
            }
          } catch (err: any) {
            return { ...uiSegment, isLoading: false, error: err.message || t('errorLoadingDataForDay'), weatherData: null, clothingSuggestions: null, activitySuggestions: null, isPristine: false, source: 'newly-fetched' as const };
          }
        });
  
        const results = await Promise.all(allSegmentPromises);
        if (!activeFetches) return;
  
        setSegments(results);
  
        const newStoredSuggestionsArray = results
          .filter(r => r.weatherData && (r.clothingSuggestions || r.activitySuggestions || r.weatherData?.isGuessed) && !r.error && r.source !== 'limit-reached')
          .map(r => ({
            segmentId: r.id as 'start' | 'middle' | 'end', date: r.date.toISOString(),
            weatherData: r.weatherData!, clothingSuggestions: r.clothingSuggestions!, activitySuggestions: r.activitySuggestions!,
            fetchedAt: new Date().toISOString(),
          }));
  
        if (newStoredSuggestionsArray.length > 0 || baseUiSegments.length > 0) { 
          try {
            const planDocRef = doc(db, "users", user.uid, "travelPlans", tripId);
            await updateDoc(planDocRef, { storedSuggestions: newStoredSuggestionsArray });
            setPlan(prevPlan => prevPlan ? { ...prevPlan, storedSuggestions: newStoredSuggestionsArray } : null);
          } catch (firestoreError) {
            console.error("Failed to update Firestore with regenerated suggestions:", firestoreError);
            toast({ title: t('storageError'), description: t('storageErrorDesc'), variant: "destructive"});
          }
        }
        setIsRegenerating(false);
        toast({ title: t('suggestionsRegenerated'), description: t('suggestionsRegeneratedDesc')});
      };
      regenerateAllData();
    } else { 
      const segmentsToFetch = segments.filter(s => s.isLoading && !s.isPristine);
      if (segmentsToFetch.length === 0) return;
  
      const fetchIndividualSegment = async (uiSegment: ExtendedTripSegmentSuggestions) => {
        const canFetchAISuggestionsForThisSegment = await checkAndUpdateTripSegmentUsage();
        if (!canFetchAISuggestionsForThisSegment) {
          if(activeFetches) setSegments(prev => prev.map(s => s.id === uiSegment.id && s.date.getTime() === uiSegment.date.getTime() ? { ...s, isLoading: false, error: t('dailyTripDetailsSuggestionsLimitReached'), source: 'limit-reached', isPristine: false } : s));
          return;
        }
  
        let segmentDataToUse: Partial<ExtendedTripSegmentSuggestions> = { isLoading: true, error: null };
        try {
          const weather = await fetchWeather(plan.location, uiSegment.date, appSettings.maxApiForecastDays, language);
          segmentDataToUse.weatherData = weather;
          let clothing: ClothingSuggestionsOutput | null = null;
          let activities: ActivitySuggestionsOutput | null = null;
          let segmentError: string | null = null;
  
          if (weather) {
            try { clothing = await suggestClothing({ weatherCondition: weather.condition, temperature: weather.temperature, familyProfile: combinedProfileForAI, location: plan.location, language: language }); } catch (e:any) { segmentError = segmentError ? `${segmentError} ${t('outfitSuggestionErrorDefault')}` : t('outfitSuggestionErrorDefault'); }
            try { 
              activities = await suggestActivities({ weatherCondition: weather.condition, temperature: weather.temperature, familyProfile: combinedProfileForAI, timeOfDay: "day", locationPreferences: plan.location, language: language });
              const serviceBusyMsgEn = "AI suggestion service is currently busy. Please try again in a moment.";
              const serviceBusyMsgTr = t('aiServiceBusy');
              if (activities && activities.indoorActivities.length === 1 && (activities.indoorActivities[0] === serviceBusyMsgEn || activities.indoorActivities[0] === serviceBusyMsgTr)) {
                toast({ title: t('activitySuggestionErrorTitle'), description: activities.indoorActivities[0], variant: "default" });
                activities = { indoorActivities: [], outdoorActivities: [] };
                segmentError = segmentError ? `${segmentError} ${t('aiServiceBusy')}` : t('aiServiceBusy');
              }
            } catch (e:any) { segmentError = segmentError ? `${segmentError} ${t('activitySuggestionErrorDefault')}` : t('activitySuggestionErrorDefault'); }
            if (weather && (clothing || activities || weather.isGuessed)) { await incrementTripSegmentUsage(); }
          } else { segmentError = t('weatherDataUnavailableForDay'); }
          
          segmentDataToUse = { ...segmentDataToUse, clothingSuggestions: clothing, activitySuggestions: activities, isLoading: false, error: segmentError, source: 'newly-fetched', isPristine: false };
  
          if (weather && (clothing || activities || weather.isGuessed) && !segmentError && activeFetches) {
            const newStoredSegment: StoredTripSegmentData = { segmentId: uiSegment.id as any, date: uiSegment.date.toISOString(), weatherData: weather, clothingSuggestions: clothing!, activitySuggestions: activities!, fetchedAt: new Date().toISOString() };
            const currentStored = plan.storedSuggestions || [];
            const existingIndex = currentStored.findIndex(s => s.segmentId === uiSegment.id && isSameDay(parseISO(s.date), uiSegment.date));
            let newFullStoredArray;
            if (existingIndex > -1) {
              newFullStoredArray = [...currentStored];
              newFullStoredArray[existingIndex] = newStoredSegment;
            } else {
              newFullStoredArray = [...currentStored, newStoredSegment];
            }
            const planDocRef = doc(db, "users", user.uid, "travelPlans", tripId);
            await updateDoc(planDocRef, { storedSuggestions: newFullStoredArray });
            if(activeFetches) setPlan(prevPlan => prevPlan ? { ...prevPlan, storedSuggestions: newFullStoredArray } : null);
          }
        } catch (err: any) {
          segmentDataToUse = { isLoading: false, error: err.message || t('errorLoadingDataForDay'), weatherData: null, isPristine: false };
        }
        if(activeFetches) setSegments(prev => prev.map(s => s.id === uiSegment.id && s.date.getTime() === uiSegment.date.getTime() ? { ...s, ...segmentDataToUse } : s));
      };
      segmentsToFetch.forEach(fetchIndividualSegment);
    }
    return () => { activeFetches = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, user, familyProfile, isRegenerating, language, appSettingsLoading, appSettings.maxApiForecastDays, t, toast, getUniqueDateSegments, checkAndUpdateTripSegmentUsage, incrementTripSegmentUsage]);

  const handleRegenerateSuggestions = async () => {
    if (!plan || !user) return;
    // const confirmed = window.confirm(t('confirmRegenerate') || "Are you sure you want to regenerate all suggestions for this trip? This will fetch fresh data and overwrite any stored suggestions.");
    // if (confirmed) { // Removed confirm to avoid sandbox issues
        setTripDetailLimitReachedForPage(false); 
        setIsRegenerating(true); 
    // }
  };

  const handleAccordionTriggerClick = (segmentToLoad: ExtendedTripSegmentSuggestions) => {
    if (segmentToLoad.isPristine && !segmentToLoad.isLoading && !segmentToLoad.error && !isRegenerating) {
      setSegments(prevSegments =>
        prevSegments.map(s =>
          s.id === segmentToLoad.id && s.date.getTime() === segmentToLoad.date.getTime()
            ? { ...s, isLoading: true, isPristine: false } 
            : s
        )
      );
    }
  };

  const generateShareText = () => {
    if (!plan) return t('sharePlanDetailsNotLoaded');
    if (segments.some(s => s.isLoading || (s.isPristine && !s.error) )) return t('shareSuggestionsLoadingOrIncomplete');

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
      } else if (segment.isPristine) {
         text += `${t('suggestionsNotLoadedYet')}\n\n`;
      }
      else {
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
  
  const allSegmentsProcessedOrStored = segments.length > 0 && segments.every(s => !s.isLoading && (!s.isPristine || s.source === 'stored' || s.error));
  const someSuggestionsFailed = allSegmentsProcessedOrStored && segments.some(s => s.weatherData && (!s.clothingSuggestions || !s.activitySuggestions) && !s.error?.includes(t('weatherDataUnavailableForDay')) && !s.weatherData?.isGuessed && s.source !== 'limit-reached' && !s.isPristine);
  const someWeatherFailed = allSegmentsProcessedOrStored && segments.some(s => !s.weatherData && s.error && !s.weatherData?.isGuessed && s.source !== 'limit-reached' && !s.isPristine);

  if (authIsLoading || overallLoading || appSettingsLoading) {
     return (
        <div className="container mx-auto max-w-2xl p-4 space-y-4 mt-4 py-4">
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
      <div className="container mx-auto max-w-2xl p-4">
        <Card className="mt-4 shadow-lg">
          <CardHeader><CardTitle className="text-xl flex items-center gap-2 text-destructive"><AlertCircle /> {t('error')}</CardTitle></CardHeader>
          <CardContent>
            <p>{pageError}</p>
            <Button onClick={() => router.push('/travelplanner')} className="mt-4"><ArrowLeft className="mr-2 h-4 w-4" /> {t('backToTravelPlans')}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="container mx-auto max-w-2xl p-4">
         <Card className="mt-4 shadow-lg">
            <CardHeader><CardTitle>{t('loadingPlanDetails')}</CardTitle></CardHeader>
            <CardContent><p>{t('loadingPlanDetailsError')}</p>
             <Button onClick={() => router.push('/travelplanner')} className="mt-4"><ArrowLeft className="mr-2 h-4 w-4" /> {t('backToTravelPlans')}</Button>
            </CardContent>
         </Card>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto max-w-2xl p-4 space-y-6 py-4">
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
                {tripDetailLimitReachedForPage && (
                    <Alert variant="destructive" className="mb-4">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>{t('limitReachedTitle')}</AlertTitle>
                        <AlertDescription>{t('dailyTripDetailsSuggestionsLimitReached')}</AlertDescription>
                    </Alert>
                )}
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
                            <AccordionTrigger
                              onClick={() => handleAccordionTriggerClick(segment)}
                              className="text-lg font-semibold hover:no-underline bg-card hover:bg-muted/80 px-4 py-3 rounded-md border shadow-sm data-[state=open]:rounded-b-none data-[state=open]:border-b-0 pr-3"
                            >
                            <span className="flex-1 text-left">{segment.label}</span>
                            {segment.isLoading && <Skeleton className="h-5 w-20 ml-auto" />}
                            {segment.error && !segment.weatherData && segment.source !== 'limit-reached' && <AlertCircle className="h-5 w-5 text-destructive ml-auto" title={t('errorLoadingDataForDay')}/>}
                            {segment.error && segment.source === 'limit-reached' && <AlertTriangle className="h-5 w-5 text-amber-600 ml-auto" title={t('dailyTripDetailsSuggestionsLimitReached')}/>}
                            {segment.error && segment.weatherData && segment.source !== 'limit-reached' && <Info className="h-5 w-5 text-amber-600 ml-auto" title={t('aiSuggestionErrorForDay')}/>}
                            {segment.isPristine && !segment.isLoading && !segment.error && <span className="text-xs text-muted-foreground ml-auto">{t('clickToLoadSuggestions')}</span>}
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
                                    <Alert variant={segment.source === 'limit-reached' ? "default" : "destructive"} className={`my-2 ${segment.source === 'limit-reached' ? 'border-amber-300 bg-amber-50 text-amber-700 [&>svg~*]:pl-7 [&>svg]:text-amber-600' : ''}`}>
                                      {segment.source === 'limit-reached' ? <AlertTriangle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" /> }
                                      <AlertTitle>{segment.source === 'limit-reached' ? t('limitReachedTitle') : t('errorLoadingDataForDay')}</AlertTitle>
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
                                                                    aria-label={t('aiEstimateTooltip')}
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
                                                  <AlertTitle className="font-semibold">{segment.source === 'limit-reached' ? t('limitReachedTitle') : t('aiSuggestionErrorForDay')}</AlertTitle>
                                                  <AlertDescription>{segment.error}</AlertDescription>
                                              </Alert>
                                          )}

                                          {(!segment.isLoading || segment.clothingSuggestions || segment.activitySuggestions) && segment.source !== 'limit-reached' && !segment.isPristine && ( 
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
                                          {segment.isPristine && !segment.isLoading && !segment.error && (
                                            <div className="text-center py-4 text-muted-foreground">
                                                <p>{t('expandToLoadContent')}</p>
                                            </div>
                                          )}
                                      </div>
                                       {showHourlyForecastSegment && segment.weatherData?.forecast && (
                                        <div className="pt-2 mt-2 border-t">
                                            <h4 className="text-sm font-semibold mb-1.5 flex items-center gap-1.5">
                                                <Clock size={14} className="text-primary" /> {t('hourlyForecastForDate', { date: format(segment.date, "MMM d", { locale: dateLocale }) })}
                                            </h4>
                                            <ScrollArea className="w-full whitespace-nowrap">
                                                <div className="flex space-x-2 pb-1">
                                                {segment.weatherData.forecast.map((item, idx) => {
                                                    const itemIsDay = typeof item.isDay === 'boolean' ? item.isDay : true;
                                                    const ItemIcon = getWeatherIcon(item.conditionCode, item.condition, itemIsDay);
                                                    let displayTime = item.time;
                                                     try {
                                                        const parsedItemTime = parseISO(item.time);
                                                        if (isValid(parsedItemTime)) {
                                                        displayTime = format(parsedItemTime, "h a", { locale: dateLocale });
                                                        }
                                                    } catch (e) { /* fallback */ }
                                                    return (
                                                    <div key={`hourly-trip-${segment.id}-${idx}`} className="flex flex-col items-center space-y-0.5 p-1.5 border rounded-md min-w-[60px] bg-background/30 shadow-sm text-center">
                                                        <p className="text-xs text-muted-foreground">{displayTime}</p>
                                                        <ItemIcon size={20} className="text-accent" data-ai-hint={`${item.condition} weather ${itemIsDay ? "day" : "night"}`} />
                                                        <p className="text-xs font-semibold">{item.temperature}°C</p>
                                                    </div>
                                                    );
                                                })}
                                                </div>
                                                <ScrollBar orientation="horizontal" />
                                            </ScrollArea>
                                        </div>
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

                {(allSegmentsProcessedOrStored && (someSuggestionsFailed || someWeatherFailed)) && (
                     <Alert variant="default" className="mt-4 border-amber-300 bg-amber-50 text-amber-700 [&>svg~*]:pl-7 [&>svg]:text-amber-600">
                        <Info className="h-4 w-4" />
                        <AlertTitle className="font-semibold">{t('partialData')}</AlertTitle>
                        <AlertDescription>
                        { someWeatherFailed ? t('partialDataWeatherError') : t('partialDataAIError')}
                        </AlertDescription>
                    </Alert>
                )}

                <div className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-2 md:justify-end mt-6 pt-6 border-t">
                    <Button
                        variant="outline"
                        className="w-full md:w-auto"
                        onClick={handleRegenerateSuggestions}
                        disabled={segments.length === 0 || isRegenerating || overallLoading || pageError !== null || segments.some(s => s.isLoading)}
                    >
                        <RefreshCw className="mr-2 h-4 w-4" /> {isRegenerating ? t('regenerating') : t('regenerateAllSuggestions')}
                    </Button>
                    <Button
                        className="w-full md:w-auto"
                        onClick={handleDownload}
                        disabled={!allSegmentsProcessedOrStored || segments.length === 0 || isRegenerating}
                    >
                        <Download className="mr-2 h-4 w-4" /> {t('download')}
                    </Button>
                    <Button
                        className="w-full md:w-auto"
                        onClick={handleShare}
                        disabled={!allSegmentsProcessedOrStored || segments.length === 0 || isRegenerating}
                    >
                        <Share2 className="mr-2 h-4 w-4" /> {t('share')}
                    </Button>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}


