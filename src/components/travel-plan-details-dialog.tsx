
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Download, Share2, Plane, CalendarDays, MapPin, Info, ExternalLink, CloudSun, CloudRain, Thermometer } from "lucide-react";
import { format, parseISO, differenceInCalendarDays, addDays, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { fetchWeather } from "@/lib/weather-api";
import { suggestClothing, type ClothingSuggestionsOutput } from "@/ai/flows/clothing-suggestions";
import { suggestActivities, type ActivitySuggestionsOutput } from "@/ai/flows/activity-suggestions";
import type { TravelPlanItem, WeatherData, TripSegmentSuggestions as TripSegmentSuggestionsType } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { getWeatherIcon } from "@/components/icons";

interface TravelPlanDetailsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  plan: TravelPlanItem | null;
  familyProfile: string;
}

export function TravelPlanDetailsDialog({
  isOpen,
  onOpenChange,
  plan,
  familyProfile,
}: TravelPlanDetailsDialogProps) {
  const [segments, setSegments] = React.useState<TripSegmentSuggestionsType[]>([]);
  const [overallLoading, setOverallLoading] = React.useState(false);
  const { toast } = useToast();

  const getUniqueDateSegments = React.useCallback(() => {
    if (!plan) return [];

    const startDate = startOfDay(parseISO(plan.startDate));
    const endDate = startOfDay(parseISO(plan.endDate));
    const duration = differenceInCalendarDays(endDate, startDate) + 1;

    const datePoints: Map<string, { date: Date; id: 'start' | 'middle' | 'end'; labelPrefix: string }> = new Map();

    // Always add start date
    datePoints.set(format(startDate, 'yyyy-MM-dd'), { date: startDate, id: 'start', labelPrefix: 'Start of Trip' });

    // Add end date if different from start
    if (!isWithinInterval(endDate, { start: startDate, end: startDate })) {
         datePoints.set(format(endDate, 'yyyy-MM-dd'), { date: endDate, id: 'end', labelPrefix: 'End of Trip' });
    } else if (duration === 1) { // If only one day, "End of Trip" is same as "Start"
        // No need to add, start date covers it.
    }


    // Add middle date if trip is 3 days or longer, and middle is distinct from start/end
    if (duration >= 3) {
        const middleDateOffset = Math.floor(duration / 2); // Ensure it's an integer offset
        const middleDate = startOfDay(addDays(startDate, middleDateOffset));
        
        const middleDateStr = format(middleDate, 'yyyy-MM-dd');
        const startDateStr = format(startDate, 'yyyy-MM-dd');
        const endDateStr = format(endDate, 'yyyy-MM-dd');

        if (middleDateStr !== startDateStr && middleDateStr !== endDateStr) {
            datePoints.set(middleDateStr, { date: middleDate, id: 'middle', labelPrefix: 'Middle of Trip' });
        }
    }
    
    // Create segments in order: start, middle (if exists), end (if exists and different)
    const orderedSegments: { date: Date; id: 'start' | 'middle' | 'end'; labelPrefix: string }[] = [];
    const startSegment = Array.from(datePoints.values()).find(dp => dp.id === 'start');
    const middleSegment = Array.from(datePoints.values()).find(dp => dp.id === 'middle');
    const endSegment = Array.from(datePoints.values()).find(dp => dp.id === 'end');

    if (startSegment) orderedSegments.push(startSegment);
    if (middleSegment && middleSegment.date !== startSegment?.date) orderedSegments.push(middleSegment);
    if (endSegment && endSegment.date !== startSegment?.date && endSegment.date !== middleSegment?.date) orderedSegments.push(endSegment);


    return orderedSegments.map(dp => ({
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
    if (!isOpen || !plan) {
      setSegments([]);
      return;
    }

    const initialSegments = getUniqueDateSegments();
    setSegments(initialSegments);
    setOverallLoading(initialSegments.length > 0);

    const fetchAllSegmentData = async () => {
      const promises = initialSegments.map(async (segment, index) => {
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
            timeOfDay: "day", // Generic time for travel planning
            locationPreferences: plan.location,
          };
          const activities = await suggestActivities(activityInput);
          setSegments(prev => prev.map(s => s.id === segment.id ? { ...s, activitySuggestions: activities, isLoading: false } : s));
          return { ...segment, weatherData: weather, clothingSuggestions: clothing, activitySuggestions: activities, isLoading: false };
        } catch (err: any) {
          console.error(`Error fetching data for segment ${segment.id}:`, err);
          const errorMessage = err.message || "Failed to load suggestions for this day.";
          setSegments(prev => prev.map(s => s.id === segment.id ? { ...s, error: errorMessage, isLoading: false } : s));
          return { ...segment, error: errorMessage, isLoading: false };
        }
      });
      
      await Promise.all(promises);
      setOverallLoading(false);
    };

    if (initialSegments.length > 0) {
        fetchAllSegmentData();
    }

  }, [isOpen, plan, familyProfile, getUniqueDateSegments]);

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
  
  const allSegmentsLoadedSuccessfully = segments.length > 0 && segments.every(s => !s.isLoading && !s.error);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Plane className="text-primary" /> {plan?.tripName || "Travel Plan"} Suggestions
          </DialogTitle>
          {plan && (
            <DialogDescription className="text-sm">
              <div className="flex items-center gap-2 mt-1"><MapPin size={14}/> {plan.location}</div>
              <div className="flex items-center gap-2 mt-1"><CalendarDays size={14}/> 
                {format(parseISO(plan.startDate), "MMM d, yyyy")} - {format(parseISO(plan.endDate), "MMM d, yyyy")}
              </div>
            </DialogDescription>
          )}
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0"> {/* Ensure ScrollArea can shrink and grow */}
          <div className="p-6 space-y-4">
            {overallLoading && segments.length === 0 && (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            )}

            {!overallLoading && segments.length === 0 && plan && (
                 <div className="text-center py-8">
                    <Info size={48} className="mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No suggestion segments to display for this trip duration.</p>
                    <p className="text-xs text-muted-foreground mt-1">This might happen for very short trips or if dates are the same.</p>
                </div>
            )}
            
            <Accordion type="multiple" className="w-full">
              {segments.map((segment) => {
                const WeatherIcon = segment.weatherData ? getWeatherIcon(segment.weatherData.conditionCode, segment.weatherData.condition) : CloudSun;
                return (
                  <AccordionItem value={segment.id} key={segment.id}>
                    <AccordionTrigger className="text-lg font-semibold hover:no-underline pr-2">
                      {segment.label}
                      {segment.isLoading && <Skeleton className="h-5 w-20 ml-auto" />}
                      {segment.error && <AlertCircle className="h-5 w-5 text-destructive ml-auto" />}
                    </AccordionTrigger>
                    <AccordionContent className="pt-2 pb-4 space-y-4">
                      {segment.isLoading && (
                        <div className="space-y-3 p-4 border rounded-md bg-card/50">
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
                        <div className="p-4 border rounded-md bg-card/80 shadow-sm">
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
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
             {!overallLoading && segments.length > 0 && !allSegmentsLoadedSuccessfully && (
                <div className="text-center py-4 text-sm text-amber-700 bg-amber-50 p-3 rounded-md border border-amber-200">
                    <p><Info size={16} className="inline mr-1" /> Some suggestions might still be loading or encountered an error. Please check each section.</p>
                </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="p-6 pt-4 border-t bg-background">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={handleDownload} disabled={!allSegmentsLoadedSuccessfully}>
            <Download className="mr-2 h-4 w-4" /> Download
          </Button>
          <Button onClick={handleShare} disabled={!allSegmentsLoadedSuccessfully}>
            <Share2 className="mr-2 h-4 w-4" /> Share
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    