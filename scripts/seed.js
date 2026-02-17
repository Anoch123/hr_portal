// Note: This script requires SUPABASE_SERVICE_ROLE_KEY to be set in .env
// You can also run this directly in Supabase SQL Editor

const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase admin client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL in .env')
  console.error('Add these to your .env file before running this script')
  process.exit(1)
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

const leaveTypes = [
  {
    name: 'Annual Leave',
    description: 'Annual paid leave',
    default_days: 20,
    is_active: true,
    is_paid: true,
    requires_approval: true,
    max_consecutive_days: 30,
  },
  {
    name: 'Sick Leave',
    description: 'Sick leave for illness',
    default_days: 10,
    is_active: true,
    is_paid: true,
    requires_approval: true,
    max_consecutive_days: 7,
  },
  {
    name: 'Personal Leave',
    description: 'Personal leave for personal reasons',
    default_days: 5,
    is_active: true,
    is_paid: true,
    requires_approval: true,
    max_consecutive_days: 5,
  },
  {
    name: 'Maternity Leave',
    description: 'Maternity leave for childbirth',
    default_days: 90,
    is_active: true,
    is_paid: true,
    requires_approval: true,
    max_consecutive_days: 180,
  },
  {
    name: 'Paternity Leave',
    description: 'Paternity leave for childbirth',
    default_days: 7,
    is_active: true,
    is_paid: true,
    requires_approval: true,
    max_consecutive_days: 30,
  },
]

async function seedLeaveTypes() {
  try {
    console.log('🌱 Seeding leave types to Supabase...')

    for (const leaveType of leaveTypes) {
      const { data, error } = await supabaseAdmin
        .from('leave_types')
        .insert(leaveType)

      if (error && error.code !== '23505') {
        // 23505 is unique constraint violation - that's ok
        console.error(`❌ Error inserting ${leaveType.name}:`, error.message)
      } else if (data) {
        console.log(`✅ Created: ${leaveType.name}`)
      } else if (error?.code === '23505') {
        console.log(`⏭️  Already exists: ${leaveType.name}`)
      }
    }

    console.log('\n✅ Seeding complete!')
    console.log('📝 Next steps:')
    console.log('   1. Create users via Supabase dashboard Authentication')
    console.log('   2. Run: npm run dev')
    console.log('   3. Visit http://localhost:3001')
    process.exit(0)
  } catch (error) {
    console.error('❌ Seeding failed:', error.message)
}

seedLeaveTypes()
}
