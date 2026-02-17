#!/bin/bash

# Setup Supabase migrations
echo "🚀 Setting up Supabase database..."

# Extract credentials from .env.local
export SUPABASE_ACCESS_TOKEN=$(grep -v '^#' .env.local | grep SUPABASE_SERVICE_ROLE_KEY | cut -d'=' -f2 | tr -d '"')
export NEXT_PUBLIC_SUPABASE_URL=$(grep -v '^#' .env.local | grep NEXT_PUBLIC_SUPABASE_URL | cut -d'=' -f2 | tr -d '"')

# Extract project ref from URL
PROJECT_REF=$(echo $NEXT_PUBLIC_SUPABASE_URL | sed 's/https:\/\/\(.*\)\.supabase\.co/\1/')

echo "📍 Project Ref: $PROJECT_REF"
echo ""

# Link the project
echo "🔗 Linking Supabase project..."
npx supabase link --project-ref $PROJECT_REF

# Push migrations
echo ""
echo "📤 Pushing database migrations..."
npx supabase db push

echo ""
echo "✅ Database setup complete!"
echo ""
echo "Now you can create a test user with:"
echo "  source <(grep -v '^#' .env.local) && node scripts/create-user.js"
