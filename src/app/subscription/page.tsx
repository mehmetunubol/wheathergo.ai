
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "@/hooks/use-translation";

export default function SubscriptionPage() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Card className="w-full max-w-md text-center shadow-xl">
        <CardHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-4">
            <CreditCard className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">{t('subscriptionTitle')}</CardTitle>
          <CardDescription className="!mt-2">
            {t('subscriptionDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-6 border rounded-md bg-muted/50">
            <p className="text-lg font-semibold text-foreground">{t('comingSoon')}</p>
            <p className="text-muted-foreground mt-1">
              {t('comingSoonDesc')}
            </p>
          </div>
          <Link href="/" passHref>
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('backToHome')}
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
