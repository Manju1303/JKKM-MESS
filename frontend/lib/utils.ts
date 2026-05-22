import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export function getDaysUntilExpiry(expiryDate: string | Date): number {
  const diff = new Date(expiryDate).getTime() - new Date().getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function getStockStatus(quantity: number, minLevel: number): 'critical' | 'low' | 'normal' | 'high' {
  if (quantity <= 0) return 'critical';
  if (quantity <= minLevel) return 'low';
  if (quantity <= minLevel * 1.5) return 'normal';
  return 'high';
}
