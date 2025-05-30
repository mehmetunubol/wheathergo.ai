
"use client";

import * as React from "react";
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import type { AppSettings } from "@/types";

// Hardcoded default settings, used until Firestore settings are loaded or if Firestore is unavailable.
export const DEFAULT_APP_SETTINGS: AppSettings = {
  defaultLocation: "auto:ip",
  cacheDurationMs: 60 * 60 * 1000, // 1 hour
  maxApiForecastDays: 2, // WeatherAPI provides current + 2 future days, so index 2 is the 3rd day.
  defaultFamilyProfile: "A single adult enjoying good weather.",
  defaultNotificationTime: "09:00",
  defaultNotificationFrequency: "daily",
  freeTierLimits: {
    dailyImageGenerations: 3,
    dailyOutfitSuggestions: 10,
    dailyActivitySuggestions: 10,
    maxTravelPlans: 10,
  },
  premiumTierLimits: { // Example for future use
    dailyImageGenerations: 50,
    dailyOutfitSuggestions: 100,
    dailyActivitySuggestions: 100,
    maxTravelPlans: 100,
  },
};

interface AppSettingsContextType {
  settings: AppSettings;
  isLoadingSettings: boolean;
  errorSettings: string | null;
  refetchSettings: () => Promise<void>;
  updateSettingsInFirestore: (newSettings: Partial<AppSettings>) => Promise<void>;
}

const AppSettingsContext = createContext<AppSettingsContextType | undefined>(undefined);

export const AppSettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [errorSettings, setErrorSettings] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setIsLoadingSettings(true);
    setErrorSettings(null);
    try {
      const settingsDocRef = doc(db, "config", "appSettings");
      const docSnap = await getDoc(settingsDocRef);
      if (docSnap.exists()) {
        // Merge fetched settings with defaults to ensure all keys are present
        // and also merge nested objects like freeTierLimits correctly
        const firestoreData = docSnap.data() as Partial<AppSettings>;
        const mergedSettings: AppSettings = {
          ...DEFAULT_APP_SETTINGS, // Start with system defaults
          ...firestoreData,        // Overlay with Firestore data
          // Ensure nested limit objects are merged, not just overwritten if partially present
          freeTierLimits: {
            ...DEFAULT_APP_SETTINGS.freeTierLimits,
            ...(firestoreData.freeTierLimits || {}),
          },
          premiumTierLimits: {
            ...DEFAULT_APP_SETTINGS.premiumTierLimits,
            ...(firestoreData.premiumTierLimits || {}),
          },
        };
        setSettings(mergedSettings);
      } else {
        // No settings found in Firestore, use defaults and try to save them
        console.warn("No app settings found in Firestore. Using default values and attempting to save them.");
        setSettings(DEFAULT_APP_SETTINGS);
        await setDoc(settingsDocRef, DEFAULT_APP_SETTINGS); // Initialize settings in Firestore
      }
    } catch (err) {
      console.error("Error fetching app settings:", err);
      setErrorSettings("Failed to load application settings. Using default values.");
      setSettings(DEFAULT_APP_SETTINGS); // Fallback to defaults on error
    } finally {
      setIsLoadingSettings(false);
    }
  }, []);

  const updateSettingsInFirestore = async (newSettings: Partial<AppSettings>) => {
    setIsLoadingSettings(true); // Indicate that an update process is starting
    try {
      const settingsDocRef = doc(db, "config", "appSettings");
      await setDoc(settingsDocRef, newSettings, { merge: true });
      // After successful update, refetch to ensure local state is consistent
      await fetchSettings(); 
    } catch (err) {
      console.error("Error updating app settings in Firestore:", err);
      setErrorSettings("Failed to update application settings.");
      // Optionally, revert local state or re-fetch to be safe, though fetchSettings() will run.
      setIsLoadingSettings(false); // Ensure loading is set to false even on error
      throw err; // Re-throw to be caught by the caller
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return (
    <AppSettingsContext.Provider value={{ settings, isLoadingSettings, errorSettings, refetchSettings: fetchSettings, updateSettingsInFirestore }}>
      {children}
    </AppSettingsContext.Provider>
  );
};

export const useAppSettings = (): AppSettingsContextType => {
  const context = useContext(AppSettingsContext);
  if (context === undefined) {
    throw new Error("useAppSettings must be used within an AppSettingsProvider");
  }
  return context;
};
