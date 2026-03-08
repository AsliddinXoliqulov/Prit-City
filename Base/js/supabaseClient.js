import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm"

const supabaseUrl = "SUPABASE_URL"
const supabaseAnonKey = "SUPABASE_ANON_KEY"

export const supabase = createClient(supabaseUrl, supabaseAnonKey)