import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertCircle, FolderOpen, Building2, RotateCcw, Trash2 } from "lucide-react";
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
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [activityToDelete, setActivityToDelete] = useState<{ id: string; name: string; type: 'project' | 'department' } | null>(null);
    
    // Selection state
    const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(new Set());
    const [selectedDepartmentIds, setSelectedDepartmentIds] = useState<Set<string>>(new Set());
    const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
    const [bulkDeleteType, setBulkDeleteType] = useState<'project' | 'department'>('project');

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

    const openDeleteDialog = (id: string, name: string, type: 'project' | 'department') => {
        setActivityToDelete({ id, name, type });
        setDeleteDialogOpen(true);
    };

    const handleDeleteActivity = async () => {
        if (!activityToDelete) return;
        
        setDeletingId(activityToDelete.id);
        try {
            const table = activityToDelete.type === 'project' ? 'project_activities' : 'department_activities';
            const { error } = await supabase
                .from(table)
                .delete()
                .eq('id', activityToDelete.id);

            if (error) throw error;

            toast.success(`Atividade "${activityToDelete.name}" excluída permanentemente!`);
            
            if (activityToDelete.type === 'project') {
                queryClient.invalidateQueries({ queryKey: ['completed-project-activities'] });
                queryClient.invalidateQueries({ queryKey: ['tasks'] });
            } else {
                queryClient.invalidateQueries({ queryKey: ['completed-department-activities'] });
                queryClient.invalidateQueries({ queryKey: ['department-activities'] });
            }
            queryClient.invalidateQueries({ queryKey: ['global-activities'] });
        } catch (error) {
            console.error('Erro ao excluir atividade:', error);
            toast.error('Erro ao excluir atividade');
        } finally {
            setDeletingId(null);
            setDeleteDialogOpen(false);
            setActivityToDelete(null);
        }
    };

    const toggleProjectSelection = (id: string) => {
        const newSelected = new Set(selectedProjectIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedProjectIds(newSelected);
    };

    const toggleDepartmentSelection = (id: string) => {
        const newSelected = new Set(selectedDepartmentIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedDepartmentIds(newSelected);
    };

    const selectAllProjects = () => {
        if (selectedProjectIds.size === projectActivities.length) {
            setSelectedProjectIds(new Set());
        } else {
            setSelectedProjectIds(new Set(projectActivities.map(a => a.id)));
        }
    };

    const selectAllDepartments = () => {
        if (selectedDepartmentIds.size === departmentActivities.length) {
            setSelectedDepartmentIds(new Set());
        } else {
            setSelectedDepartmentIds(new Set(departmentActivities.map(a => a.id)));
        }
    };

    const openBulkDeleteDialog = (type: 'project' | 'department') => {
        setBulkDeleteType(type);
        setBulkDeleteDialogOpen(true);
    };

    const handleBulkDelete = async () => {
        const ids = bulkDeleteType === 'project' ? Array.from(selectedProjectIds) : Array.from(selectedDepartmentIds);
        if (ids.length === 0) return;

        try {
            const table = bulkDeleteType === 'project' ? 'project_activities' : 'department_activities';
            const { error } = await supabase
                .from(table)
                .delete()
                .in('id', ids);

            if (error) throw error;

            toast.success(`${ids.length} atividade(s) excluída(s) permanentemente!`);
            
            if (bulkDeleteType === 'project') {
                setSelectedProjectIds(new Set());
                queryClient.invalidateQueries({ queryKey: ['completed-project-activities'] });
                queryClient.invalidateQueries({ queryKey: ['tasks'] });
            } else {
                setSelectedDepartmentIds(new Set());
                queryClient.invalidateQueries({ queryKey: ['completed-department-activities'] });
                queryClient.invalidateQueries({ queryKey: ['department-activities'] });
            }
            queryClient.invalidateQueries({ queryKey: ['global-activities'] });
        } catch (error) {
            console.error('Erro ao excluir atividades:', error);
            toast.error('Erro ao excluir atividades');
        } finally {
            setBulkDeleteDialogOpen(false);
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
            <>
                {selectedProjectIds.size > 0 && (
                    <div className="px-6 py-3 bg-muted/50 border-b flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                            {selectedProjectIds.size} selecionada(s)
                        </span>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => openBulkDeleteDialog('project')}
                        >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Excluir selecionadas
                        </Button>
                    </div>
                )}
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50">
                            <TableHead className="w-[50px]">
                                <Checkbox
                                    checked={selectedProjectIds.size === projectActivities.length && projectActivities.length > 0}
                                    onCheckedChange={selectAllProjects}
                                />
                            </TableHead>
                            <TableHead className="w-[300px]">Atividade</TableHead>
                            <TableHead>Projeto</TableHead>
                            <TableHead>Status do Prazo</TableHead>
                            <TableHead>Concluído em</TableHead>
                            <TableHead className="w-[120px]">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {projectActivities.map((activity: ProjectActivity) => (
                            <TableRow key={activity.id} className={selectedProjectIds.has(activity.id) ? "bg-destructive/5" : ""}>
                                <TableCell>
                                    <Checkbox
                                        checked={selectedProjectIds.has(activity.id)}
                                        onCheckedChange={() => toggleProjectSelection(activity.id)}
                                    />
                                </TableCell>
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
                                    <div className="flex items-center gap-1">
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
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => openDeleteDialog(activity.id, activity.name, 'project')}
                                            disabled={deletingId === activity.id}
                                            className="h-8 px-2 text-muted-foreground hover:text-destructive"
                                            title="Excluir permanentemente"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </>
        );
    };

    const renderDepartmentActivities = () => {
        if (departmentActivities.length === 0) return renderEmptyState();
        
        return (
            <>
                {selectedDepartmentIds.size > 0 && (
                    <div className="px-6 py-3 bg-muted/50 border-b flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                            {selectedDepartmentIds.size} selecionada(s)
                        </span>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => openBulkDeleteDialog('department')}
                        >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Excluir selecionadas
                        </Button>
                    </div>
                )}
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50">
                            <TableHead className="w-[50px]">
                                <Checkbox
                                    checked={selectedDepartmentIds.size === departmentActivities.length && departmentActivities.length > 0}
                                    onCheckedChange={selectAllDepartments}
                                />
                            </TableHead>
                            <TableHead className="w-[300px]">Atividade</TableHead>
                            <TableHead>Departamento</TableHead>
                            <TableHead>Status do Prazo</TableHead>
                            <TableHead>Concluído em</TableHead>
                            <TableHead className="w-[120px]">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {departmentActivities.map((activity: DepartmentActivity) => (
                            <TableRow key={activity.id} className={selectedDepartmentIds.has(activity.id) ? "bg-destructive/5" : ""}>
                                <TableCell>
                                    <Checkbox
                                        checked={selectedDepartmentIds.has(activity.id)}
                                        onCheckedChange={() => toggleDepartmentSelection(activity.id)}
                                    />
                                </TableCell>
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
                                    <div className="flex items-center gap-1">
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
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => openDeleteDialog(activity.id, activity.name, 'department')}
                                            disabled={deletingId === activity.id}
                                            className="h-8 px-2 text-muted-foreground hover:text-destructive"
                                            title="Excluir permanentemente"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </>
        );
    };

    return (
        <>
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

            {/* Single Delete Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir atividade permanentemente?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação não pode ser desfeita. A atividade "{activityToDelete?.name}" será excluída permanentemente do sistema.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteActivity}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Bulk Delete Dialog */}
            <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir atividades selecionadas?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação não pode ser desfeita. {bulkDeleteType === 'project' ? selectedProjectIds.size : selectedDepartmentIds.size} atividade(s) serão excluídas permanentemente do sistema.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleBulkDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Excluir {bulkDeleteType === 'project' ? selectedProjectIds.size : selectedDepartmentIds.size} atividade(s)
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};