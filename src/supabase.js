import { createClient } from "@supabase/supabase-js";

const VITE_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY = import.meta.env
  .VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

const supabase = createClient(
  VITE_SUPABASE_URL,
<<<<<<< HEAD
  VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY
=======
  VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY,
>>>>>>> 598674f (Buy_Feature)
);

export default supabase;
