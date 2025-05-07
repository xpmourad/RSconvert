
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Check for API key and provide a warning in development if not found
const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY;

if (!apiKey && process.env.NODE_ENV === 'development') {
  console.warn(
    '\n🔴 WARNING: GEMINI_API_KEY, GOOGLE_API_KEY, or GOOGLE_GENAI_API_KEY is not set in your environment variables.' +
    '\nThe application might not function correctly with Google AI services.' +
    '\nPlease ensure one of these is set in your .env file (e.g., .env or .env.local) at the project root.' +
    '\nExample .env file content:\nGEMINI_API_KEY=YOUR_ACTUAL_API_KEY_HERE\n' +
    '\nIf you have recently added or modified this, please restart your development server.\n'
  );
}

export const ai = genkit({
  plugins: [
    // Explicitly pass the apiKey if found, otherwise let googleAI() try to find it from env.
    // This doesn't change the core lookup mechanism but makes the intent clearer
    // and works with the warning above.
    apiKey ? googleAI({ apiKey }) : googleAI(),
  ],
  model: 'googleai/gemini-2.0-flash', // Default model for text generation
});
