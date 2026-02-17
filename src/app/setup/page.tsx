'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function SetupPage() {
  const [status, setStatus] = useState<'checking' | 'ready' | 'error'>('checking')
  const [message, setMessage] = useState('Checking database...')

  useEffect(() => {
    checkDatabase()
  }, [])

  async function checkDatabase() {
    try {
      const response = await fetch('/api/db-status')
      const data = await response.json()

      if (data.initialized) {
        // Database is ready, redirect to login
        window.location.href = '/login'
        return
      }

      setStatus('ready')
      setMessage('Database needs to be initialized')
    } catch (error) {
      setStatus('error')
      setMessage('Failed to check database status')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-2xl">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl font-bold text-center">
            Database Setup Required
          </CardTitle>
          <CardDescription className="text-center">
            Your application needs to initialize the database before you can proceed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {status === 'checking' && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-4 text-muted-foreground">{message}</p>
            </div>
          )}

          {status === 'ready' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">📋 Follow these steps:</h3>
                <ol className="space-y-3 text-sm text-blue-800">
                  <li className="flex gap-3">
                    <span className="font-bold flex-shrink-0">1.</span>
                    <span>Open Supabase SQL Editor: <a href="https://app.supabase.com/project/jdvbjkidxvpysmcnbreb/sql/new" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Click here</a></span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold flex-shrink-0">2.</span>
                    <span>Copy all SQL from the migration file (see code block below)</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold flex-shrink-0">3.</span>
                    <span>Paste into Supabase SQL editor and click Run (Ctrl+Enter)</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold flex-shrink-0">4.</span>
                    <span>Click "Check Again" below</span>
                  </li>
                </ol>
              </div>

              <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs">
                <p className="text-gray-400 mb-2">supabase/migrations/001_create_tables.sql</p>
                <pre className="whitespace-pre-wrap break-words">
{`-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (linked to auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'EMPLOYEE' CHECK (role IN ('ADMIN', 'HR_MANAGER', 'MANAGER', 'EMPLOYEE')),
  department TEXT,
  position TEXT,
  manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Leave Types table
CREATE TABLE leave_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  default_days INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_paid BOOLEAN NOT NULL DEFAULT true,
  requires_approval BOOLEAN NOT NULL DEFAULT true,
  max_consecutive_days INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- [Copy the full SQL from supabase/migrations/001_create_tables.sql]`}
                </pre>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  ⚠️ <strong>Note:</strong> You need to copy the complete SQL file. The preview above is truncated. Open the file at <code className="bg-yellow-100 px-1 py-0.5 rounded">supabase/migrations/001_create_tables.sql</code> in your editor for the full content.
                </p>
              </div>

              <Button 
                onClick={checkDatabase}
                className="w-full"
                size="lg"
              >
                ✓ Check Database Status
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                <p>
                  Already ran the SQL? Click "Check Database Status" above to verify.
                </p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800 mb-4">{message}</p>
              <Button 
                onClick={checkDatabase}
                variant="outline"
                className="w-full"
              >
                Retry
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
