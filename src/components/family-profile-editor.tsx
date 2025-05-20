"use client";

import * as React from "react";
import { Users, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface FamilyProfileEditorProps {
  profile: string;
  onProfileSave: (profile: string) => void;
}

export function FamilyProfileEditor({
  profile,
  onProfileSave,
}: FamilyProfileEditorProps) {
  const [currentProfile, setCurrentProfile] = React.useState(profile);
  const { toast } = useToast();

  React.useEffect(() => {
    setCurrentProfile(profile);
  }, [profile]);

  const handleSave = () => {
    onProfileSave(currentProfile);
    toast({
      title: "Profile Saved",
      description: "Your family profile has been updated.",
    });
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <Users className="text-primary" />
          Family Profile
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Label htmlFor="family-profile" className="text-sm font-medium">
          Describe your family members (e.g., ages, sensitivities, pets)
        </Label>
        <Textarea
          id="family-profile"
          value={currentProfile}
          onChange={(e) => setCurrentProfile(e.target.value)}
          placeholder="E.g., Two adults, one 2-year-old baby sensitive to cold, one dog."
          className="mt-1 min-h-[100px]"
        />
      </CardContent>
      <CardFooter>
        <Button onClick={handleSave} className="w-full">
          <Save className="mr-2 h-4 w-4" /> Save Profile
        </Button>
      </CardFooter>
    </Card>
  );
}
