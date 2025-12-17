import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

interface TaskChartProps {
    type: 'pie' | 'bar';
    title: string;
    description?: string;
    data: Array<{
        name: string;
        value: number;
        color?: string;
    }>;
    onClick?: (data: any) => void;
}

const COLORS = {
    'Feito': '#22c55e',
    'Em andamento': '#3b82f6',
    'Não iniciado': '#94a3b8',
    'Parado': '#ef4444',
    'Atrasado': '#f59e0b',
    'Dentro do prazo': '#10b981',
};

const DEFAULT_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];

export function TaskChart({ type, title, description, data, onClick }: TaskChartProps) {
    const getColor = (name: string, index: number) => {
        return COLORS[name as keyof typeof COLORS] || data[index]?.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length];
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                {description && <CardDescription>{description}</CardDescription>}
            </CardHeader>
            <CardContent>
                {type === 'pie' ? (
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                                onClick={onClick}
                                className="cursor-pointer"
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={getColor(entry.name, index)} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="value" fill="#3b82f6" onClick={onClick} className="cursor-pointer">
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={getColor(entry.name, index)} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    );
}
