# FileVault Project Exploration

## Overview

FileVault is a comprehensive React frontend for the ImageSecurity API system, providing user management, cloud service configuration, and secure file handling with special features for "Our Memories" functionality.

## Project Structure

```
src/
├── components/
│   ├── layout/                 # Layout components (Header, Sidebar, Footer)
│   ├── auth/                   # Authentication components
│   ├── admin/                  # Admin dashboard components
│   ├── services/               # Service configuration components
│   ├── common/                 # Shared components (Modals, Loaders, etc.)
│   ├── openclaw/               # OpenClaw AI assistant components
│   ├── invitations/            # Invitation system components
│   └── PhotoBook/              # Photo book creation components
├── pages/
│   ├── auth/                   # Authentication pages
│   ├── dashboard/              # Dashboard pages
│   ├── user/                   # User profile and settings pages
│   ├── billing/                # Billing and subscription pages
│   ├── images/                 # Image management pages
│   ├── invitations/            # Invitation management pages
│   ├── family-tree/            # Family tree features
│   ├── photo-studio/           # Photo studio management
│   ├── photo-themes/           # Photo themes functionality
│   ├── photo-book/             # Photo book creation
│   ├── memories/               # **Our Memories** core functionality
│   ├── PhoneBook/              # Contact management
│   └── misc/                   # Miscellaneous pages (privacy, etc.)
├── hooks/                      # Custom React hooks
├── services/                   # API service layers
├── types/                      # TypeScript type definitions
├── utils/                      # Utility functions and helpers
├── state/                      # State management (stores, context)
│   ├── stores/                 # Zustand stores
│   └── context/                # React context providers
├── config/                     # Configuration files
├── templates/                  # Template definitions
└── i18n/                       # Internationalization
```

## Key Features

### 1. Authentication System
- Multi-step registration with verification
- JWT-based authentication
- Role-based access control (User/Admin)
- Password management and reset
- Protected route system

### 2. Service Subscription Management
- Dynamic cloud service configuration (S3, B2, Google Drive)
- Connection testing and status monitoring
- Service documentation integration
- Enable/disable services dynamically

### 3. File Management System
- Dynamic file listing from API
- Multiple file type support (images, documents, text)
- File preview and download functionality
- Cloud service integration status display
- Secure file deletion

### 4. Our Memories (Core Feature)
- Event creation and management
- Photo upload and organization
- Privacy settings (Public, Private, Invite-only)
- Photobook creation from events
- Shared events with others
- Event dashboard and analytics
- Memory timeline views

### 5. Photo Studio Pro
- Client management system
- Gallery and album organization
- Barcode system for print management
- Client portal access
- Labor sheets and job tracking
- Public image sharing and sales

### 6. Additional Features
- Phone Book/Contact management
- Family tree builder
- Invitation system for sharing
- Billing and plan management
- Analytics and usage tracking
- OpenClaw AI assistant integration
- Photo themes and customization

## Technology Stack

- **Frontend**: React 18.x with TypeScript
- **Routing**: React Router v6
- **State Management**: React Query (TanStack Query) + Zustand
- **HTTP Client**: Axios
- **Styling**: Tailwind CSS
- **Forms**: React Hook Form
- **Notifications**: React Hot Toast
- **Icons**: React Icons (FontAwesome)
- **Build Tool**: Create React App with CRACO

## API Integration

The frontend integrates with the ImageSecurity API backend at:
- Development: `http://localhost:9090` (from .env)
- Production: Configured via REACT_APP_API_URL

Key API endpoints used:
- `/api/auth/*` - Authentication
- `/api/user/*` - User management
- `/api/services/*` - Service configuration
- `/api/images/*` - File management
- `/api/memories/*` - Memories functionality
- `/api/openclaw/*` - AI assistant
- `/api/billing/*` - Subscription and payments
- `/api/invitations/*` - Invitation system
- `/api/photo-studio/*` - Photo studio features

## Environment Configuration

Environment variables are defined in `.env`:
- `REACT_APP_API_URL` - Backend API URL
- `REACT_APP_OPENCLAW_ENABLED` - OpenClaw assistant toggle
- `REACT_APP_OPENCLAW_*_PATH` - OpenClaw endpoint paths
- `OPENCLAW_BRIDGE_URL` - OpenClaw bridge URL
- `OPENCLAW_BRIDGE_TOKEN` - Authentication token
- `OPENAI_API_KEY` - OpenAI/OpenRouter API key
- `OPENAI_API_BASE` - OpenRouter API base URL
- `OPENAI_MODEL` - AI model to use
- `OPENCLAW_DEV_PORT` - Development port for OpenClaw

## Development Setup

1. Install dependencies: `npm install`
2. Configure `.env` file (see template in .env.example or existing .env)
3. Start development server: `npm start`
4. Application available at: `http://localhost:3000`

## Build Commands

- `npm start` - Development server
- `npm run build` - Production build
- `npm test` - Run tests
- `npm run eject` - Eject from CRA (not recommended)

## Security Features

- JWT token management with automatic refresh
- Role-based access control
- Secure credential handling (encryption utilities)
- Account lockout protection
- Input validation and sanitization
- Protected routes for authenticated users
- Admin-only route protection

## UI/UX Features

- Responsive design (mobile-first)
- Tailwind CSS utility-first styling
- Component reusability
- Loading states (skeletons, spinners)
- Error boundaries for graceful error handling
- Toast notifications for user feedback
- Form validation with React Hook Form
- Accessibility considerations (WCAG compliant)

## Memory System Details

The "Our Memories" feature includes:

### Event Management
- Create events with name, date, location, summary
- Upload cover images and gallery photos
- Set privacy levels (Public, Private, Invite-only)
- Edit and delete events
- Share events with specific users

### Photobook Creation
- Generate photobooks from event photos
- Multiple templates available
- Customizable layouts and designs
- Preview before generation
- Save and manage photobooks

### Sharing & Collaboration
- Share events with specific users
- View shared events in "Shared with Me" section
- Public galleries for events set to Public
- Guest access via shareable links

### Data Structure
- Events contain metadata (name, date, location, etc.)
- Images stored with references to events
- Privacy settings control access levels
- Photobook templates stored separately
- User relationships managed through invitations

## OpenClaw Integration

The OpenClaw AI assistant is integrated throughout the application:
- Available as a dockable panel
- Context-aware assistance based on current page
- Voice and text interaction capabilities
- Image generation and analysis
- Session management for personalized assistance
- Configuration via environment variables

## Photo Studio Features

### Client Management
- Client database with contact information
- Job tracking and project management
- Client-specific galleries and albums
- Portal access for clients to view/share photos

### Studio Operations
- Labor sheets for job tracking
- Barcode system for print workflow
- Image selection and proofing systems
- Payment and invoice management
- Public image sales and licensing

### Configuration
- Studio settings customization
- Email and notification templates
- Branding and watermark options
- Pricing and package configuration

## Internationalization

- i18n configuration for multiple languages
- English (en.json) as primary locale
- Easy addition of new languages
- Centralized translation management

## Code Quality Standards

- TypeScript for type safety
- ESLint for code linting
- Prettier for code formatting
- Consistent component architecture
- Custom hooks for reusable logic
- Utility functions for common operations
- Proper error boundaries and loading states

## Deployment

Production deployment involves:
1. Building the application: `npm run build`
2. Serving the static files from the build directory
3. Configuring environment variables for production
4. Setting up proper routing (for client-side routing)
5. Ensuring CORS configuration on backend API

## Recent Changes & TODOs

Based on the git status:
- `.env` file has been modified (API configuration)
- `todaywork.md` has been modified (work tracking)
- `.openclaw/` directory contains OpenClaw workspace state
- `openclaw/` directory appears to be a git submodule or separate repository

## Navigation Structure

Main navigation sections accessible via sidebar:
- Dashboard
- Profile
- Services
- Plans
- Billing
- Settings
- Portal Settings
- Upload
- Images
- Analytics
- Invitations
- Connections
- Studio (Photo Studio Pro)
- Photo Themes
- Photo Book
- Memories (Our Memories)
- Phone Book
- Family Tree
- Admin (Admin only)

Each section contains multiple pages and features as outlined above.

---
*This exploration document provides a comprehensive overview of the FileVault/OpenClaw project structure, features, and technology stack.*