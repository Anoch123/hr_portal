// Script to create a test user in Supabase
// Usage: NEXT_PUBLIC_SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=yyy node scripts/create-user.js
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL in .env.local')
  process.exit(1)
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

async function createTestUser() {
  try {
    const testEmail = 'test@example.com'
    const testPassword = 'password123'

    console.log(`🔐 Creating test user: ${testEmail}`)

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
    })

    if (authError) {
      if (authError.message.includes('already exists')) {
        console.log(`⏭️  User already exists: ${testEmail}`)
        // Get the existing user
        const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()
        if (!listError) {
          const existingUser = users.find(u => u.email === testEmail)
          if (existingUser) {
            console.log(`✅ Found existing user ID: ${existingUser.id}`)
          }
        }
        return
      }
      throw authError
    }

    console.log(`✅ Created auth user: ${authData.user.id}`)

    // Create user profile
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authData.user.id,
        email: testEmail,
        first_name: 'Test',
        last_name: 'User',
        role: 'EMPLOYEE',
        is_active: true,
      })
      .select()
      .single()

    if (userError) {
      if (userError.code === '23505') {
        console.log(`⏭️  User profile already exists for ${testEmail}`)
      } else {
        throw userError
      }
    } else {
      console.log(`✅ Created user profile: ${userData.id}`)
    }

    console.log('\n✅ Test user setup complete!')
    console.log(`📧 Email: ${testEmail}`)
    console.log(`🔒 Password: ${testPassword}`)
    console.log('\n🚀 You can now log in with these credentials at http://localhost:3001/login')
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Error creating user:', error.message)
    process.exit(1)
  }
}

createTestUser()
