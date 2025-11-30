# Vine CRM - Project Review & File Documentation

**Project**: Vine CRM - Enterprise Resource Management Platform  
**Type**: React + Vite + TypeScript + Tailwind CSS + Shadcn UI  
**Database**: Supabase (PostgreSQL)  
**Build Tool**: Vite  
**Package Manager**: pnpm

---

## 📋 Table of Contents

1. [Root Configuration Files](#root-configuration-files)
2. [Source Code Structure](#source-code-structure)
3. [Pages](#pages)
4. [Components](#components)
5. [Integration & Libraries](#integration--libraries)
6. [Utilities & Hooks](#utilities--hooks)

---

## Root Configuration Files

### `package.json`
- **Purpose**: Project metadata, dependencies, and npm scripts
- **Key Scripts**:
  - `dev`: Start Vite development server
  - `build`: Build for production
  - `build:dev`: Build in development mode
  - `lint`: Run ESLint
  - `preview`: Preview built app
- **Dependencies**: React 18, React Router DOM, Supabase, TanStack Query, Tailwind CSS, Shadcn UI components, Recharts, date-fns, form libraries

### `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`
- **Purpose**: TypeScript configuration files
- **Main Config**: Path aliases, strict mode, module resolution, DOM lib support

### `vite.config.ts`
- **Purpose**: Vite build configuration
- **Features**: React SWC plugin for fast builds, path aliases setup

### `tailwind.config.ts`
- **Purpose**: Tailwind CSS configuration
- **Includes**: Custom theme colors (primary, success, warning, error), gradient utilities, animation utilities

### `postcss.config.js`
- **Purpose**: PostCSS configuration
- **Plugins**: Tailwind CSS, Autoprefixer

### `eslint.config.js`
- **Purpose**: ESLint code quality rules and standards enforcement

### `components.json`
- **Purpose**: Shadcn UI components configuration
- **Defines**: Component paths, aliases, CSS variables

### `index.html`
- **Purpose**: HTML entry point for the application
- **Content**: Root div with id "root" for React mounting

### `supabase/config.toml`
- **Purpose**: Supabase local development configuration

---

## Source Code Structure

### Root Source Files

#### `src/main.tsx`
- **Purpose**: Application entry point
- **Functionality**: Mounts React app to DOM using ReactDOM.createRoot()

#### `src/index.css`
- **Purpose**: Global CSS styles
- **Content**: Base styles, animations, utility classes

#### `src/App.css`
- **Purpose**: Application-level CSS styles
- **Content**: App-specific styling

#### `src/App.tsx`
- **Purpose**: Root React component and routing setup
- **Key Features**:
  - Sets up React Query for data fetching
  - Configures React Router with all application routes
  - Provides tooltip context
  - Integrates Toaster (React toast) and Sonner notifications
- **Routes**:
  - `/` → Index (landing page)
  - `/auth/login` → Login/Signup page
  - `/dashboard` → Main dashboard
  - `/attendance` → Attendance tracking
  - `/tasks` → Task management
  - `/meeting-rooms` → Meeting room booking
  - `/leave` → Leave management
  - `/organization` → Organization settings (admin only)
  - `/profile` → User profile
  - `*` → 404 Not Found

---

## Pages

All page components are located in `src/pages/` and serve as primary route handlers. Each page typically:
- Loads user role and authentication status
- Wraps content in `DashboardLayout`
- Displays role-specific content

### `src/pages/Index.tsx`
- **Purpose**: Landing/home page
- **Features**:
  - Hero section with "Vine CRM" branding
  - Feature showcase grid (6 main features)
  - Call-to-action sections
  - Automatic redirect to dashboard if user is authenticated
  - Displays features: Organization Management, Attendance Tracking, Meeting Rooms, Analytics, Security, Real-time Updates

### `src/pages/Dashboard.tsx`
- **Purpose**: Main dashboard showing user overview and quick stats
- **Features**:
  - Role-based statistics (different for staff/leader/admin)
  - Stat cards: Total Tasks, Completed Tasks, Attendance, Leave Balance
  - Task completion progress tracking
  - Quick action buttons (Check In/Out, Create Task, Book Meeting)
  - Recent activity section
  - Loading skeleton states
- **Data Loads From Supabase**:
  - Tasks data
  - Attendance records
  - User profiles
  - Room bookings

### `src/pages/Attendance.tsx`
- **Purpose**: Attendance tracking page
- **Features**:
  - Displays AttendanceWidget component
  - User role verification
  - Styled header with gradient text
- **Related Component**: AttendanceWidget

### `src/pages/Tasks.tsx`
- **Purpose**: Task management page
- **Features**:
  - Tabbed interface with two views:
    - **Board View**: Kanban-style task board (TaskBoard component)
    - **List View**: Tabular task list (TaskList component)
  - Role-based task display
- **Related Components**: TaskBoard, TaskList

### `src/pages/Leave.tsx`
- **Purpose**: Leave/vacation management page
- **Features**:
  - Leave balance display card
  - Tabbed interface:
    - **New Request Tab**: LeaveRequestForm component
    - **History Tab**: LeaveHistory component
  - Shows available leave balance in days
- **Related Components**: LeaveRequestForm, LeaveHistory

### `src/pages/MeetingRooms.tsx`
- **Purpose**: Meeting room booking and management
- **Features**:
  - Tabbed interface with three views:
    - **Calendar View**: BookingCalendar component
    - **Rooms View**: RoomList component
    - **My Bookings**: MyBookings component
  - Room availability management
- **Related Components**: BookingCalendar, RoomList, MyBookings

### `src/pages/Organization.tsx`
- **Purpose**: Admin-only organizational settings and management
- **Access Control**: Only accessible to admin users
- **Features**:
  - Tabbed interface for different management areas:
    - **Teams**: TeamsManagement component
    - **Users**: UsersManagement component
    - **Shifts**: ShiftsManagement component
    - **Salary**: SalaryManagement component
    - **Statistics**: SalaryStatistics component
    - **Attendance Settings**: AttendanceSettings component
- **Related Components**: All organization management components

### `src/pages/Profile.tsx`
- **Purpose**: User profile management and settings
- **Features**:
  - Avatar upload with validation (max 2MB)
  - Personal information editing:
    - First name, Last name, Phone, Date of birth
  - Display profile picture with initials fallback
  - Organization info section (read-only):
    - Team assignment
    - Shift information
    - Annual leave balance
  - Form validation using Zod
  - Toast notifications for feedback
- **Related Libraries**: react-hook-form, zod, shadcn UI form components

### `src/pages/NotFound.tsx`
- **Purpose**: 404 error page for undefined routes
- **Features**:
  - Displays 404 message
  - Logs attempted route to console
  - Link to return home

### `src/pages/auth/Login.tsx`
- **Purpose**: Authentication page for login and signup
- **Features**:
  - Tabbed interface:
    - **Login Tab**: Email + password login
    - **Signup Tab**: Create new account with name and email
  - Form validation
  - Error and success toast notifications
  - Automatic redirect to dashboard if already logged in
  - Loading states during authentication
  - Vine CRM branding
- **Related Functions**: signIn, signUp from auth library

---

## Components

### Layout Components

#### `src/components/layout/DashboardLayout.tsx`
- **Purpose**: Main layout wrapper for authenticated pages
- **Features**:
  - Sticky header with Vine CRM branding
  - User avatar dropdown menu with logout
  - Theme toggle (dark/light mode)
  - Notification bell
  - Responsive sidebar navigation (hidden on mobile)
  - Mobile bottom navigation bar
  - Role-based menu items (admin sees Organization option)
  - User profile display in dropdown
  - Automatic redirect if not authenticated
- **Props**: `children`, `role`
- **Menu Items**: Dashboard, Attendance, Tasks, Meetings, Leave, Organization (admin only)

#### `src/components/NavLink.tsx`
- **Purpose**: Navigation link component
- **Type**: Custom navigation wrapper component

### UI Components (Shadcn UI)

Located in `src/components/ui/`, these are pre-built reusable UI components from the shadcn UI library:

#### Core Interactive Components
- **`button.tsx`**: Styled button component with variants (primary, secondary, outline, ghost, destructive)
- **`input.tsx`**: Text input field component
- **`label.tsx`**: Form label component
- **`select.tsx`**: Dropdown select component
- **`checkbox.tsx`**: Checkbox input component
- **`radio-group.tsx`**: Radio button group component
- **`switch.tsx`**: Toggle switch component
- **`textarea.tsx`**: Multi-line text input

#### Dialog & Overlay Components
- **`dialog.tsx`**: Modal dialog component
- **`alert-dialog.tsx`**: Alert dialog with confirmation
- **`drawer.tsx`**: Slide-out drawer panel
- **`popover.tsx`**: Popover tooltip component
- **`dropdown-menu.tsx`**: Dropdown menu component
- **`context-menu.tsx`**: Right-click context menu

#### Data Display Components
- **`table.tsx`**: Data table component
- **`card.tsx`**: Card container with header/footer
- **`badge.tsx`**: Small label badge
- **`avatar.tsx`**: User avatar with fallback
- **`progress.tsx`**: Progress bar component
- **`slider.tsx`**: Numeric slider component
- **`carousel.tsx`**: Image/content carousel

#### Layout Components
- **`tabs.tsx`**: Tabbed interface component
- **`accordion.tsx`**: Collapsible accordion component
- **`collapsible.tsx`**: Expandable collapsible section
- **`sidebar.tsx`**: Sidebar navigation component
- **`sheet.tsx`**: Side sheet overlay
- **`scroll-area.tsx`**: Scrollable container
- **`separator.tsx`**: Visual divider line
- **`resizable.tsx`**: Resizable panels

#### Date & Time Components
- **`calendar.tsx`**: Date picker calendar
- **`input-otp.tsx`**: OTP input component

#### Utility Components
- **`tooltip.tsx`**: Tooltip overlay
- **`hover-card.tsx`**: Hover-triggered card
- **`breadcrumb.tsx`**: Breadcrumb navigation
- **`pagination.tsx`**: Pagination controls
- **`command.tsx`**: Command/search palette
- **`menubar.tsx`**: Top menu bar
- **`navigation-menu.tsx`**: Navigation menu system
- **`toggle.tsx`**: Toggle button
- **`toggle-group.tsx`**: Group of toggle buttons

#### Notification Components
- **`toast.tsx`**: Toast notification container
- **`toaster.tsx`**: Toast notification wrapper
- **`sonner.tsx`**: Sonner toast notifications setup

#### Chart Component
- **`chart.tsx`**: Recharts integration wrapper

#### Form Component
- **`form.tsx`**: React Hook Form wrapper with validation

#### Skeleton Components (Loading States)
- **`skeleton.tsx`**: Generic loading skeleton
- **`skeleton-card.tsx`**: Card skeleton for loading states
- **`skeleton-table.tsx`**: Table skeleton for loading states

### Feature Components

#### Attendance Components

##### `src/components/attendance/AttendanceWidget.tsx`
- **Purpose**: Main attendance tracking widget
- **Features**:
  - Check-in/check-out functionality
  - Display current status
  - Clock time display
  - Attendance history
  - Shift information
  - Location tracking (if enabled)

#### Leave Components

##### `src/components/leave/LeaveRequestForm.tsx`
- **Purpose**: Form for submitting new leave requests
- **Features**:
  - Date range picker
  - Leave type selection
  - Reason/notes field
  - Form validation
  - Submit and notification handling

##### `src/components/leave/LeaveHistory.tsx`
- **Purpose**: Display leave request history and status
- **Features**:
  - List of past and pending leave requests
  - Status badges (approved, pending, rejected)
  - Date range display
  - Role-based view (staff vs admin)

#### Notification Components

##### `src/components/notifications/NotificationBell.tsx`
- **Purpose**: Notification bell icon in header
- **Features**:
  - Badge showing notification count
  - Dropdown menu with recent notifications
  - Real-time notification updates
  - Notification dismissal

#### Task Components

##### `src/components/tasks/TaskBoard.tsx`
- **Purpose**: Kanban board view for tasks
- **Features**:
  - Drag-and-drop task management
  - Status columns (To Do, In Progress, Done)
  - Task cards with details
  - Create new task button
- **Props**: `role` (for role-based display)

##### `src/components/tasks/TaskList.tsx`
- **Purpose**: Table/list view for tasks
- **Features**:
  - Sortable task list
  - Filter options
  - Task details display
  - Status indicators
  - Due date highlights
- **Props**: `role`

##### `src/components/tasks/TaskCard.tsx`
- **Purpose**: Individual task card component
- **Features**:
  - Task title and description
  - Priority indicator
  - Assignee avatar
  - Due date
  - Status badge

##### `src/components/tasks/CreateTaskDialog.tsx`
- **Purpose**: Dialog for creating new tasks
- **Features**:
  - Task title and description fields
  - Assignee selection
  - Priority selection
  - Due date picker
  - Form validation

##### `src/components/tasks/EditTaskDialog.tsx`
- **Purpose**: Dialog for editing existing tasks
- **Features**:
  - Pre-filled task information
  - All creation fields available for editing
  - Status update capability
  - Delete task option

#### Room Booking Components

##### `src/components/rooms/BookingCalendar.tsx`
- **Purpose**: Calendar view for room availability and booking
- **Features**:
  - Month/week view calendar
  - Show booked time slots
  - Create booking by selecting time
  - Color-coded availability
- **Props**: `role`

##### `src/components/rooms/RoomList.tsx`
- **Purpose**: Display available meeting rooms
- **Features**:
  - Room cards with details
  - Capacity information
  - Amenities list
  - Quick booking button
  - Room availability status
- **Props**: `role`

##### `src/components/rooms/MyBookings.tsx`
- **Purpose**: Display user's room bookings
- **Features**:
  - List of upcoming bookings
  - Past bookings archive
  - Cancellation functionality
  - Booking details

##### `src/components/rooms/CreateRoomDialog.tsx`
- **Purpose**: Dialog for admin to create new rooms
- **Features**:
  - Room name and description
  - Capacity setting
  - Amenities selection
  - Location/building assignment

##### `src/components/rooms/CreateBookingDialog.tsx`
- **Purpose**: Dialog for creating new room bookings
- **Features**:
  - Room selection
  - Date and time range picker
  - Meeting title and agenda
  - Attendees list
  - Recurrence options (if needed)

#### Organization Management Components

##### `src/components/organization/TeamsManagement.tsx`
- **Purpose**: Admin panel for managing teams/departments
- **Features**:
  - List of all teams
  - Create new team
  - Edit team details
  - Delete teams
  - Assign team members
  - View team members

##### `src/components/organization/UsersManagement.tsx`
- **Purpose**: Admin panel for user management
- **Features**:
  - List of all users
  - Create new user
  - Edit user details
  - Change user roles
  - Assign teams and shifts
  - Deactivate/activate users
  - Export user data

##### `src/components/organization/ShiftsManagement.tsx`
- **Purpose**: Admin panel for shift management
- **Features**:
  - List of all shifts
  - Create shift patterns
  - Edit shift times
  - Assign users to shifts
  - Delete shifts
  - Shift templates

##### `src/components/organization/SalaryManagement.tsx`
- **Purpose**: Admin panel for salary and payroll
- **Features**:
  - User salary records
  - Salary adjustments
  - Benefits management
  - Tax deductions
  - Payroll processing

##### `src/components/organization/SalaryStatistics.tsx`
- **Purpose**: Analytics and statistics for payroll
- **Features**:
  - Salary distribution charts
  - Department-wise salary analysis
  - Payroll trends
  - Expense reports

##### `src/components/organization/AttendanceSettings.tsx`
- **Purpose**: Admin settings for attendance system
- **Features**:
  - Attendance policy configuration
  - Grace period settings
  - Location-based check-in setup
  - Geofencing configuration
  - Attendance rules and penalties

---

## Integration & Libraries

### `src/integrations/supabase/client.ts`
- **Purpose**: Supabase client initialization
- **Features**:
  - Creates Supabase client instance
  - Configures authentication persistence
  - Auto-refresh tokens
  - LocalStorage for sessions
- **Configuration**:
  - URL: `https://fjzzjhgjxsfbbwwuqcxh.supabase.co`
  - Uses Supabase JWT authentication

### `src/integrations/supabase/types.ts`
- **Purpose**: TypeScript type definitions for Supabase database
- **Content**: Generated database types for type safety
- **Note**: Auto-generated, should not be manually edited

---

## Utilities & Hooks

### `src/lib/auth.ts`
- **Purpose**: Authentication and user management utilities
- **Exports**:
  - **`UserRole`**: Type definition (admin | leader | staff)
  - **`UserProfile`**: Interface with user details
  - **`getCurrentUser()`**: Get currently authenticated user
  - **`getCurrentSession()`**: Get current auth session
  - **`getUserRole(userId)`**: Fetch user's role
  - **`getUserProfile(userId)`**: Fetch user profile details
  - **`signIn(email, password)`**: Login user
  - **`signUp(email, password, metadata)`**: Register new user
  - **`signOut()`**: Logout current user

### `src/lib/utils.ts`
- **Purpose**: Utility functions
- **Exports**:
  - **`cn(...inputs)`**: Utility for merging Tailwind CSS classes using clsx and tailwind-merge
  - Used for conditional class styling throughout components

### `src/hooks/use-toast.ts`
- **Purpose**: Custom hook for toast notifications
- **Functionality**: Returns `toast` function for showing notifications
- **Related Component**: Toaster component

### `src/hooks/use-mobile.tsx`
- **Purpose**: Custom hook to detect mobile viewport
- **Functionality**: Returns boolean indicating if screen is mobile size
- **Usage**: Responsive component rendering

---

## Configuration Files in Root

### `bun.lockb`, `package-lock.json`, `pnpm-lock.yaml`
- **Purpose**: Lock files for dependency version management
- **Current Package Manager**: pnpm (as specified in package.json)

### `README.md`
- **Purpose**: Project documentation and setup instructions

### `.gitignore`, `.env.example`
- **Purpose**: Git and environment configuration

---

## Key Technologies & Libraries

### Frontend Framework
- **React 18**: UI library
- **React Router DOM v6**: Client-side routing
- **TypeScript**: Type safety

### UI & Styling
- **Tailwind CSS**: Utility-first CSS framework
- **Shadcn UI**: High-quality React component library
- **Lucide React**: Icon library

### State Management & Data Fetching
- **TanStack Query (React Query)**: Server state management
- **React Hook Form**: Form state management
- **Zod**: Schema validation

### Backend & Authentication
- **Supabase**: PostgreSQL database and authentication
- **Supabase JS Client**: Database and auth integration

### Date & Time
- **date-fns**: Date utilities
- **React Day Picker**: Date picker component

### Charts & Data Visualization
- **Recharts**: Chart library

### Notifications
- **Sonner**: Toast notifications
- **Radix UI Toast**: Toast component base

### Utilities
- **clsx**: Conditional class names
- **tailwind-merge**: Merge Tailwind classes
- **class-variance-authority**: Component variants
- **xlsx**: Excel file export
- **cmdk**: Command palette
- **embla-carousel**: Carousel/slider
- **react-resizable-panels**: Resizable panel system
- **next-themes**: Theme management
- **vaul**: Drawer/navigation drawer

### Development
- **Vite**: Build tool and dev server
- **ESLint**: Code quality
- **PostCSS & Autoprefixer**: CSS processing
- **TypeScript ESLint**: Type-aware linting

---

## Architecture Overview

### Data Flow
1. **Authentication**: User logs in via Login page → Supabase auth
2. **Navigation**: Routes managed by React Router
3. **Layout**: Most pages wrapped in DashboardLayout
4. **Data Fetching**: TanStack Query handles server state
5. **Notifications**: Sonner for toast notifications

### Role-Based Access
- **Staff**: Access Dashboard, Attendance, Tasks, Leave, Meetings
- **Leader**: Same as staff + team management features
- **Admin**: Full access including Organization settings

### State Management
- **Auth State**: Managed through Supabase
- **UI State**: React local state (useState)
- **Server State**: TanStack Query
- **Form State**: React Hook Form

---

## Notes

- All API calls use Supabase client (src/integrations/supabase/client.ts)
- Forms use React Hook Form with Zod validation
- Responsive design with Tailwind CSS breakpoints
- Dark mode support via next-themes
- Accessibility built-in via Radix UI primitives
- Type safety throughout with TypeScript
- Gradient utilities defined in Tailwind config for consistent branding
