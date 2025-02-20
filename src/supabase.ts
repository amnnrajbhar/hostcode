import { createClient } from '@supabase/supabase-js';
import { environment } from './environments/environment';

// Configure Supabase client with better timeout and retry settings
export const supabase = createClient(environment.supabaseUrl, environment.supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: { 'x-application-name': 'codeshare-clone' },
  },
  realtime: {
    params: {
      eventsPerSecond: 1 // Reduce to prevent rate limiting
    }
  }
});

// Connection state management
let connectionAttempts = 0;
const MAX_RETRIES = 5;
const RETRY_DELAY = 2000; // 2 seconds
const MAX_TIMEOUT = 10000; // 10 seconds

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Wrapper for database operations with timeout and retry logic
export async function executeWithRetry<T>(
  operation: () => Promise<T>, 
  customTimeout = MAX_TIMEOUT
): Promise<T> {
  let lastError: any;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Create a timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Operation timed out')), customTimeout);
      });

      // Race between the operation and the timeout
      const result = await Promise.race([
        operation(),
        timeoutPromise
      ]);

      // Reset connection attempts on success
      connectionAttempts = 0;
      return result;
    } catch (error: any) {
      lastError = error;
      console.warn(`Attempt ${attempt} failed:`, error.message);
      
      if (attempt < MAX_RETRIES) {
        // Exponential backoff
        const backoffDelay = RETRY_DELAY * Math.pow(2, attempt - 1);
        await delay(backoffDelay);
      }
    }
  }

  // If we've exhausted all retries, throw the last error
  throw new Error(`Operation failed after ${MAX_RETRIES} attempts. Last error: ${lastError?.message}`);
}