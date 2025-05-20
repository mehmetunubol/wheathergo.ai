

"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Download, Share2, Plane, CalendarDays, MapPin, Info, CloudSun, Thermometer, ArrowLeft } from "lucide-react";
import { format, parseISO, differenceInCalendarDays, addDays, startOfDay, isWithinInterval, isBefore, isSameDay } from "date-fns";
import { fetchWeather } from "@/lib/weather-api";
import { suggestClothing, type ClothingSuggestionsOutput } from "@/ai/flows/clothing-suggestions";
import { suggestActivities, type ActivitySuggestionsOutput } from "@/ai/flows/activity-suggestions";
import type { TravelPlanItem, WeatherData, TripSegmentSuggestions } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { getWeatherIcon } from "@/components/icons";

const DEFAULT_FAMILY_PROFILE_FOR_SUGGESTIONS = "An adult traveler.";

export default function TripDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.tripId as string;

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

    const potentialSegments: { date: Date; id: 'start' | 'middle' | 'end'; labelPrefix: string }[] = [];

    potentialSegments.push({ date: startDate, id: 'start', labelPrefix: 'Start of Trip' });

    if (duration >= 2) { 
      const middleOffset = Math.floor(duration / 2.0);
      const middleDateCand = startOfDay(addDays(startDate, middleOffset));
      if (!isSameDay(middleDateCand, startDate) && !isSameDay(middleDateCand, endDate)) {
        potentialSegments.push({ date: middleDateCand, id: 'middle', labelPrefix: 'Middle of Trip' });
      }
    }
    
    if (!isSameDay(endDate, startDate)) {
      potentialSegments.push({ date: endDate, id: 'end', labelPrefix: 'End of Trip' });
    }
    
    const uniqueSegmentsMap = new Map<string, { date: Date; id: 'start' | 'middle' | 'end'; labelPrefix: string }>();
    potentialSegments.forEach(segment => {
        const dateStr = format(segment.date, 'yyyy-MM-dd');
        if (!uniqueSegmentsMap.has(dateStr)) { 
            uniqueSegmentsMap.set(dateStr, segment);
        } else {
            // If date is already present, ensure 'start' or 'end' id takes precedence if applicable
            // This handles cases where middle date might be same as start/end for short trips if logic was different
            if (segment.id === 'start' && uniqueSegmentsMap.get(dateStr)?.id !== 'start') {
                 uniqueSegmentsMap.set(dateStr, segment);
            } else if (segment.id === 'end' && uniqueSegmentsMap.get(dateStr)?.id !== 'end') {
                 uniqueSegmentsMap.set(dateStr, segment);
            }
        }
    });

    return Array.from(uniqueSegmentsMap.values())
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map(dp => ({
        id: dp.id,
        label: `${dp.labelPrefix} (${format(dp.date, "MMM d, yyyy")})`,
        date: dp.date,
        weatherData: null,
        clothingSuggestions: null,
        activitySuggestions: null,
        isLoading: true,
        error: null,
      }));

  }, [plan]);

  React.useEffect(() => {
    if (!tripId) {
      setPageError("Trip ID is missing.");
      setOverallLoading(false);
      return;
    }

    const storedFamilyProfile = localStorage.getItem("weatherwise-familyProfile");
    if (storedFamilyProfile) setFamilyProfile(storedFamilyProfile);

    const storedTravelPlans = localStorage.getItem("weatherwise-travel-plans");
    if (storedTravelPlans) {
      try {
        const parsedPlans = JSON.parse(storedTravelPlans) as TravelPlanItem[];
        const currentPlan = parsedPlans.find(p => p.id === tripId);
        if (currentPlan) {
          setPlan(currentPlan);
        } else {
          setPageError("Travel plan not found.");
          setOverallLoading(false);
        }
      } catch (error) {
        console.error("Failed to parse travel plans:", error);
        setPageError("Error loading travel plan data.");
        setOverallLoading(false);
      }
    } else {
      setPageError("No travel plans found in storage.");
      setOverallLoading(false);
    }
  }, [tripId]);


  React.useEffect(() => {
    if (!plan) return;

    const initialSegments = getUniqueDateSegments();
    setSegments(initialSegments);
    
    if (initialSegments.length === 0) {
        setOverallLoading(false);
        return;
    }
    setOverallLoading(true); 

    const fetchAllSegmentData = async () => {
      const promises = initialSegments.map(async (segment) => {
        try {
          const weather = await fetchWeather(plan.location, segment.date);
          setSegments(prev => prev.map(s => s.id === segment.id ? { ...s, weatherData: weather } : s));

          const clothingInput = {
            weatherCondition: weather.condition,
            temperature: weather.temperature,
            familyProfile: familyProfile,
            location: plan.location,
          };
          const clothing = await suggestClothing(clothingInput);
          setSegments(prev => prev.map(s => s.id === segment.id ? { ...s, clothingSuggestions: clothing } : s));
          
          const activityInput = {
            weatherCondition: weather.condition,
            temperature: weather.temperature,
            familyProfile: familyProfile,
            timeOfDay: "day", 
            locationPreferences: plan.location,
          };
          const activities = await suggestActivities(activityInput);
          setSegments(prev => prev.map(s => s.id === segment.id ? { ...s, activitySuggestions: activities, isLoading: false } : s));
          return { ...segment, weatherData: weather, clothingSuggestions: clothing, activitySuggestions: activities, isLoading: false, error: null };
        } catch (err: any) {
          console.error(`Error fetching data for segment ${segment.id} (${format(segment.date, "yyyy-MM-dd")}):`, err);
          const userFriendlyMessage = "AI suggestions are currently unavailable for this day. Please try again later.";
          setSegments(prev => prev.map(s => s.id === segment.id ? { ...s, error: userFriendlyMessage, isLoading: false } : s));
          return { ...segment, error: userFriendlyMessage, isLoading: false };
        }
      });
      
      await Promise.all(promises);
      setOverallLoading(false);
    };
    
    fetchAllSegmentData();

  }, [plan, familyProfile, getUniqueDateSegments]);


  const generateShareText = () => {
    if (!plan || segments.some(s => s.isLoading || s.error)) return "Suggestions are loading or incomplete.";
    
    let text = `WeatherWise Guide - Travel Plan: ${plan.tripName} to ${plan.location}\n`;
    text += `Dates: ${format(parseISO(plan.startDate), "PPP")} - ${format(parseISO(plan.endDate), "PPP")}\n\n`;

    segments.forEach(segment => {
      if (segment.weatherData && segment.clothingSuggestions && segment.activitySuggestions) {
        text += `--- ${segment.label} ---\n`;
        text += `Weather: ${segment.weatherData.temperature}°C, ${segment.weatherData.condition} (${segment.weatherData.description})\n`;
        text += `Outfit Ideas: ${segment.clothingSuggestions.suggestions.join(", ") || "N/A"}\n`;
        text += `Activity Ideas:\n`;
        text += `  Indoor: ${segment.activitySuggestions.indoorActivities.join(", ") || "N/A"}\n`;
        text += `  Outdoor: ${segment.activitySuggestions.outdoorActivities.join(", ") || "N/A"}\n\n`;
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
        await navigator.share({
          title: `Travel Suggestions for ${plan?.tripName}`,
          text: textToShare,
        });
        toast({ title: "Shared Successfully" });
      } catch (error) {
        console.error("Error sharing:", error);
        toast({ title: "Share Canceled or Failed", variant: "destructive" });
      }
    } else {
      navigator.clipboard.writeText(textToShare).then(() => {
        toast({ title: "Copied to Clipboard", description: "Suggestions copied. Web Share API not available." });
      }).catch(err => {
        toast({ title: "Copy Failed", description: "Could not copy suggestions to clipboard.", variant: "destructive" });
      });
    }
  };
  
  const allSegmentsLoadedSuccessfully = !overallLoading && segments.length > 0 && segments.every(s => !s.isLoading && !s.error);

  if (pageError) {
    return (
      <Card className="mt-4 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2 text-destructive">
            <AlertCircle /> Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>{pageError}</p>
          <Button onClick={() => router.push('/notifications')} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Travel Plans
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!plan && overallLoading) {
     return (
        <div className="space-y-4 mt-4">
            <Skeleton className="h-12 w-1/2" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
        </div>
     );
  }
  
  if (!plan) { 
    return (
         <Card className="mt-4 shadow-lg">
            <CardHeader><CardTitle>Loading Plan...</CardTitle></CardHeader>
            <CardContent><p>If this takes too long, the plan might not exist or there was an issue.</p>
             <Button onClick={() => router.push('/notifications')} className="mt-4">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Travel Plans
            </Button>
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
            <CardHeader className="bg-primary/10 rounded-t-lg">
                <CardTitle className="text-2xl flex items-center gap-3">
                    <Plane className="text-primary" /> {plan.tripName}
                </CardTitle>
                <CardDescription className="!mt-1">
                    <span className="flex items-center gap-2"><MapPin size={14}/> {plan.location}</span>
                    <span className="flex items-center gap-2"><CalendarDays size={14}/> 
                    {format(parseISO(plan.startDate), "PPP")} - {format(parseISO(plan.endDate), "PPP")}
                    </span>
                </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
                <h2 className="text-xl font-semibold mb-3">Daily Itinerary & Suggestions</h2>
                
                {overallLoading && segments.length === 0 && (
                  <div className="space-y-3 p-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                )}

                {!overallLoading && segments.length === 0 && (
                    <div className="text-center py-8 my-4 border rounded-md bg-card">
                        <Info size={48} className="mx-auto text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">No suggestion segments to display for this trip duration.</p>
                        <p className="text-xs text-muted-foreground mt-1">This might happen for very short trips.</p>
                    </div>
                )}

                {segments.length > 0 && (
                    <Accordion type="multiple" className="w-full space-y-1 p-1">
                    {segments.map((segment) => {
                        const WeatherIcon = segment.weatherData ? getWeatherIcon(segment.weatherData.conditionCode, segment.weatherData.condition) : CloudSun;
                        return (
                        <AccordionItem value={segment.id} key={segment.id} className="border-b-0">
                            <AccordionTrigger className="text-lg font-semibold hover:no-underline bg-card hover:bg-muted/80 px-4 py-3 rounded-md border shadow-sm data-[state=open]:rounded-b-none data-[state=open]:border-b-0 pr-2">
                            <span>{segment.label}</span>
                            {segment.isLoading && <Skeleton className="h-5 w-20 ml-auto" />}
                            {segment.error && <AlertCircle className="h-5 w-5 text-destructive ml-auto" />}
                            </AccordionTrigger>
                            <AccordionContent className="pt-0 pb-4 space-y-4 border border-t-0 rounded-b-md shadow-sm bg-card">
                                <div className="p-4">
                                {segment.isLoading && (
                                    <div className="space-y-3 p-4 border rounded-md bg-background/50">
                                    <div className="flex justify-between items-center">
                                        <Skeleton className="h-8 w-1/2" />
                                        <Skeleton className="h-8 w-1/4" />
                                    </div>
                                    <Skeleton className="h-4 w-3/4" />
                                    <Skeleton className="h-16 w-full" />
                                    <Skeleton className="h-16 w-full" />
                                    </div>
                                )}
                                {segment.error && (
                                    <div className="text-destructive p-4 border border-destructive/50 rounded-md bg-destructive/10">
                                    <p className="font-medium">Error loading suggestions:</p>
                                    <p className="text-sm">{segment.error}</p>
                                    </div>
                                )}
                                {!segment.isLoading && !segment.error && segment.weatherData && segment.clothingSuggestions && segment.activitySuggestions && (
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
                                            <p>Humidity: {segment.weatherData.humidity}%</p>
                                            <p>Wind: {segment.weatherData.windSpeed} km/h</p>
                                        </div>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div>
                                        <h4 className="font-semibold mb-1 text-md flex items-center gap-1.5"><Thermometer size={18}/> Outfit Ideas</h4>
                                        {segment.clothingSuggestions.suggestions.length > 0 ? (
                                            <ul className="list-disc list-inside space-y-0.5 text-sm pl-1">
                                            {segment.clothingSuggestions.suggestions.map((item, index) => (
                                                <li key={`cloth-${segment.id}-${index}`}>{item}</li>
                                            ))}
                                            </ul>
                                        ) : <p className="text-sm text-muted-foreground">No specific outfits suggested.</p>}
                                        {segment.clothingSuggestions.reasoning && <p className="text-xs text-muted-foreground italic mt-1">{segment.clothingSuggestions.reasoning}</p>}
                                        </div>
                                        <div>
                                        <h4 className="font-semibold mb-1 text-md flex items-center gap-1.5"><CloudSun size={18}/> Activity Ideas</h4>
                                        {segment.activitySuggestions.indoorActivities.length > 0 && (
                                            <>
                                            <p className="text-sm font-medium mt-1">Indoor:</p>
                                            <ul className="list-disc list-inside space-y-0.5 text-sm pl-1">
                                                {segment.activitySuggestions.indoorActivities.map((item, index) => (
                                                <li key={`indoor-${segment.id}-${index}`}>{item}</li>
                                                ))}
                                            </ul>
                                            </>
                                        )}
                                        {segment.activitySuggestions.outdoorActivities.length > 0 && (
                                            <>
                                            <p className="text-sm font-medium mt-1">Outdoor:</p>
                                            <ul className="list-disc list-inside space-y-0.5 text-sm pl-1">
                                                {segment.activitySuggestions.outdoorActivities.map((item, index) => (
                                                <li key={`outdoor-${segment.id}-${index}`}>{item}</li>
                                                ))}
                                            </ul>
                                            </>
                                        )}
                                        {(segment.activitySuggestions.indoorActivities.length === 0 && segment.activitySuggestions.outdoorActivities.length === 0) && (
                                            <p className="text-sm text-muted-foreground">No activities suggested.</p>
                                        )}
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

                {!overallLoading && segments.length > 0 && !allSegmentsLoadedSuccessfully && (
                    <div className="text-center py-4 text-sm text-amber-700 bg-amber-50 p-3 rounded-md border border-amber-200 mt-4">
                        <p><Info size={16} className="inline mr-1" /> Some suggestions might still be loading or encountered an error. Please check each section.</p>
                    </div>
                )}

                <div className="flex justify-end space-x-2 mt-6 pt-6 border-t">
                    <Button onClick={handleDownload} disabled={!allSegmentsLoadedSuccessfully}>
                        <Download className="mr-2 h-4 w-4" /> Download
                    </Button>
                    <Button onClick={handleShare} disabled={!allSegmentsLoadedSuccessfully}>
                        <Share2 className="mr-2 h-4 w-4" /> Share
                    </Button>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}

