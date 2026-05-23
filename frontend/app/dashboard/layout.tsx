'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';
import { socket } from '@/lib/socket';
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
  const { isAuthenticated, token, user } = useAuthStore();
  const { addNotification } = useNotificationStore();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.push('/login');
    }
  }, [mounted, isAuthenticated, router]);

  // Connect & subscribe to Socket.io events
  useEffect(() => {
    if (!mounted || !isAuthenticated || !token) return;

    // Set auth parameters and connect
    socket.auth = { token };
    socket.connect();

    const handleConnect = () => {
      console.log('🔌 Connected to WebSockets Gateway');
      // If the user has managerial access, join the restricted room
      if (user && ['Super Admin', 'Mess Manager'].includes(user.role)) {
        socket.emit('join-room', 'managers');
      }
    };

    const handleLowStock = (data: any) => {
      addNotification({
        id: Date.now() + Math.random(),
        title: 'Low Stock Alert',
        message: `Product "${data.productName}" is low on stock: ${data.currentQty} remaining (Min: ${data.minLevel}).`,
        type: 'LOW_STOCK',
        severity: data.severity || 'WARNING',
        isRead: false,
        createdAt: data.timestamp || new Date().toISOString(),
      });
    };

    const handleNewPurchase = (data: any) => {
      addNotification({
        id: Date.now() + Math.random(),
        title: 'New Purchase Order Created',
        message: `Purchase order ${data.purchaseNumber} has been created for amount ₹${data.amount}.`,
        type: 'PURCHASE',
        severity: 'INFO',
        isRead: false,
        createdAt: data.timestamp || new Date().toISOString(),
      });
    };

    const handleKitchenIssue = (data: any) => {
      addNotification({
        id: Date.now() + Math.random(),
        title: 'Kitchen Stock Issue',
        message: `${data.quantity} of "${data.productName}" issued for ${data.meal}.`,
        type: 'KITCHEN',
        severity: 'INFO',
        isRead: false,
        createdAt: data.timestamp || new Date().toISOString(),
      });
    };

    const handleExpiryAlert = (data: any) => {
      addNotification({
        id: Date.now() + Math.random(),
        title: 'Expiry Warning',
        message: `Product "${data.productName}" (${data.quantity} qty) is expiring in ${data.daysToExpiry} days.`,
        type: 'EXPIRY',
        severity: data.severity || 'WARNING',
        isRead: false,
        createdAt: data.timestamp || new Date().toISOString(),
      });
    };

    const handleGeneralNotification = (data: any) => {
      addNotification({
        id: Date.now() + Math.random(),
        title: data.title,
        message: data.message,
        type: data.type || 'SYSTEM',
        severity: data.severity || 'INFO',
        isRead: false,
        createdAt: data.timestamp || new Date().toISOString(),
      });
    };

    socket.on('connect', handleConnect);
    socket.on('low-stock-alert', handleLowStock);
    socket.on('new-purchase', handleNewPurchase);
    socket.on('kitchen-issue', handleKitchenIssue);
    socket.on('expiry-alert', handleExpiryAlert);
    socket.on('notification', handleGeneralNotification);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('low-stock-alert', handleLowStock);
      socket.off('new-purchase', handleNewPurchase);
      socket.off('kitchen-issue', handleKitchenIssue);
      socket.off('expiry-alert', handleExpiryAlert);
      socket.off('notification', handleGeneralNotification);
      socket.disconnect();
    };
  }, [mounted, isAuthenticated, token, user, addNotification]);

  if (!mounted || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const page = pageTitles[pathname] || { title: 'JKKM Mess ERP', subtitle: '' };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <a href="#main-content" className="skip-to-content">Skip to main content</a>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar title={page.title} subtitle={page.subtitle} />
        <main id="main-content" className="flex-1 overflow-y-auto p-6" aria-label={`${page.title} content area`}>
          {children}
        </main>
      </div>
    </div>
  );
}
