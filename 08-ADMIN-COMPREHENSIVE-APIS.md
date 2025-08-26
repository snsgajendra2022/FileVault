# Comprehensive Admin APIs Documentation

## Overview

This document describes the complete set of admin APIs for managing the Image Security system. These APIs provide comprehensive administrative capabilities including user management, service configuration monitoring, usage statistics, and system health monitoring.

### Base URL
```
http://localhost:9090
```

### Authentication
All admin endpoints require admin privileges. Include the admin token in the Authorization header:
```
Authorization: Bearer <adminToken>
```

---

## 1. User Management APIs

### 1.1 Get All Users with Pagination and Filtering

**Endpoint:** `GET /api/admin/users`

**Description:** Retrieves all users in the system with pagination, filtering, and search capabilities.

**Query Parameters:**
- `page` (optional): Page number (default: 0)
- `size` (optional): Page size (default: 20)
- `status` (optional): Filter by user status (ACTIVE, SUSPENDED, PENDING_VERIFICATION, etc.)
- `accountType` (optional): Filter by account type (FREE, BASIC, PREMIUM, ENTERPRISE, ADMIN)
- `search` (optional): Search in username, email, first name, or last name

**Request:**
```bash
curl -X GET "http://localhost:9090/api/admin/users?page=0&size=10&status=ACTIVE&search=john" \
  -H "Authorization: Bearer <adminToken>"
```

**Response:**
```json
{
  "users": [
    {
      "id": 1,
      "username": "john_doe",
      "email": "john@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "+1234567890",
      "accountType": "PREMIUM",
      "status": "ACTIVE",
      "createdAt": "2025-01-15T10:30:00",
      "lastLoginAt": "2025-01-20T14:45:00",
      "updatedAt": "2025-01-20T14:45:00",
      "company": "Tech Corp",
      "role": "Developer",
      "department": "Engineering",
      "storageQuotaMB": 1000,
      "allowedFileTypes": "jpg,jpeg,png,pdf,doc,docx",
      "maxFileSizeMB": 50,
      "twoFactorEnabled": false,
      "failedLoginAttempts": 0
    }
  ],
  "totalUsers": 150,
  "page": 0,
  "size": 10,
  "totalPages": 15
}
```

### 1.2 Get User Statistics

**Endpoint:** `GET /api/admin/users/statistics`

**Description:** Retrieves comprehensive user statistics and counts.

**Request:**
```bash
curl -X GET http://localhost:9090/api/admin/users/statistics \
  -H "Authorization: Bearer <adminToken>"
```

**Response:**
```json
{
  "statusCounts": {
    "ACTIVE": 120,
    "PENDING_VERIFICATION": 5,
    "SUSPENDED": 3,
    "LOCKED": 2,
    "INACTIVE": 20
  },
  "accountTypeCounts": {
    "FREE": 50,
    "BASIC": 30,
    "PREMIUM": 40,
    "ENTERPRISE": 25,
    "ADMIN": 5
  },
  "recentRegistrations": 15,
  "activeUsers": 85,
  "totalUsers": 150
}
```

### 1.3 Get Detailed User Information

**Endpoint:** `GET /api/admin/users/{userId}/details`

**Description:** Retrieves comprehensive user information including usage statistics and service configurations.

**Request:**
```bash
curl -X GET http://localhost:9090/api/admin/users/1/details \
  -H "Authorization: Bearer <adminToken>"
```

**Response:**
```json
{
  "user": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "accountType": "PREMIUM",
    "status": "ACTIVE",
    "storageQuotaMB": 1000,
    "createdAt": "2025-01-15T10:30:00",
    "lastLoginAt": "2025-01-20T14:45:00"
  },
  "services": {
    "userId": 1,
    "username": "john_doe",
    "subscriptions": [
      {
        "id": 1,
        "serviceType": "B2_SERVICE",
        "serviceDisplayName": "Backblaze B2",
        "isEnabled": true,
        "isConfigured": true,
        "connectionStatus": "CONNECTED",
        "createdAt": "2025-01-16T09:00:00"
      }
    ],
    "summary": {
      "totalSubscriptions": 1,
      "enabledSubscriptions": 1,
      "configuredSubscriptions": 1,
      "connectedServices": 1,
      "failedConnections": 0
    }
  },
  "imageCount": 25,
  "totalStorageUsedBytes": 524288000,
  "totalStorageUsedMB": 500,
  "storageQuotaMB": 1000,
  "storageUsagePercentage": 50.0,
  "userPlan": {
    "id": 1,
    "planId": 2,
    "userId": 1,
    "subscriptionStatus": "ACTIVE",
    "billingCycle": "MONTHLY",
    "startDate": "2025-01-15T10:30:00",
    "endDate": "2025-02-15T10:30:00"
  }
}
```

---

## 2. Service Configuration Management APIs

### 2.1 Get All Service Configurations

**Endpoint:** `GET /api/admin/services/configurations`

**Description:** Retrieves all service configurations across all users with pagination and filtering.

**Query Parameters:**
- `page` (optional): Page number (default: 0)
- `size` (optional): Page size (default: 20)
- `serviceType` (optional): Filter by service type (S3_BUCKET, B2_SERVICE, GOOGLE_DRIVE)
- `status` (optional): Filter by connection status (CONNECTED, FAILED, NOT_TESTED)

**Request:**
```bash
curl -X GET "http://localhost:9090/api/admin/services/configurations?page=0&size=10&serviceType=B2_SERVICE" \
  -H "Authorization: Bearer <adminToken>"
```

**Response:**
```json
{
  "configurations": [
    {
      "id": 1,
      "userId": 1,
      "username": "john_doe",
      "serviceType": "B2_SERVICE",
      "serviceDisplayName": "Backblaze B2",
      "connectionStatus": "CONNECTED",
      "isEnabled": true,
      "createdAt": "2025-01-16T09:00:00",
      "updatedAt": "2025-01-20T14:45:00",
      "lastTestedAt": "2025-01-20T14:45:00"
    }
  ],
  "totalConfigurations": 45,
  "page": 0,
  "size": 10,
  "totalPages": 5
}
```

### 2.2 Get Service Configuration Statistics

**Endpoint:** `GET /api/admin/services/statistics`

**Description:** Retrieves comprehensive service configuration statistics.

**Request:**
```bash
curl -X GET http://localhost:9090/api/admin/services/statistics \
  -H "Authorization: Bearer <adminToken>"
```

**Response:**
```json
{
  "serviceTypeCounts": {
    "S3_BUCKET": 15,
    "B2_SERVICE": 20,
    "GOOGLE_DRIVE": 10
  },
  "connectionStatusCounts": {
    "CONNECTED": 35,
    "FAILED": 5,
    "NOT_TESTED": 5
  },
  "usersWithMultipleServices": 8,
  "totalConfigurations": 45,
  "uniqueUsersWithServices": 30
}
```

### 2.3 Test Service Configuration

**Endpoint:** `POST /api/admin/services/{subscriptionId}/test`

**Description:** Tests a specific service configuration connection.

**Request:**
```bash
curl -X POST http://localhost:9090/api/admin/services/1/test \
  -H "Authorization: Bearer <adminToken>"
```

**Response:**
```json
{
  "success": true,
  "message": "B2 connection successful",
  "connectionStatus": "CONNECTED",
  "errorDetails": null,
  "testTime": "2025-01-20T15:00:00"
}
```

---

## 3. Usage Statistics APIs

### 3.1 Get System-Wide Usage Statistics

**Endpoint:** `GET /api/admin/usage/statistics`

**Description:** Retrieves comprehensive system-wide usage statistics.

**Query Parameters:**
- `period` (optional): Time period for statistics (e.g., "30d", "7d", "1d")

**Request:**
```bash
curl -X GET http://localhost:9090/api/admin/usage/statistics \
  -H "Authorization: Bearer <adminToken>"
```

**Response:**
```json
{
  "totalStorageUsedBytes": 1073741824000,
  "totalStorageUsedGB": 1000.0,
  "totalImages": 50000,
  "averageFileSizeBytes": 21474836,
  "averageFileSizeMB": 20.48,
  "fileTypeDistribution": {
    "jpg": 20000,
    "png": 15000,
    "pdf": 8000,
    "doc": 4000,
    "docx": 3000
  },
  "userStorageUsage": {
    "1": 524288000,
    "2": 1048576000,
    "3": 262144000
  },
  "topUsersByStorage": [
    {
      "userId": 2,
      "username": "jane_smith",
      "storageUsedBytes": 1048576000,
      "storageUsedMB": 1000.0
    },
    {
      "userId": 1,
      "username": "john_doe",
      "storageUsedBytes": 524288000,
      "storageUsedMB": 500.0
    }
  ]
}
```

### 3.2 Get User-Specific Usage Statistics

**Endpoint:** `GET /api/admin/users/{userId}/usage`

**Description:** Retrieves detailed usage statistics for a specific user.

**Query Parameters:**
- `period` (optional): Time period for statistics (e.g., "30d", "7d", "1d")

**Request:**
```bash
curl -X GET http://localhost:9090/api/admin/users/1/usage \
  -H "Authorization: Bearer <adminToken>"
```

**Response:**
```json
{
  "totalImages": 25,
  "totalStorageUsedBytes": 524288000,
  "totalStorageUsedMB": 500.0,
  "storageQuotaMB": 1000,
  "storageUsagePercentage": 50.0,
  "fileTypeDistribution": {
    "jpg": 15,
    "png": 8,
    "pdf": 2
  },
  "recentUploads": 5,
  "averageFileSizeBytes": 20971520,
  "averageFileSizeMB": 20.0
}
```

---

## 4. System Health APIs

### 4.1 Get System Health and Performance Metrics

**Endpoint:** `GET /api/admin/system/health`

**Description:** Retrieves comprehensive system health and performance metrics.

**Request:**
```bash
curl -X GET http://localhost:9090/api/admin/system/health \
  -H "Authorization: Bearer <adminToken>"
```

**Response:**
```json
{
  "totalUsers": 150,
  "totalImages": 50000,
  "totalServiceConfigurations": 45,
  "activeUsers": 85,
  "pendingVerifications": 5,
  "suspendedUsers": 3,
  "failedServiceConnections": 5,
  "totalStorageUsedGB": 1000.0
}
```

---

## 5. Error Responses

### 5.1 Authentication Errors

**Status:** `401 Unauthorized`
```json
{
  "error": "Invalid token"
}
```

**Status:** `403 Forbidden`
```json
{
  "error": "Admin access required"
}
```

### 5.2 Resource Not Found

**Status:** `404 Not Found`
```json
{
  "error": "User not found"
}
```

### 5.3 Validation Errors

**Status:** `400 Bad Request`
```json
{
  "error": "Invalid request parameters"
}
```

---

## 6. Admin Privileges and Security

### 6.1 Required Admin Permissions

All admin endpoints require:
- Valid admin token
- User account type must be ADMIN
- Token must not be expired

### 6.2 Security Considerations

- All admin actions are logged for audit purposes
- Sensitive data (passwords, API keys) are masked in responses
- Rate limiting applies to admin endpoints
- Admin tokens should be rotated regularly

### 6.3 Getting Admin Token

1. Login as admin user:
```bash
curl -X POST http://localhost:9090/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

2. Extract the `apiToken` from the response
3. Use the token in the Authorization header for admin requests

---

## 7. Usage Examples

### 7.1 Complete User Management Workflow

```bash
# 1. Get all users with pagination
curl -X GET "http://localhost:9090/api/admin/users?page=0&size=20" \
  -H "Authorization: Bearer <adminToken>"

# 2. Get user statistics
curl -X GET http://localhost:9090/api/admin/users/statistics \
  -H "Authorization: Bearer <adminToken>"

# 3. Get detailed user information
curl -X GET http://localhost:9090/api/admin/users/1/details \
  -H "Authorization: Bearer <adminToken>"

# 4. Get user usage statistics
curl -X GET http://localhost:9090/api/admin/users/1/usage \
  -H "Authorization: Bearer <adminToken>"
```

### 7.2 Service Configuration Management

```bash
# 1. Get all service configurations
curl -X GET "http://localhost:9090/api/admin/services/configurations?serviceType=B2_SERVICE" \
  -H "Authorization: Bearer <adminToken>"

# 2. Get service statistics
curl -X GET http://localhost:9090/api/admin/services/statistics \
  -H "Authorization: Bearer <adminToken>"

# 3. Test a service configuration
curl -X POST http://localhost:9090/api/admin/services/1/test \
  -H "Authorization: Bearer <adminToken>"
```

### 7.3 System Monitoring

```bash
# 1. Get system health
curl -X GET http://localhost:9090/api/admin/system/health \
  -H "Authorization: Bearer <adminToken>"

# 2. Get usage statistics
curl -X GET http://localhost:9090/api/admin/usage/statistics \
  -H "Authorization: Bearer <adminToken>"
```

---

## 8. Best Practices

### 8.1 Performance Optimization

- Use pagination for large datasets
- Apply filters to reduce response size
- Cache frequently accessed statistics
- Monitor API response times

### 8.2 Data Management

- Regularly review user statistics
- Monitor storage usage trends
- Track service configuration health
- Audit admin actions

### 8.3 Security

- Rotate admin tokens regularly
- Monitor for suspicious admin activities
- Implement proper access controls
- Log all admin actions

---

## 9. Integration Examples

### 9.1 Dashboard Integration

```javascript
// Get system overview for dashboard
async function getSystemOverview() {
  const [users, services, usage, health] = await Promise.all([
    fetch('/api/admin/users/statistics'),
    fetch('/api/admin/services/statistics'),
    fetch('/api/admin/usage/statistics'),
    fetch('/api/admin/system/health')
  ]);
  
  return {
    users: await users.json(),
    services: await services.json(),
    usage: await usage.json(),
    health: await health.json()
  };
}
```

### 9.2 Monitoring Integration

```javascript
// Monitor system health
async function monitorSystemHealth() {
  const health = await fetch('/api/admin/system/health');
  const data = await health.json();
  
  if (data.pendingVerifications > 10) {
    alert('High number of pending verifications');
  }
  
  if (data.failedServiceConnections > 5) {
    alert('Multiple service connection failures');
  }
}
```

---

## 10. Troubleshooting

### 10.1 Common Issues

1. **401 Unauthorized**: Check admin token validity
2. **403 Forbidden**: Ensure user has ADMIN account type
3. **404 Not Found**: Verify resource ID exists
4. **400 Bad Request**: Check request parameters

### 10.2 Debugging Tips

- Check server logs for detailed error messages
- Verify admin token in Authorization header
- Ensure proper Content-Type headers
- Test with smaller page sizes for large datasets

---

This comprehensive admin API documentation provides all the necessary endpoints for complete system administration, user management, service monitoring, and usage analytics. 