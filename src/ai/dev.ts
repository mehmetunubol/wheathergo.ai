import { config } from 'dotenv';
config();

import '@/ai/flows/clothing-suggestions.ts';
import '@/ai/flows/activity-suggestions.ts';
import '@/ai/flows/send-notification-flow.ts'; // Added new flow
