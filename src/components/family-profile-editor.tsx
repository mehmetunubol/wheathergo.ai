
"use client";

import * as React from "react";
import { Users, Save, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/hooks/use-translation";

interface FamilyProfileEditorProps {
  profile: string; 
  onProfileSave: (profile: string) => void; 
}

export function FamilyProfileEditor({
  profile: initialProfile,
  onProfileSave,
}: FamilyProfileEditorProps) {
  const { t } = useTranslation();
  const [currentProfile, setCurrentProfile] = React.useState(initialProfile);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading: authIsLoading } = useAuth();

  // This default might need translation or to be a key from translations.ts
  const defaultProfileText = t('familyProfilePlaceholder'); 

  React.useEffect(() => {
    const fetchProfile = async () => {
      if (isAuthenticated && user) {
        setIsLoading(true);
        try {
          const profileRef = doc(db, "users", user.uid, "profile", "mainProfile");
          const docSnap = await getDoc(profileRef);
          if (docSnap.exists()) {
            const profileData = docSnap.data().description || "";
            setCurrentProfile(profileData);
            onProfileSave(profileData); 
          } else {
            setCurrentProfile(initialProfile || defaultProfileText); 
            onProfileSave(initialProfile || defaultProfileText);
          }
        } catch (error) {
          console.error("Error fetching family profile:", error);
          toast({
            title: t('error'),
            description: "Could not load your family profile from the cloud.", // Consider t('loadProfileError')
            variant: "destructive",
          });
          setCurrentProfile(initialProfile || defaultProfileText); 
          onProfileSave(initialProfile || defaultProfileText);
        } finally {
          setIsLoading(false);
        }
      } else if (!authIsLoading) {
        const storedProfile = localStorage.getItem("weatherugo-familyProfile");
        const profileToSet = storedProfile || initialProfile || defaultProfileText;
        setCurrentProfile(profileToSet);
        onProfileSave(profileToSet);
        setIsLoading(false);
      }
    };

    if (!authIsLoading) {
      fetchProfile();
    }
  }, [user, isAuthenticated, authIsLoading, toast, initialProfile, onProfileSave, t, defaultProfileText]);


  const handleSave = async () => {
    if (!isAuthenticated || !user) {
      localStorage.setItem("weatherugo-familyProfile", currentProfile);
      onProfileSave(currentProfile);
      toast({
        title: t('familyProfileSaveLocal'),
        description: "Your family profile has been saved to this browser. Log in to save to the cloud.",
      });
      return;
    }

    setIsSaving(true);
    try {
      const profileRef = doc(db, "users", user.uid, "profile", "mainProfile");
      await setDoc(profileRef, { description: currentProfile, updatedAt: new Date().toISOString() }, { merge: true });
      onProfileSave(currentProfile); 
      toast({
        title: t('familyProfileSaveSuccess'),
        description: "Your family profile has been updated in the cloud.",
      });
    } catch (error) {
      console.error("Error saving family profile:", error);
      toast({
        title: t('familyProfileSaveError'),
        description: "Could not save your family profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (authIsLoading || isLoading) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <Skeleton className="h-7 w-1/2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-3/4 mb-2" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
        <CardFooter>
          <Skeleton className="h-10 w-full" />
        </CardFooter>
      </Card>
    );
  }

  const profileTextarea = (
    <Textarea
      id="family-profile"
      value={currentProfile}
      onChange={(e) => setCurrentProfile(e.target.value)}
      placeholder={t('familyProfilePlaceholder')}
      className="mt-1 min-h-[100px]"
      disabled={isSaving}
    />
  );

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <Users className="text-primary" />
          {t('familyProfile')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Label htmlFor="family-profile" className="text-sm font-medium">
          {t('familyProfileDescription')}
        </Label>
        {!isAuthenticated ? (
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                {profileTextarea}
              </TooltipTrigger>
              <TooltipContent side="top" align="start" className="bg-background border-border shadow-lg p-3 max-w-xs">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <p className="font-semibold text-foreground">{t('notLoggedInWarning')}</p>
                    <p className="text-muted-foreground">
                      {t('notLoggedInDetails')}
                    </p>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          profileTextarea
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={handleSave} className="w-full" disabled={isSaving || isLoading}>
          {isSaving ? t('saving') : <><Save className="mr-2 h-4 w-4" /> {t('saveFamilyProfile')}</>}
        </Button>
      </CardFooter>
    </Card>
  );
}
