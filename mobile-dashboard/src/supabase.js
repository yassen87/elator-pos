import { createClient } from '@supabase/supabase-js'

// These will be loaded from localStorage since the user sets them in the desktop app
// Or the user can enter them on first mobile login
const supabaseUrl = localStorage.getItem('supabase_url') || ''
const supabaseKey = localStorage.getItem('supabase_key') || ''

export const supabase = (supabaseUrl && supabaseKey) 
    ? createClient(supabaseUrl, supabaseKey)
    : null

export const initSupabase = (url, key) => {
    localStorage.setItem('supabase_url', url)
    localStorage.setItem('supabase_key', key)
    return createClient(url, key)
}
