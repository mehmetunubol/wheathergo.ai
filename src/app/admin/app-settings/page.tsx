
"use client";

import * as React from "react";
import { useAppSettings, DEFAULT_APP_SETTINGS } from "@/contexts/app-settings-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Save, Settings, MapPin, Clock, Users, CalendarDays, SlidersHorizontal, AlertTriangle } from "lucide-react";
import type { NotificationFrequency, AppSettings as AppSettingsType } from "@/types"; // Renamed to avoid conflict

export default function AdminAppSettingsPage() {
  const { settings: currentSettings, isLoadingSettings, errorSettings, updateSettingsInFirestore, refetchSettings } = useAppSettings();
  const { toast } = useToast();

  const [formState, setFormState] = React.useState<AppSettingsType>(DEFAULT_APP_SETTINGS);
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    if (!isLoadingSettings && currentSettings) {
      setFormState(currentSettings);
    }
  }, [currentSettings, isLoadingSettings]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormState(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }));
  };

  const handleSelectChange = (name: keyof AppSettingsType, value: string) => {
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // Ensure numeric fields are numbers
      const settingsToSave: AppSettingsType = {
        ...formState,
        cacheDurationMs: Number(formState.cacheDurationMs),
        maxApiForecastDays: Number(formState.maxApiForecastDays),
      };
      await updateSettingsInFirestore(settingsToSave);
      toast({ title: "Success", description: "Application settings updated successfully." });
      // refetchSettings is called internally by updateSettingsInFirestore's success path
    } catch (error) {
      console.error("Error updating app settings:", error);
      toast({ title: "Error", description: "Failed to update settings. " + (error as Error).message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingSettings && !Object.keys(currentSettings).length) { // Show skeleton only on initial full load
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Settings /> Application Settings</h1>
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-4 w-1/4 mt-2" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
            <CardFooter><Skeleton className="h-10 w-24" /></CardFooter>
          </Card>
        ))}
      </div>
    );
  }
  
  if (errorSettings) {
      return (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold flex items-center gap-2"><Settings /> Application Settings</h1>
            <Card className="border-destructive">
                <CardHeader>
                    <CardTitle className="text-destructive flex items-center gap-2"><AlertTriangle /> Error Loading Settings</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>{errorSettings}</p>
                    <Button onClick={refetchSettings} className="mt-4">Try Again</Button>
                </CardContent>
            </Card>
        </div>
      );
  }


  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <h1 className="text-2xl font-bold flex items-center gap-2"><Settings /> Application Settings</h1>
      <p className="text-muted-foreground">Manage global configurations for the Weatherugo application.</p>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><MapPin /> Location & Forecast</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="defaultLocation">Default Location</Label>
            <Input id="defaultLocation" name="defaultLocation" value={formState.defaultLocation} onChange={handleChange} placeholder="e.g., London or auto:ip" />
            <p className="text-xs text-muted-foreground mt-1">Set to 'auto:ip' for IP-based detection.</p>
          </div>
          <div>
            <Label htmlFor="maxApiForecastDays">Max Real Forecast Days (WeatherAPI)</Label>
            <Input id="maxApiForecastDays" name="maxApiForecastDays" type="number" value={formState.maxApiForecastDays} onChange={handleChange} min="0" max="9" />
            <p className="text-xs text-muted-foreground mt-1">Days (0-9) for direct API forecast. Beyond this, AI estimates are used. WeatherAPI typically provides 0 (today) to 2 (day after tomorrow).</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><SlidersHorizontal /> Caching & Profiles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="cacheDurationMs">Cache Duration (ms) for Homepage</Label>
            <Input id="cacheDurationMs" name="cacheDurationMs" type="number" value={formState.cacheDurationMs} onChange={handleChange} />
            <p className="text-xs text-muted-foreground mt-1">Duration in milliseconds for local weather/suggestion cache (e.g., 3600000 for 1 hour).</p>
          </div>
          <div>
            <Label htmlFor="defaultFamilyProfile">Default Family Profile</Label>
            <Textarea id="defaultFamilyProfile" name="defaultFamilyProfile" value={formState.defaultFamilyProfile} onChange={handleChange} placeholder="e.g., A single adult traveler." />
            <p className="text-xs text-muted-foreground mt-1">Used as a fallback if a user hasn't set their own profile.</p>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><CalendarDays /> Travel Plan Defaults</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
           <div>
            <Label htmlFor="defaultNotificationTime">Default Notification Time for Travel Plans</Label>
            <Input id="defaultNotificationTime" name="defaultNotificationTime" type="time" value={formState.defaultNotificationTime} onChange={handleChange} />
          </div>
          <div>
            <Label htmlFor="defaultNotificationFrequency">Default Notification Frequency</Label>
            <Select name="defaultNotificationFrequency" value={formState.defaultNotificationFrequency} onValueChange={(value) => handleSelectChange("defaultNotificationFrequency", value)}>
              <SelectTrigger><SelectValue placeholder="Select frequency" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSaving || isLoadingSettings}>
          <Save className="mr-2 h-4 w-4" /> {isSaving ? "Saving..." : "Save All Settings"}
        </Button>
      </div>
    </form>
  );
}
