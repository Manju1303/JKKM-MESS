'use client';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { ReactNode } from 'react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  trend?: number;
  trendLabel?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'primary';
  className?: string;
  isLoading?: boolean;
}

const variantStyles = {
  default: 'bg-card border-border',
  success: 'bg-card border-green-500/30',
  warning: 'bg-card border-amber-500/30',
  danger: 'bg-card border-red-500/30',
  primary: 'bg-card border-primary/30',
};

const iconVariantStyles = {
  default: 'bg-muted text-muted-foreground',
  success: 'bg-green-500/15 text-green-500',
  warning: 'bg-amber-500/15 text-amber-500',
  danger: 'bg-red-500/15 text-red-500',
  primary: 'bg-primary/15 text-primary',
};

export default function StatsCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendLabel,
  variant = 'default',
  className,
  isLoading,
}: StatsCardProps) {
  return (
    <div className={cn(
      'stat-card rounded-xl border p-5 flex flex-col gap-3 animate-in',
      variantStyles[variant],
      className
    )}>
      <div className="flex items-start justify-between">
        <div className={cn(
          'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
          iconVariantStyles[variant]
        )}>
          {icon}
        </div>
        {trend !== undefined && (
          <div className={cn(
            'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full',
            trend > 0
              ? 'bg-green-500/15 text-green-500'
              : trend < 0
                ? 'bg-red-500/15 text-red-500'
                : 'bg-muted text-muted-foreground'
          )}>
            {trend > 0
              ? <TrendingUp className="w-3 h-3" />
              : trend < 0
                ? <TrendingDown className="w-3 h-3" />
                : <Minus className="w-3 h-3" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div>
        {isLoading ? (
          <div className="h-8 w-24 bg-muted animate-pulse rounded" />
        ) : (
          <p className="text-2xl font-bold text-foreground">{value}</p>
        )}
        <p className="text-sm text-muted-foreground mt-0.5">{title}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground/70 mt-1">{subtitle}</p>
        )}
        {trendLabel && (
          <p className="text-xs text-muted-foreground/70 mt-1">{trendLabel}</p>
        )}
      </div>
    </div>
  );
}
