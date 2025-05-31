
"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CreditCard, ArrowLeft, Gem, LogIn, Mail } from "lucide-react"; // Added Mail
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import type { User } from "@/types";
import { useTranslation } from "@/hooks/use-translation";

export default function SubscriptionPage() {
  const { user, isAuthenticated, isLoading: authIsLoading, refreshUser } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [currentUserData, setCurrentUserData] = React.useState<User | null>(null);
  const [isLoadingUserData, setIsLoadingUserData] = React.useState(true);
  const contactEmail = "support@weatherugo.com";

  React.useEffect(() => {
    const fetchUserData = async () => {
      if (isAuthenticated && user) {
        setIsLoadingUserData(true);
        try {
          const userDocRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists()) {
            setCurrentUserData(docSnap.data() as User);
          } else {
             setCurrentUserData(user); 
          }
        } catch (error) {
          console.error("Error fetching user data for subscription page:", error);
          setCurrentUserData(user); 
        } finally {
          setIsLoadingUserData(false);
        }
      } else if (!authIsLoading) {
        setIsLoadingUserData(false);
      }
    };
    fetchUserData();
  }, [isAuthenticated, user, authIsLoading]);

  const handleCancelSubscription = async () => {
    if (!user) return;
    setIsProcessing(true);
    // TODO: Integrate PayTR cancellation logic here
    try {
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, { isPremium: false });
      await refreshUser(); 
      setCurrentUserData(prev => prev ? {...prev, isPremium: false} : null);
      toast({ title: t('success'), description: t('cancelSuccess') });
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      toast({ title: t('error'), description: t('cancelError'), variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  if (authIsLoading || isLoadingUserData) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Card className="w-full max-w-md text-center shadow-xl">
          <CardHeader>
            <Skeleton className="h-12 w-12 rounded-full bg-primary/10 mx-auto mb-4" />
            <Skeleton className="h-7 w-3/4 mx-auto" />
            <Skeleton className="h-4 w-1/2 mx-auto mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-32 mx-auto" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Gem size={48} className="text-muted-foreground mb-4" />
        <h1 className="text-2xl font-semibold mb-2">{t('loginToSubscribe')}</h1>
        <p className="text-muted-foreground mb-4">{t('loginToSubscribeDetails')}</p>
        <Link href="/login" passHref>
          <Button><LogIn className="mr-2 h-4 w-4" />{t('loginButton')}</Button>
        </Link>
      </div>
    );
  }
  
  const isPremium = currentUserData?.isPremium;

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Card className="w-full max-w-lg text-center shadow-xl">
        <CardHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-4">
            <CreditCard className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">{t('subscriptionTitle')}</CardTitle>
          <CardDescription className="!mt-2">
            {t('subscriptionDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Card className="p-6 bg-card">
            <CardTitle className="text-lg font-semibold mb-2">{t('currentPlan')}</CardTitle>
            {isPremium ? (
              <>
                <div className="flex items-center justify-center gap-2 text-purple-600">
                  <Gem /> 
                  <p className="text-xl font-bold">{t('premiumPlan')}</p>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{t('premiumPlanFeatures')}</p>
              </>
            ) : (
              <>
                <p className="text-xl font-bold text-muted-foreground">{t('freePlan')}</p>
                <p className="text-sm text-muted-foreground mt-1">{t('freePlanFeatures')}</p>
              </>
            )}
          </Card>

          {isPremium ? (
            <div className="space-y-3">
              <Button onClick={handleCancelSubscription} variant="outline" className="w-full" disabled={isProcessing}>
                {isProcessing ? t('cancelling') : t('cancelSubscription')}
              </Button>
               <p className="text-xs text-muted-foreground">{t('cancellationPlaceholder')}</p>
            </div>
          ) : (
            <div className="space-y-3 p-4 border border-dashed rounded-md">
              <p className="text-lg font-semibold text-primary">{t('premiumComingSoonTitle')}</p>
              <p className="text-sm text-muted-foreground">
                {t('premiumComingSoonDesc')}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {t('premiumTrialRequest')}
              </p>
              <a href={`mailto:${contactEmail}?subject=Premium Trial Request`} className="inline-block mt-2">
                <Button variant="outline">
                  <Mail className="mr-2 h-4 w-4" /> {t('contactAdminButton')}
                </Button>
              </a>
            </div>
          )}

          <Link href="/" passHref>
            <Button variant="ghost" className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('backToHome')}
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

    