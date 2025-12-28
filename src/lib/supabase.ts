import { createClient } from '@supabase/supabase-js';


// Initialize database client
const supabaseUrl = 'https://mfkvbauiirxvrsgkiztz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ma3ZiYXVpaXJ4dnJzZ2tpenR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5MzUxNTAsImV4cCI6MjA4MjUxMTE1MH0.2H-8kPyZ1GVSBbvF8Ua8if1cdGTQSrTVTZm_PnPROEw';
const supabase = createClient(supabaseUrl, supabaseKey);

// Export the Supabase URL for desktop app sync configuration
export { supabase, supabaseUrl };
