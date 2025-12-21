import { useState, useEffect } from "react";
import loadingPikachu from "@/assets/loading-pikachu.gif";
import {
    Sheet,
    SheetContent,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import {
    Calendar,
    User,
    Building2,
    FolderKanban,
    MessageSquare,
    CheckCircle2,
    Target,
    Clock,
    Save,
    Plus,
    Trash2,
    History,
    ListChecks,
    BookOpen,
    Flag,
    Send,
    Users,
    X,
    Check,
    Repeat,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { 
    notifyActivityCreated, 
    notifyActivityStatusChanged,
    notifyProjectActivityCreated,
    notifyProjectActivityCompleted,
    notifyCommentAdded,
    extractMentions,
    notifyMentionedUsers,
    formatMentionsForDisplay
} from "@/utils/notificationService";
import { MentionInput } from "@/components/MentionInput";

interface ChecklistItem {
    id: string;
    title: string;
    completed: boolean;
    order_index: number;
}

interface Comment {
    id: string;
    content: string;
    user_id: string;
    created_at: string;
}

interface HistoryEntry {
    id: string;
    action: string;
    field_name: string | null;
    old_value: string | null;
    new_value: string | null;
    user_id: string;
    created_at: string;
}

interface Note {
    id: string;
    content: string;
    user_id: string;
    created_at: string;
}

interface TeamMember {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
}

interface ActivityDetailsSheetProps {
    activity: any | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mode?: 'view' | 'create';
    preselectedDepartmentId?: string;
    preselectedProjectId?: string;
}

export function ActivityDetailsSheet({
    activity: initialActivity,
    open,
    onOpenChange,
    mode = 'view',
    preselectedDepartmentId,
    preselectedProjectId
}: ActivityDetailsSheetProps) {
    const { profile, selectedCompanyId } = useAuth();
    const queryClient = useQueryClient();
    const [loading, setLoading] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: "",
        status: "pendente",
        goal_date: "",
        deadline: "",
        description: "",
        priority: "media",
        department_id: preselectedDepartmentId || "",
        is_recurring: false,
        recurrence_type: "weekly" as "daily" | "weekly" | "monthly" | "yearly",
        recurrence_day: 1,
        recurrence_month: 1,
        recurrence_active: true
    });

    // Assignees State
    const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);

    // Fetch departments for selection
    const { data: departments } = useQuery({
        queryKey: ['departments-for-activity', selectedCompanyId],
        queryFn: async () => {
            if (!selectedCompanyId) return [];
            const { data } = await supabase
                .from('departments')
                .select('id, name')
                .eq('company_id', selectedCompanyId);
            return data || [];
        },
        enabled: open && !!selectedCompanyId && mode === 'create' && !preselectedDepartmentId && !preselectedProjectId
    });

    // Fetch team members from the company
    const { data: teamMembers = [] } = useQuery({
        queryKey: ['team-members-for-activity', selectedCompanyId],
        queryFn: async () => {
            if (!selectedCompanyId) return [];
            
            const { data: userCompanies } = await supabase
                .from('user_companies')
                .select('user_id')
                .eq('company_id', selectedCompanyId);
            
            if (!userCompanies || userCompanies.length === 0) return [];
            
            const userIds = userCompanies.map(uc => uc.user_id);
            
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, full_name, email, avatar_url')
                .in('id', userIds);
            
            return (profiles || []) as TeamMember[];
        },
        enabled: !!selectedCompanyId && open
    });

    // Checklist State
    const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
    const [newChecklistItem, setNewChecklistItem] = useState("");

    // Comments State
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState("");

    // History State
    const [history, setHistory] = useState<HistoryEntry[]>([]);

    // Notes State (Diário de Bordo)
    const [notes, setNotes] = useState<Note[]>([]);
    const [newNote, setNewNote] = useState("");

    // Fetch profiles for user names
    const { data: profiles } = useQuery({
        queryKey: ['profiles-for-activity'],
        queryFn: async () => {
            const { data } = await supabase
                .from('profiles')
                .select('id, full_name');
            return data || [];
        },
        enabled: open
    });

    const getUserName = (userId: string) => {
        const user = profiles?.find(p => p.id === userId);
        return user?.full_name || 'Usuário';
    };

    // Fetch checklist, comments, history, notes
    useEffect(() => {
        if (open && initialActivity?.id && mode === 'view') {
            fetchActivityData();
        }
    }, [open, initialActivity?.id, mode]);

    const fetchActivityData = async () => {
        if (!initialActivity?.id) return;

        const isProject = !initialActivity.department_id;
        const assigneesTable = isProject ? 'project_activity_assignees' : 'department_activity_assignees';
        const checklistTable = isProject ? 'project_activity_checklist' : 'department_activity_checklist';
        const commentsTable = isProject ? 'project_activity_comments' : 'department_activity_comments';
        const historyTable = isProject ? 'project_activity_history' : 'department_activity_history';
        const notesTable = isProject ? 'project_activity_notes' : 'department_activity_notes';

        // Fetch assignees
        const { data: assigneesData } = await supabase
            .from(assigneesTable)
            .select('user_id')
            .eq('activity_id', initialActivity.id);
        if (assigneesData) {
            setSelectedAssignees(assigneesData.map(a => a.user_id));
        }

        // Fetch checklist, comments, history, notes for both project and department activities
        const { data: checklistData } = await supabase
            .from(checklistTable)
            .select('*')
            .eq('activity_id', initialActivity.id)
            .order('order_index');
        if (checklistData) setChecklist(checklistData);

        const { data: commentsData } = await supabase
            .from(commentsTable)
            .select('*')
            .eq('activity_id', initialActivity.id)
            .order('created_at', { ascending: false });
        if (commentsData) setComments(commentsData);

        const { data: historyData } = await supabase
            .from(historyTable)
            .select('*')
            .eq('activity_id', initialActivity.id)
            .order('created_at', { ascending: false });
        if (historyData) setHistory(historyData);

        const { data: notesData } = await supabase
            .from(notesTable)
            .select('*')
            .eq('activity_id', initialActivity.id)
            .order('created_at', { ascending: false });
        if (notesData) setNotes(notesData);
    };

    // Initialize/Reset Form
    useEffect(() => {
        if (open) {
            if (mode === 'view' && initialActivity) {
                setFormData({
                    name: initialActivity.name || "",
                    status: initialActivity.status || "pendente",
                    goal_date: initialActivity.goal_date ? initialActivity.goal_date.split('T')[0] : "",
                    deadline: initialActivity.deadline ? initialActivity.deadline.split('T')[0] : "",
                    description: initialActivity.description || "",
                    priority: initialActivity.priority || "media",
                    department_id: initialActivity.department_id || "",
                    is_recurring: initialActivity.is_recurring || false,
                    recurrence_type: initialActivity.recurrence_type || "weekly",
                    recurrence_day: initialActivity.recurrence_day ?? 1,
                    recurrence_month: initialActivity.recurrence_month ?? 1,
                    recurrence_active: initialActivity.recurrence_active ?? true
                });
                // Assignees serão carregados pelo fetchActivityData
            } else {
                setFormData({
                    name: "",
                    status: "pendente",
                    goal_date: "",
                    deadline: "",
                    description: "",
                    priority: "media",
                    department_id: preselectedDepartmentId || "",
                    is_recurring: false,
                    recurrence_type: "weekly",
                    recurrence_day: 1,
                    recurrence_month: 1,
                    recurrence_active: true
                });
                setSelectedAssignees([]);
                setChecklist([]);
                setComments([]);
                setHistory([]);
                setNotes([]);
            }
        }
    }, [open, mode, initialActivity]);

    const toggleAssignee = (userId: string) => {
        setSelectedAssignees(prev => 
            prev.includes(userId) 
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const recordHistory = async (activityId: string, action: string, fieldName?: string, oldValue?: string, newValue?: string, isProject?: boolean) => {
        const historyTable = isProject ? 'project_activity_history' : 'department_activity_history';
        await supabase.from(historyTable).insert({
            activity_id: activityId,
            user_id: profile?.id,
            action,
            field_name: fieldName || null,
            old_value: oldValue || null,
            new_value: newValue || null
        });
    };

    const handleSave = async () => {
        if (!formData.name.trim()) {
            toast.error("Nome da atividade é obrigatório");
            return;
        }

        setLoading(true);
        try {
            const isProject = !!(preselectedProjectId || (initialActivity && !initialActivity.department_id));
            const table = isProject ? 'project_activities' : 'department_activities';

            const activityData: any = {
                name: formData.name,
                status: formData.status,
                description: formData.description,
                goal_date: formData.goal_date || null,
                deadline: formData.deadline || null,
                priority: formData.priority,
                // Recurrence fields (only for department activities)
                ...(isProject ? {} : {
                    is_recurring: formData.is_recurring,
                    recurrence_type: formData.is_recurring ? formData.recurrence_type : null,
                    recurrence_day: formData.is_recurring ? formData.recurrence_day : null,
                    recurrence_month: formData.is_recurring && formData.recurrence_type === 'yearly' ? formData.recurrence_month : null,
                    recurrence_active: formData.is_recurring ? formData.recurrence_active : false
                })
            };

            let activityId = initialActivity?.id;

            if (mode === 'create') {
                if (isProject) {
                    activityData.project_id = preselectedProjectId;
                } else {
                    activityData.department_id = formData.department_id || preselectedDepartmentId;
                }
                activityData.created_by = profile?.id;

                const { data, error } = await supabase
                    .from(table)
                    .insert(activityData)
                    .select()
                    .single();

                if (error) throw error;
                activityId = data.id;

                const checklistTable = isProject ? 'project_activity_checklist' : 'department_activity_checklist';
                
                await recordHistory(activityId, 'criou', undefined, undefined, 'Atividade criada', isProject);
                
                // Salvar checklist items criados localmente
                if (checklist.length > 0) {
                    const checklistItems = checklist.map((item, index) => ({
                        activity_id: activityId,
                        title: item.title,
                        completed: item.completed,
                        order_index: index
                    }));
                    await supabase.from(checklistTable).insert(checklistItems);
                }

                if (!isProject) {
                    // Notificar todos da empresa sobre nova atividade de departamento
                    if (selectedCompanyId && profile?.id) {
                        const departmentId = formData.department_id || preselectedDepartmentId;
                        const { data: deptData } = await supabase
                            .from('departments')
                            .select('name')
                            .eq('id', departmentId)
                            .single();
                        
                        await notifyActivityCreated(
                            selectedCompanyId,
                            formData.name,
                            deptData?.name || 'Departamento',
                            departmentId!,
                            activityId!,
                            profile.full_name || 'Usuário',
                            profile.id
                        );
                    }
                } else {
                    // Notificar todos da empresa sobre nova atividade de projeto
                    if (selectedCompanyId && profile?.id && preselectedProjectId) {
                        const { data: projData } = await supabase
                            .from('projects')
                            .select('name')
                            .eq('id', preselectedProjectId)
                            .single();
                        
                        await notifyProjectActivityCreated(
                            selectedCompanyId,
                            formData.name,
                            projData?.name || 'Projeto',
                            preselectedProjectId,
                            activityId!,
                            profile.full_name || 'Usuário',
                            profile.id
                        );
                    }
                }

                // Salvar responsáveis (assignees)
                const assigneesTable = isProject ? 'project_activity_assignees' : 'department_activity_assignees';
                if (selectedAssignees.length > 0) {
                    const assigneesData = selectedAssignees.map(userId => ({
                        activity_id: activityId,
                        user_id: userId
                    }));
                    await supabase.from(assigneesTable).insert(assigneesData);
                }

                toast.success("Atividade criada com sucesso!");
            } else {
                // Record history for both project and department activities
                if (initialActivity) {
                    if (initialActivity.status !== formData.status) {
                        await recordHistory(activityId!, 'alterou', 'status', initialActivity.status, formData.status, isProject);
                        
                        // Notificar todos da empresa sobre mudança de status
                        if (profile?.id && selectedCompanyId && !isProject) {
                            await notifyActivityStatusChanged(
                                selectedCompanyId,
                                formData.name,
                                initialActivity.status,
                                formData.status,
                                activityId!,
                                initialActivity.department_id,
                                profile.full_name || 'Usuário',
                                profile.id
                            );
                        }
                    }
                    if (initialActivity.priority !== formData.priority) {
                        await recordHistory(activityId!, 'alterou', 'prioridade', initialActivity.priority, formData.priority, isProject);
                    }
                    if (initialActivity.name !== formData.name) {
                        await recordHistory(activityId!, 'alterou', 'nome', initialActivity.name, formData.name, isProject);
                    }
                }

                // Both project and department activities use the same data structure now
                const { data: updatedActivity, error } = await supabase
                    .from(table)
                    .update(activityData)
                    .eq('id', activityId)
                    .select()
                    .single();

                if (error) throw error;

                // Atualizar responsáveis (delete and re-insert)
                const assigneesTable = isProject ? 'project_activity_assignees' : 'department_activity_assignees';
                await supabase.from(assigneesTable).delete().eq('activity_id', activityId!);
                
                if (selectedAssignees.length > 0) {
                    const assigneesData = selectedAssignees.map(userId => ({
                        activity_id: activityId,
                        user_id: userId
                    }));
                    await supabase.from(assigneesTable).insert(assigneesData);
                }

                // Gamificação: dar pontos quando status muda para concluida
                if (initialActivity?.status !== 'concluida' && formData.status === 'concluida' && selectedCompanyId) {
                    const deadlineStatus = updatedActivity?.deadline_status;
                    
                    console.log('Gamificação - deadline_status:', deadlineStatus);
                    console.log('Gamificação - selectedAssignees:', selectedAssignees);
                    console.log('Gamificação - profile?.id:', profile?.id);
                    
                    // Determinar pontos baseado no deadline_status
                    // bateu_meta = 10 pontos, concluido_no_prazo = 5 pontos
                    let points = 0;
                    let isBeatGoal = false;
                    
                    if (deadlineStatus === 'bateu_meta') {
                        points = 10;
                        isBeatGoal = true;
                    } else if (deadlineStatus === 'concluido_no_prazo') {
                        points = 5;
                    }
                    
                    console.log('Gamificação - pontos calculados:', points, 'isBeatGoal:', isBeatGoal);
                    
                    // Determinar quem recebe os pontos
                    // Se há assignees, dar para eles; senão, dar para quem concluiu
                    const usersToScore = selectedAssignees.length > 0 
                        ? selectedAssignees 
                        : (profile?.id ? [profile.id] : []);
                    
                    console.log('Gamificação - usuários que receberão pontos:', usersToScore);
                    
                    // Dar pontos
                    if (points > 0 && usersToScore.length > 0) {
                        for (const userId of usersToScore) {
                            try {
                                console.log('Chamando add_user_score para:', userId, 'pontos:', points);
                                const { error: scoreError } = await supabase.rpc('add_user_score', {
                                    _user_id: userId,
                                    _company_id: selectedCompanyId,
                                    _points: points,
                                    _is_beat_goal: isBeatGoal
                                });
                                if (scoreError) {
                                    console.error('Erro RPC add_user_score:', scoreError);
                                } else {
                                    console.log('Score adicionado com sucesso para:', userId);
                                    toast.success(`+${points} pontos! ${isBeatGoal ? '🏆 Bateu a meta!' : '✅ No prazo!'}`);
                                }
                            } catch (e) {
                                console.error('Erro ao adicionar score:', e);
                            }
                        }
                    }
                }

                toast.success("Atividade atualizada com sucesso!");
            }

            queryClient.invalidateQueries({ queryKey: ['department-activities'] });
            queryClient.invalidateQueries({ queryKey: ['department-activities-all'] });
            queryClient.invalidateQueries({ queryKey: ['project-activities'] });
            queryClient.invalidateQueries({ queryKey: ['global-activities'] });
            queryClient.invalidateQueries({ queryKey: ['gamification-report'] });

            onOpenChange(false);

        } catch (error: any) {
            console.error("Erro ao salvar:", error);
            toast.error(`Erro ao salvar: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (field: string, value: string | boolean | number) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // Checklist handlers
    const addChecklistItem = async () => {
        if (!newChecklistItem.trim()) return;
        
        const isProject = initialActivity && !initialActivity.department_id;
        const checklistTable = isProject ? 'project_activity_checklist' : 'department_activity_checklist';
        
        // Se já existe a atividade, salva no banco
        if (initialActivity?.id) {
            const { data, error } = await supabase
                .from(checklistTable)
                .insert({
                    activity_id: initialActivity.id,
                    title: newChecklistItem,
                    order_index: checklist.length
                })
                .select()
                .single();

            if (!error && data) {
                setChecklist([...checklist, data]);
                setNewChecklistItem("");
                await recordHistory(initialActivity.id, 'adicionou', 'checklist', undefined, newChecklistItem, !!isProject);
            }
        } else {
            // Se não existe, adiciona localmente (será salvo ao criar a atividade)
            const newItem: ChecklistItem = {
                id: `temp-${Date.now()}`,
                title: newChecklistItem,
                completed: false,
                order_index: checklist.length
            };
            setChecklist([...checklist, newItem]);
            setNewChecklistItem("");
        }
    };

    const toggleChecklistItem = async (item: ChecklistItem) => {
        // Se é item temporário, apenas atualiza localmente
        if (item.id.startsWith('temp-')) {
            setChecklist(checklist.map(c => c.id === item.id ? { ...c, completed: !c.completed } : c));
            return;
        }

        const isProject = initialActivity && !initialActivity.department_id;
        const checklistTable = isProject ? 'project_activity_checklist' : 'department_activity_checklist';

        const { error } = await supabase
            .from(checklistTable)
            .update({ completed: !item.completed })
            .eq('id', item.id);

        if (!error) {
            setChecklist(checklist.map(c => c.id === item.id ? { ...c, completed: !c.completed } : c));
        }
    };

    const deleteChecklistItem = async (itemId: string) => {
        // Se é item temporário, apenas remove localmente
        if (itemId.startsWith('temp-')) {
            setChecklist(checklist.filter(c => c.id !== itemId));
            return;
        }

        const isProject = initialActivity && !initialActivity.department_id;
        const checklistTable = isProject ? 'project_activity_checklist' : 'department_activity_checklist';

        const { error } = await supabase
            .from(checklistTable)
            .delete()
            .eq('id', itemId);

        if (!error) {
            setChecklist(checklist.filter(c => c.id !== itemId));
        }
    };

    // Comments handlers
    const addComment = async () => {
        if (!newComment.trim() || !initialActivity?.id) return;

        const isProject = !initialActivity.department_id;
        const commentsTable = isProject ? 'project_activity_comments' : 'department_activity_comments';

        const { data, error } = await supabase
            .from(commentsTable)
            .insert({
                activity_id: initialActivity.id,
                user_id: profile?.id,
                content: newComment
            })
            .select()
            .single();

        if (!error && data) {
            setComments([data, ...comments]);
            
            // Extrair menções e notificar usuários mencionados
            const mentionedUserIds = extractMentions(newComment);
            if (mentionedUserIds.length > 0 && profile?.id) {
                await notifyMentionedUsers(
                    mentionedUserIds,
                    initialActivity.name,
                    initialActivity.id,
                    initialActivity.department_id,
                    initialActivity.project_id,
                    profile.full_name || 'Usuário',
                    profile.id
                );
            }
            
            setNewComment("");
        }
    };

    // Notes handlers
    const addNote = async () => {
        if (!newNote.trim() || !initialActivity?.id) return;

        const isProject = !initialActivity.department_id;
        const notesTable = isProject ? 'project_activity_notes' : 'department_activity_notes';

        const { data, error } = await supabase
            .from(notesTable)
            .insert({
                activity_id: initialActivity.id,
                user_id: profile?.id,
                content: newNote
            })
            .select()
            .single();

        if (!error && data) {
            setNotes([data, ...notes]);
            setNewNote("");
        }
    };

    const InputWrapper = ({ icon: Icon, label, children }: { icon: any, label: string, children: React.ReactNode }) => (
        <div className="grid grid-cols-[140px_1fr] items-center gap-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium">
                <Icon className="h-4 w-4" />
                {label}
            </div>
            <div className="w-full">
                {children}
            </div>
        </div>
    );

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'urgente': return 'bg-red-500/10 text-red-500 border-red-500/20';
            case 'nao_urgente': return 'bg-green-500/10 text-green-500 border-green-500/20';
            case 'media': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
            default: return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'pendente': return 'Não iniciado';
            case 'em_andamento': return 'Em andamento';
            case 'concluida': return 'Finalizado';
            case 'cancelada': return 'Cancelado';
            default: return status;
        }
    };

    const getProgressFromStatus = (status: string) => {
        switch (status) {
            case 'pendente': return 0;
            case 'em_andamento': return 50;
            case 'concluida': return 100;
            case 'cancelada': return 0;
            default: return 0;
        }
    };

    const isProjectActivity = preselectedProjectId || (initialActivity && !initialActivity.department_id);
    const isDepartmentActivity = !isProjectActivity;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-3xl overflow-hidden flex flex-col p-0 border-l-4 border-l-primary/10" side="right">
                <ScrollArea className="h-full">
                    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
                        {/* Header */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-muted-foreground text-sm bg-muted/30 px-3 py-1 rounded-full">
                                    {isProjectActivity ? (
                                        <>
                                            <FolderKanban className="h-4 w-4 text-emerald-500" />
                                            <span className="font-medium text-emerald-900 dark:text-emerald-300">Projeto</span>
                                        </>
                                    ) : (
                                        <>
                                            <Building2 className="h-4 w-4 text-blue-500" />
                                            <span className="font-medium text-blue-900 dark:text-blue-300">Departamento</span>
                                        </>
                                    )}
                                    <span className="text-muted-foreground/50">/</span>
                                    <span>{mode === 'create' ? 'Nova Atividade' : 'Editar Atividade'}</span>
                                </div>
                                <Button onClick={handleSave} disabled={loading} size="sm" className="gap-2">
                                    <Save className="h-4 w-4" />
                                    {loading ? "Salvando..." : (mode === 'create' ? "Criar" : "Salvar")}
                                </Button>
                            </div>

                            <Input
                                value={formData.name}
                                onChange={(e) => handleChange('name', e.target.value)}
                                className="text-xl md:text-2xl font-bold border-none shadow-none px-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/50"
                                placeholder="Nome da Atividade"
                            />
                        </div>

                        <Separator />

                        {/* Properties Grid */}
                        <div className="grid gap-4 bg-card rounded-lg p-1">
                            <InputWrapper icon={CheckCircle2} label="Status">
                                <Select value={formData.status} onValueChange={(val) => handleChange('status', val)}>
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="pendente">Não iniciado</SelectItem>
                                        <SelectItem value="em_andamento">Em andamento</SelectItem>
                                        <SelectItem value="concluida">Finalizado</SelectItem>
                                        <SelectItem value="cancelada">Cancelado</SelectItem>
                                    </SelectContent>
                                </Select>
                            </InputWrapper>

                            <InputWrapper icon={Flag} label="Prioridade">
                                <Select value={formData.priority} onValueChange={(val) => handleChange('priority', val)}>
                                    <SelectTrigger className={`w-[180px] ${getPriorityColor(formData.priority)}`}>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="urgente">
                                            <span className="text-red-500 font-medium">Urgente</span>
                                        </SelectItem>
                                        <SelectItem value="nao_urgente">
                                            <span className="text-green-500 font-medium">Não Urgente</span>
                                        </SelectItem>
                                        <SelectItem value="media">
                                            <span className="text-yellow-500 font-medium">Média Urgência</span>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </InputWrapper>

                            <InputWrapper icon={User} label="Criado por">
                                <div className="flex items-center gap-2">
                                    <Avatar className="h-6 w-6">
                                        <AvatarFallback className="text-xs bg-primary/10">
                                            {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm">
                                        {initialActivity?.created_by ? getUserName(initialActivity.created_by) : profile?.full_name || 'Você'}
                                    </span>
                                </div>
                            </InputWrapper>

                            {isDepartmentActivity && (
                                <InputWrapper icon={Building2} label="Departamento">
                                    {mode === 'create' && !preselectedDepartmentId ? (
                                        <Select value={formData.department_id} onValueChange={(val) => handleChange('department_id', val)}>
                                            <SelectTrigger className="w-[180px]">
                                                <SelectValue placeholder="Selecione..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {departments?.map((dept) => (
                                                    <SelectItem key={dept.id} value={dept.id}>
                                                        {dept.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <span className="text-sm font-medium">
                                            {initialActivity?.department?.name || departments?.find(d => d.id === formData.department_id)?.name || 'Departamento'}
                                        </span>
                                    )}
                                </InputWrapper>
                            )}

                            {/* Assignees Section */}
                            <div className="grid grid-cols-[140px_1fr] items-start gap-4">
                                <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium pt-2">
                                    <Users className="h-4 w-4" />
                                    Responsáveis
                                </div>
                                <div className="space-y-2">
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <div className="min-h-[42px] w-full border rounded-lg p-2 cursor-pointer hover:bg-muted/50 transition-colors">
                                                {selectedAssignees.length === 0 ? (
                                                    <span className="text-sm text-muted-foreground">Selecione quantas quiser</span>
                                                ) : (
                                                    <div className="flex flex-wrap gap-1">
                                                        {selectedAssignees.map((userId) => {
                                                            const member = teamMembers.find(m => m.id === userId);
                                                            if (!member) return null;
                                                            return (
                                                                <Badge
                                                                    key={userId}
                                                                    variant="secondary"
                                                                    className="flex items-center gap-1 pr-1"
                                                                >
                                                                    <Avatar className="h-4 w-4">
                                                                        <AvatarImage src={member.avatar_url || undefined} />
                                                                        <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
                                                                            {member.full_name?.charAt(0).toUpperCase() || 'U'}
                                                                        </AvatarFallback>
                                                                    </Avatar>
                                                                    <span className="max-w-[150px] truncate">{member.full_name}</span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            toggleAssignee(userId);
                                                                        }}
                                                                        className="ml-1 rounded-full hover:bg-destructive/20 p-0.5"
                                                                    >
                                                                        <X className="h-3 w-3" />
                                                                    </button>
                                                                </Badge>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[300px] p-0 bg-popover" align="start">
                                            <Command>
                                                <CommandInput placeholder="Buscar membro..." />
                                                <CommandList>
                                                    <CommandEmpty>Nenhum membro encontrado.</CommandEmpty>
                                                    <CommandGroup>
                                                        {teamMembers.map((member) => {
                                                            const isSelected = selectedAssignees.includes(member.id);
                                                            return (
                                                                <CommandItem
                                                                    key={member.id}
                                                                    value={member.full_name}
                                                                    onSelect={() => toggleAssignee(member.id)}
                                                                    className="flex items-center gap-2 cursor-pointer"
                                                                >
                                                                    <Avatar className="h-6 w-6">
                                                                        <AvatarImage src={member.avatar_url || undefined} />
                                                                        <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                                                                            {member.full_name?.charAt(0).toUpperCase() || 'U'}
                                                                        </AvatarFallback>
                                                                    </Avatar>
                                                                    <span className="flex-1 truncate">{member.full_name}</span>
                                                                    {isSelected && (
                                                                        <Check className="h-4 w-4 text-primary" />
                                                                    )}
                                                                </CommandItem>
                                                            );
                                                        })}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>

                            <InputWrapper icon={Target} label="Meta">
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="date"
                                        value={formData.goal_date}
                                        onChange={(e) => handleChange('goal_date', e.target.value)}
                                        className="w-[180px]"
                                    />
                                    <span className="text-xs text-muted-foreground">Data objetivo</span>
                                </div>
                            </InputWrapper>

                            <InputWrapper icon={Clock} label="Prazo">
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="date"
                                        value={formData.deadline}
                                        onChange={(e) => handleChange('deadline', e.target.value)}
                                        className="w-[180px]"
                                    />
                                    <span className="text-xs text-muted-foreground">Última data limite</span>
                                </div>
                            </InputWrapper>

                            {initialActivity?.created_at && (
                                <InputWrapper icon={Calendar} label="Criado em">
                                    <span className="text-sm text-muted-foreground">
                                        {format(new Date(initialActivity.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                    </span>
                                </InputWrapper>
                            )}
                        </div>

                        <Separator />

                        {/* Description */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-muted-foreground font-medium">
                                <MessageSquare className="h-4 w-4" />
                                Descrição
                            </div>
                            <Textarea
                                value={formData.description}
                                onChange={(e) => handleChange('description', e.target.value)}
                                placeholder="Adicione uma descrição detalhada..."
                                className="min-h-[100px] resize-none"
                            />
                        </div>

                        {/* Recurrence Section - Only for department activities */}
                        {(initialActivity?.department_id || (mode === 'create' && !preselectedProjectId)) && (
                            <>
                                <Separator />
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-muted-foreground font-medium">
                                            <Repeat className="h-4 w-4" />
                                            Atividade Recorrente
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-muted-foreground">
                                                {formData.is_recurring ? 'Ativa' : 'Desativada'}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => handleChange('is_recurring', !formData.is_recurring)}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                                    formData.is_recurring ? 'bg-primary' : 'bg-muted'
                                                }`}
                                            >
                                                <span
                                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                        formData.is_recurring ? 'translate-x-6' : 'translate-x-1'
                                                    }`}
                                                />
                                            </button>
                                        </div>
                                    </div>

                                    {formData.is_recurring && (
                                        <div className="space-y-4 pl-6 border-l-2 border-primary/20 animate-in fade-in slide-in-from-top-2 duration-200">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">Frequência</label>
                                                <Select 
                                                    value={formData.recurrence_type} 
                                                    onValueChange={(value: "daily" | "weekly" | "monthly" | "yearly") => {
                                                        handleChange('recurrence_type', value);
                                                        if (value === 'weekly') handleChange('recurrence_day', 1);
                                                        if (value === 'monthly') handleChange('recurrence_day', 1);
                                                        if (value === 'yearly') { handleChange('recurrence_day', 1); handleChange('recurrence_month', 1); }
                                                    }}
                                                >
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="daily">Diária</SelectItem>
                                                        <SelectItem value="weekly">Semanal</SelectItem>
                                                        <SelectItem value="monthly">Mensal</SelectItem>
                                                        <SelectItem value="yearly">Anual</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {formData.recurrence_type === 'weekly' && (
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium">Dia da Semana</label>
                                                    <Select 
                                                        value={String(formData.recurrence_day)} 
                                                        onValueChange={(v) => handleChange('recurrence_day', Number(v))}
                                                    >
                                                        <SelectTrigger className="w-full">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="0">Domingo</SelectItem>
                                                            <SelectItem value="1">Segunda-feira</SelectItem>
                                                            <SelectItem value="2">Terça-feira</SelectItem>
                                                            <SelectItem value="3">Quarta-feira</SelectItem>
                                                            <SelectItem value="4">Quinta-feira</SelectItem>
                                                            <SelectItem value="5">Sexta-feira</SelectItem>
                                                            <SelectItem value="6">Sábado</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            )}

                                            {formData.recurrence_type === 'monthly' && (
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium">Dia do Mês</label>
                                                    <Select 
                                                        value={String(formData.recurrence_day)} 
                                                        onValueChange={(v) => handleChange('recurrence_day', Number(v))}
                                                    >
                                                        <SelectTrigger className="w-full">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                                                                <SelectItem key={day} value={String(day)}>
                                                                    Dia {day}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            )}

                                            {formData.recurrence_type === 'yearly' && (
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium">Mês</label>
                                                        <Select 
                                                            value={String(formData.recurrence_month)} 
                                                            onValueChange={(v) => handleChange('recurrence_month', Number(v))}
                                                        >
                                                            <SelectTrigger className="w-full">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="1">Janeiro</SelectItem>
                                                                <SelectItem value="2">Fevereiro</SelectItem>
                                                                <SelectItem value="3">Março</SelectItem>
                                                                <SelectItem value="4">Abril</SelectItem>
                                                                <SelectItem value="5">Maio</SelectItem>
                                                                <SelectItem value="6">Junho</SelectItem>
                                                                <SelectItem value="7">Julho</SelectItem>
                                                                <SelectItem value="8">Agosto</SelectItem>
                                                                <SelectItem value="9">Setembro</SelectItem>
                                                                <SelectItem value="10">Outubro</SelectItem>
                                                                <SelectItem value="11">Novembro</SelectItem>
                                                                <SelectItem value="12">Dezembro</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium">Dia</label>
                                                        <Select 
                                                            value={String(formData.recurrence_day)} 
                                                            onValueChange={(v) => handleChange('recurrence_day', Number(v))}
                                                        >
                                                            <SelectTrigger className="w-full">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                                                                    <SelectItem key={day} value={String(day)}>
                                                                        Dia {day}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>
                                            )}

                                            <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                                                {formData.recurrence_type === 'daily' && '📅 Uma nova atividade será criada todos os dias automaticamente.'}
                                                {formData.recurrence_type === 'weekly' && `📅 Uma nova atividade será criada toda ${['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'][formData.recurrence_day]}.`}
                                                {formData.recurrence_type === 'monthly' && `📅 Uma nova atividade será criada todo dia ${formData.recurrence_day} de cada mês.`}
                                                {formData.recurrence_type === 'yearly' && `📅 Uma nova atividade será criada todo dia ${formData.recurrence_day} de ${['', 'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'][formData.recurrence_month]}.`}
                                            </p>

                                            {mode === 'view' && initialActivity?.is_recurring && (
                                                <div className="flex items-center justify-between pt-2">
                                                    <span className="text-sm">Recorrência ativa</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleChange('recurrence_active', !formData.recurrence_active)}
                                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                                            formData.recurrence_active ? 'bg-green-500' : 'bg-destructive'
                                                        }`}
                                                    >
                                                        <span
                                                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                                formData.recurrence_active ? 'translate-x-6' : 'translate-x-1'
                                                            }`}
                                                        />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {/* Checklist Section */}
                        <>
                            <Separator />
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-muted-foreground font-medium">
                                        <ListChecks className="h-4 w-4" />
                                        Checklist - Passos da Atividade
                                    </div>
                                    <div className="flex gap-2">
                                        <Input
                                            value={newChecklistItem}
                                            onChange={(e) => setNewChecklistItem(e.target.value)}
                                            placeholder="Adicionar novo passo..."
                                            onKeyDown={(e) => e.key === 'Enter' && addChecklistItem()}
                                        />
                                        <Button onClick={addChecklistItem} size="icon" variant="outline">
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                        {checklist.length === 0 ? (
                                            <p className="text-sm text-muted-foreground text-center py-4">
                                                Nenhum passo adicionado
                                            </p>
                                        ) : (
                                            checklist.map((item) => (
                                                <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 group">
                                                    <Checkbox
                                                        checked={item.completed}
                                                        onCheckedChange={() => toggleChecklistItem(item)}
                                                    />
                                                    <span className={`flex-1 text-sm ${item.completed ? 'line-through text-muted-foreground' : ''}`}>
                                                        {item.title}
                                                    </span>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 opacity-0 group-hover:opacity-100"
                                                        onClick={() => deleteChecklistItem(item.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    {checklist.length > 0 && (
                                        <div className="pt-2">
                                            <div className="flex items-center justify-between text-sm mb-1">
                                                <span className="text-muted-foreground">Progresso do Checklist</span>
                                                <span className="font-medium">
                                                    {Math.round((checklist.filter(c => c.completed).length / checklist.length) * 100)}%
                                                </span>
                                            </div>
                                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-primary transition-all"
                                                    style={{ width: `${(checklist.filter(c => c.completed).length / checklist.length) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>

                        {/* Comments Section */}
                        <>
                            <Separator />
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-muted-foreground font-medium">
                                    <MessageSquare className="h-4 w-4" />
                                    Comentários
                                </div>
                                {!initialActivity?.id ? (
                                    <p className="text-sm text-muted-foreground text-center py-4 bg-muted/30 rounded-lg">
                                        Salve a atividade primeiro para adicionar comentários
                                    </p>
                                ) : (
                                    <>
                                        <div className="flex gap-2 items-start">
                                            <MentionInput
                                                value={newComment}
                                                onChange={setNewComment}
                                                onSubmit={addComment}
                                                placeholder="Adicionar comentário... (@ para mencionar)"
                                                teamMembers={teamMembers}
                                            />
                                            <Button onClick={addComment} size="icon" variant="outline" className="shrink-0">
                                                <Send className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        <div className="space-y-3 max-h-[200px] overflow-y-auto">
                                            {comments.length === 0 ? (
                                                <p className="text-sm text-muted-foreground text-center py-4">
                                                    Nenhum comentário ainda
                                                </p>
                                            ) : (
                                                comments.map((comment) => (
                                                    <div key={comment.id} className="p-3 rounded-lg bg-muted/30 space-y-2">
                                                        <div className="flex items-center gap-2">
                                                            <Avatar className="h-6 w-6">
                                                                <AvatarFallback className="text-xs bg-primary/10">
                                                                    {getUserName(comment.user_id).charAt(0).toUpperCase()}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <span className="text-sm font-medium">{getUserName(comment.user_id)}</span>
                                                            <span className="text-xs text-muted-foreground">
                                                                {format(new Date(comment.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm pl-8">
                                                            {formatMentionsForDisplay(comment.content).split(/(@\w+(?:\s\w+)?)/g).map((part, i) => 
                                                                part.startsWith('@') ? (
                                                                    <span key={i} className="text-primary font-medium bg-primary/10 px-1 rounded">
                                                                        {part}
                                                                    </span>
                                                                ) : part
                                                            )}
                                                        </p>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </>


                        {/* History Section */}
                        <>
                            <Separator />
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-muted-foreground font-medium">
                                    <History className="h-4 w-4" />
                                    Histórico de Alterações
                                </div>
                                {!initialActivity?.id ? (
                                    <p className="text-sm text-muted-foreground text-center py-4 bg-muted/30 rounded-lg">
                                        O histórico será exibido após salvar a atividade
                                    </p>
                                ) : (
                                    <div className="space-y-3 max-h-[200px] overflow-y-auto">
                                        {history.length === 0 ? (
                                            <p className="text-sm text-muted-foreground text-center py-4">
                                                Nenhum histórico de alterações
                                            </p>
                                        ) : (
                                            history.map((entry) => (
                                                <div key={entry.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/30">
                                                    <Avatar className="h-6 w-6 mt-0.5">
                                                        <AvatarFallback className="text-xs bg-primary/10">
                                                            {getUserName(entry.user_id).charAt(0).toUpperCase()}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex-1">
                                                        <p className="text-sm">
                                                            <span className="font-medium">{getUserName(entry.user_id)}</span>
                                                            {' '}{entry.action}{' '}
                                                            {entry.field_name && (
                                                                <span className="text-muted-foreground">
                                                                    {entry.field_name}
                                                                    {entry.old_value && entry.new_value && (
                                                                        <>
                                                                            {' '}de <span className="line-through">{entry.old_value}</span>
                                                                            {' '}para <span className="font-medium">{entry.new_value}</span>
                                                                        </>
                                                                    )}
                                                                </span>
                                                            )}
                                                        </p>
                                                        <span className="text-xs text-muted-foreground">
                                                            {format(new Date(entry.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        </>

                        {/* Bottom Action Button - shown in all modes */}
                        <Separator />
                        <div className="flex justify-center pt-4 pb-2">
                            <Button 
                                onClick={handleSave} 
                                disabled={loading}
                                size="lg"
                                className="bg-primary hover:bg-primary/90 shadow-lg min-w-[180px]"
                            >
                                <Save className="h-5 w-5 mr-2" />
                                {mode === 'create' ? "Criar Atividade" : "Salvar Alterações"}
                            </Button>
                        </div>

                    </div>
                </ScrollArea>

                {/* Loading Overlay */}
                {loading && (
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
                        <img 
                            src={loadingPikachu} 
                            alt="Carregando" 
                            className="h-32 w-32 object-contain"
                        />
                        <p className="mt-4 text-lg font-medium text-foreground">
                            {mode === 'create' ? "Criando atividade..." : "Salvando alterações..."}
                        </p>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}
