-- Update password for salesdesouzamatheus@gmail.com directly
-- This uses a temporary function to update the password via pgcrypto
SELECT id FROM auth.users WHERE email = 'salesdesouzamatheus@gmail.com';