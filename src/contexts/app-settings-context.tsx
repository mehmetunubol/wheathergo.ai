
"use client";

import * as React from "react";
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import type { AppSettings, FlowModelOverrides } from "@/types";
import type { ModelId } from "@/ai/ai-config";

// Hardcoded default settings, used until Firestore settings are loaded or if Firestore is unavailable.
export const DEFAULT_APP_SETTINGS: AppSettings = {
  defaultLocation: "auto:ip",
  cacheDurationMs: 60 * 60 * 1000, // 1 hour
  maxApiForecastDays: 2, 
  defaultFamilyProfile: "A single adult enjoying good weather.",
  defaultNotificationTime: "09:00",
  defaultNotificationFrequency: "daily",
  freeTierLimits: {
    dailyImageGenerations: 3,
    dailyOutfitSuggestions: 10,
    dailyActivitySuggestions: 10,
    dailyTripDetailsSuggestions: 2,
    maxTravelPlans: 10,
  },
  premiumTierLimits: { 
    dailyImageGenerations: 50,
    dailyOutfitSuggestions: 100,
    dailyActivitySuggestions: 100,
    dailyTripDetailsSuggestions: 10,
    maxTravelPlans: 100,
  },
  flowModelOverrides: {}, // Default to empty object
};

interface AppSettingsContextType {
  settings: AppSettings;
  isLoadingSettings: boolean;
  errorSettings: string | null;
  refetchSettings: () => Promise<void>;
  updateSettingsInFirestore: (newSettings: Partial<AppSettings>) => Promise<void>;
}

const AppSettingsContext = createContext<AppSettingsContextType | undefined>(undefined);

const clearExpiredCacheEntries = (cacheDurationMs: number) => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    const keysToRemove: string[] = [];
    const currentTime = Date.now();

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('weatherugo-cache-')) {
        const itemString = localStorage.getItem(key);
        if (itemString) {
          try {
            const item = JSON.parse(itemString);
            if (item && typeof item.timestamp === 'number') {
              if (currentTime - item.timestamp >= cacheDurationMs) {
                keysToRemove.push(key);
              }
            } else {
              keysToRemove.push(key);
            }
          } catch (parseError) {
            console.warn(`Corrupted cache item ${key}, removing. Error:`, parseError);
            keysToRemove.push(key);
          }
        } else {
          keysToRemove.push(key);
        }
      }
    }

    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });

    if (keysToRemove.length > 0) {
      console.log(`[Cache Cleanup] Removed ${keysToRemove.length} expired/invalid cache entries.`);
    }
  } catch (error) {
    console.error("Error during cache cleanup:", error);
  }
};

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
        const firestoreData = docSnap.data() as Partial<AppSettings>;
        const mergedSettings: AppSettings = {
          ...DEFAULT_APP_SETTINGS,
          ...firestoreData,
          freeTierLimits: {
            ...DEFAULT_APP_SETTINGS.freeTierLimits,
            ...(firestoreData.freeTierLimits || {}),
          },
          premiumTierLimits: {
            ...DEFAULT_APP_SETTINGS.premiumTierLimits,
            ...(firestoreData.premiumTierLimits || {}),
          },
          flowModelOverrides: { // Ensure correct merging for flowModelOverrides
            ...(DEFAULT_APP_SETTINGS.flowModelOverrides || {}),
            ...(firestoreData.flowModelOverrides || {}),
          },
        };
        setSettings(mergedSettings);
      } else {
        console.warn("No app settings found in Firestore. Using default values and attempting to save them.");
        setSettings(DEFAULT_APP_SETTINGS);
        await setDoc(settingsDocRef, DEFAULT_APP_SETTINGS);
      }
    } catch (err) {
      console.error("Error fetching app settings:", err);
      setErrorSettings("Failed to load application settings. Using default values.");
      setSettings(DEFAULT_APP_SETTINGS);
    } finally {
      setIsLoadingSettings(false);
    }
  }, []);

  const updateSettingsInFirestore = async (newSettings: Partial<AppSettings>) => {
    setIsLoadingSettings(true); // Should be set to true to indicate saving
    try {
      const settingsDocRef = doc(db, "config", "appSettings");
      // Ensure flowModelOverrides is at least an empty object if not provided in newSettings
      const settingsToSave = {
        ...newSettings,
        flowModelOverrides: newSettings.flowModelOverrides || settings.flowModelOverrides || {},
      };
      await setDoc(settingsDocRef, settingsToSave, { merge: true });
      // After successful save, refetch to ensure local state is consistent with Firestore
      await fetchSettings(); 
    } catch (err) {
      console.error("Error updating app settings in Firestore:", err);
      setErrorSettings("Failed to update application settings.");
      // Optionally, revert local state or handle error more gracefully
      setIsLoadingSettings(false); // Reset loading state on error
      throw err; // Re-throw to be caught by caller if needed
    }
    // setIsLoadingSettings(false); // fetchSettings will set this correctly
  };

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    if (!isLoadingSettings && settings.cacheDurationMs > 0) {
      clearExpiredCacheEntries(settings.cacheDurationMs);
    }
  }, [isLoadingSettings, settings.cacheDurationMs]);

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
