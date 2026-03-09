import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm"

const supabaseUrl = "https://wsxbviztajscpeaetnsr.supabase.co"
const supabaseAnonKey = "sb_publishable_LI0vwYaAd1RUSh-hAY71bw_TcPRn56z"

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// postgresql://postgres:[YOUR-PASSWORD]@db.wsxbviztajscpeaetnsr.supabase.co:5432/postgres