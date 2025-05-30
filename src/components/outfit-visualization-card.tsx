
"use client";

import * as React from "react";
import type { WeatherData, ClothingSuggestionsOutput, Language, User, DailyUsage, AppSettings } from "@/types";
import { generateVisualOutfit } from "@/ai/flows/generate-visual-outfit-flow";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageIcon, Sparkles, AlertTriangle, Wand2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/use-translation";
import { useAuth } from "@/hooks/use-auth";
import { useAppSettings } from "@/contexts/app-settings-context"; 
import { db } from "@/lib/firebase";
import { doc, updateDoc, getDoc, runTransaction } from "firebase/firestore";
import { format } from 'date-fns';

interface OutfitVisualizationCardProps {
  weatherData: WeatherData | null;
  familyProfile: string;
  clothingSuggestions: ClothingSuggestionsOutput | null;
  language: Language;
  isLoadingParentData: boolean; 
}

export function OutfitVisualizationCard({
  weatherData,
  familyProfile,
  clothingSuggestions,
  language,
  isLoadingParentData,
}: OutfitVisualizationCardProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const { settings: appSettings, isLoadingSettings: appSettingsLoading } = useAppSettings(); 

  const [generatedImageUrl, setGeneratedImageUrl] = React.useState<string | null>(null);
  const [isProcessingImage, setIsProcessingImage] = React.useState(false);
  const [generationError, setGenerationError] = React.useState<string | null>(null);
  const [canGenerateImage, setCanGenerateImage] = React.useState(true); 

  const checkImageGenerationLimit = React.useCallback(async () => {
    if (appSettingsLoading) return false; 

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const limits = user?.isPremium ? appSettings.premiumTierLimits : appSettings.freeTierLimits;
    const currentLimit = limits.dailyImageGenerations;

    if (!isAuthenticated || !user) {
      const storedUsageRaw = localStorage.getItem('weatherugo-dailyImageGenerations');
      const storedUsage: DailyUsage = storedUsageRaw ? JSON.parse(storedUsageRaw) : { date: '', count: 0 };
      if (storedUsage.date === todayStr && storedUsage.count >= currentLimit) {
        toast({ title: t('limitReachedTitle'), description: t('dailyImageGenerationLimitReached'), variant: "destructive" });
        return false;
      }
      return true;
    } else {
      const userDocRef = doc(db, "users", user.uid);
      try {
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data() as User;
          const usage = userData.dailyImageGenerations || { count: 0, date: '' };
          if (usage.date === todayStr && usage.count >= currentLimit) {
            toast({ title: t('limitReachedTitle'), description: t('dailyImageGenerationLimitReached'), variant: "destructive" });
            return false;
          }
        }
      } catch (error) {
        console.error("Error checking image generation limit:", error);
        toast({ title: t('error'), description: "Could not verify usage limits.", variant: "destructive" });
        return false; 
      }
      return true;
    }
  }, [isAuthenticated, user, t, toast, appSettings.freeTierLimits, appSettings.premiumTierLimits, appSettingsLoading]);

  const updateImageGenerationCount = async () => {
    if (appSettingsLoading) return; 

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    if (!isAuthenticated || !user) {
      const storedUsageRaw = localStorage.getItem('weatherugo-dailyImageGenerations');
      let storedUsage: DailyUsage = storedUsageRaw ? JSON.parse(storedUsageRaw) : { date: '', count: 0 };
      if (storedUsage.date === todayStr) {
        storedUsage.count += 1;
      } else {
        storedUsage = { date: todayStr, count: 1 };
      }
      localStorage.setItem('weatherugo-dailyImageGenerations', JSON.stringify(storedUsage));
    } else {
      const userDocRef = doc(db, "users", user.uid);
      try {
        await runTransaction(db, async (transaction) => {
          const userDocSnap = await transaction.get(userDocRef);
          if (!userDocSnap.exists()) {
            throw new Error("User document does not exist!");
          }
          const userData = userDocSnap.data() as User;
          const currentUsage = userData.dailyImageGenerations || { count: 0, date: '' };
          const newCount = currentUsage.date === todayStr ? currentUsage.count + 1 : 1;
          transaction.update(userDocRef, { 
            dailyImageGenerations: { count: newCount, date: todayStr }
          });
        });
      } catch (error) {
        console.error("Error updating image generation count:", error);
      }
    }
  };


  const handleGenerateImage = async () => {
    if (!weatherData || !clothingSuggestions || !familyProfile) {
      toast({
        title: t('error'),
        description: t('visualizationPrerequisitesError'),
        variant: "destructive",
      });
      return;
    }

    if (appSettingsLoading) {
        toast({ title: t('error'), description: "App settings still loading, please wait.", variant: "destructive"});
        return;
    }

    const canProceed = await checkImageGenerationLimit();
    if (!canProceed) {
        setCanGenerateImage(false); 
        return;
    }
    setCanGenerateImage(true);

    setIsProcessingImage(true);
    setGeneratedImageUrl(null);
    setGenerationError(null);

    try {
      const result = await generateVisualOutfit({
        weatherData,
        familyProfile,
        clothingSuggestions,
        language,
      });

      if (result && result.generatedImageUrl) {
        setGeneratedImageUrl(result.generatedImageUrl);
        await updateImageGenerationCount();
        toast({
          title: t('visualizationSuccessTitle'),
          description: t('visualizationSuccessDesc'),
        });
      } else {
        // This case should ideally be caught by errors thrown from generateVisualOutfitFlow
        throw new Error(t('imageGenerationErrorDefault'));
      }
    } catch (error: any) {
      console.error("Outfit visualization error (client-side catch):", error);
      let userFriendlyError = t('imageGenerationAIBusyError'); // Default to "AI busy"
       if (error.message && error.message.toLowerCase().includes('api key issue')) {
        userFriendlyError = t('imageGenerationApiKeyError');
      }
      // Detailed error is logged above, user sees the friendly message.

      setGenerationError(userFriendlyError);
      toast({
        title: t('imageGenerationErrorTitle'),
        description: userFriendlyError,
        variant: "destructive",
      });
    } finally {
      setIsProcessingImage(false);
    }
  };

  const canTryToGenerate = weatherData && clothingSuggestions && clothingSuggestions.suggestions.length > 0 && familyProfile && !isLoadingParentData && canGenerateImage && !appSettingsLoading;

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Wand2 className="text-primary h-5 w-5" /> {t('visualizeOutfitTitle')} <Sparkles className="text-accent h-4 w-4" />
        </CardTitle>
        <CardDescription>{t('visualizeOutfitDescription')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={handleGenerateImage}
          disabled={!canTryToGenerate || isProcessingImage}
          className="w-full"
        >
          <ImageIcon className="mr-2 h-4 w-4" />
          {isProcessingImage ? t('generatingButton') : t('generateOutfitImageButton')}
        </Button>

        {isProcessingImage && (
          <div className="text-center py-4">
            <Skeleton className="h-64 w-full rounded-md" />
            <p className="text-sm text-muted-foreground mt-2 animate-pulse">{t('generatingImageMessage')}</p>
          </div>
        )}

        {generationError && !isProcessingImage && (
          <div className="text-center py-4 text-destructive flex flex-col items-center gap-2">
            <AlertTriangle size={40} />
            <p className="font-semibold">{t('imageGenerationErrorTitle')}</p>
            <p className="text-sm">{generationError}</p>
          </div>
        )}

        {generatedImageUrl && !isProcessingImage && (
          <div className="mt-4 border rounded-md overflow-hidden shadow-sm aspect-square max-w-full mx-auto">
            <img
              src={generatedImageUrl}
              alt={t('visualizedOutfitAlt')}
              className="w-full h-full object-contain"
              data-ai-hint="generated outfit fashion"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

