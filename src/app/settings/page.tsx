
"use client";

import * as React from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { db, auth } from "@/lib/firebase"; // Added auth
import { doc, getDoc, setDoc } from "firebase/firestore";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth"; // Added Firebase auth functions
import { Skeleton } from "@/components/ui/skeleton";
import { Settings as SettingsIcon, Save, UserCircle, Languages, KeyRound, AlertTriangle } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import { useTranslation } from "@/hooks/use-translation";
import type { Language } from "@/types";
import { DEFAULT_APP_SETTINGS } from "@/contexts/app-settings-context";

export default function SettingsPage() {
  const { user, isAuthenticated, isLoading: authIsLoading, refreshUser } = useAuth(); 
  const { toast } = useToast();
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();

  const [familyProfile, setFamilyProfile] = React.useState("");
  const [isLoadingSettings, setIsLoadingSettings] = React.useState(true);
  const [isSavingFamilyProfile, setIsSavingFamilyProfile] = React.useState(false);
  const [selectedLanguage, setSelectedLanguage] = React.useState<Language>(language);

  // Password Management State
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [passwordProviderExists, setPasswordProviderExists] = React.useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = React.useState(false);
  const [passwordError, setPasswordError] = React.useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = React.useState<string | null>(null);


  React.useEffect(() => {
    setSelectedLanguage(language);
  }, [language]);

  const translatedDefaultProfileText = React.useMemo(() => t('defaultFamilyProfileSettingText'), [t]);

  React.useEffect(() => {
    const loadSettings = async () => {
      if (!isAuthenticated || !user) {
        setFamilyProfile(translatedDefaultProfileText);
        setPasswordProviderExists(false);
        setIsLoadingSettings(false);
        return;
      }

      setIsLoadingSettings(true);
      try {
        // Check for password provider
        const currentUser = auth.currentUser;
        if (currentUser) {
          const providerData = currentUser.providerData;
          setPasswordProviderExists(providerData.some(provider => provider.providerId === EmailAuthProvider.PROVIDER_ID));
        }

        const profileRef = doc(db, "users", user.uid, "profile", "mainProfile");
        const profileSnap = await getDoc(profileRef);
        if (profileSnap.exists() && profileSnap.data().description) {
          const desc = profileSnap.data().description;
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
        toast({ title: t('error'), description: t('settingsLoadError'), variant: "destructive" });
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
      toast({ title: t('login'), description: t('loginToSaveSettingsDesc'), variant: "destructive" });
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
    setLanguage(lang);
    toast({ title: t('language'), description: `${t('language')} ${lang === 'tr' ? 'Türkçe' : 'English'} ${t('selectedStatus')}.` });
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!auth.currentUser) {
      setPasswordError(t('passwordErrorNotLoggedIn'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t('passwordErrorMismatch'));
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError(t('passwordErrorTooShort'));
      return;
    }

    setIsUpdatingPassword(true);
    try {
      if (passwordProviderExists) { // Change existing password
        if (!currentPassword) {
          setPasswordError(t('passwordErrorCurrentRequired'));
          setIsUpdatingPassword(false);
          return;
        }
        const credential = EmailAuthProvider.credential(auth.currentUser.email!, currentPassword);
        await reauthenticateWithCredential(auth.currentUser, credential);
        await updatePassword(auth.currentUser, newPassword);
        setPasswordSuccess(t('passwordChangeSuccess'));
        await refreshUser(); // Refresh user state after successful change
      } else { // Set new password for OAuth user
        await updatePassword(auth.currentUser, newPassword);
        setPasswordSuccess(t('passwordSetSuccess'));
        setPasswordProviderExists(true); // Password provider now exists
        await refreshUser(); // Refresh user state to update providerData
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error("Password update error:", error.code, error.message);
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        setPasswordError(t('passwordErrorWrongCurrent'));
      } else if (error.code === 'auth/requires-recent-login') {
        setPasswordError(t('passwordErrorRequiresRecentLogin'));
      } else {
        setPasswordError(t('passwordErrorGeneric'));
      }
    } finally {
      setIsUpdatingPassword(false);
    }
  };


  if (authIsLoading || isLoadingSettings) {
    return (
      <div className="container mx-auto max-w-2xl p-4 space-y-6 py-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-1/3" />
        </div>
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader><Skeleton className="h-6 w-1/4" /></CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-20 w-full" />
            </CardContent>
            <CardFooter><Skeleton className="h-10 w-32" /></CardFooter>
          </Card>
        ))}
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto max-w-2xl p-4 flex flex-col items-center justify-center py-12 text-center">
        <SettingsIcon size={48} className="text-muted-foreground mb-4" />
        <h1 className="text-2xl font-semibold mb-2">{t('settings')}</h1>
        <p className="text-muted-foreground mb-4">{t('loginToManageSettings')}</p>
        <Link href="/login" passHref>
          <Button>{t('loginButton')}</Button>
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
          <CardTitle className="text-lg flex items-center gap-2"><KeyRound /> {t('passwordManagementTitle')}</CardTitle>
          <CardDescription>
            {passwordProviderExists ? t('changePasswordDesc') : t('setPasswordDesc')}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handlePasswordUpdate}>
          <CardContent className="space-y-4">
            {passwordError && (
              <div className="p-3 border rounded-md bg-destructive/10 text-destructive text-sm flex items-center gap-2">
                <AlertTriangle size={16} /> {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className="p-3 border rounded-md bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm">
                {passwordSuccess}
              </div>
            )}
            {passwordProviderExists && (
              <div>
                <Label htmlFor="currentPassword">{t('currentPasswordLabel')}</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={isUpdatingPassword}
                  className="mt-1"
                />
              </div>
            )}
            <div>
              <Label htmlFor="newPassword">{t('newPasswordLabel')}</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                disabled={isUpdatingPassword}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">{t('confirmNewPasswordLabel')}</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                disabled={isUpdatingPassword}
                className="mt-1"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isUpdatingPassword}>
              <Save className="mr-2 h-4 w-4" /> 
              {isUpdatingPassword ? t('saving') : (passwordProviderExists ? t('updatePasswordButton') : t('setPasswordButton'))}
            </Button>
          </CardFooter>
        </form>
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
    
