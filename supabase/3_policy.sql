-- Make sure RLS is enabled on the table first
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;

-- 1. Allow workers to READ their own profile
CREATE POLICY "Allow users to read their own worker profile"
ON public.workers
FOR SELECT
TO authenticated
USING (auth_id = auth.uid());

-- 2. Allow workers to INSERT their own profile
CREATE POLICY "Allow users to create their own worker profile"
ON public.workers
FOR INSERT
TO authenticated
WITH CHECK (auth_id = auth.uid());

-- 3. Allow workers to UPDATE their own profile
CREATE POLICY "Allow users to update their own worker profile"
ON public.workers
FOR UPDATE
TO authenticated
USING (auth_id = auth.uid())
WITH CHECK (auth_id = auth.uid());