
"use client";

import { TravelPlannerCard } from "@/components/travel-planner-card";
import { useTranslation } from "@/hooks/use-translation";

export default function TravelPlannerPage() {
  const { t } = useTranslation();
  return (
    <div className="container mx-auto max-w-2xl p-4 space-y-6">
      <h1 className="text-2xl font-semibold">{t('travelPlannerTitle')}</h1>
      <p className="text-muted-foreground">
        {t('travelPlannerDescription')}
      </p>
      <TravelPlannerCard />
    </div>
  );
}
