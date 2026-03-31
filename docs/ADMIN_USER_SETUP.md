# Admin User Setup

The `admin_users` table uses RLS that requires an existing `super_admin` to grant access.
The **first admin must be inserted directly** via the Supabase SQL Editor, which runs as
the `postgres` role and bypasses RLS entirely.

## Step-by-step

### 1. Get your user ID

Go to **Supabase Dashboard → Authentication → Users**, find your account, and copy the UUID
from the **User UID** column.

### 2. Open SQL Editor

Go to **Supabase Dashboard → SQL Editor** and run:

```sql
INSERT INTO public.admin_users (user_id, role)
VALUES ('<your-user-uuid-here>', 'super_admin')
ON CONFLICT (user_id) DO UPDATE SET role = 'super_admin';
```

Replace `<your-user-uuid-here>` with the UUID from step 1.

### 3. Verify

```sql
SELECT * FROM public.admin_users;
```

You should see one row with `role = 'super_admin'`.

## Adding more admins

Once you have a `super_admin` row, you can add additional admins through the app (if an
admin management UI exists) or via the SQL Editor:

```sql
-- Add another admin
INSERT INTO public.admin_users (user_id, role)
VALUES ('<other-user-uuid>', 'admin')
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

-- Promote to super_admin
UPDATE public.admin_users SET role = 'super_admin' WHERE user_id = '<other-user-uuid>';
```

## Why this is required

The RLS policy on `admin_users` is:

```sql
CREATE POLICY "Only super admins can manage admin users"
    ON public.admin_users FOR ALL
    USING (auth.uid() IN (SELECT user_id FROM public.admin_users WHERE role = 'super_admin'));
```

This is intentionally a bootstrap problem — no API route can insert the first row because
there are no super admins yet. The `postgres` role used by the SQL Editor bypasses RLS, so
it can seed the table without restriction.

## Effect in the app

Admins are opted out of PostHog analytics tracking automatically. The `PostHogProvider`
checks the `admin_users` table on mount and calls `posthog.opt_out_capturing()` if the
current user is found.
