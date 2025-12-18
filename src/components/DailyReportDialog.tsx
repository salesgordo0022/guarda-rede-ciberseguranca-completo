import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, TrendingUp, Trophy, Star, Target, RotateCcw, Medal, Flame } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface UserScore {
    user_id: string;
    full_name: string;
    avatar_url: string | null;
    current_score: number;
    total_cycles_completed: number;
    beat_goal_count: number;
    on_time_count: number;
    total_activities: number;
    completed_activities: number;
    overdue_activities: number;
}

export function DailyReportDialog() {
    const { selectedCompanyId, isAdmin } = useAuth();
    const queryClient = useQueryClient();

    const { data: gamificationData, isLoading } = useQuery({
        queryKey: ['gamification-report', selectedCompanyId],
        queryFn: async () => {
            if (!selectedCompanyId) return [];

            // Buscar membros da empresa
            const { data: userCompanies } = await supabase
                .from('user_companies')
                .select('user_id')
                .eq('company_id', selectedCompanyId);

            if (!userCompanies || userCompanies.length === 0) return [];

            const userIds = userCompanies.map(uc => uc.user_id);

            // Buscar perfis
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url')
                .in('id', userIds);

            // Buscar scores
            const { data: scores } = await supabase
                .from('user_scores')
                .select('*')
                .eq('company_id', selectedCompanyId);

            // Buscar atividades dos projetos
            const { data: projectActivities } = await supabase
                .from('project_activities')
                .select(`
                    id,
                    status,
                    deadline_status,
                    project:projects!inner(company_id),
                    assignees:project_activity_assignees(user_id)
                `)
                .eq('project.company_id', selectedCompanyId);

            // Buscar atividades de departamentos
            const { data: deptActivities } = await supabase
                .from('department_activities')
                .select(`
                    id,
                    status,
                    deadline_status,
                    department:departments!inner(company_id),
                    assignees:department_activity_assignees(user_id)
                `)
                .eq('department.company_id', selectedCompanyId);

            // Processar dados por usuário
            const userMap = new Map<string, UserScore>();

            // Inicializar com perfis
            profiles?.forEach(p => {
                const userScore = scores?.find(s => s.user_id === p.id);
                userMap.set(p.id, {
                    user_id: p.id,
                    full_name: p.full_name || 'Usuário',
                    avatar_url: p.avatar_url,
                    current_score: userScore?.current_score || 0,
                    total_cycles_completed: userScore?.total_cycles_completed || 0,
                    beat_goal_count: userScore?.beat_goal_count || 0,
                    on_time_count: userScore?.on_time_count || 0,
                    total_activities: 0,
                    completed_activities: 0,
                    overdue_activities: 0
                });
            });

            // Contar atividades de projetos
            projectActivities?.forEach((activity: any) => {
                activity.assignees?.forEach((assignee: any) => {
                    const userId = assignee.user_id;
                    if (userMap.has(userId)) {
                        const stats = userMap.get(userId)!;
                        stats.total_activities++;
                        if (activity.status === 'concluida') {
                            stats.completed_activities++;
                        }
                        if (activity.deadline_status === 'fora_do_prazo' || activity.deadline_status === 'concluido_atrasado') {
                            stats.overdue_activities++;
                        }
                    }
                });
            });

            // Contar atividades de departamentos
            deptActivities?.forEach((activity: any) => {
                activity.assignees?.forEach((assignee: any) => {
                    const userId = assignee.user_id;
                    if (userMap.has(userId)) {
                        const stats = userMap.get(userId)!;
                        stats.total_activities++;
                        if (activity.status === 'concluida') {
                            stats.completed_activities++;
                        }
                        if (activity.deadline_status === 'fora_do_prazo' || activity.deadline_status === 'concluido_atrasado') {
                            stats.overdue_activities++;
                        }
                    }
                });
            });

            return Array.from(userMap.values())
                .sort((a, b) => {
                    // Ordenar por ciclos completados primeiro, depois por score
                    if (b.total_cycles_completed !== a.total_cycles_completed) {
                        return b.total_cycles_completed - a.total_cycles_completed;
                    }
                    return b.current_score - a.current_score;
                });
        },
        enabled: !!selectedCompanyId
    });

    const resetScoreMutation = useMutation({
        mutationFn: async (userId: string) => {
            const { error } = await supabase.rpc('reset_user_score', {
                _user_id: userId,
                _company_id: selectedCompanyId
            });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['gamification-report'] });
            toast.success('Score resetado com sucesso!');
        },
        onError: (error: any) => {
            toast.error('Erro ao resetar score: ' + error.message);
        }
    });

    const totalBeatGoal = gamificationData?.reduce((acc, curr) => acc + curr.beat_goal_count, 0) || 0;
    const totalOnTime = gamificationData?.reduce((acc, curr) => acc + curr.on_time_count, 0) || 0;
    const totalCycles = gamificationData?.reduce((acc, curr) => acc + curr.total_cycles_completed, 0) || 0;

    const getRankBadge = (index: number) => {
        if (index === 0) return <Medal className="h-5 w-5 text-yellow-500" />;
        if (index === 1) return <Medal className="h-5 w-5 text-gray-400" />;
        if (index === 2) return <Medal className="h-5 w-5 text-amber-700" />;
        return <span className="text-sm text-muted-foreground w-5 text-center">{index + 1}</span>;
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <FileText className="h-4 w-4" />
                    Relatório Diário
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] md:max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl md:text-2xl font-bold flex items-center gap-2">
                        <FileText className="h-6 w-6 text-primary" />
                        Relatório Diário - Produtividade e Desempenho
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 md:space-y-6 mt-4">
                    {/* Cards de resumo */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950/30 dark:to-yellow-900/20 border-yellow-200">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs md:text-sm font-medium text-yellow-700 dark:text-yellow-400 flex items-center gap-1">
                                    <Star className="h-4 w-4" />
                                    Bateu Meta
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-xl md:text-2xl font-bold text-yellow-600">
                                    {totalBeatGoal}
                                    <span className="text-xs ml-1 font-normal text-yellow-600/70">+10pts cada</span>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 border-green-200">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs md:text-sm font-medium text-green-700 dark:text-green-400 flex items-center gap-1">
                                    <Target className="h-4 w-4" />
                                    No Prazo
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-xl md:text-2xl font-bold text-green-600">
                                    {totalOnTime}
                                    <span className="text-xs ml-1 font-normal text-green-600/70">+5pts cada</span>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/20 border-purple-200">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs md:text-sm font-medium text-purple-700 dark:text-purple-400 flex items-center gap-1">
                                    <Flame className="h-4 w-4" />
                                    Ciclos 100pts
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-xl md:text-2xl font-bold text-purple-600">
                                    {totalCycles}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs md:text-sm font-medium text-blue-700 dark:text-blue-400 flex items-center gap-1">
                                    <TrendingUp className="h-4 w-4" />
                                    Colaboradores
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-xl md:text-2xl font-bold text-blue-600">
                                    {gamificationData?.length || 0}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Tabela de ranking */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                                <Medal className="h-5 w-5 text-yellow-500" />
                                Ranking por Score
                            </CardTitle>
                            <p className="text-xs text-muted-foreground">
                                Bateu meta = +10pts | Concluiu no prazo = +5pts | Ao atingir 100pts, completa um ciclo e zera
                            </p>
                        </CardHeader>
                        <CardContent className="overflow-x-auto">
                            <Table className="min-w-[600px]">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-12">#</TableHead>
                                        <TableHead>Colaborador</TableHead>
                                        <TableHead className="text-center">Score</TableHead>
                                        <TableHead className="text-center">Ciclos</TableHead>
                                        <TableHead className="text-center">
                                            <span className="flex items-center justify-center gap-1">
                                                <Star className="h-3 w-3 text-yellow-500" />
                                                Meta
                                            </span>
                                        </TableHead>
                                        <TableHead className="text-center">
                                            <span className="flex items-center justify-center gap-1">
                                                <Target className="h-3 w-3 text-green-500" />
                                                Prazo
                                            </span>
                                        </TableHead>
                                        {isAdmin && <TableHead className="text-center">Ações</TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={isAdmin ? 7 : 6} className="text-center py-8">
                                                Carregando dados...
                                            </TableCell>
                                        </TableRow>
                                    ) : gamificationData?.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={isAdmin ? 7 : 6} className="text-center py-8">
                                                Nenhum colaborador encontrado.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        gamificationData?.map((user, index) => (
                                            <TableRow key={user.user_id} className={index === 0 ? "bg-yellow-50/50 dark:bg-yellow-900/10" : ""}>
                                                <TableCell className="font-bold">
                                                    {getRankBadge(index)}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Avatar className="h-8 w-8">
                                                            <AvatarImage src={user.avatar_url || undefined} />
                                                            <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                                                                {user.full_name.substring(0, 2).toUpperCase()}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <span className="font-medium text-sm">{user.full_name}</span>
                                                            {user.total_cycles_completed > 0 && (
                                                                <div className="flex items-center gap-1">
                                                                    {Array.from({ length: Math.min(user.total_cycles_completed, 5) }).map((_, i) => (
                                                                        <Flame key={i} className="h-3 w-3 text-orange-500" />
                                                                    ))}
                                                                    {user.total_cycles_completed > 5 && (
                                                                        <span className="text-xs text-orange-500">+{user.total_cycles_completed - 5}</span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col items-center gap-1">
                                                        <Progress value={user.current_score} className="h-2 w-20" />
                                                        <span className="text-xs font-bold">{user.current_score}/100</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge variant="outline" className="bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                                                        {user.total_cycles_completed}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
                                                        {user.beat_goal_count}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                                                        {user.on_time_count}
                                                    </Badge>
                                                </TableCell>
                                                {isAdmin && (
                                                    <TableCell className="text-center">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => resetScoreMutation.mutate(user.user_id)}
                                                            disabled={resetScoreMutation.isPending}
                                                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                        >
                                                            <RotateCcw className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                )}
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