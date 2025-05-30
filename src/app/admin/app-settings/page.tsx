
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
import { Save, Settings, MapPin, Clock, Users, CalendarDays, SlidersHorizontal, AlertTriangle, BarChart3, Gem, Shield, Briefcase } from "lucide-react"; // Added Briefcase
import type { NotificationFrequency, AppSettings as AppSettingsType } from "@/types"; 
import { useTranslation } from "@/hooks/use-translation";

export default function AdminAppSettingsPage() {
  const { settings: currentSettings, isLoadingSettings, errorSettings, updateSettingsInFirestore, refetchSettings } = useAppSettings();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [formState, setFormState] = React.useState<AppSettingsType>(DEFAULT_APP_SETTINGS);
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    if (!isLoadingSettings && currentSettings) {
      // Ensure all limit fields, including the new one, are present in formState, falling back to defaults
      const mergedFreeTierLimits = {
        ...DEFAULT_APP_SETTINGS.freeTierLimits,
        ...(currentSettings.freeTierLimits || {}),
      };
      const mergedPremiumTierLimits = {
        ...DEFAULT_APP_SETTINGS.premiumTierLimits,
        ...(currentSettings.premiumTierLimits || {}),
      };
      setFormState({
        ...currentSettings,
        freeTierLimits: mergedFreeTierLimits,
        premiumTierLimits: mergedPremiumTierLimits,
      });
    }
  }, [currentSettings, isLoadingSettings]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const [mainKey, nestedKey] = name.split('.'); // For nested limit fields like 'freeTierLimits.dailyImageGenerations'

    if (nestedKey) {
      setFormState(prev => ({
        ...prev,
        [mainKey]: {
          ...(prev[mainKey as keyof AppSettingsType] as object), // Type assertion needed here
          [nestedKey]: type === 'number' ? Number(value) : value,
        }
      }));
    } else {
      setFormState(prev => ({
        ...prev,
        [name]: type === 'number' ? Number(value) : value,
      }));
    }
  };

  const handleSelectChange = (name: keyof AppSettingsType, value: string) => {
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // Ensure all number fields are correctly typed before saving
      const settingsToSave: AppSettingsType = {
        ...formState,
        cacheDurationMs: Number(formState.cacheDurationMs),
        maxApiForecastDays: Number(formState.maxApiForecastDays),
        freeTierLimits: {
          dailyImageGenerations: Number(formState.freeTierLimits.dailyImageGenerations),
          dailyOutfitSuggestions: Number(formState.freeTierLimits.dailyOutfitSuggestions),
          dailyActivitySuggestions: Number(formState.freeTierLimits.dailyActivitySuggestions),
          dailyTripDetailsSuggestions: Number(formState.freeTierLimits.dailyTripDetailsSuggestions), // New limit
          maxTravelPlans: Number(formState.freeTierLimits.maxTravelPlans),
        },
        premiumTierLimits: {
          dailyImageGenerations: Number(formState.premiumTierLimits.dailyImageGenerations),
          dailyOutfitSuggestions: Number(formState.premiumTierLimits.dailyOutfitSuggestions),
          dailyActivitySuggestions: Number(formState.premiumTierLimits.dailyActivitySuggestions),
          dailyTripDetailsSuggestions: Number(formState.premiumTierLimits.dailyTripDetailsSuggestions), // New limit
          maxTravelPlans: Number(formState.premiumTierLimits.maxTravelPlans),
        },
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
        {[...Array(5)].map((_, i) => ( 
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
          <CardTitle className="text-lg flex items-center gap-2"><BarChart3 /> {t('usageLimitsConfigCardTitle')}</CardTitle>
          <CardDescription>{t('usageLimitsConfigCardDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Free Tier Limits */}
          <div className="space-y-4 p-4 border rounded-md">
            <h4 className="font-semibold text-md flex items-center gap-2"><Shield className="h-5 w-5 text-primary"/> {t('freeTierLimits')}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="freeTierLimits.dailyImageGenerations">{t('dailyImageGenerationsLimitLabel')}</Label>
                <Input id="freeTierLimits.dailyImageGenerations" name="freeTierLimits.dailyImageGenerations" type="number" value={formState.freeTierLimits.dailyImageGenerations} onChange={handleChange} />
              </div>
              <div>
                <Label htmlFor="freeTierLimits.dailyOutfitSuggestions">{t('dailyOutfitSuggestionsLimitLabel')}</Label>
                <Input id="freeTierLimits.dailyOutfitSuggestions" name="freeTierLimits.dailyOutfitSuggestions" type="number" value={formState.freeTierLimits.dailyOutfitSuggestions} onChange={handleChange} />
              </div>
              <div>
                <Label htmlFor="freeTierLimits.dailyActivitySuggestions">{t('dailyActivitySuggestionsLimitLabel')}</Label>
                <Input id="freeTierLimits.dailyActivitySuggestions" name="freeTierLimits.dailyActivitySuggestions" type="number" value={formState.freeTierLimits.dailyActivitySuggestions} onChange={handleChange} />
              </div>
              <div>
                <Label htmlFor="freeTierLimits.dailyTripDetailsSuggestions">{t('dailyTripDetailsSuggestionsLimitLabel')}</Label>
                <Input id="freeTierLimits.dailyTripDetailsSuggestions" name="freeTierLimits.dailyTripDetailsSuggestions" type="number" value={formState.freeTierLimits.dailyTripDetailsSuggestions} onChange={handleChange} />
              </div>
              <div>
                <Label htmlFor="freeTierLimits.maxTravelPlans">{t('maxTravelPlansLimitLabel')}</Label>
                <Input id="freeTierLimits.maxTravelPlans" name="freeTierLimits.maxTravelPlans" type="number" value={formState.freeTierLimits.maxTravelPlans} onChange={handleChange} />
              </div>
            </div>
          </div>

          {/* Premium Tier Limits */}
          <div className="space-y-4 p-4 border rounded-md">
            <h4 className="font-semibold text-md flex items-center gap-2"><Gem className="h-5 w-5 text-purple-500"/> {t('premiumTierLimits')}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="premiumTierLimits.dailyImageGenerations">{t('dailyImageGenerationsLimitLabel')}</Label>
                <Input id="premiumTierLimits.dailyImageGenerations" name="premiumTierLimits.dailyImageGenerations" type="number" value={formState.premiumTierLimits.dailyImageGenerations} onChange={handleChange} />
              </div>
              <div>
                <Label htmlFor="premiumTierLimits.dailyOutfitSuggestions">{t('dailyOutfitSuggestionsLimitLabel')}</Label>
                <Input id="premiumTierLimits.dailyOutfitSuggestions" name="premiumTierLimits.dailyOutfitSuggestions" type="number" value={formState.premiumTierLimits.dailyOutfitSuggestions} onChange={handleChange} />
              </div>
              <div>
                <Label htmlFor="premiumTierLimits.dailyActivitySuggestions">{t('dailyActivitySuggestionsLimitLabel')}</Label>
                <Input id="premiumTierLimits.dailyActivitySuggestions" name="premiumTierLimits.dailyActivitySuggestions" type="number" value={formState.premiumTierLimits.dailyActivitySuggestions} onChange={handleChange} />
              </div>
              <div>
                <Label htmlFor="premiumTierLimits.dailyTripDetailsSuggestions">{t('dailyTripDetailsSuggestionsLimitLabel')}</Label>
                <Input id="premiumTierLimits.dailyTripDetailsSuggestions" name="premiumTierLimits.dailyTripDetailsSuggestions" type="number" value={formState.premiumTierLimits.dailyTripDetailsSuggestions} onChange={handleChange} />
              </div>
              <div>
                <Label htmlFor="premiumTierLimits.maxTravelPlans">{t('maxTravelPlansLimitLabel')}</Label>
                <Input id="premiumTierLimits.maxTravelPlans" name="premiumTierLimits.maxTravelPlans" type="number" value={formState.premiumTierLimits.maxTravelPlans} onChange={handleChange} />
              </div>
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
