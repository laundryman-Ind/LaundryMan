#!/usr/bin/env bash
# Deploy the delete-account Edge Function to your Supabase project.
#
# Before running (once):
#   1. npm i -g supabase            (or use `npx supabase` below)
#   2. supabase login               (opens a browser to authenticate the CLI)
#
# Then:
#   export SUPABASE_PROJECT_REF=abcdefghijklmnopqrst   # from Dashboard > Project Settings > General
#   export SUPABASE_SERVICE_ROLE_KEY=eyJ...            # from Dashboard > Project Settings > API (service_role)
#   bash supabase/deploy-functions.sh
set -e
cd "$(dirname "$0")"

SUPABASE_PROJECT_REF="${SUPABASE_PROJECT_REF:?Set SUPABASE_PROJECT_REF (project ref from Dashboard > Project Settings > General)}"
SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:?Set SUPABASE_SERVICE_ROLE_KEY (service_role key from Dashboard > Project Settings > API)}"

echo "1/3 Linking project ${SUPABASE_PROJECT_REF}..."
supabase link --project-ref "$SUPABASE_PROJECT_REF"

echo "2/3 Setting service-role secret..."
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY"

echo "3/4 Deploying delete-account..."
supabase functions deploy delete-account

echo "4/4 Deploying place-order..."
supabase functions deploy place-order

echo ""
echo "Done. Edge Functions delete-account and place-order deployed successfully."
