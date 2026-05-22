import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: 'JKKM Mess ERP - Enterprise Hostel Mess Management',
  description: 'Enterprise ERP system for hostel mess inventory automation, stock management, kitchen consumption tracking, and analytics for JKKM College, Erode.',
  keywords: 'mess erp, hostel management, inventory, stock management, JKKM college',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
