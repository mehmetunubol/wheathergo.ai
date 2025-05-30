
"use client";

import * as React from "react";
import type { WeatherData, ClothingSuggestionsOutput, Language } from "@/types";
import { generateVisualOutfit, type GenerateVisualOutfitOutput } from "@/ai/flows/generate-visual-outfit-flow";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Image as ImageIcon, Sparkles, AlertTriangle, Wand2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/use-translation";

interface OutfitVisualizationCardProps {
  weatherData: WeatherData | null;
  familyProfile: string;
  clothingSuggestions: ClothingSuggestionsOutput | null;
  language: Language;
  isLoadingParentData: boolean; // To know if suggestions/weather are still loading
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

  const [generatedImageUrl, setGeneratedImageUrl] = React.useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = React.useState(false);
  const [generationError, setGenerationError] = React.useState<string | null>(null);

  const handleGenerateImage = async () => {
    if (!weatherData || !clothingSuggestions || !familyProfile) {
      toast({
        title: t('error'),
        description: t('visualizationPrerequisitesError'),
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingImage(true);
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
      setIsGeneratingImage(false);
    }
  };

  const canGenerate = weatherData && clothingSuggestions && clothingSuggestions.suggestions.length > 0 && familyProfile && !isLoadingParentData;

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
          disabled={!canGenerate || isGeneratingImage}
          className="w-full"
        >
          <ImageIcon className="mr-2 h-4 w-4" />
          {isGeneratingImage ? t('generatingButton') : t('generateOutfitImageButton')}
        </Button>

        {isGeneratingImage && (
          <div className="text-center py-4">
            <Skeleton className="h-64 w-full rounded-md" />
            <p className="text-sm text-muted-foreground mt-2 animate-pulse">{t('generatingImageMessage')}</p>
          </div>
        )}

        {generationError && !isGeneratingImage && (
          <div className="text-center py-4 text-destructive flex flex-col items-center gap-2">
            <AlertTriangle size={40} />
            <p className="font-semibold">{t('imageGenerationErrorTitle')}</p>
            <p className="text-sm">{generationError}</p>
          </div>
        )}

        {generatedImageUrl && !isGeneratingImage && (
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
