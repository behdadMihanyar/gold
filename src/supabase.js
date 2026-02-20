import { createClient } from "@supabase/supabase-js";

const VITE_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY = import.meta.env
  .VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

const supabase = createClient(
  VITE_SUPABASE_URL,
  VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY,
);

export default supabase;
