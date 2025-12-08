import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, TrendingUp } from "lucide-react";
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
    total_activities: number;
    completed_activities: number;
    overdue_activities: number;
    avg_completion_time_hours: number;
    productivity_score: number;
}

export function DailyReportDialog() {
    const { selectedCompanyId } = useAuth();

    const { data: productivityData, isLoading } = useQuery({
        queryKey: ['productivity-report', selectedCompanyId],
        queryFn: async () => {
            if (!selectedCompanyId) return [];

            // Buscar atividades de projetos da empresa
            const { data: activities, error } = await supabase
                .from('project_activities')
                .select(`
                    id,
                    status,
                    deadline,
                    completed_at,
                    created_at,
                    created_by,
                    project:projects(company_id)
                `);

            if (error) throw error;

            // Filtrar por empresa
            const companyActivities = (activities || []).filter(
                (a: any) => a.project?.company_id === selectedCompanyId
            );

            // Buscar perfis
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, full_name');

            const userMap = new Map<string, UserProductivity>();

            // Inicializar mapa com perfis
            profiles?.forEach(p => {
                userMap.set(p.id, {
                    user_id: p.id,
                    full_name: p.full_name || 'Usuário',
                    total_activities: 0,
                    completed_activities: 0,
                    overdue_activities: 0,
                    avg_completion_time_hours: 0,
                    productivity_score: 0
                });
            });

            // Processar atividades
            companyActivities.forEach((activity: any) => {
                const creatorId = activity.created_by;
                
                if (!userMap.has(creatorId)) {
                    userMap.set(creatorId, {
                        user_id: creatorId,
                        full_name: 'Usuário Desconhecido',
                        total_activities: 0,
                        completed_activities: 0,
                        overdue_activities: 0,
                        avg_completion_time_hours: 0,
                        productivity_score: 0
                    });
                }

                const stats = userMap.get(creatorId)!;
                stats.total_activities++;

                if (activity.status === 'concluida') {
                    stats.completed_activities++;

                    if (activity.completed_at && activity.created_at) {
                        const start = new Date(activity.created_at).getTime();
                        const end = new Date(activity.completed_at).getTime();
                        const hours = (end - start) / (1000 * 60 * 60);
                        stats.avg_completion_time_hours =
                            (stats.avg_completion_time_hours * (stats.completed_activities - 1) + hours) / stats.completed_activities;
                    }
                }

                if (activity.deadline) {
                    const deadline = new Date(activity.deadline);
                    const today = new Date();
                    if ((activity.status !== 'concluida' && deadline < today) ||
                        (activity.status === 'concluida' && activity.completed_at && new Date(activity.completed_at) > deadline)) {
                        stats.overdue_activities++;
                    }
                }
            });

            // Calcular scores
            return Array.from(userMap.values())
                .filter(stat => stat.total_activities > 0)
                .map(stat => {
                    const completionRate = stat.total_activities > 0 ? (stat.completed_activities / stat.total_activities) : 0;
                    let score = (completionRate * 100) - (stat.overdue_activities * 5);
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
                                    Atividades Concluídas
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-green-600">
                                    {productivityData ? productivityData.reduce((acc, curr) => acc + curr.completed_activities, 0) : 0}
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    Atividades em Atraso
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-red-600">
                                    {productivityData ? productivityData.reduce((acc, curr) => acc + curr.overdue_activities, 0) : 0}
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
                                        <TableHead className="text-center">Atividades</TableHead>
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
                                                <TableCell className="text-center">{user.total_activities}</TableCell>
                                                <TableCell className="text-center text-green-600 font-medium">{user.completed_activities}</TableCell>
                                                <TableCell className="text-center text-red-600 font-medium">{user.overdue_activities}</TableCell>
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
