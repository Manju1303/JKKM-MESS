'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';
import { socket } from '@/lib/socket';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import { ShieldX } from 'lucide-react';

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
  '/dashboard/menu': { title: 'Daily Menu', subtitle: 'Hostel meal schedules & plans' },
  '/dashboard/complaints': { title: 'Complaints', subtitle: 'Submit or resolve student complaints' },
  '/dashboard/audit-logs': { title: 'Audit Logs', subtitle: 'Institutional login activity monitoring' },
};

const isRouteAllowed = (path: string, role: string) => {
  if (path === '/dashboard/menu') return true;
  if (path === '/dashboard/notifications') return true;

  if (path === '/dashboard') {
    return ['SUPER_ADMIN', 'MESS_MANAGER', 'HOSTEL_WARDEN', 'STOREKEEPER', 'KITCHEN_STAFF', 'ACCOUNTANT', 'STUDENT', 'STUDENT_VIEWER'].includes(role);
  }
  if (path.startsWith('/dashboard/inventory')) {
    return ['SUPER_ADMIN', 'MESS_MANAGER', 'STOREKEEPER'].includes(role);
  }
  if (path.startsWith('/dashboard/products')) {
    return ['SUPER_ADMIN', 'MESS_MANAGER', 'STOREKEEPER'].includes(role);
  }
  if (path.startsWith('/dashboard/purchases')) {
    return ['SUPER_ADMIN', 'MESS_MANAGER', 'STOREKEEPER', 'ACCOUNTANT'].includes(role);
  }
  if (path.startsWith('/dashboard/suppliers')) {
    return ['SUPER_ADMIN', 'MESS_MANAGER', 'STOREKEEPER'].includes(role);
  }
  if (path.startsWith('/dashboard/kitchen')) {
    return ['SUPER_ADMIN', 'MESS_MANAGER', 'KITCHEN_STAFF'].includes(role);
  }
  if (path.startsWith('/dashboard/barcode')) {
    return ['SUPER_ADMIN', 'MESS_MANAGER', 'STOREKEEPER', 'KITCHEN_STAFF'].includes(role);
  }
  if (path.startsWith('/dashboard/complaints')) {
    return ['SUPER_ADMIN', 'HOSTEL_WARDEN', 'STUDENT', 'STUDENT_VIEWER'].includes(role);
  }
  if (path.startsWith('/dashboard/reports')) {
    return ['SUPER_ADMIN', 'MESS_MANAGER', 'ACCOUNTANT'].includes(role);
  }
  if (path.startsWith('/dashboard/attendance')) {
    return ['SUPER_ADMIN', 'HOSTEL_WARDEN'].includes(role);
  }
  if (path.startsWith('/dashboard/ai')) {
    return ['SUPER_ADMIN', 'MESS_MANAGER'].includes(role);
  }
  if (path.startsWith('/dashboard/users')) {
    return ['SUPER_ADMIN'].includes(role);
  }
  if (path.startsWith('/dashboard/audit-logs')) {
    return ['SUPER_ADMIN'].includes(role);
  }
  if (path.startsWith('/dashboard/settings')) {
    return ['SUPER_ADMIN', 'MESS_MANAGER'].includes(role);
  }
  return true;
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, token, user, logout } = useAuthStore();
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

  // Inactivity timeout: logout after 15 minutes of idle state
  useEffect(() => {
    if (!mounted || !isAuthenticated) return;

    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        console.log('Session timed out due to inactivity.');
        logout();
        router.push('/login');
      }, 15 * 60 * 1000); // 15 minutes
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [mounted, isAuthenticated, logout, router]);

  // Connect & subscribe to Socket.io events
  useEffect(() => {
    if (!mounted || !isAuthenticated || !token) return;

    socket.auth = { token };
    socket.connect();

    const handleConnect = () => {
      console.log('🔌 Connected to WebSockets Gateway');
      if (user && ['SUPER_ADMIN', 'MESS_MANAGER'].includes(user.role)) {
        socket.emit('join-room', 'managers');
      }
    };

    const handleLowStock = (data: any) => {
      addNotification({
        id: Date.now() + Math.random(),
        title: 'Low Stock Alert',
        message: `Product "${data.productName}" is low: ${data.currentQty} remaining (Min: ${data.minLevel}).`,
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
        message: `Purchase order ${data.purchaseNumber} created for ₹${data.amount}.`,
        type: 'PURCHASE',
        severity: 'INFO',
        isRead: false,
        createdAt: data.timestamp || new Date().toISOString(),
      });
    };

    socket.on('connect', handleConnect);
    socket.on('low-stock-alert', handleLowStock);
    socket.on('new-purchase', handleNewPurchase);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('low-stock-alert', handleLowStock);
      socket.off('new-purchase', handleNewPurchase);
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
  const allowed = user ? isRouteAllowed(pathname, user.role) : false;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <a href="#main-content" className="skip-to-content">Skip to main content</a>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar title={page.title} subtitle={page.subtitle} />
        <main id="main-content" className="flex-1 overflow-y-auto p-6" aria-label={`${page.title} content area`}>
          {allowed ? (
            children
          ) : (
            <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
              <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl flex items-center justify-center mb-4 shadow-xl">
                <ShieldX className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Access Denied</h2>
              <p className="text-sm text-muted-foreground max-w-sm mb-6">
                Your account ({user?.role}) does not have permission to view this module. Please contact the administrator.
              </p>
              <button
                onClick={() => {
                  if (user?.role === 'SUPER_ADMIN') router.push('/dashboard/users');
                  else if (user?.role === 'HOSTEL_WARDEN') router.push('/dashboard/attendance');
                  else if (user?.role === 'MESS_MANAGER') router.push('/dashboard/inventory');
                  else router.push('/dashboard');
                }}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/95 transition-all shadow-md"
              >
                Go to Default Dashboard
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
