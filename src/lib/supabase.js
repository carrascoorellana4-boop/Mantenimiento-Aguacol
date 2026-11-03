import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || window.location.origin
const supabasePublishableKey = import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY || 'placeholder-key'

// La sesión vive solo en memoria: al recargar la página (incluido el hard-refresh) se vuelve a la pantalla de inicio de sesión.
// Se borran las sesiones guardadas por versiones anteriores para que no revivan.
Object.keys(localStorage).filter((k) => k.startsWith('sb-')).forEach((k) => localStorage.removeItem(k))

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: { persistSession: false, autoRefreshToken: true, detectSessionInUrl: false },
})
