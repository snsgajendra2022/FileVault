# DashboardLoading — quick examples

Full documentation: **[docs/DASHBOARD-LOADING.md](../../docs/DASHBOARD-LOADING.md)** (design, props, accessibility, repo usage).

## Defaults

```tsx
<DashboardLoading />
// title: "Loading..."
// subtitle: "Preparing your content..."
// icon: FaCamera
// features: Clients, Photos, Albums
```

## Copy-paste

```tsx
import DashboardLoading from '../../components/common/DashboardLoading';
import { FaCamera, FaFolder, FaUsers, FaImages } from 'react-icons/fa';

if (loading) {
  return (
    <DashboardLoading
      title="Loading albums"
      subtitle="Fetching your photo collections..."
      icon={FaFolder}
    />
  );
}
```

```tsx
// No feature chips
<DashboardLoading
  title="Authenticating"
  subtitle="Please wait..."
  icon={FaUsers}
  showFeatures={false}
/>
```

```tsx
// Custom chips
<DashboardLoading
  title="Loading..."
  subtitle="Preparing your content..."
  features={[
    { icon: FaUsers, label: 'Clients' },
    { icon: FaImages, label: 'Photos' },
    { icon: FaFolder, label: 'Albums' },
  ]}
/>
```
