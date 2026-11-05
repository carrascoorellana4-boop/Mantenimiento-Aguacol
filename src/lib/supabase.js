import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || window.location.origin
const supabasePublishableKey = import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY || 'placeholder-key'

// Persistencia de sesión habilitada en localStorage para mantener la sesión activa al recargar la página
export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined
  },
})
