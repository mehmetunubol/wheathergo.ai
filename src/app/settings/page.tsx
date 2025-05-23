
"use client";

import * as React from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { Settings as SettingsIcon, Save, UserCircle } from "lucide-react";

const DEFAULT_FAMILY_PROFILE_SETTING = "A single adult enjoying good weather.";

export default function SettingsPage() {
  const { user, isAuthenticated, isLoading: authIsLoading } = useAuth();
  const { toast } = useToast();

  const [familyProfile, setFamilyProfile] = React.useState("");
  const [isLoadingSettings, setIsLoadingSettings] = React.useState(true);
  const [isSavingFamilyProfile, setIsSavingFamilyProfile] = React.useState(false);

  React.useEffect(() => {
    const loadSettings = async () => {
      if (!isAuthenticated || !user) {
        setFamilyProfile(DEFAULT_FAMILY_PROFILE_SETTING);
        setIsLoadingSettings(false);
        return;
      }

      setIsLoadingSettings(true);
      try {
        // Load family profile
        const profileRef = doc(db, "users", user.uid, "profile", "mainProfile");
        const profileSnap = await getDoc(profileRef);
        if (profileSnap.exists() && profileSnap.data().description) {
          setFamilyProfile(profileSnap.data().description);
        } else {
          setFamilyProfile(DEFAULT_FAMILY_PROFILE_SETTING);
        }

      } catch (error) {
        console.error("Error loading settings:", error);
        toast({ title: "Error", description: "Could not load settings.", variant: "destructive" });
        setFamilyProfile(DEFAULT_FAMILY_PROFILE_SETTING);
      } finally {
        setIsLoadingSettings(false);
      }
    };

    if (!authIsLoading) {
      loadSettings();
    }
  }, [user, isAuthenticated, authIsLoading, toast]);

  const handleSaveFamilyProfile = async () => {
    if (!isAuthenticated || !user) {
      toast({ title: "Login Required", description: "Please log in to save settings.", variant: "destructive" });
      return;
    }
    setIsSavingFamilyProfile(true);
    try {
      const profileRef = doc(db, "users", user.uid, "profile", "mainProfile");
      await setDoc(profileRef, { description: familyProfile, updatedAt: new Date().toISOString() }, { merge: true });
      toast({ title: "Family Profile Saved", description: "Your family profile has been updated." });
    } catch (error) {
      console.error("Error saving family profile:", error);
      toast({ title: "Save Error", description: "Could not save family profile.", variant: "destructive" });
    } finally {
      setIsSavingFamilyProfile(false);
    }
  };

  if (authIsLoading || isLoadingSettings) {
    return (
      <div className="space-y-6 py-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-1/3" />
        </div>
        <Card>
          <CardHeader><Skeleton className="h-6 w-1/4" /></CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
          <CardFooter><Skeleton className="h-10 w-32" /></CardFooter>
        </Card>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <SettingsIcon size={48} className="text-muted-foreground mb-4" />
        <h1 className="text-2xl font-semibold mb-2">Settings</h1>
        <p className="text-muted-foreground mb-4">Please log in to manage your application settings.</p>
        <Link href="/login" passHref>
          <Button>Log In / Sign Up</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <SettingsIcon className="h-6 w-6 text-primary" /> Application Settings
        </h1>
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><UserCircle /> Family Profile</CardTitle>
          <CardDescription>
            This profile is used by the AI to provide personalized weather and activity suggestions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Label htmlFor="family-profile-setting">Describe your family or group</Label>
          <Textarea
            id="family-profile-setting"
            value={familyProfile}
            onChange={(e) => setFamilyProfile(e.target.value)}
            placeholder="E.g., Two adults, one 5-year-old child who loves parks, and a small dog."
            className="mt-1 min-h-[100px]"
            disabled={isSavingFamilyProfile}
          />
        </CardContent>
        <CardFooter>
          <Button onClick={handleSaveFamilyProfile} disabled={isSavingFamilyProfile || familyProfile === ""}>
            <Save className="mr-2 h-4 w-4" /> {isSavingFamilyProfile ? "Saving..." : "Save Family Profile"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
