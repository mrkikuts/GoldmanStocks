import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

import type { Database } from '@/lib/database.types';

function required(value: string | undefined, name: string) {
  if (!value) {
    throw new Error(
      `Missing ${name}. Set it to the matching GoldmanStocks Supabase project value before starting Expo.`,
    );
  }
  return value;
}

export const supabase = createClient<Database>(
  required(process.env.EXPO_PUBLIC_SUPABASE_URL, 'EXPO_PUBLIC_SUPABASE_URL'),
  required(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY, 'EXPO_PUBLIC_SUPABASE_ANON_KEY'),
  {
    auth: {
      storage: AsyncStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  },
);
