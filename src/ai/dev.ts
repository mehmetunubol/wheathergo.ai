
import { config } from 'dotenv';
config();

import '@/ai/flows/clothing-suggestions.ts';
import '@/ai/flows/activity-suggestions.ts';
import '@/ai/flows/send-notification-flow.ts';
import '@/ai/flows/guess-weather-flow.ts';
import '@/ai/flows/generate-blog-content-flow.ts'; // Added new flow
