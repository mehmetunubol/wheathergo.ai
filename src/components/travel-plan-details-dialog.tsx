
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
import { useToast } from "@/hooks/use-toast";
import type { TravelPlanItem, WeatherData } from "@/types";
import { fetchWeather } from "@/lib/weather-api";
import { suggestClothing, type ClothingSuggestionsOutput } from "@/ai/flows/clothing-suggestions";
import { suggestActivities, type ActivitySuggestionsOutput } from "@/ai/flows/activity-suggestions";
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { Thermometer, CloudSun, Shirt, ListTree, Download, Share2, Info, CalendarDays, MapPinIcon } from "lucide-react";

interface TravelPlanDetailsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  plan: TravelPlanItem | null;
  familyProfile: string;
}

const DEFAULT_FAMILY_PROFILE = "An adult traveler.";

export function TravelPlanDetailsDialog({
  isOpen,
  onOpenChange,
  plan,
  familyProfile,
}: TravelPlanDetailsDialogProps) {
  const [weatherData, setWeatherData] = React.useState<WeatherData | null>(null);
  const [clothingSuggestions, setClothingSuggestions] = React.useState<ClothingSuggestionsOutput | null>(null);
  const [activitySuggestions, setActivitySuggestions] = React.useState<ActivitySuggestionsOutput | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const { toast } = useToast();

  const effectiveFamilyProfile = familyProfile || DEFAULT_FAMILY_PROFILE;

  React.useEffect(() => {
    if (isOpen && plan) {
      const fetchDetails = async () => {
        setIsLoading(true);
        setError(null);
        setWeatherData(null);
        setClothingSuggestions(null);
        setActivitySuggestions(null);

        try {
          // Determine relevant date: today if trip is ongoing, else start date.
          const today = startOfDay(new Date());
          const startDate = startOfDay(parseISO(plan.startDate));
          const endDate = endOfDay(parseISO(plan.endDate));
          let relevantDate = startDate;
          if (isWithinInterval(today, { start: startDate, end: endDate })) {
            relevantDate = today;
          } else if (isBefore(today, startDate)) {
            relevantDate = startDate;
          } else { // Trip is in the past
            relevantDate = startDate; // Show for the start date
          }
          
          const weather = await fetchWeather(plan.location, relevantDate);
          setWeatherData(weather);

          if (weather) {
            const [clothing, activities] = await Promise.all([
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
            setClothingSuggestions(clothing);
            setActivitySuggestions(activities);
          }
        } catch (err) {
          console.error("Error fetching travel plan details:", err);
          setError("Failed to load suggestions. Please try again.");
          toast({
            title: "Error",
            description: "Could not load suggestions for the travel plan.",
            variant: "destructive",
          });
        } finally {
          setIsLoading(false);
        }
      };
      fetchDetails();
    }
  }, [isOpen, plan, effectiveFamilyProfile, toast]);

  if (!plan) return null;

  const relevantDateForDisplay = () => {
      const today = startOfDay(new Date());
      const startDate = startOfDay(parseISO(plan.startDate));
      const endDate = endOfDay(parseISO(plan.endDate));
      if (isWithinInterval(today, { start: startDate, end: endDate })) return today;
      if (isBefore(today, startDate)) return startDate;
      return startDate; // Default to start date if in past
  };

  const generateShareText = () => {
    let text = `Travel Plan: ${plan.tripName} to ${plan.location}\n`;
    text += `Dates: ${format(parseISO(plan.startDate), "PPP")} - ${format(parseISO(plan.endDate), "PPP")}\n`;
    text += `Suggestions for: ${format(relevantDateForDisplay(), "PPP")}\n\n`;

    if (weatherData) {
      text += `Weather: ${weatherData.temperature}°C, ${weatherData.condition}\n`;
      text += `Humidity: ${weatherData.humidity}%, Wind: ${weatherData.windSpeed} km/h\n\n`;
    }
    if (clothingSuggestions?.suggestions?.length) {
      text += "Clothing Suggestions:\n";
      clothingSuggestions.suggestions.forEach(s => text += `- ${s}\n`);
      if(clothingSuggestions.reasoning) text += `Reasoning: ${clothingSuggestions.reasoning}\n`;
      text += "\n";
    }
    if (activitySuggestions?.indoorActivities?.length || activitySuggestions?.outdoorActivities?.length) {
      text += "Activity Suggestions:\n";
      if(activitySuggestions.indoorActivities?.length) {
        text += "  Indoor:\n";
        activitySuggestions.indoorActivities.forEach(s => text += `  - ${s}\n`);
      }
      if(activitySuggestions.outdoorActivities?.length) {
        text += "  Outdoor:\n";
        activitySuggestions.outdoorActivities.forEach(s => text += `  - ${s}\n`);
      }
      text += "\n";
    }
    return text;
  };

  const handleDownload = () => {
    const text = generateShareText();
    const filename = `${plan.tripName.replace(/\s+/g, '_')}_suggestions.txt`;
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
      title: `WeatherWise Suggestions for ${plan.tripName}`,
      text: generateShareText(),
      url: window.location.href, // Or a specific link if you have one
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        toast({ title: "Shared", description: "Suggestions shared successfully." });
      } catch (err) {
        console.error("Share failed:", err);
        // Fallback or specific error handling
         if ((err as Error).name !== 'AbortError') {
          toast({ title: "Share Failed", description: "Could not share suggestions.", variant: "destructive" });
        }
      }
    } else {
      // Fallback for browsers that don't support Web Share API
      try {
        await navigator.clipboard.writeText(shareData.text);
        toast({ title: "Copied to Clipboard", description: "Suggestions copied to clipboard." });
      } catch (err) {
        toast({ title: "Copy Failed", description: "Could not copy suggestions to clipboard.", variant: "destructive" });
      }
    }
  };
  
  const suggestionDate = relevantDateForDisplay();

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Plane className="text-primary h-6 w-6" /> {plan.tripName}
          </DialogTitle>
          <DialogDescription className="flex flex-col sm:flex-row sm:items-center sm:gap-4 text-sm">
            <span className="flex items-center gap-1.5"><MapPinIcon size={14}/> {plan.location}</span>
            <span className="flex items-center gap-1.5"><CalendarDays size={14}/> 
              {format(parseISO(plan.startDate), "MMM d, yyyy")} - {format(parseISO(plan.endDate), "MMM d, yyyy")}
            </span>
          </DialogDescription>
        </DialogHeader>

        <Separator />
        
        <p className="text-sm text-muted-foreground flex items-center gap-1.5">
          <Info size={14} /> Suggestions for: <span className="font-semibold">{format(suggestionDate, "EEEE, MMMM do, yyyy")}</span>
        </p>

        <ScrollArea className="flex-grow pr-2 -mr-2"> {/* Added padding for scrollbar */}
          <div className="space-y-4 py-1">
            {isLoading && (
              <div className="space-y-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            )}
            {error && <p className="text-destructive text-center py-4">{error}</p>}
            
            {!isLoading && !error && weatherData && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><Thermometer className="text-accent"/> Weather Overview</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <p><strong>Temperature:</strong> {weatherData.temperature}°C</p>
                  <p><strong>Condition:</strong> {weatherData.condition} ({weatherData.description})</p>
                  <p><strong>Humidity:</strong> {weatherData.humidity}%</p>
                  <p><strong>Wind:</strong> {weatherData.windSpeed} km/h</p>
                </CardContent>
              </Card>
            )}

            {!isLoading && !error && clothingSuggestions && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><Shirt className="text-accent"/> Clothing Ideas</CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  {clothingSuggestions.suggestions.length > 0 ? (
                    <ul className="list-disc list-inside space-y-1">
                      {clothingSuggestions.suggestions.map((item, index) => (
                        <li key={`cloth-${index}`}>{item}</li>
                      ))}
                    </ul>
                  ) : <p className="text-muted-foreground">No specific clothing items suggested.</p>}
                  {clothingSuggestions.reasoning && (
                    <p className="mt-2 text-xs italic text-muted-foreground"><strong>Reasoning:</strong> {clothingSuggestions.reasoning}</p>
                  )}
                </CardContent>
              </Card>
            )}

            {!isLoading && !error && activitySuggestions && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><ListTree className="text-accent"/> Activity Ideas</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  {activitySuggestions.indoorActivities.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-1">Indoor:</h4>
                      <ul className="list-disc list-inside space-y-1">
                        {activitySuggestions.indoorActivities.map((activity, index) => (
                          <li key={`indoor-act-${index}`}>{activity}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {activitySuggestions.outdoorActivities.length > 0 && (
                     <div>
                      <h4 className="font-semibold mb-1">Outdoor:</h4>
                      <ul className="list-disc list-inside space-y-1">
                        {activitySuggestions.outdoorActivities.map((activity, index) => (
                          <li key={`outdoor-act-${index}`}>{activity}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                   {(activitySuggestions.indoorActivities.length === 0 && activitySuggestions.outdoorActivities.length === 0) && (
                     <p className="text-muted-foreground">No specific activities suggested.</p>
                   )}
                </CardContent>
              </Card>
            )}
            {!isLoading && !error && !weatherData && (
                <p className="text-muted-foreground text-center py-4">No suggestion data available for this plan currently.</p>
            )}
          </div>
        </ScrollArea>

        <Separator />

        <DialogFooter className="gap-2 sm:justify-end pt-2">
          <Button variant="outline" onClick={handleDownload} disabled={isLoading || !weatherData}>
            <Download className="mr-2 h-4 w-4" /> Download
          </Button>
          <Button onClick={handleShare} disabled={isLoading || !weatherData}>
            <Share2 className="mr-2 h-4 w-4" /> Share
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
