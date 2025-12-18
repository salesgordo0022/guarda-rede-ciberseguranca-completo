import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertCircle, FolderOpen, Building2, RotateCcw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useState } from "react";

interface ProjectActivity {
    id: string;
    name: string;
    description: string | null;
    status: string;
    completed_at: string | null;
    deadline_status: string | null;
    project: {
        id: string;
        name: string;
        company_id: string;
    } | null;
}

interface DepartmentActivity {
    id: string;
    name: string;
    description: string | null;
    status: string;
    completed_at: string | null;
    deadline_status: string | null;
    department: {
        id: string;
        name: string;
        company_id: string;
    } | null;
}

export const TaskHistoryTable = () => {
    const { selectedCompanyId } = useAuth();
    const queryClient = useQueryClient();
    const [restoringId, setRestoringId] = useState<string | null>(null);

    // Fetch completed project activities
    const { data: projectActivities = [], isLoading: isLoadingProjects } = useQuery({
        queryKey: ['completed-project-activities', selectedCompanyId],
        queryFn: async () => {
            if (!selectedCompanyId) return [];

            const { data, error } = await supabase
                .from('project_activities')
                .select(`
                    id, name, description, status, completed_at, deadline_status,
                    project:projects(id, name, company_id)
                `)
                .eq('status', 'concluida')
                .order('completed_at', { ascending: false })
                .limit(100);

            if (error) throw error;
            
            return (data || []).filter((activity: ProjectActivity) => 
                activity.project?.company_id === selectedCompanyId
            );
        },
        enabled: !!selectedCompanyId
    });

    // Fetch completed department activities
    const { data: departmentActivities = [], isLoading: isLoadingDepartments } = useQuery({
        queryKey: ['completed-department-activities', selectedCompanyId],
        queryFn: async () => {
            if (!selectedCompanyId) return [];

            const { data, error } = await supabase
                .from('department_activities')
                .select(`
                    id, name, description, status, completed_at, deadline_status,
                    department:departments(id, name, company_id)
                `)
                .eq('status', 'concluida')
                .order('completed_at', { ascending: false })
                .limit(100);

            if (error) throw error;
            
            return (data || []).filter((activity: DepartmentActivity) => 
                activity.department?.company_id === selectedCompanyId
            );
        },
        enabled: !!selectedCompanyId
    });

    const handleRestoreProjectActivity = async (activityId: string, activityName: string) => {
        setRestoringId(activityId);
        try {
            const { error } = await supabase
                .from('project_activities')
                .update({ 
                    status: 'pendente', 
                    completed_at: null,
                    deadline_status: 'no_prazo'
                })
                .eq('id', activityId);

            if (error) throw error;

            toast.success(`Atividade "${activityName}" restaurada com sucesso!`);
            queryClient.invalidateQueries({ queryKey: ['completed-project-activities'] });
            queryClient.invalidateQueries({ queryKey: ['global-activities'] });
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
        } catch (error) {
            console.error('Erro ao restaurar atividade:', error);
            toast.error('Erro ao restaurar atividade');
        } finally {
            setRestoringId(null);
        }
    };

    const handleRestoreDepartmentActivity = async (activityId: string, activityName: string) => {
        setRestoringId(activityId);
        try {
            const { error } = await supabase
                .from('department_activities')
                .update({ 
                    status: 'pendente', 
                    completed_at: null,
                    deadline_status: 'no_prazo'
                })
                .eq('id', activityId);

            if (error) throw error;

            toast.success(`Atividade "${activityName}" restaurada com sucesso!`);
            queryClient.invalidateQueries({ queryKey: ['completed-department-activities'] });
            queryClient.invalidateQueries({ queryKey: ['global-activities'] });
            queryClient.invalidateQueries({ queryKey: ['department-activities'] });
        } catch (error) {
            console.error('Erro ao restaurar atividade:', error);
            toast.error('Erro ao restaurar atividade');
        } finally {
            setRestoringId(null);
        }
    };

    const getDeadlineStatusBadge = (status: string | null) => {
        switch (status) {
            case "bateu_meta":
                return <Badge className="bg-emerald-100 text-emerald-800 border-0">Bateu a Meta</Badge>;
            case "concluido_no_prazo":
                return <Badge className="bg-green-100 text-green-800 border-0">No Prazo</Badge>;
            case "concluido_atrasado":
                return <Badge className="bg-orange-100 text-orange-800 border-0">Atrasado</Badge>;
            default:
                return <Badge className="bg-gray-100 text-gray-800 border-0">Concluída</Badge>;
        }
    };

    const isLoading = isLoadingProjects || isLoadingDepartments;
    const totalCompleted = projectActivities.length + departmentActivities.length;

    if (isLoading) {
        return <div className="p-8 text-center">Carregando histórico...</div>;
    }

    const renderEmptyState = () => (
        <div className="text-center py-12 space-y-3">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground" />
            <h3 className="text-lg font-semibold">Nenhuma atividade concluída</h3>
            <p className="text-muted-foreground">
                Atividades concluídas aparecerão aqui.
            </p>
        </div>
    );

    const renderProjectActivities = () => {
        if (projectActivities.length === 0) return renderEmptyState();
        
        return (
            <Table>
                <TableHeader>
                    <TableRow className="bg-muted/50">
                        <TableHead className="w-[300px]">Atividade</TableHead>
                        <TableHead>Projeto</TableHead>
                        <TableHead>Status do Prazo</TableHead>
                        <TableHead>Concluído em</TableHead>
                        <TableHead className="w-[100px]">Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {projectActivities.map((activity: ProjectActivity) => (
                        <TableRow key={activity.id}>
                            <TableCell>
                                <div className="flex flex-col gap-1">
                                    <span className="font-semibold text-foreground">{activity.name}</span>
                                    {activity.description && (
                                        <span className="text-xs text-muted-foreground line-clamp-1">
                                            {activity.description}
                                        </span>
                                    )}
                                </div>
                            </TableCell>
                            <TableCell>
                                <Badge variant="outline" className="font-normal">
                                    <FolderOpen className="h-3 w-3 mr-1" />
                                    {activity.project?.name || "—"}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                {getDeadlineStatusBadge(activity.deadline_status)}
                            </TableCell>
                            <TableCell>
                                <div className="text-sm text-muted-foreground">
                                    {activity.completed_at 
                                        ? format(new Date(activity.completed_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) 
                                        : "-"
                                    }
                                </div>
                            </TableCell>
                            <TableCell>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRestoreProjectActivity(activity.id, activity.name)}
                                    disabled={restoringId === activity.id}
                                    className="h-8 px-2 text-muted-foreground hover:text-primary"
                                    title="Restaurar atividade"
                                >
                                    <RotateCcw className={`h-4 w-4 ${restoringId === activity.id ? 'animate-spin' : ''}`} />
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        );
    };

    const renderDepartmentActivities = () => {
        if (departmentActivities.length === 0) return renderEmptyState();
        
        return (
            <Table>
                <TableHeader>
                    <TableRow className="bg-muted/50">
                        <TableHead className="w-[300px]">Atividade</TableHead>
                        <TableHead>Departamento</TableHead>
                        <TableHead>Status do Prazo</TableHead>
                        <TableHead>Concluído em</TableHead>
                        <TableHead className="w-[100px]">Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {departmentActivities.map((activity: DepartmentActivity) => (
                        <TableRow key={activity.id}>
                            <TableCell>
                                <div className="flex flex-col gap-1">
                                    <span className="font-semibold text-foreground">{activity.name}</span>
                                    {activity.description && (
                                        <span className="text-xs text-muted-foreground line-clamp-1">
                                            {activity.description}
                                        </span>
                                    )}
                                </div>
                            </TableCell>
                            <TableCell>
                                <Badge variant="outline" className="font-normal">
                                    <Building2 className="h-3 w-3 mr-1" />
                                    {activity.department?.name || "—"}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                {getDeadlineStatusBadge(activity.deadline_status)}
                            </TableCell>
                            <TableCell>
                                <div className="text-sm text-muted-foreground">
                                    {activity.completed_at 
                                        ? format(new Date(activity.completed_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) 
                                        : "-"
                                    }
                                </div>
                            </TableCell>
                            <TableCell>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRestoreDepartmentActivity(activity.id, activity.name)}
                                    disabled={restoringId === activity.id}
                                    className="h-8 px-2 text-muted-foreground hover:text-primary"
                                    title="Restaurar atividade"
                                >
                                    <RotateCcw className={`h-4 w-4 ${restoringId === activity.id ? 'animate-spin' : ''}`} />
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        );
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    Histórico de Atividades
                    <Badge variant="secondary">{totalCompleted}</Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <Tabs defaultValue="projects" className="w-full">
                    <div className="px-6 pb-4">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="projects" className="flex items-center gap-2">
                                <FolderOpen className="h-4 w-4" />
                                Projetos ({projectActivities.length})
                            </TabsTrigger>
                            <TabsTrigger value="departments" className="flex items-center gap-2">
                                <Building2 className="h-4 w-4" />
                                Departamentos ({departmentActivities.length})
                            </TabsTrigger>
                        </TabsList>
                    </div>
                    <TabsContent value="projects" className="mt-0">
                        {renderProjectActivities()}
                    </TabsContent>
                    <TabsContent value="departments" className="mt-0">
                        {renderDepartmentActivities()}
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
};
