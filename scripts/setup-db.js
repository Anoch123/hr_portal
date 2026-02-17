#!/usr/bin/env node
// Initialize Supabase database - uses Supabase CLI to push migrations
const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

async function setupDatabase() {
  console.log('📦 Supabase Database Setup')
  console.log('='.repeat(60))
  console.log('')

  try {
    // Check if supabase CLI is installed
    try {
      execSync('npx supabase --version', { stdio: 'ignore' })
      console.log('✅ Supabase CLI found')
    } catch {
      console.log('📥 Installing Supabase CLI...')
      execSync('npm install -D supabase@latest', { stdio: 'inherit' })
    }

    // Load environment variables from .env or .env.local
    let envContent = ''
    const envLocalPath = path.join(process.cwd(), '.env.local')
    const envPath = path.join(process.cwd(), '.env')
    
    try {
      envContent = fs.readFileSync(envLocalPath, 'utf-8')
    } catch {
      try {
        envContent = fs.readFileSync(envPath, 'utf-8')
      } catch {
        throw new Error('.env or .env.local file not found')
      }
    }

    // Parse env file and set process.env
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)="?([^"]*)"?$/)
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2]
      }
    })

    const supabaseUrl = envContent.match(/NEXT_PUBLIC_SUPABASE_URL="([^"]+)"/)?.[1]
    
    if (!supabaseUrl) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL not found in .env or .env.local')
    }

    const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]
    if (!projectRef) {
      throw new Error('Could not extract project ref from NEXT_PUBLIC_SUPABASE_URL')
    }

    console.log(`📍 Project: ${projectRef}`)
    console.log('')

    // Check Supabase auth token
    const authToken = process.env.SUPABASE_ACCESS_TOKEN || process.env.SUPABASE_AUTH_TOKEN
    if (!authToken) {
      console.log('⚠️  No Supabase auth token found. You need to link your project.')
      console.log('')
      console.log('To set up authentication:')
      console.log('1. Go to: https://app.supabase.com/account/tokens')
      console.log('2. Create a personal access token')
      console.log('3. Set environment variable:')
      console.log('   export SUPABASE_ACCESS_TOKEN="your-token"')
      console.log('')
      process.exit(1)
    }

    console.log('🔗 Linking Supabase project...')
    try {
      execSync(`npx supabase link --project-ref ${projectRef}`, {
        stdio: 'inherit',
        env: { ...process.env, SUPABASE_ACCESS_TOKEN: authToken }
      })
    } catch (err) {
      // Project might already be linked, continue
      console.log('ℹ️  Project already linked')
    }

    console.log('')
    console.log('📤 Pushing database migrations...')
    execSync('npx supabase db push', {
      stdio: 'inherit',
      env: { ...process.env, SUPABASE_ACCESS_TOKEN: authToken }
    })

    console.log('')
    console.log('=' .repeat(60))
    console.log('✅ Database setup complete!')
    console.log('')
    console.log('Next step: Create a test user')
    console.log('')
    console.log('Run:')
    console.log('  source <(grep -v "^#" .env.local) && node scripts/create-user.js')
    console.log('')

  } catch (error) {
    console.error('')
    console.error('❌ Setup failed:', error.message)
    console.error('')
    console.error('Alternative: Manual Setup')
    console.error('='.repeat(60))
    console.error('')
    console.error('1. Go to: https://app.supabase.com/project/jdvbjkidxvpysmcnbreb/sql/new')
    console.error('2. Copy all SQL from: supabase/migrations/001_create_tables.sql')
    console.error('3. Paste into Supabase SQL editor')
    console.error('4. Click Run button')
    console.error('')
    process.exit(1)
  }
}

setupDatabase().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
