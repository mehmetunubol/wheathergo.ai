
"use client";

import * as React from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { Settings as SettingsIcon, Save, UserCircle, Languages, MapPin as MapPinIcon } from "lucide-react"; // Renamed MapPin to MapPinIcon
import { useLanguage } from "@/contexts/language-context";
import { useTranslation } from "@/hooks/use-translation";
import type { Language } from "@/types";
import { DEFAULT_APP_SETTINGS } from "@/contexts/app-settings-context"; // Import default settings


export default function SettingsPage() {
  const { user, isAuthenticated, isLoading: authIsLoading } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();

  const [familyProfile, setFamilyProfile] = React.useState("");
  const [isLoadingSettings, setIsLoadingSettings] = React.useState(true);
  const [isSavingFamilyProfile, setIsSavingFamilyProfile] = React.useState(false);
  const [selectedLanguage, setSelectedLanguage] = React.useState<Language>(language);

  React.useEffect(() => {
    setSelectedLanguage(language);
  }, [language]);

  const translatedDefaultProfileText = React.useMemo(() => t('defaultFamilyProfileSettingText'), [t]);

  React.useEffect(() => {
    const loadSettings = async () => {
      if (!isAuthenticated || !user) {
        setFamilyProfile(translatedDefaultProfileText);
        setIsLoadingSettings(false);
        return;
      }

      setIsLoadingSettings(true);
      try {
        const profileRef = doc(db, "users", user.uid, "profile", "mainProfile");
        const profileSnap = await getDoc(profileRef);
        if (profileSnap.exists() && profileSnap.data().description) {
          const desc = profileSnap.data().description;
          // If stored profile is the generic English default, show the localized one instead
          if (desc === DEFAULT_APP_SETTINGS.defaultFamilyProfile) {
            setFamilyProfile(translatedDefaultProfileText);
          } else {
            setFamilyProfile(desc);
          }
        } else {
          setFamilyProfile(translatedDefaultProfileText);
        }
      } catch (error) {
        console.error("Error loading settings:", error);
        toast({ title: t('error'), description: "Could not load settings.", variant: "destructive" });
        setFamilyProfile(translatedDefaultProfileText);
      } finally {
        setIsLoadingSettings(false);
      }
    };

    if (!authIsLoading) {
      loadSettings();
    }
  }, [user, isAuthenticated, authIsLoading, toast, t, translatedDefaultProfileText]);

  const handleSaveFamilyProfile = async () => {
    if (!isAuthenticated || !user) {
      toast({ title: t('login'), description: "Please log in to save settings.", variant: "destructive" });
      return;
    }
    setIsSavingFamilyProfile(true);
    try {
      const profileRef = doc(db, "users", user.uid, "profile", "mainProfile");
      await setDoc(profileRef, { description: familyProfile, updatedAt: new Date().toISOString() }, { merge: true });
      toast({ title: t('familyProfileTitle'), description: t('familyProfileSaveSuccess') });
    } catch (error) {
      console.error("Error saving family profile:", error);
      toast({ title: t('error'), description: t('familyProfileSaveError'), variant: "destructive" });
    } finally {
      setIsSavingFamilyProfile(false);
    }
  };

  const handleLanguageChange = (newLang: string) => {
    const lang = newLang as Language;
    setSelectedLanguage(lang);
    setLanguage(lang); // This will update context and localStorage
    toast({ title: t('language'), description: `${t('language')} ${lang === 'tr' ? 'Türkçe' : 'English'} ${t('selectedStatus') || 'olarak değiştirildi.'}` });
  };


  if (authIsLoading || isLoadingSettings) {
    return (
      <div className="container mx-auto max-w-2xl p-4 space-y-6 py-6">
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
        <Card>
          <CardHeader><Skeleton className="h-6 w-1/4" /></CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto max-w-2xl p-4 flex flex-col items-center justify-center py-12 text-center">
        <SettingsIcon size={48} className="text-muted-foreground mb-4" />
        <h1 className="text-2xl font-semibold mb-2">{t('settings')}</h1>
        <p className="text-muted-foreground mb-4">{t('loginToManageSettings') || "Please log in to manage your application settings."}</p>
        <Link href="/login" passHref>
          <Button>{t('login')} / {t('signUp')}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl p-4 space-y-8 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <SettingsIcon className="h-6 w-6 text-primary" /> {t('appSettingsTitle')}
        </h1>
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><UserCircle /> {t('familyProfileTitle')}</CardTitle>
          <CardDescription>
            {t('familyProfileSettingsDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Label htmlFor="family-profile-setting">{t('familyProfileDescription')}</Label>
          <Textarea
            id="family-profile-setting"
            value={familyProfile}
            onChange={(e) => setFamilyProfile(e.target.value)}
            placeholder={t('familyProfilePlaceholder')}
            className="mt-1 min-h-[100px]"
            disabled={isSavingFamilyProfile}
          />
        </CardContent>
        <CardFooter>
          <Button onClick={handleSaveFamilyProfile} disabled={isSavingFamilyProfile || familyProfile === ""}>
            <Save className="mr-2 h-4 w-4" /> {isSavingFamilyProfile ? t('saving') : t('saveFamilyProfile')}
          </Button>
        </CardFooter>
      </Card>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><Languages /> {t('languageSelection')}</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup value={selectedLanguage} onValueChange={handleLanguageChange}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="tr" id="lang-tr" />
              <Label htmlFor="lang-tr">Türkçe</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="en" id="lang-en" />
              <Label htmlFor="lang-en">English</Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

    </div>
  );
}
