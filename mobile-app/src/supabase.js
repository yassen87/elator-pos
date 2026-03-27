import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CLOUD_CONFIG } from './config';

let supabaseUrl = CLOUD_CONFIG.URL;
let supabaseKey = CLOUD_CONFIG.ANON_KEY;

export const getSupabaseClient = async () => {
  // Try to get from config first
  let url = CLOUD_CONFIG.URL;
  let key = CLOUD_CONFIG.ANON_KEY;

  // If not in config, try persistent storage
  if (!url || !key) {
    url = await AsyncStorage.getItem('supabase_url');
    key = await AsyncStorage.getItem('supabase_key');
  }

  if (url && key) {
    return createClient(url, key);
  }
  return null;
};

export const saveSupabaseConfig = async (url, key) => {
  await AsyncStorage.setItem('supabase_url', url);
  await AsyncStorage.setItem('supabase_key', key);
};
