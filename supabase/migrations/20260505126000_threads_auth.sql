-- Threads OAuth token storage (service-role only).
CREATE TABLE IF NOT EXISTS public.threads_auth (
  id text PRIMARY KEY DEFAULT 'default',
  access_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  threads_user_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.threads_auth ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.threads_auth FROM anon;
REVOKE ALL ON TABLE public.threads_auth FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.threads_auth TO service_role;
