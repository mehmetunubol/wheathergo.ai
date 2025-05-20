
"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import type { TravelPlanItem, WeatherData, HourlyForecastData } from "@/types";
import type { ClothingSuggestionsOutput } from "@/ai/flows/clothing-suggestions";
import type { ActivitySuggestionsOutput } from "@/ai/flows/activity-suggestions";
import { fetchWeather } from "@/lib/weather-api";
import { suggestClothing } from "@/ai/flows/clothing-suggestions";
import { suggestActivities } from "@/ai/flows/activity-suggestions";
import { format, parseISO, differenceInDays, addDays, startOfDay } from "date-fns";
import { Thermometer, CloudSun, Shirt, ListTree, Download, Share2, CalendarDays, MapPinIcon, Plane, AlertCircle } from "lucide-react";

interface TravelPlanDetailsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  plan: TravelPlanItem | null;
  familyProfile: string;
}

const DEFAULT_FAMILY_PROFILE = "An adult traveler.";

interface TripSegmentSuggestions {
  id: string; // 'start', 'middle', 'end'
  label: string;
  date: Date;
  weatherData: WeatherData | null;
  clothingSuggestions: ClothingSuggestionsOutput | null;
  activitySuggestions: ActivitySuggestionsOutput | null;
  isLoading: boolean;
  error: string | null;
}

export function TravelPlanDetailsDialog({
  isOpen,
  onOpenChange,
  plan,
  familyProfile,
}: TravelPlanDetailsDialogProps) {
  const [tripSegments, setTripSegments] = React.useState<TripSegmentSuggestions[]>([]);
  const [isOverallLoading, setIsOverallLoading] = React.useState(false);
  const { toast } = useToast();

  const effectiveFamilyProfile = familyProfile || DEFAULT_FAMILY_PROFILE;

  React.useEffect(() => {
    if (!isOpen || !plan) {
      setTripSegments([]); // Clear previous segments when dialog is closed or no plan
      return;
    }

    const fetchSegmentData = async (date: Date, id: string, labelPrefix: string): Promise<TripSegmentSuggestions> => {
      const segmentLabel = `${labelPrefix} (${format(date, "MMM d, yyyy")})`;
      const initialSegmentState: TripSegmentSuggestions = {
        id,
        label: segmentLabel,
        date,
        weatherData: null,
        clothingSuggestions: null,
        activitySuggestions: null,
        isLoading: true,
        error: null,
      };

      // Update state to show this segment is loading
      setTripSegments(prev => {
        const existing = prev.find(s => s.id === id);
        if (existing) return prev.map(s => s.id === id ? { ...s, isLoading: true, error: null, label: segmentLabel, date } : s);
        return [...prev, initialSegmentState];
      });
      
      try {
        const weather = await fetchWeather(plan.location, date);
        let clothing: ClothingSuggestionsOutput | null = null;
        let activities: ActivitySuggestionsOutput | null = null;

        if (weather) {
          [clothing, activities] = await Promise.all([
            suggestClothing({
              weatherCondition: weather.condition,
              temperature: weather.temperature,
              familyProfile: effectiveFamilyProfile,
              location: plan.location,
            }),
            suggestActivities({
              weatherCondition: weather.condition,
              temperature: weather.temperature,
              familyProfile: effectiveFamilyProfile,
              timeOfDay: new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening",
              locationPreferences: plan.location,
            }),
          ]);
        }
        return { ...initialSegmentState, weatherData: weather, clothingSuggestions: clothing, activitySuggestions: activities, isLoading: false, label: segmentLabel, date };
      } catch (err) {
        console.error(`Error fetching data for ${segmentLabel}:`, err);
        return { ...initialSegmentState, isLoading: false, error: `Failed to load suggestions for ${format(date, "MMM d")}.`, label: segmentLabel, date };
      }
    };

    const planStartDate = startOfDay(parseISO(plan.startDate));
    const planEndDate = startOfDay(parseISO(plan.endDate));
    const duration = differenceInDays(planEndDate, planStartDate) + 1;

    const segmentsToFetch: { date: Date; id: string; labelPrefix: string }[] = [];

    segmentsToFetch.push({ date: planStartDate, id: 'start', labelPrefix: "Start of Trip" });

    if (duration >= 4) { // Add middle date for trips of 4 days or more
      const middleDateIndex = Math.floor(duration / 2);
      const middleDate = addDays(planStartDate, middleDateIndex);
      if (!segmentsToFetch.find(s => s.date.getTime() === middleDate.getTime()) && middleDate.getTime() !== planEndDate.getTime()) {
        segmentsToFetch.push({ date: middleDate, id: 'middle', labelPrefix: "Middle of Trip" });
      }
    }

    if (planEndDate.getTime() !== planStartDate.getTime() && !segmentsToFetch.find(s => s.date.getTime() === planEndDate.getTime())) {
      segmentsToFetch.push({ date: planEndDate, id: 'end', labelPrefix: "End of Trip" });
    }
    
    // Ensure unique segments by date, prioritizing start, then end, then middle if dates overlap due to short duration
    const uniqueDateSegments = Array.from(new Map(segmentsToFetch.map(item => [item.date.toISOString(), item])).values());


    setIsOverallLoading(true);
    setTripSegments(uniqueDateSegments.map(s => ({
        id: s.id,
        label: `${s.labelPrefix} (${format(s.date, "MMM d, yyyy")})`,
        date: s.date,
        weatherData: null, clothingSuggestions: null, activitySuggestions: null,
        isLoading: true, error: null
    })));


    Promise.all(uniqueDateSegments.map(s => fetchSegmentData(s.date, s.id, s.labelPrefix)))
      .then(results => {
        setTripSegments(results);
      })
      .finally(() => {
        setIsOverallLoading(false);
      });

  }, [isOpen, plan, effectiveFamilyProfile, toast]);


  const generateShareText = () => {
    if (!plan) return "No plan data available.";
    let text = `Travel Plan: ${plan.tripName} to ${plan.location}\n`;
    text += `Dates: ${format(parseISO(plan.startDate), "PPP")} - ${format(parseISO(plan.endDate), "PPP")}\n\n`;

    tripSegments.forEach(segment => {
      if (segment.weatherData) {
        text += `--- ${segment.label} ---\n`;
        text += `Weather: ${segment.weatherData.temperature}°C, ${segment.weatherData.condition}\n`;
        text += `Humidity: ${segment.weatherData.humidity}%, Wind: ${segment.weatherData.windSpeed} km/h\n`;
      }
      if (segment.clothingSuggestions?.suggestions?.length) {
        text += "Clothing Suggestions:\n";
        segment.clothingSuggestions.suggestions.forEach(s => text += `- ${s}\n`);
        if(segment.clothingSuggestions.reasoning) text += `Reasoning: ${segment.clothingSuggestions.reasoning}\n`;
      }
      if (segment.activitySuggestions?.indoorActivities?.length || segment.activitySuggestions?.outdoorActivities?.length) {
        text += "Activity Suggestions:\n";
        if(segment.activitySuggestions.indoorActivities?.length) {
          text += "  Indoor:\n";
          segment.activitySuggestions.indoorActivities.forEach(s => text += `  - ${s}\n`);
        }
        if(segment.activitySuggestions.outdoorActivities?.length) {
          text += "  Outdoor:\n";
          segment.activitySuggestions.outdoorActivities.forEach(s => text += `  - ${s}\n`);
        }
      }
      text += "\n";
    });
    return text;
  };

  const handleDownload = () => {
    const text = generateShareText();
    const filename = `${plan?.tripName.replace(/\s+/g, '_')}_suggestions.txt`;
    const element = document.createElement("a");
    element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(text));
    element.setAttribute("download", filename);
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast({ title: "Downloaded", description: "Suggestions downloaded as a .txt file." });
  };

  const handleShare = async () => {
    const shareData = {
      title: `WeatherWise Suggestions for ${plan?.tripName}`,
      text: generateShareText(),
      url: window.location.href,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        toast({ title: "Shared", description: "Suggestions shared successfully." });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          toast({ title: "Share Failed", description: "Could not share suggestions.", variant: "destructive" });
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareData.text);
        toast({ title: "Copied to Clipboard", description: "Suggestions copied to clipboard." });
      } catch (err) {
        toast({ title: "Copy Failed", description: "Could not copy suggestions to clipboard.", variant: "destructive" });
      }
    }
  };

  if (!plan && isOpen) return null; // Should ideally be handled by parent, but good for safety

  const allSegmentsLoadedSuccessfully = tripSegments.length > 0 && tripSegments.every(s => !s.isLoading && !s.error && s.weatherData);


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Plane className="text-primary h-6 w-6" /> {plan?.tripName}
          </DialogTitle>
          <DialogDescription className="flex flex-col sm:flex-row sm:items-center sm:gap-4 text-sm">
            <span className="flex items-center gap-1.5"><MapPinIcon size={14}/> {plan?.location}</span>
            <span className="flex items-center gap-1.5"><CalendarDays size={14}/> 
              {plan ? `${format(parseISO(plan.startDate), "MMM d, yyyy")} - ${format(parseISO(plan.endDate), "MMM d, yyyy")}` : ''}
            </span>
          </DialogDescription>
        </DialogHeader>

        <Separator />
        
        <ScrollArea className="flex-grow">
          <div className="space-y-2 py-1">
            {isOverallLoading && tripSegments.length === 0 && ( // Show overall skeleton only if no segments rendered yet
              <div className="space-y-4 p-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            )}

            {tripSegments.length > 0 && (
              <Accordion type="multiple" className="w-full">
                {tripSegments.map((segment) => (
                  <AccordionItem value={segment.id} key={segment.id}>
                    <AccordionTrigger className="text-base hover:no-underline">
                      <div className="flex items-center gap-2">
                        {segment.isLoading && <Skeleton className="h-5 w-5 rounded-full animate-spin" />}
                        {segment.error && <AlertCircle className="h-5 w-5 text-destructive" />}
                        {!segment.isLoading && !segment.error && segment.weatherData && <CloudSun className="h-5 w-5 text-primary" />}
                        {segment.label}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2">
                      {segment.isLoading && (
                        <div className="space-y-3 p-2">
                          <Skeleton className="h-6 w-1/2" />
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-4 w-full mt-2" />
                        </div>
                      )}
                      {segment.error && <p className="text-destructive text-sm p-2">{segment.error}</p>}
                      
                      {!segment.isLoading && !segment.error && segment.weatherData && (
                        <div className="space-y-3">
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-md flex items-center gap-2"><Thermometer className="text-accent"/> Weather Overview</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm space-y-1">
                              <p><strong>Temperature:</strong> {segment.weatherData.temperature}°C</p>
                              <p><strong>Condition:</strong> {segment.weatherData.condition} ({segment.weatherData.description})</p>
                              <p><strong>Humidity:</strong> {segment.weatherData.humidity}%</p>
                              <p><strong>Wind:</strong> {segment.weatherData.windSpeed} km/h</p>
                            </CardContent>
                          </Card>
                          
                          {segment.clothingSuggestions && (
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-md flex items-center gap-2"><Shirt className="text-accent"/> Clothing Ideas</CardTitle>
                              </CardHeader>
                              <CardContent className="text-sm">
                                {segment.clothingSuggestions.suggestions.length > 0 ? (
                                  <ul className="list-disc list-inside space-y-1">
                                    {segment.clothingSuggestions.suggestions.map((item, index) => (
                                      <li key={`cloth-${segment.id}-${index}`}>{item}</li>
                                    ))}
                                  </ul>
                                ) : <p className="text-muted-foreground">No specific clothing items suggested.</p>}
                                {segment.clothingSuggestions.reasoning && (
                                  <p className="mt-2 text-xs italic text-muted-foreground"><strong>Reasoning:</strong> {segment.clothingSuggestions.reasoning}</p>
                                )}
                              </CardContent>
                            </Card>
                          )}

                          {segment.activitySuggestions && (
                             <Card>
                              <CardHeader>
                                <CardTitle className="text-md flex items-center gap-2"><ListTree className="text-accent"/> Activity Ideas</CardTitle>
                              </CardHeader>
                              <CardContent className="text-sm space-y-2">
                                {segment.activitySuggestions.indoorActivities.length > 0 && (
                                  <div>
                                    <h4 className="font-semibold mb-1">Indoor:</h4>
                                    <ul className="list-disc list-inside space-y-1">
                                      {segment.activitySuggestions.indoorActivities.map((activity, index) => (
                                        <li key={`indoor-act-${segment.id}-${index}`}>{activity}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {segment.activitySuggestions.outdoorActivities.length > 0 && (
                                   <div>
                                    <h4 className="font-semibold mb-1">Outdoor:</h4>
                                    <ul className="list-disc list-inside space-y-1">
                                      {segment.activitySuggestions.outdoorActivities.map((activity, index) => (
                                        <li key={`outdoor-act-${segment.id}-${index}`}>{activity}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                 {(segment.activitySuggestions.indoorActivities.length === 0 && segment.activitySuggestions.outdoorActivities.length === 0) && (
                                   <p className="text-muted-foreground">No specific activities suggested.</p>
                                 )}
                              </CardContent>
                            </Card>
                          )}
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
            
            {!isOverallLoading && tripSegments.length === 0 && !plan && (
                 <p className="text-muted-foreground text-center py-4">No suggestion data available.</p>
            )}
             {!isOverallLoading && tripSegments.every(s => s.error) && (
                 <p className="text-destructive text-center py-4">Could not load suggestions for this trip. Please try again later.</p>
            )}
          </div>
        </ScrollArea>

        <Separator />

        <DialogFooter className="gap-2 sm:justify-end pt-2">
          <Button variant="outline" onClick={handleDownload} disabled={isOverallLoading || !allSegmentsLoadedSuccessfully}>
            <Download className="mr-2 h-4 w-4" /> Download
          </Button>
          <Button onClick={handleShare} disabled={isOverallLoading || !allSegmentsLoadedSuccessfully}>
            <Share2 className="mr-2 h-4 w-4" /> Share
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
