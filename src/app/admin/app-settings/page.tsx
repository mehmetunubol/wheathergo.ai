
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
import { Save, Settings, MapPin, Clock, Users, CalendarDays, SlidersHorizontal, AlertTriangle, BarChart3 } from "lucide-react"; // Added BarChart3
import type { NotificationFrequency, AppSettings as AppSettingsType } from "@/types"; 
import { USAGE_LIMITS } from "@/types"; // Import USAGE_LIMITS
import { useTranslation } from "@/hooks/use-translation";

export default function AdminAppSettingsPage() {
  const { settings: currentSettings, isLoadingSettings, errorSettings, updateSettingsInFirestore, refetchSettings } = useAppSettings();
  const { toast } = useToast();
  const { t } = useTranslation();

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
      const settingsToSave: AppSettingsType = {
        ...formState,
        cacheDurationMs: Number(formState.cacheDurationMs),
        maxApiForecastDays: Number(formState.maxApiForecastDays),
      };
      await updateSettingsInFirestore(settingsToSave);
      toast({ title: t('success'), description: t('appSettingsTitleFull') + " " + t('userStatusUpdated').toLowerCase() });
    } catch (error) {
      console.error("Error updating app settings:", error);
      toast({ title: t('error'), description: t('updateFailed') + ": " + (error as Error).message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingSettings && !Object.keys(currentSettings).length) { 
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Settings /> {t('appSettingsTitleFull')}</h1>
        {[...Array(4)].map((_, i) => ( // Increased skeleton count
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
            <h1 className="text-2xl font-bold flex items-center gap-2"><Settings /> {t('appSettingsTitleFull')}</h1>
            <Card className="border-destructive">
                <CardHeader>
                    <CardTitle className="text-destructive flex items-center gap-2"><AlertTriangle /> {t('errorLoadingSettingsTitle')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>{errorSettings}</p>
                    <Button onClick={refetchSettings} className="mt-4">{t('tryAgainButton')}</Button>
                </CardContent>
            </Card>
        </div>
      );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <h1 className="text-2xl font-bold flex items-center gap-2"><Settings /> {t('appSettingsTitleFull')}</h1>
      <p className="text-muted-foreground">{t('appSettingsDescriptionFull')}</p>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><MapPin /> {t('locationForecastCardTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="defaultLocation">{t('defaultLocationLabel')}</Label>
            <Input id="defaultLocation" name="defaultLocation" value={formState.defaultLocation} onChange={handleChange} placeholder="e.g., London or auto:ip" />
            <p className="text-xs text-muted-foreground mt-1">{t('autoIpHint')}</p>
          </div>
          <div>
            <Label htmlFor="maxApiForecastDays">{t('maxApiForecastDaysLabel')}</Label>
            <Input id="maxApiForecastDays" name="maxApiForecastDays" type="number" value={formState.maxApiForecastDays} onChange={handleChange} min="0" max="9" />
            <p className="text-xs text-muted-foreground mt-1">{t('maxApiForecastDaysHint')}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><SlidersHorizontal /> {t('cachingProfilesCardTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="cacheDurationMs">{t('cacheDurationLabel')}</Label>
            <Input id="cacheDurationMs" name="cacheDurationMs" type="number" value={formState.cacheDurationMs} onChange={handleChange} />
            <p className="text-xs text-muted-foreground mt-1">{t('cacheDurationHint')}</p>
          </div>
          <div>
            <Label htmlFor="defaultFamilyProfile">{t('defaultFamilyProfileLabel')}</Label>
            <Textarea 
              id="defaultFamilyProfile" 
              name="defaultFamilyProfile" 
              value={formState.defaultFamilyProfile} 
              onChange={handleChange} 
              placeholder={t('defaultFamilyProfileExample')} 
            />
            <p className="text-xs text-muted-foreground mt-1">{t('defaultFamilyProfileHint')}</p>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><CalendarDays /> {t('travelPlanDefaultsCardTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
           <div>
            <Label htmlFor="defaultNotificationTime">{t('defaultNotificationTimeLabel')}</Label>
            <Input id="defaultNotificationTime" name="defaultNotificationTime" type="time" value={formState.defaultNotificationTime} onChange={handleChange} />
          </div>
          <div>
            <Label htmlFor="defaultNotificationFrequency">{t('defaultNotificationFrequencyLabel')}</Label>
            <Select name="defaultNotificationFrequency" value={formState.defaultNotificationFrequency} onValueChange={(value) => handleSelectChange("defaultNotificationFrequency", value as NotificationFrequency)}>
              <SelectTrigger><SelectValue placeholder={t('selectFrequency')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">{t('daily')}</SelectItem>
                <SelectItem value="weekly">{t('weekly')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><BarChart3 /> {t('usageLimitsCardTitle')}</CardTitle>
          <CardDescription>{t('usageLimitsCardDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h4 className="font-semibold text-md mb-2">{t('freeTierLimits')}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <p><strong>{t('dailyImageGenerations')}:</strong> {USAGE_LIMITS.freeTier.dailyImageGenerations}</p>
              <p><strong>{t('dailyOutfitSuggestions')}:</strong> {USAGE_LIMITS.freeTier.dailyOutfitSuggestions}</p>
              <p><strong>{t('dailyActivitySuggestions')}:</strong> {USAGE_LIMITS.freeTier.dailyActivitySuggestions}</p>
              <p><strong>{t('maxTravelPlans')}:</strong> {USAGE_LIMITS.freeTier.maxTravelPlans}</p>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-md mb-2">{t('premiumTierLimits')}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <p><strong>{t('dailyImageGenerations')}:</strong> {USAGE_LIMITS.premiumTier.dailyImageGenerations}</p>
              <p><strong>{t('dailyOutfitSuggestions')}:</strong> {USAGE_LIMITS.premiumTier.dailyOutfitSuggestions}</p>
              <p><strong>{t('dailyActivitySuggestions')}:</strong> {USAGE_LIMITS.premiumTier.dailyActivitySuggestions}</p>
              <p><strong>{t('maxTravelPlans')}:</strong> {USAGE_LIMITS.premiumTier.maxTravelPlans}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSaving || isLoadingSettings}>
          <Save className="mr-2 h-4 w-4" /> {isSaving ? t('saving') : t('saveAllSettingsButton')}
        </Button>
      </div>
    </form>
  );
}

    