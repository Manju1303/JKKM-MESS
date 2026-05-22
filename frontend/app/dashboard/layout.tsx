'use client';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Overview of mess operations' },
  '/dashboard/inventory': { title: 'Inventory Management', subtitle: 'Real-time stock tracking' },
  '/dashboard/products': { title: 'Product Catalog', subtitle: 'Packaged, vegetables & bulk materials' },
  '/dashboard/purchases': { title: 'Purchase Management', subtitle: 'Purchase orders & approvals' },
  '/dashboard/suppliers': { title: 'Supplier Management', subtitle: 'Vendor database & analytics' },
  '/dashboard/kitchen': { title: 'Kitchen Issues', subtitle: 'Daily stock issue & consumption' },
  '/dashboard/barcode': { title: 'Barcode Scanner', subtitle: 'Scan products for quick entry' },
  '/dashboard/reports': { title: 'Reports & Analytics', subtitle: 'Insights & export' },
  '/dashboard/attendance': { title: 'Attendance', subtitle: 'Student meal count tracking' },
  '/dashboard/ai': { title: 'AI Insights', subtitle: 'Predictions & forecasting' },
  '/dashboard/notifications': { title: 'Notifications', subtitle: 'Alerts & system messages' },
  '/dashboard/users': { title: 'User Management', subtitle: 'Staff roles & permissions' },
  '/dashboard/settings': { title: 'Settings', subtitle: 'System configuration' },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const page = pageTitles[pathname] || { title: 'JKKM Mess ERP', subtitle: '' };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar title={page.title} subtitle={page.subtitle} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
