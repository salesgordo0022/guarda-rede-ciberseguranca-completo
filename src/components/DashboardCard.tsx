import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardCardProps {
    title: string;
    value: string | number;
    description?: string;
    icon: LucideIcon;
    iconColor?: string;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    className?: string;
}

export function DashboardCard({
    title,
    value,
    description,
    icon: Icon,
    iconColor = 'text-primary',
    trend,
    className,
}: DashboardCardProps) {
    return (
        <Card className={cn('hover:shadow-lg transition-shadow', className)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className={cn('h-5 w-5', iconColor)} />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                {description && (
                    <p className="text-xs text-muted-foreground mt-1">{description}</p>
                )}
                {trend && (
                    <div className="flex items-center mt-2">
                        <span
                            className={cn(
                                'text-xs font-medium',
                                trend.isPositive ? 'text-green-600' : 'text-red-600'
                            )}
                        >
                            {trend.isPositive ? '+' : '-'}
                            {Math.abs(trend.value)}%
                        </span>
                        <span className="text-xs text-muted-foreground ml-1">
                            vs. mês anterior
                        </span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
