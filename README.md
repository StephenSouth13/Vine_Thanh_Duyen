<div align="center">
  
# 🍇 Vine CRM

### Enterprise Resource Management Platform

*Modern, Powerful, and Intelligent CRM System for Internal Business Operations*

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)

[🚀 Demo](https://lovable.dev/projects/f69f86c8-a387-4d19-b189-642e8f36a015) • [📖 Documentation](#) • [🐛 Report Bug](#) • [✨ Request Feature](#)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Database Schema](#-database-schema)
- [Role-Based Access](#-role-based-access)
- [Getting Started](#-getting-started)
- [Environment Setup](#-environment-setup)
- [Development](#-development)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Overview

**Vine CRM** is a comprehensive Enterprise Resource Management platform designed to streamline internal business operations. Built with modern technologies and focused on real-world data handling, it provides a centralized solution for:

- 👥 **Organization Management** - Teams, departments, and user hierarchy
- ⏰ **Attendance Tracking** - Real-time check-in/check-out with shift management
- 📋 **Task Management** - Kanban-style workflow with team collaboration
- 🏢 **Meeting Room Booking** - Smart scheduling and resource allocation
- 🌴 **Leave Management** - Automated approval workflow
- 📊 **Analytics Dashboard** - Role-based insights and reporting

> 💡 **Note:** This system uses **real data** (no mockups), supports **dark mode**, features **multi-role user management**, and includes an **AI-powered account seeder**.

---

## ✨ Key Features

### 🎨 **Modern User Interface**
- Beautiful, responsive design with TailwindCSS + shadcn/ui
- Full dark mode support with smooth transitions
- Framer Motion animations for delightful UX
- Mobile-first approach

### 🔐 **Advanced Security**
- Row-Level Security (RLS) on all database tables
- JWT-based authentication via Supabase Auth
- Audit logging for all critical operations
- Role-based access control (RBAC)

### 📊 **Role-Based Dashboards**

#### 🧑‍💼 Admin Dashboard
- Company-wide analytics and metrics
- User and team management
- System configuration and audit logs
- Unassigned tasks and overdue items

#### 👨‍🏫 Leader Dashboard
- Team attendance overview
- Task progress tracking
- Leave request approvals
- Team performance metrics

#### 👩‍💻 Staff Dashboard
- Personal attendance records
- Assigned tasks and deadlines
- Leave balance and requests
- Personal meeting schedule

### 🤖 **AI-Powered Features**
- **Smart Account Seeder**: Bulk user creation via CSV upload
- Automated email notifications
- Intelligent task assignment suggestions (planned)
- Performance analytics (planned)

### ⚡ **Real-Time Updates**
- Live attendance tracking with Supabase Realtime
- Instant task status updates
- Real-time meeting room availability
- Push notifications for approvals

---

## 🛠 Tech Stack

### **Frontend**
| Technology | Purpose |
|-----------|---------|
| **React 18** | UI library with hooks |
| **TypeScript** | Type-safe development |
| **Vite** | Lightning-fast build tool |
| **TailwindCSS** | Utility-first CSS framework |
| **shadcn/ui** | Beautiful component library |
| **Framer Motion** | Smooth animations |
| **Tanstack Query** | Server state management |
| **Zustand** | Client state management |

### **Backend**
| Technology | Purpose |
|-----------|---------|
| **Supabase** | PostgreSQL database & Auth |
| **Golang** | API service layer |
| **Supabase Storage** | File storage (avatars, attachments) |
| **Redis** | Queue management (optional) |

### **Deployment**
- **Frontend**: Vercel / Lovable
- **Backend**: Fly.io / Railway
- **Database**: Supabase Cloud
- **CDN**: Cloudflare (optional)

---

## 📁 Project Structure

```
vine-crm/
├── src/
│   ├── components/         # Reusable UI components
│   │   ├── ui/            # shadcn/ui components
│   │   ├── dashboard/     # Dashboard widgets
│   │   ├── attendance/    # Check-in/out components
│   │   ├── tasks/         # Task management UI
│   │   └── meetings/      # Meeting room booking
│   ├── pages/             # Route pages
│   │   ├── Index.tsx      # Landing/Dashboard
│   │   ├── auth/          # Authentication pages
│   │   ├── tasks/         # Task management
│   │   ├── attendance/    # Attendance tracking
│   │   ├── meetings/      # Meeting rooms
│   │   └── leaves/        # Leave management
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utility functions
│   ├── integrations/      # Supabase client & types
│   │   └── supabase/
│   ├── types/             # TypeScript definitions
│   └── index.css          # Global styles & design tokens
├── supabase/
│   ├── migrations/        # Database migrations
│   ├── functions/         # Edge functions
│   └── config.toml        # Supabase config
├── public/                # Static assets
└── README.md
```

---

## 🗄️ Database Schema

### **Core Tables**

| Table | Description |
|-------|-------------|
| `users` | User profiles (id, email, role, team_id, shift_id, avatar) |
| `teams` | Departments and teams (id, name, leader_id) |
| `shifts` | Work shifts (id, name, start_time, end_time) |
| `attendance` | Check-in/out logs (user_id, timestamp, location, type) |
| `tasks` | Work items (id, title, assignee_id, creator_id, deadline, status) |
| `meeting_rooms` | Conference rooms (id, name, location, capacity, equipment) |
| `room_bookings` | Meeting reservations (room_id, user_id, start_time, end_time, status) |
| `leave_requests` | Time-off requests (user_id, type, start_date, end_date, status, approver_id) |
| `audit_logs` | System activity logs (user_id, action, entity, timestamp) |

> All tables implement **Row-Level Security (RLS)** for data protection.

---

## 👥 Role-Based Access

| Feature | Admin | Leader | Staff |
|---------|-------|--------|-------|
| **Organization Management** | ✅ Full CRUD | 👁️ View team only | 🔒 Personal view only |
| **Attendance Tracking** | ✅ All records | ✅ Team records | ✅ Self only |
| **Task Management** | ✅ Full control | ✅ Create, assign, approve | ✅ Create & report |
| **Meeting Rooms** | ✅ Manage rooms | ✅ Approve bookings | ✅ Book only |
| **Leave Management** | ✅ Approve all | ✅ Approve team | ✅ Request only |
| **System Settings** | ✅ | 🔒 | 🔒 |

---

## 🚀 Getting Started

### **Prerequisites**

- Node.js 18+ and npm
- Supabase account
- Git

### **Installation**

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/vine-crm.git
   cd vine-crm
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Update `.env` with your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
   VITE_SUPABASE_PROJECT_ID=your_project_id
   ```

4. **Run database migrations**
   ```bash
   npx supabase db push
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   ```
   http://localhost:8080
   ```

---

## 🔧 Environment Setup

### **Supabase Configuration**

1. Create a new project on [Supabase](https://supabase.com)
2. Run migrations from `supabase/migrations/`
3. Enable Row-Level Security on all tables
4. Configure authentication providers
5. Set up storage buckets for avatars and attachments

### **Development Tools**

```bash
# Install development dependencies
npm install -D @types/node typescript eslint prettier

# Run linter
npm run lint

# Format code
npm run format

# Type check
npm run type-check
```

---

## 💻 Development

### **Running Tests**

```bash
# Unit tests
npm run test

# E2E tests (Playwright)
npm run test:e2e

# Load testing
npm run test:load
```

### **Building for Production**

```bash
npm run build
npm run preview
```

---

## 🌐 Deployment

### **Deploy to Lovable**

Simply open [Lovable](https://lovable.dev/projects/f69f86c8-a387-4d19-b189-642e8f36a015) and click **Share → Publish**.

### **Deploy to Vercel**

```bash
vercel deploy --prod
```

### **Custom Domain**

Navigate to **Project > Settings > Domains** to connect your custom domain.

📖 [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

---

## 🎨 Design System

### **Typography**

- **Primary Font**: Inter - Clean and modern
- **Secondary Font**: Source Sans 3 / Roboto - Dashboard readability
- **Display Font**: Poppins (optional) - Brand headers

### **Color Palette**

#### Light Mode
- **Primary**: `#0F62FE` (Blue)
- **Background**: `#F7F9FC` (Light gray)
- **Text Secondary**: `#6B7280` (Muted)

#### Dark Mode
- **Primary**: `#3B82F6` (Bright blue)
- **Background**: `#0B1220` (Dark navy)
- **Text Secondary**: `#94A3B8` (Light gray)

### **Components**

All UI components follow the design system tokens defined in `src/index.css` and use semantic color variables. Never use hardcoded colors like `text-white` or `bg-blue-500`.

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### **Coding Standards**

- Follow TypeScript best practices
- Use semantic commit messages
- Write tests for new features
- Update documentation as needed

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [shadcn/ui](https://ui.shadcn.com/) for beautiful components
- [Supabase](https://supabase.com/) for amazing backend infrastructure
- [Lucide Icons](https://lucide.dev/) for clean iconography
- [Framer Motion](https://www.framer.com/motion/) for smooth animations

---

<div align="center">

### 🌟 Star us on GitHub — it motivates us a lot!

**Built with ❤️ by the Vine Team**

[🐛 Report Bug](https://github.com/yourusername/vine-crm/issues) • [✨ Request Feature](https://github.com/yourusername/vine-crm/issues)

</div>
