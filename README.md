# Leave Management System

A comprehensive leave management system built with Next.js 14, featuring role-based access control, employee management, leave request workflows, and email notifications.

## Features

### Core Features
- **Authentication & Authorization**: Secure login with NextAuth.js and role-based access control (ACL)
- **Employee Management**: Create, update, and manage employee accounts
- **Leave Type Management**: Configure different types of leave (Annual, Sick, Personal, etc.)
- **Leave Request Management**: Submit, view, and track leave requests
- **Leave Approval Workflow**: Multi-level approval process for managers
- **Leave Rejection Management**: Reject requests with reasons
- **Leave Cancellation**: Cancel pending or approved requests
- **Leave Balance Tracking**: Track available, used, and pending leave days
- **Leave History**: Complete audit trail of all leave activities
- **Email Notifications**: Automated emails for request submissions, approvals, and rejections

### User Roles
1. **Admin**: Full system access, can manage all users and settings
2. **HR Manager**: Can manage employees, leave types, and approve all requests
3. **Manager**: Can approve/reject requests from direct reports
4. **Employee**: Can submit and manage their own leave requests

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: SQLite with Prisma ORM
- **Authentication**: NextAuth.js
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI
- **Email**: Nodemailer

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd leave-management-system
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-super-secret-key"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"
SMTP_FROM="noreply@yourcompany.com"
```

4. Initialize the database:
```bash
npm run db:push
```

5. Seed the database with initial data:
```bash
npm run db:seed
```

6. Start the development server:
```bash
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Test Accounts

After seeding, you can use these test accounts:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@company.com | admin123 |
| HR Manager | hr@company.com | hr123 |
| Manager | manager@company.com | manager123 |
| Employee | employee@company.com | employee123 |

## Project Structure

```
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts            # Database seeding script
├── src/
│   ├── app/
│   │   ├── api/           # API routes
│   │   │   ├── auth/      # NextAuth routes
│   │   │   ├── employees/ # Employee CRUD
│   │   │   ├── leave-types/ # Leave type CRUD
│   │   │   ├── leave-requests/ # Leave request management
│   │   │   ├── leave-balances/ # Balance management
│   │   │   ├── leave-history/ # History tracking
│   │   │   └── approvals/ # Pending approvals
│   │   ├── dashboard/     # Dashboard pages
│   │   │   ├── leaves/    # My leaves
│   │   │   ├── balance/   # Leave balance
│   │   │   ├── approvals/ # Pending approvals
│   │   │   ├── employees/ # Employee management
│   │   │   └── leave-types/ # Leave type management
│   │   ├── login/         # Login page
│   │   └── layout.tsx     # Root layout
│   ├── components/
│   │   ├── layout/        # Layout components
│   │   ├── providers/     # Context providers
│   │   └── ui/            # UI components
│   ├── lib/
│   │   ├── acl.ts         # Access control logic
│   │   ├── auth.ts        # NextAuth configuration
│   │   ├── email.ts       # Email service
│   │   ├── prisma.ts      # Prisma client
│   │   └── utils.ts       # Utility functions
│   └── types/
│       └── next-auth.d.ts # NextAuth type extensions
├── .env                   # Environment variables
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

## API Endpoints

### Authentication
- `POST /api/auth/[...nextauth]` - NextAuth.js authentication

### Employees
- `GET /api/employees` - List employees
- `POST /api/employees` - Create employee
- `GET /api/employees/[id]` - Get employee details
- `PUT /api/employees/[id]` - Update employee
- `DELETE /api/employees/[id]` - Deactivate employee

### Leave Types
- `GET /api/leave-types` - List leave types
- `POST /api/leave-types` - Create leave type
- `GET /api/leave-types/[id]` - Get leave type
- `PUT /api/leave-types/[id]` - Update leave type
- `DELETE /api/leave-types/[id]` - Delete leave type

### Leave Requests
- `GET /api/leave-requests` - List leave requests
- `POST /api/leave-requests` - Create leave request
- `GET /api/leave-requests/[id]` - Get leave request
- `DELETE /api/leave-requests/[id]` - Delete leave request
- `POST /api/leave-requests/[id]/approve` - Approve request
- `POST /api/leave-requests/[id]/reject` - Reject request
- `POST /api/leave-requests/[id]/cancel` - Cancel request

### Leave Balances
- `GET /api/leave-balances` - Get leave balances
- `POST /api/leave-balances` - Update leave balance

### Leave History
- `GET /api/leave-history` - Get leave history

### Approvals
- `GET /api/approvals` - Get pending approvals

## Permissions by Role

| Permission | Admin | HR Manager | Manager | Employee |
|------------|-------|------------|---------|----------|
| View Employees | ✓ | ✓ | ✓ | - |
| Create Employees | ✓ | ✓ | - | - |
| Update Employees | ✓ | ✓ | - | - |
| Delete Employees | ✓ | - | - | - |
| Manage Leave Types | ✓ | ✓ | - | - |
| View All Requests | ✓ | ✓ | Team Only | Own Only |
| Approve Requests | ✓ | ✓ | Team Only | - |
| Reject Requests | ✓ | ✓ | Team Only | - |
| View Reports | ✓ | ✓ | ✓ | - |
| System Settings | ✓ | - | - | - |

## Email Notifications

The system sends automated emails for:
- New employee welcome with credentials
- Leave request submitted (to manager)
- Leave request approved (to employee)
- Leave request rejected (to employee)
- Leave request cancelled (to manager)

## Development

### Database Commands
```bash
# Push schema changes to database
npm run db:push

# Seed database
npm run db:seed

# Open Prisma Studio
npm run db:studio
```

### Build for Production
```bash
npm run build
npm start
```

## License

MIT License
