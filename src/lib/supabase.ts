import { createClient } from '@supabase/supabase-js';


// Initialize database client
const supabaseUrl = 'https://bnhfvcnubdjeovtsjeqy.databasepad.com';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjcwZjk3YWM1LTkzOWYtNDc5Mi1hNGY0LTk3MTk0NTNiYTcwYiJ9.eyJwcm9qZWN0SWQiOiJibmhmdmNudWJkamVvdnRzamVxeSIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzY2MDExODk5LCJleHAiOjIwODEzNzE4OTksImlzcyI6ImZhbW91cy5kYXRhYmFzZXBhZCIsImF1ZCI6ImZhbW91cy5jbGllbnRzIn0.8dB_oPE3r07MvBvVNLXIiQ433qxQdx932xXoFY7CdZM';
const supabase = createClient(supabaseUrl, supabaseKey);


export { supabase };