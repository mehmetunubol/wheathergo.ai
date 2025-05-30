
"use client";

import * as React from "react";
import type { WeatherData, ClothingSuggestionsOutput, Language, User, DailyUsage } from "@/types";
import { USAGE_LIMITS } from "@/types"; // Import limits
import { generateVisualOutfit } from "@/ai/flows/generate-visual-outfit-flow";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageIcon, Sparkles, AlertTriangle, Wand2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/use-translation";
import { useAuth } from "@/hooks/use-auth";
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

  const [generatedImageUrl, setGeneratedImageUrl] = React.useState<string | null>(null);
  const [isProcessingImage, setIsProcessingImage] = React.useState(false);
  const [generationError, setGenerationError] = React.useState<string | null>(null);
  const [canGenerateImage, setCanGenerateImage] = React.useState(true); // Assume true initially

  const checkImageGenerationLimit = React.useCallback(async () => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    if (!isAuthenticated || !user) {
      // Non-authenticated user logic (localStorage)
      const storedUsageRaw = localStorage.getItem('weatherugo-dailyImageGenerations');
      const storedUsage: DailyUsage = storedUsageRaw ? JSON.parse(storedUsageRaw) : { date: '', count: 0 };
      if (storedUsage.date === todayStr && storedUsage.count >= USAGE_LIMITS.freeTier.dailyImageGenerations) {
        toast({ title: t('limitReachedTitle'), description: t('dailyImageGenerationLimitReached'), variant: "destructive" });
        return false;
      }
      return true;
    } else {
      // Authenticated user logic (Firestore)
      const userDocRef = doc(db, "users", user.uid);
      try {
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data() as User;
          const limit = userData.isPremium ? USAGE_LIMITS.premiumTier.dailyImageGenerations : USAGE_LIMITS.freeTier.dailyImageGenerations;
          const usage = userData.dailyImageGenerations || { count: 0, date: '' };
          if (usage.date === todayStr && usage.count >= limit) {
            toast({ title: t('limitReachedTitle'), description: t('dailyImageGenerationLimitReached'), variant: "destructive" });
            return false;
          }
        }
      } catch (error) {
        console.error("Error checking image generation limit:", error);
        toast({ title: t('error'), description: "Could not verify usage limits.", variant: "destructive" });
        return false; // Prevent generation if limit check fails
      }
      return true;
    }
  }, [isAuthenticated, user, t, toast]);

  const updateImageGenerationCount = async () => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    if (!isAuthenticated || !user) {
      // Non-authenticated user logic (localStorage)
      const storedUsageRaw = localStorage.getItem('weatherugo-dailyImageGenerations');
      let storedUsage: DailyUsage = storedUsageRaw ? JSON.parse(storedUsageRaw) : { date: '', count: 0 };
      if (storedUsage.date === todayStr) {
        storedUsage.count += 1;
      } else {
        storedUsage = { date: todayStr, count: 1 };
      }
      localStorage.setItem('weatherugo-dailyImageGenerations', JSON.stringify(storedUsage));
    } else {
      // Authenticated user logic (Firestore)
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
        // Optionally notify user, but primary action (image generation) already happened
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

    const canProceed = await checkImageGenerationLimit();
    if (!canProceed) {
        setCanGenerateImage(false); // Update UI if needed, e.g. to disable button more permanently for the session
        return;
    }
    setCanGenerateImage(true); // Reset if previously false

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
        throw new Error(t('imageGenerationErrorDefault'));
      }
    } catch (error: any) {
      console.error("Outfit visualization error:", error);
      const userFriendlyError = error.message && error.message.includes('API key issue')
        ? t('imageGenerationApiKeyError')
        : t('imageGenerationErrorDefault');
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

  const canTryToGenerate = weatherData && clothingSuggestions && clothingSuggestions.suggestions.length > 0 && familyProfile && !isLoadingParentData && canGenerateImage;

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
