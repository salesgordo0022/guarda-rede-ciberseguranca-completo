import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, TrendingUp, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface UserProductivity {
    user_id: string;
    full_name: string;
    total_tasks: number;
    completed_tasks: number;
    overdue_tasks: number;
    avg_completion_time_hours: number;
    productivity_score: number;
}

export function DailyReportDialog() {
    const { selectedCompanyId } = useAuth();

    const { data: productivityData, isLoading } = useQuery({
        queryKey: ['productivity-report', selectedCompanyId],
        queryFn: async () => {
            if (!selectedCompanyId) return [];

            // Fetch all tasks for the company
            const { data: tasks, error } = await supabase
                .from('tasks')
                .select(`
          id,
          status,
          deadline,
          completed_at,
          created_at,
          responsible,
          assigned_to
        `)
                .eq('company_id', selectedCompanyId);

            if (error) throw error;

            // Fetch all profiles for the company (mock or real)
            // Since we don't have a direct link in profiles to company in mock sometimes, 
            // we'll infer from tasks or fetch all. Ideally profiles should have company_id.
            // For now let's get unique assigned users from tasks + profiles table
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, full_name');

            const userMap = new Map<string, UserProductivity>();

            // Initialize map with profiles
            profiles?.forEach(p => {
                userMap.set(p.full_name || p.id, {
                    user_id: p.id,
                    full_name: p.full_name || 'Usuário',
                    total_tasks: 0,
                    completed_tasks: 0,
                    overdue_tasks: 0,
                    avg_completion_time_hours: 0,
                    productivity_score: 0
                });
            });

            // Process tasks
            tasks?.forEach(task => {
                const responsibleName = task.responsible || 'Sem Responsável';

                if (!userMap.has(responsibleName)) {
                    userMap.set(responsibleName, {
                        user_id: 'unknown',
                        full_name: responsibleName,
                        total_tasks: 0,
                        completed_tasks: 0,
                        overdue_tasks: 0,
                        avg_completion_time_hours: 0,
                        productivity_score: 0
                    });
                }

                const stats = userMap.get(responsibleName)!;
                stats.total_tasks++;

                if (task.status === 'Feito') {
                    stats.completed_tasks++;

                    if (task.completed_at && task.created_at) {
                        const start = new Date(task.created_at).getTime();
                        const end = new Date(task.completed_at).getTime();
                        const hours = (end - start) / (1000 * 60 * 60);
                        // Running average
                        stats.avg_completion_time_hours =
                            (stats.avg_completion_time_hours * (stats.completed_tasks - 1) + hours) / stats.completed_tasks;
                    }
                }

                if (task.deadline) {
                    const deadline = new Date(task.deadline);
                    const today = new Date();
                    // If not done and deadline passed OR done after deadline
                    if ((task.status !== 'Feito' && deadline < today) ||
                        (task.status === 'Feito' && task.completed_at && new Date(task.completed_at) > deadline)) {
                        stats.overdue_tasks++;
                    }
                }
            });

            // Calculate scores
            return Array.from(userMap.values()).map(stat => {
                // Simple score: (completed / total) * 100 - (overdue * 5)
                const completionRate = stat.total_tasks > 0 ? (stat.completed_tasks / stat.total_tasks) : 0;
                let score = (completionRate * 100) - (stat.overdue_tasks * 5);
                if (score < 0) score = 0;
                if (score > 100) score = 100;

                stat.productivity_score = Math.round(score);
                stat.avg_completion_time_hours = Math.round(stat.avg_completion_time_hours * 10) / 10;

                return stat;
            }).sort((a, b) => b.productivity_score - a.productivity_score);
        },
        enabled: !!selectedCompanyId
    });

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                    <FileText className="h-4 w-4 mr-2" />
                    Relatório do dia
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                        <TrendingUp className="h-6 w-6 text-blue-600" />
                        Relatório de Produtividade e Desempenho
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    Média de Produtividade
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {productivityData ? Math.round(productivityData.reduce((acc, curr) => acc + curr.productivity_score, 0) / (productivityData.length || 1)) : 0}%
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    Tarefas Concluídas Hoje
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-green-600">
                                    {productivityData ? productivityData.reduce((acc, curr) => acc + curr.completed_tasks, 0) : 0}
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    Tarefas em Atraso
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-red-600">
                                    {productivityData ? productivityData.reduce((acc, curr) => acc + curr.overdue_tasks, 0) : 0}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Desempenho por Colaborador</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Colaborador</TableHead>
                                        <TableHead className="text-center">Score</TableHead>
                                        <TableHead className="text-center">Tarefas</TableHead>
                                        <TableHead className="text-center">Concluídas</TableHead>
                                        <TableHead className="text-center">Atrasadas</TableHead>
                                        <TableHead className="text-center">Tempo Médio</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8">Carregando dados...</TableCell>
                                        </TableRow>
                                    ) : productivityData?.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8">Nenhum dado encontrado para esta empresa.</TableCell>
                                        </TableRow>
                                    ) : (
                                        productivityData?.map((user) => (
                                            <TableRow key={user.user_id}>
                                                <TableCell className="font-medium flex items-center gap-2">
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.full_name}`} />
                                                        <AvatarFallback>{user.full_name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                                    </Avatar>
                                                    {user.full_name}
                                                </TableCell>
                                                <TableCell className="w-[200px]">
                                                    <div className="flex items-center gap-2">
                                                        <Progress value={user.productivity_score} className="h-2" />
                                                        <span className="text-xs font-bold w-8">{user.productivity_score}%</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">{user.total_tasks}</TableCell>
                                                <TableCell className="text-center text-green-600 font-medium">{user.completed_tasks}</TableCell>
                                                <TableCell className="text-center text-red-600 font-medium">{user.overdue_tasks}</TableCell>
                                                <TableCell className="text-center text-muted-foreground">
                                                    {user.avg_completion_time_hours > 0 ? `${user.avg_completion_time_hours}h` : '-'}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </DialogContent>
        </Dialog>
    );
}
