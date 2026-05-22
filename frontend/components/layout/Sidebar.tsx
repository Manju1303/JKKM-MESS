'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Package, ShoppingCart, Truck, ChefHat, BarChart3,
  Users, QrCode, Bell, Settings, LogOut, Boxes, Brain,
  ChevronLeft, ChevronRight, Building2, Calendar,
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['all'] },
  { label: 'Inventory', href: '/dashboard/inventory', icon: Boxes, roles: ['all'] },
  { label: 'Products', href: '/dashboard/products', icon: Package, roles: ['all'] },
  { label: 'Purchases', href: '/dashboard/purchases', icon: ShoppingCart, roles: ['Super Admin', 'Mess Manager', 'Storekeeper', 'Accounts Department'] },
  { label: 'Suppliers', href: '/dashboard/suppliers', icon: Truck, roles: ['Super Admin', 'Mess Manager', 'Accounts Department'] },
  { label: 'Kitchen Issues', href: '/dashboard/kitchen', icon: ChefHat, roles: ['all'] },
  { label: 'Barcode Scanner', href: '/dashboard/barcode', icon: QrCode, roles: ['Super Admin', 'Mess Manager', 'Storekeeper'] },
  { label: 'Reports', href: '/dashboard/reports', icon: BarChart3, roles: ['all'] },
  { label: 'Attendance', href: '/dashboard/attendance', icon: Calendar, roles: ['Super Admin', 'Mess Manager'] },
  { label: 'AI Insights', href: '/dashboard/ai', icon: Brain, roles: ['Super Admin', 'Mess Manager', 'Management Viewer'] },
  { label: 'Notifications', href: '/dashboard/notifications', icon: Bell, roles: ['all'] },
  { label: 'Users', href: '/dashboard/users', icon: Users, roles: ['Super Admin'] },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings, roles: ['Super Admin', 'Mess Manager'] },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const { user, logout } = useAuthStore();

  const filteredItems = navItems.filter(item =>
    item.roles.includes('all') || (user && item.roles.includes(user.role))
  );

  const initials = user
    ? user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : '??';

  return (
    <aside className={cn(
      'flex flex-col h-screen transition-all duration-300 ease-in-out relative flex-shrink-0',
      'bg-gradient-to-b from-[hsl(224,90%,12%)] to-[hsl(224,95%,8%)]',
      'border-r border-white/10',
      sidebarCollapsed ? 'w-16' : 'w-64'
    )}>
      {/* Logo */}
      <div className={cn(
        'flex items-center gap-3 p-4 border-b border-white/10',
        sidebarCollapsed && 'justify-center'
      )}>
        <div className="w-9 h-9 rounded-xl gradient-accent flex items-center justify-center flex-shrink-0 shadow-lg">
          <Building2 className="w-5 h-5 text-white" />
        </div>
        {!sidebarCollapsed && (
          <div className="animate-in">
            <p className="text-white font-bold text-sm leading-none">JKKM Mess</p>
            <p className="text-white/50 text-xs mt-0.5">ERP System</p>
          </div>
        )}
      </div>

      {/* Toggle button */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-7 z-10 w-6 h-6 rounded-full bg-[hsl(224,76%,48%)] flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
        aria-label="Toggle sidebar"
      >
        {sidebarCollapsed
          ? <ChevronRight className="w-3 h-3 text-white" />
          : <ChevronLeft className="w-3 h-3 text-white" />}
      </button>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden scrollbar-thin">
        {!sidebarCollapsed && (
          <p className="text-white/30 text-xs font-semibold uppercase tracking-wider px-4 mb-2">
            Main Menu
          </p>
        )}
        <div className="space-y-0.5 px-2">
          {filteredItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                title={sidebarCollapsed ? item.label : undefined}
                className={cn(
                  'sidebar-item flex items-center gap-3 px-3 py-2.5 rounded-lg',
                  'text-white/70 hover:text-white group transition-all',
                  isActive && 'sidebar-item active !text-white',
                  sidebarCollapsed && 'justify-center px-2'
                )}
              >
                <item.icon className={cn(
                  'w-4 h-4 flex-shrink-0 transition-colors',
                  isActive ? 'text-[hsl(28,95%,55%)]' : 'text-white/60 group-hover:text-white/90'
                )} />
                {!sidebarCollapsed && (
                  <span className="text-sm font-medium truncate">{item.label}</span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User info */}
      {user && (
        <div className={cn(
          'p-3 border-t border-white/10',
          sidebarCollapsed ? 'flex justify-center' : 'block'
        )}>
          {!sidebarCollapsed ? (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">{initials}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-semibold truncate">{user.name}</p>
                <p className="text-white/50 text-xs truncate">{user.role}</p>
              </div>
              <button
                onClick={logout}
                className="text-white/40 hover:text-red-400 transition-colors"
                aria-label="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={logout}
              className="text-white/40 hover:text-red-400 transition-colors"
              aria-label="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </aside>
  );
}
