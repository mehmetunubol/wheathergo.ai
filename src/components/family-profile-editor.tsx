
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
import { DEFAULT_APP_SETTINGS } from "@/contexts/app-settings-context";

interface FamilyProfileEditorProps {
  profile: string;
  onProfileSave: (profile: string) => void;
}

export function FamilyProfileEditor({
  profile: initialProfile,
  onProfileSave,
}: FamilyProfileEditorProps) {
  const { t } = useTranslation();
  const [currentProfile, setCurrentProfile] = React.useState(initialProfile || "");
  const [isLoading, setIsLoading] = React.useState(true); // Local loading for this component's data
  const [isSaving, setIsSaving] = React.useState(false);
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading: authIsLoading } = useAuth();

  const defaultProfileText = React.useMemo(() => t('defaultFamilyProfileSettingText') || DEFAULT_APP_SETTINGS.defaultFamilyProfile, [t]);

  React.useEffect(() => {
    const fetchProfile = async () => {
      let profileToSetAndUpdateParent = "";
      if (isAuthenticated && user) {
        setIsLoading(true);
        try {
          const profileRef = doc(db, "users", user.uid, "profile", "mainProfile");
          const docSnap = await getDoc(profileRef);
          if (docSnap.exists() && docSnap.data().description) {
            profileToSetAndUpdateParent = docSnap.data().description;
          } else {
            profileToSetAndUpdateParent = defaultProfileText;
          }
        } catch (error) {
          console.error("Error fetching family profile:", error);
          toast({
            title: t('error'),
            description: t('familyProfileSaveError'), // Re-using save error for load error as it's user-facing
            variant: "destructive",
          });
          profileToSetAndUpdateParent = defaultProfileText;
        } finally {
          setCurrentProfile(profileToSetAndUpdateParent);
          onProfileSave(profileToSetAndUpdateParent); // Update parent after fetching/defaulting
          setIsLoading(false);
        }
      } else if (!authIsLoading) { // Not authenticated and auth is settled
        const storedProfile = localStorage.getItem("weatherugo-familyProfile");
        profileToSetAndUpdateParent = storedProfile || defaultProfileText;
        setCurrentProfile(profileToSetAndUpdateParent);
        onProfileSave(profileToSetAndUpdateParent); // Update parent for non-auth case
        setIsLoading(false);
      }
    };

    if (!authIsLoading) {
      fetchProfile();
    } else {
      // If auth is loading, we are effectively loading here too until auth settles.
      // The fetchProfile will run once authIsLoading is false.
      setIsLoading(true); 
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAuthenticated, authIsLoading, defaultProfileText]); // onProfileSave removed to prevent loops if parent's callback isn't memoized perfectly, toast, t removed


  React.useEffect(() => {
    // This effect syncs currentProfile with initialProfile (from parent) if it changes
    // AFTER the initial loading is complete. This is to handle cases where the parent
    // might update the profile prop externally.
    if (!isLoading && initialProfile !== currentProfile) {
      if (initialProfile && initialProfile !== defaultProfileText) {
        setCurrentProfile(initialProfile);
      } else if (!initialProfile && currentProfile !== defaultProfileText) {
        setCurrentProfile(defaultProfileText);
      } else if (initialProfile === defaultProfileText && currentProfile !== defaultProfileText) {
        // If parent resets to default, and local isn't default, update local.
        setCurrentProfile(defaultProfileText);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialProfile, isLoading, defaultProfileText]); // currentProfile removed from deps


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
      
      // Explicitly set isSaving to false BEFORE calling onProfileSave to ensure UI is responsive
      // to the change even if parent re-render is quick.
      setIsSaving(false); 
      onProfileSave(currentProfile); // Notify parent of the change
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
      setIsSaving(false); // Ensure isSaving is false on error too
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
      disabled={isSaving} // Only disabled by isSaving
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
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                {/* Ensure the child of TooltipTrigger can receive a ref if needed, Button/Input/Textarea usually can */}
                <div className="w-full">{profileTextarea}</div> 
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
        <Button 
          onClick={handleSave} 
          className="w-full" 
          disabled={isSaving || (!isAuthenticated && currentProfile === "") || (isAuthenticated && (currentProfile === "" || isLoading )) }
        >
          {isSaving ? t('saving') : <><Save className="mr-2 h-4 w-4" /> {t('saveFamilyProfile')}</>}
        </Button>
      </CardFooter>
    </Card>
  );
}
