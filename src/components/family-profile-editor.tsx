
"use client";

import * as React from "react";
import { Users, Save, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";


interface FamilyProfileEditorProps {
  profile: string; // This will now be an initial value, actual state managed internally
  onProfileSave: (profile: string) => void; // Callback for parent to update its state if needed
}

export function FamilyProfileEditor({
  profile: initialProfile,
  onProfileSave,
}: FamilyProfileEditorProps) {
  const [currentProfile, setCurrentProfile] = React.useState(initialProfile);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading: authIsLoading } = useAuth();

  React.useEffect(() => {
    const fetchProfile = async () => {
      if (isAuthenticated && user) {
        setIsLoading(true);
        try {
          const profileRef = doc(db, "users", user.uid, "profile", "mainProfile");
          const docSnap = await getDoc(profileRef);
          if (docSnap.exists()) {
            setCurrentProfile(docSnap.data().description || "");
            onProfileSave(docSnap.data().description || ""); // Notify parent
          } else {
            setCurrentProfile(initialProfile); // Use initial if nothing in DB
            onProfileSave(initialProfile);
          }
        } catch (error) {
          console.error("Error fetching family profile:", error);
          toast({
            title: "Error",
            description: "Could not load your family profile from the cloud.",
            variant: "destructive",
          });
          setCurrentProfile(initialProfile); // Fallback to initial
          onProfileSave(initialProfile);
        } finally {
          setIsLoading(false);
        }
      } else if (!authIsLoading) {
        // Not authenticated or user object not yet available, but auth loading finished
        // Use localStorage or default
        const storedProfile = localStorage.getItem("weatherugo-familyProfile");
        const profileToSet = storedProfile || initialProfile;
        setCurrentProfile(profileToSet);
        onProfileSave(profileToSet);
        setIsLoading(false);
      }
    };

    if (!authIsLoading) {
      fetchProfile();
    }
  }, [user, isAuthenticated, authIsLoading, toast, initialProfile, onProfileSave]);


  const handleSave = async () => {
    if (!isAuthenticated || !user) {
      // Save to localStorage if not authenticated
      localStorage.setItem("weatherugo-familyProfile", currentProfile);
      onProfileSave(currentProfile);
      toast({
        title: "Profile Saved Locally",
        description: "Your family profile has been saved to this browser. Log in to save to the cloud.",
      });
      return;
    }

    setIsSaving(true);
    try {
      const profileRef = doc(db, "users", user.uid, "profile", "mainProfile");
      await setDoc(profileRef, { description: currentProfile, updatedAt: new Date().toISOString() }, { merge: true });
      onProfileSave(currentProfile); // Notify parent of the change
      toast({
        title: "Profile Saved",
        description: "Your family profile has been updated in the cloud.",
      });
    } catch (error) {
      console.error("Error saving family profile:", error);
      toast({
        title: "Save Error",
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

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <Users className="text-primary" />
          Family Profile
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!isAuthenticated && (
          <Alert variant="default" className="mb-4 text-sm">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You are not logged in. Profile changes will be saved locally to this browser.
            </AlertDescription>
          </Alert>
        )}
        <Label htmlFor="family-profile" className="text-sm font-medium">
          Describe your family members (e.g., ages, sensitivities, pets)
        </Label>
        <Textarea
          id="family-profile"
          value={currentProfile}
          onChange={(e) => setCurrentProfile(e.target.value)}
          placeholder="E.g., Two adults, one 2-year-old baby sensitive to cold, one dog."
          className="mt-1 min-h-[100px]"
          disabled={isSaving}
        />
      </CardContent>
      <CardFooter>
        <Button onClick={handleSave} className="w-full" disabled={isSaving || isLoading}>
          {isSaving ? "Saving..." : <><Save className="mr-2 h-4 w-4" /> Save Profile</>}
        </Button>
      </CardFooter>
    </Card>
  );
}
