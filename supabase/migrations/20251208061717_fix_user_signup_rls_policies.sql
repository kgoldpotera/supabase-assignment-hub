/*
  # Fix User Signup RLS Policies

  ## Changes
  - Add INSERT policy for profiles table to allow new user creation
  - Ensure the handle_new_user trigger function can bypass RLS restrictions
  - Grant necessary permissions to the trigger function

  ## Details
  The issue was that profiles table had RLS enabled but no INSERT policy,
  blocking the automatic profile creation during user signup.
*/

-- Add INSERT policy for profiles to allow users to create their own profile during signup
CREATE POLICY "Allow profile creation during signup"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Recreate the handle_new_user function with explicit grants
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role app_role;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  
  -- Determine role based on email
  IF NEW.email = 'koechmanoah32@gmail.com' THEN
    user_role := 'admin';
  ELSE
    user_role := 'student';
  END IF;
  
  -- Create user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role);
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error details for debugging
  RAISE WARNING 'Error in handle_new_user: % %', SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
