
'use server';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { AppSettings } from '@/types';
import { DEFAULT_APP_SETTINGS } from '@/contexts/app-settings-context';

let cachedAppSettings: AppSettings | null = null;
let cacheTimestamp = 0;
// Cache app settings for a short duration to avoid frequent Firestore reads during flow executions.
const APP_SETTINGS_CACHE_DURATION = 1 * 60 * 1000; // 1 minute

export async function getFlowAppSettings(): Promise<AppSettings> {
  const now = Date.now();
  if (cachedAppSettings && (now - cacheTimestamp < APP_SETTINGS_CACHE_DURATION)) {
    return cachedAppSettings;
  }
  try {
    const settingsDocRef = doc(db, "config", "appSettings");
    const docSnap = await getDoc(settingsDocRef);
    if (docSnap.exists()) {
      const firestoreData = docSnap.data() as Partial<AppSettings>;
      // Deep merge, ensuring all nested objects are correctly handled
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
        flowModelOverrides: { // Ensure flowModelOverrides is an object
          ...(DEFAULT_APP_SETTINGS.flowModelOverrides || {}), 
          ...(firestoreData.flowModelOverrides || {}),
        },
      };
      cachedAppSettings = mergedSettings;
      cacheTimestamp = now;
      return mergedSettings;
    }
    // If no settings in Firestore, use defaults and cache them
    cachedAppSettings = DEFAULT_APP_SETTINGS;
    cacheTimestamp = now;
    return DEFAULT_APP_SETTINGS;
  } catch (error) {
    console.error("Error fetching app settings for flow execution:", error);
    // On error, return defaults but don't permanently cache them as "the" settings.
    return DEFAULT_APP_SETTINGS;
  }
}
