import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// Using the SERVICE ROLE key here because this backend does its own
// auth (bcrypt + JWT) and needs full read/write access to tables.
// NEVER expose the service key to the frontend/mobile app.
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default supabase;
