import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  'https://qlizhahzfqaesmyglmsn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsaXpoYWh6ZnFhZXNteWdsbXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3MTE5OTgsImV4cCI6MjEwMTI4Nzk5OH0.VELTvmOOVPKkYlyQyr0pm0NnvPf3FINwFY3ZdKHSXJo'
);
