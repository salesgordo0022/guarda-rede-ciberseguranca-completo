import { useState, useEffect } from "react";
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
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { createNotification } from "@/hooks/useNotifications";

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
        department_id: preselectedDepartmentId || ""
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

        // Fetch assignees
        const { data: assigneesData } = await supabase
            .from(assigneesTable)
            .select('user_id')
            .eq('activity_id', initialActivity.id);
        if (assigneesData) {
            setSelectedAssignees(assigneesData.map(a => a.user_id));
        }

        // Only fetch these for department activities
        if (!isProject) {
            const { data: checklistData } = await supabase
                .from('department_activity_checklist')
                .select('*')
                .eq('activity_id', initialActivity.id)
                .order('order_index');
            if (checklistData) setChecklist(checklistData);

            const { data: commentsData } = await supabase
                .from('department_activity_comments')
                .select('*')
                .eq('activity_id', initialActivity.id)
                .order('created_at', { ascending: false });
            if (commentsData) setComments(commentsData);

            const { data: historyData } = await supabase
                .from('department_activity_history')
                .select('*')
                .eq('activity_id', initialActivity.id)
                .order('created_at', { ascending: false });
            if (historyData) setHistory(historyData);

            const { data: notesData } = await supabase
                .from('department_activity_notes')
                .select('*')
                .eq('activity_id', initialActivity.id)
                .order('created_at', { ascending: false });
            if (notesData) setNotes(notesData);
        }
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
                    department_id: initialActivity.department_id || ""
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
                    department_id: preselectedDepartmentId || ""
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

    const recordHistory = async (activityId: string, action: string, fieldName?: string, oldValue?: string, newValue?: string) => {
        await supabase.from('department_activity_history').insert({
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
            const isProject = preselectedProjectId || (initialActivity && !initialActivity.department_id);
            const table = isProject ? 'project_activities' : 'department_activities';

            const activityData: any = {
                name: formData.name,
                status: formData.status,
                description: formData.description,
                goal_date: formData.goal_date || null,
                deadline: formData.deadline || null,
                priority: formData.priority
            };

            let activityId = initialActivity?.id;

            if (mode === 'create') {
                if (isProject) {
                    activityData.project_id = preselectedProjectId;
                    delete activityData.priority;
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

                if (!isProject) {
                    await recordHistory(activityId, 'criou', undefined, undefined, 'Atividade criada');
                    
                    // Salvar checklist items criados localmente
                    if (checklist.length > 0) {
                        const checklistItems = checklist.map((item, index) => ({
                            activity_id: activityId,
                            title: item.title,
                            completed: item.completed,
                            order_index: index
                        }));
                        await supabase.from('department_activity_checklist').insert(checklistItems);
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
                if (!isProject && initialActivity) {
                    if (initialActivity.status !== formData.status) {
                        await recordHistory(activityId!, 'alterou', 'status', initialActivity.status, formData.status);
                        
                        // Notificar assignees sobre mudança de status
                        if (profile?.id) {
                            const assigneesTable = isProject ? 'project_activity_assignees' : 'department_activity_assignees';
                            const { data: assignees } = await supabase
                                .from(assigneesTable)
                                .select('user_id')
                                .eq('activity_id', activityId!);
                            
                            if (assignees) {
                                const statusLabels: Record<string, string> = {
                                    'pendente': 'Não iniciado',
                                    'em_andamento': 'Em andamento',
                                    'concluida': 'Finalizado',
                                    'cancelada': 'Cancelado'
                                };
                                
                                for (const assignee of assignees) {
                                    if (assignee.user_id !== profile.id) {
                                        try {
                                            await createNotification({
                                                userId: assignee.user_id,
                                                title: "Status da atividade alterado",
                                                description: `"${formData.name}" mudou de ${statusLabels[initialActivity.status] || initialActivity.status} para ${statusLabels[formData.status] || formData.status}`,
                                                type: "status_change",
                                                activityId: activityId!,
                                                departmentId: initialActivity.department_id,
                                                createdBy: profile.id
                                            });
                                        } catch (e) {
                                            console.error("Erro ao criar notificação:", e);
                                        }
                                    }
                                }
                            }
                        }
                    }
                    if (initialActivity.priority !== formData.priority) {
                        await recordHistory(activityId!, 'alterou', 'prioridade', initialActivity.priority, formData.priority);
                    }
                    if (initialActivity.name !== formData.name) {
                        await recordHistory(activityId!, 'alterou', 'nome', initialActivity.name, formData.name);
                    }
                }

                const updateData = isProject 
                    ? { name: formData.name, status: formData.status, description: formData.description, goal_date: formData.goal_date || null, deadline: formData.deadline || null }
                    : activityData;

                const { error } = await supabase
                    .from(table)
                    .update(updateData)
                    .eq('id', activityId);

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

                toast.success("Atividade atualizada com sucesso!");
            }

            queryClient.invalidateQueries({ queryKey: ['department-activities'] });
            queryClient.invalidateQueries({ queryKey: ['project-activities'] });
            queryClient.invalidateQueries({ queryKey: ['global-activities'] });

            onOpenChange(false);

        } catch (error: any) {
            console.error("Erro ao salvar:", error);
            toast.error(`Erro ao salvar: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // Checklist handlers
    const addChecklistItem = async () => {
        if (!newChecklistItem.trim()) return;
        
        // Se já existe a atividade, salva no banco
        if (initialActivity?.id) {
            const { data, error } = await supabase
                .from('department_activity_checklist')
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
                await recordHistory(initialActivity.id, 'adicionou', 'checklist', undefined, newChecklistItem);
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

        const { error } = await supabase
            .from('department_activity_checklist')
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

        const { error } = await supabase
            .from('department_activity_checklist')
            .delete()
            .eq('id', itemId);

        if (!error) {
            setChecklist(checklist.filter(c => c.id !== itemId));
        }
    };

    // Comments handlers
    const addComment = async () => {
        if (!newComment.trim() || !initialActivity?.id) return;

        const { data, error } = await supabase
            .from('department_activity_comments')
            .insert({
                activity_id: initialActivity.id,
                user_id: profile?.id,
                content: newComment
            })
            .select()
            .single();

        if (!error && data) {
            setComments([data, ...comments]);
            
            // Detectar menções (@usuario) e criar notificações
            const mentionRegex = /@(\w+)/g;
            const mentions = newComment.match(mentionRegex);
            
            if (mentions && profiles && profile?.id) {
                for (const mention of mentions) {
                    const mentionName = mention.slice(1).toLowerCase();
                    const mentionedUser = profiles.find(p => 
                        p.full_name.toLowerCase().includes(mentionName)
                    );
                    
                    if (mentionedUser && mentionedUser.id !== profile.id) {
                        try {
                            await createNotification({
                                userId: mentionedUser.id,
                                title: "Você foi mencionado em um comentário",
                                description: `${profile?.full_name || 'Alguém'} mencionou você: "${newComment.slice(0, 100)}${newComment.length > 100 ? '...' : ''}"`,
                                type: "mention",
                                activityId: initialActivity.id,
                                departmentId: initialActivity.department_id,
                                createdBy: profile.id
                            });
                        } catch (e) {
                            console.error("Erro ao criar notificação:", e);
                        }
                    }
                }
            }
            
            setNewComment("");
        }
    };

    // Notes handlers
    const addNote = async () => {
        if (!newNote.trim() || !initialActivity?.id) return;

        const { data, error } = await supabase
            .from('department_activity_notes')
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

                            {isDepartmentActivity && (
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
                            )}

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

                        {/* Checklist Section */}
                        {isDepartmentActivity && (
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
                        )}

                        {/* Comments Section */}
                        {isDepartmentActivity && (
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
                                            <div className="flex gap-2">
                                                <Input
                                                    value={newComment}
                                                    onChange={(e) => setNewComment(e.target.value)}
                                                    placeholder="Adicionar comentário..."
                                                    onKeyDown={(e) => e.key === 'Enter' && addComment()}
                                                />
                                                <Button onClick={addComment} size="icon" variant="outline">
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
                                                            <p className="text-sm pl-8">{comment.content}</p>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </>
                        )}


                        {/* History Section */}
                        {isDepartmentActivity && (
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
                        )}

                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
}
