# FileVault - Image Security React Portal

A comprehensive React frontend for the ImageSecurity API system, providing user management, cloud service configuration, and secure file handling.

## 🚀 Features

 "start": "concurrently -n openclaw,web -c magenta,cyan \"node server/openclaw-dev-server.js\" \"craco start\"",
"start:web": "craco start",
"openclaw-server": "node server/openclaw-dev-server.js",


### Core Features
- **User Authentication & Management**
  - User registration with multi-step form
  - Login/logout functionality
  - Profile management
  - Password change
  - Admin verification workflow

- **Plan Management System**
  - Plan selection and subscription
  - Usage tracking and limits
  - Plan upgrade/downgrade
  - Billing cycle management
  - Usage statistics and alerts

- **Admin Dashboard**
  - User management and verification
  - Account status management
  - System overview and statistics
  - Plan management and analytics

- **Service Subscription Management**
  - Dynamic cloud service configuration from API
  - Support for S3, B2, Google Drive, and more
  - Dynamic form generation based on service requirements
  - Connection testing and status monitoring
  - Service documentation integration

- **File Management System**
  - Dynamic file listing from API (`/api/images/user/all`)
  - Support for multiple file types (images, documents, text files)
  - File preview and download functionality
  - Cloud service integration status display
  - File deletion with API integration

- **Security Features**
  - JWT token management
  - Role-based access control
  - Secure credential handling
  - Account lockout protection

## 🛠️ Tech Stack

- **Frontend Framework**: React 18.x with TypeScript
- **Routing**: React Router v6
- **State Management**: React Query (TanStack Query)
- **HTTP Client**: Axios
- **Styling**: Tailwind CSS
- **Forms**: React Hook Form
- **Notifications**: React Hot Toast
- **Icons**: React Icons

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd filevault
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   REACT_APP_API_URL=http://localhost:9090
   REACT_APP_ENVIRONMENT=development
   ```

4. **Start the development server**
   ```bash
   npm start
   ```

The application will be available at `http://localhost:3000`

## 🏗️ Project Structure

```
src/
├── components/
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Layout.tsx
│   │   └── Footer.tsx
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   ├── RegisterForm.tsx
│   │   └── ProfileForm.tsx
│   ├── admin/
│   │   ├── UserManagement.tsx
│   │   ├── UserVerification.tsx
│   │   └── AdminDashboard.tsx
│   ├── services/
│   │   ├── ServiceList.tsx
│   │   ├── ServiceConfiguration.tsx
│   │   └── ServiceStatus.tsx
│   └── common/
│       ├── LoadingSpinner.tsx
│       ├── ErrorBoundary.tsx
│       └── Modal.tsx
├── pages/
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   ├── DashboardPage.tsx
│   └── AdminPage.tsx
├── hooks/
│   ├── useAuth.ts
│   └── useApi.ts
├── services/
│   ├── api.ts
│   ├── authService.ts
│   └── userService.ts
├── types/
│   ├── auth.ts
│   ├── user.ts
│   └── services.ts
├── utils/
│   ├── constants.ts
│   └── helpers.ts
└── context/
    └── AuthContext.tsx
```

## 🔐 Authentication

The application uses JWT tokens for authentication. The authentication flow includes:

1. **Login**: Users can log in with username/password
2. **Registration**: Multi-step registration process
3. **Token Management**: Automatic token refresh and storage
4. **Protected Routes**: Route protection based on authentication status
5. **Role-based Access**: Admin and user role management

### API Endpoints

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `PUT /api/auth/change-password` - Change password

## ☁️ Service Configuration

The application supports configuration of multiple cloud storage services:

### Supported Services
- **Amazon S3**: Configure with access key, secret key, bucket name, and region
- **Backblaze B2**: Configure with application key ID, application key, and bucket
- **Google Drive**: Configure with client ID, client secret, and refresh token

### Service Management
- Dynamic form generation based on service requirements
- Connection testing for each service
- Service status monitoring
- Enable/disable services

## 👨‍💼 Admin Features

Admin users have access to additional features:

### User Management
- View all users
- Verify pending users
- Activate/suspend users
- Upgrade user plans
- View user statistics

### System Overview
- Total users count
- Active users
- Pending verifications
- Service usage statistics

## 🎨 UI/UX Features

### Design System
- **Color Scheme**: Primary blue theme with status colors
- **Typography**: Clean, readable fonts
- **Components**: Reusable, consistent components
- **Responsive**: Mobile-first responsive design

### User Experience
- **Loading States**: Skeleton loading and spinners
- **Error Handling**: Graceful error boundaries
- **Notifications**: Toast notifications for user feedback
- **Form Validation**: Real-time form validation
- **Accessibility**: WCAG compliant components

## 🔧 Development

### Available Scripts

```bash
# Start development server
npm start

# Build for production
npm run build

# Run tests
npm test

# Eject from Create React App
npm run eject
```

### Code Quality

- **TypeScript**: Full type safety
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **React Query**: Efficient data fetching and caching

## 🚀 Deployment

### Production Build

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Deploy to your hosting service**
   - The build folder contains the production-ready files
   - Configure your web server to serve the static files

### Environment Configuration

Set the following environment variables for production:

```env
REACT_APP_API_URL=https://api.imagesecurity.com
REACT_APP_ENVIRONMENT=production
```

## 📱 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

## 🔄 API Integration

This frontend integrates with the ImageSecurity API backend. Ensure the backend is running and accessible at the configured API URL.

### API Base URL
- Development: `http://localhost:9090`
- Production: `https://api.imagesecurity.com`

### Required Backend Services
- Authentication service
- User management service
- Service subscription service
- Plan management service
- File upload service

---

**FileVault** - Secure, scalable image management for modern businesses.


