
"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OutfitSuggestionsCard } from "./outfit-suggestions-card";
import { ActivitySuggestionsCard } from "./activity-suggestions-card";
import type { ClothingSuggestionsOutput } from "@/ai/flows/clothing-suggestions";
import type { ActivitySuggestionsOutput } from "@/ai/flows/activity-suggestions";
import { useTranslation } from "@/hooks/use-translation";

interface SuggestionsTabsProps {
  outfitSuggestions: ClothingSuggestionsOutput | null;
  isOutfitLoading: boolean;
  activitySuggestions: ActivitySuggestionsOutput | null;
  isActivityLoading: boolean;
  outfitLimitReached?: boolean;
  activityLimitReached?: boolean;
}

export function SuggestionsTabs({
  outfitSuggestions,
  isOutfitLoading,
  activitySuggestions,
  isActivityLoading,
  outfitLimitReached,
  activityLimitReached,
}: SuggestionsTabsProps) {
  const { t } = useTranslation();
  return (
    <Tabs defaultValue="outfits" className="w-full">
      <TabsList className="grid w-full grid-cols-2 bg-primary/10">
        <TabsTrigger value="outfits" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">{t('outfitIdeas')}</TabsTrigger>
        <TabsTrigger value="activities" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">{t('activityIdeas')}</TabsTrigger>
      </TabsList>
      <TabsContent value="outfits" className="mt-4">
        <OutfitSuggestionsCard 
          suggestions={outfitSuggestions} 
          isLoading={isOutfitLoading} 
          limitReached={outfitLimitReached} 
        />
      </TabsContent>
      <TabsContent value="activities" className="mt-4">
        <ActivitySuggestionsCard 
          suggestions={activitySuggestions} 
          isLoading={isActivityLoading} 
          limitReached={activityLimitReached}
        />
      </TabsContent>
    </Tabs>
  );
}
