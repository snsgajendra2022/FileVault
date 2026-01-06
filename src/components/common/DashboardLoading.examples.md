# DashboardLoading Component - Usage Examples

A modern, customizable loading component that can be used across multiple pages with different configurations.

## Basic Usage

```tsx
import DashboardLoading from '../../components/common/DashboardLoading';

if (loading) {
  return <DashboardLoading />;
}
```

## Customized Examples

### 1. Dashboard Page
```tsx
import DashboardLoading from '../../components/common/DashboardLoading';
import { FaCamera } from 'react-icons/fa';

if (loading) {
  return (
    <DashboardLoading 
      title="Loading Dashboard"
      subtitle="Preparing your photo studio..."
      icon={FaCamera}
    />
  );
}
```

### 2. Albums Page
```tsx
import DashboardLoading from '../../components/common/DashboardLoading';
import { FaFolder } from 'react-icons/fa';

if (loading) {
  return (
    <DashboardLoading 
      title="Loading Albums"
      subtitle="Fetching your photo collections..."
      icon={FaFolder}
    />
  );
}
```

### 3. Clients Page
```tsx
import DashboardLoading from '../../components/common/DashboardLoading';
import { FaUsers } from 'react-icons/fa';

if (loading) {
  return (
    <DashboardLoading 
      title="Loading Clients"
      subtitle="Retrieving client information..."
      icon={FaUsers}
      features={[
        { icon: FaUsers, label: 'Clients' },
        { icon: FaFolder, label: 'Albums' },
        { icon: FaImages, label: 'Photos' }
      ]}
    />
  );
}
```

### 4. Upload Page
```tsx
import DashboardLoading from '../../components/common/DashboardLoading';
import { FaCloudUploadAlt } from 'react-icons/fa';

if (loading) {
  return (
    <DashboardLoading 
      title="Preparing Upload"
      subtitle="Setting up your upload session..."
      icon={FaCloudUploadAlt}
      showFeatures={false}
    />
  );
}
```

### 5. Settings Page
```tsx
import DashboardLoading from '../../components/common/DashboardLoading';
import { FaCog } from 'react-icons/fa';

if (loading) {
  return (
    <DashboardLoading 
      title="Loading Settings"
      subtitle="Fetching your preferences..."
      icon={FaCog}
      showProgress={false}
    />
  );
}
```

### 6. Analytics Page
```tsx
import DashboardLoading from '../../components/common/DashboardLoading';
import { FaChartLine, FaUsers, FaImages, FaDollarSign } from 'react-icons/fa';

if (loading) {
  return (
    <DashboardLoading 
      title="Loading Analytics"
      subtitle="Calculating your statistics..."
      icon={FaChartLine}
      features={[
        { icon: FaUsers, label: 'Users' },
        { icon: FaImages, label: 'Images' },
        { icon: FaDollarSign, label: 'Revenue' }
      ]}
    />
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | `"Loading Dashboard"` | Main loading title |
| `subtitle` | `string` | `"Preparing your content..."` | Subtitle text |
| `icon` | `React.ComponentType<IconBaseProps>` | `FaCamera` | Icon to display in the center |
| `features` | `LoadingFeature[]` | Default features | Array of feature items to display |
| `showFeatures` | `boolean` | `true` | Show/hide feature items |
| `showProgress` | `boolean` | `true` | Show/hide progress bar |

## LoadingFeature Interface

```tsx
interface LoadingFeature {
  icon: React.ComponentType<IconBaseProps>;
  label: string;
}
```

## Default Features

If no features are provided, the component uses:
- Clients (FaUsers)
- Photos (FaImages)
- Albums (FaFolder)



