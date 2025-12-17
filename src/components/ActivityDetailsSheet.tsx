import { useState, useEffect } from "react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetClose,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Calendar,
    Clock,
    User,
    Tag,
    Flag,
    Building2,
    FolderKanban,
    MessageSquare,
    CheckCircle2,
    AlertCircle,
    Save,
    ListTodo,
    Plus,
    X,
    Trash2
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";

interface ChecklistItem {
    id: string; // Temporary ID for new items
    text: string;
    completed: boolean;
    isNew?: boolean;
}

interface ActivityDetailsSheetProps {
    activity: any | null; // Null in create mode (initially)
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
        schedule_start: "",
        schedule_end: "",
        deadline: "",
        priority: "nao_urgente",
        description: ""
    });
    // Checklist State
    const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
    const [newChecklistItemText, setNewChecklistItemText] = useState("");

    // Initialize/Reset Form
    useEffect(() => {
        if (open) {
            if (mode === 'view' && initialActivity) {
                setFormData({
                    name: initialActivity.name || "",
                    status: initialActivity.status || "pendente",
                    schedule_start: initialActivity.schedule_start ? initialActivity.schedule_start.split('T')[0] : "",
                    schedule_end: initialActivity.schedule_end ? initialActivity.schedule_end.split('T')[0] : "",
                    deadline: initialActivity.deadline ? initialActivity.deadline.split('T')[0] : "",
                    priority: initialActivity.priority || "nao_urgente",
                    description: initialActivity.description || ""
                });
                fetchChecklist(initialActivity.id);
            } else {
                // Create Mode
                setFormData({
                    name: "",
                    status: "pendente",
                    schedule_start: "",
                    schedule_end: "",
                    deadline: "",
                    priority: "nao_urgente",
                    description: ""
                });
                setChecklistItems([]);
            }
        }
    }, [open, mode, initialActivity]);

    const fetchChecklist = async (activityId: string) => {
        // Checklist functionality disabled - table doesn't exist yet
        setChecklistItems([]);
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
                priority: formData.priority,
                description: formData.description,
                schedule_start: formData.schedule_start ? new Date(formData.schedule_start).toISOString() : null,
                schedule_end: formData.schedule_end ? new Date(formData.schedule_end).toISOString() : null,
                deadline: formData.deadline ? new Date(formData.deadline).toISOString() : null,
            };

            let activityId = initialActivity?.id;

            if (mode === 'create') {
                // Insert new activity
                if (isProject) {
                    activityData.project_id = preselectedProjectId;
                } else {
                    activityData.department_id = preselectedDepartmentId;
                }
                activityData.created_by = profile?.id;

                const { data, error } = await supabase
                    .from(table)
                    .insert(activityData)
                    .select()
                    .single(); // Ensure we get the ID back

                if (error) throw error;
                activityId = data.id;
                toast.success("Atividade criada com sucesso!");
            } else {
                // Update existing
                const { error } = await supabase
                    .from(table)
                    .update(activityData)
                    .eq('id', activityId);

                if (error) throw error;
                toast.success("Atividade atualizada com sucesso!");
            }

            // Checklist saving disabled - table doesn't exist yet

            // Invalidate queries
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

    const handleAddChecklistItem = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!newChecklistItemText.trim()) return;

        const newItem: ChecklistItem = {
            id: `temp-${Date.now()}`,
            text: newChecklistItemText,
            completed: false,
            isNew: true
        };

        setChecklistItems([...checklistItems, newItem]);
        setNewChecklistItemText("");
    };

    const toggleChecklistItem = (id: string, checked: boolean) => {
        setChecklistItems(prev => prev.map(item =>
            item.id === id ? { ...item, completed: checked } : item
        ));
    };

    const deleteChecklistItem = async (id: string) => {
        // Checklist delete disabled - table doesn't exist yet
        setChecklistItems(prev => prev.filter(item => item.id !== id));
    };

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
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

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-2xl overflow-hidden flex flex-col p-0 border-l-4 border-l-primary/10">
                <ScrollArea className="h-full">
                    <div className="p-8 space-y-8">
                        {/* Header */}
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-muted-foreground text-sm bg-muted/30 px-3 py-1 rounded-full">
                                    {(preselectedProjectId || (initialActivity && !initialActivity.department_id)) ? (
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
                                    {loading ? "Salvando..." : (mode === 'create' ? "Criar Atividade" : "Salvar Alterações")}
                                </Button>
                            </div>

                            <Input
                                value={formData.name}
                                onChange={(e) => handleChange('name', e.target.value)}
                                className="text-3xl font-bold border-none shadow-none px-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/50"
                                placeholder="Nome da Atividade"
                            />
                        </div>

                        <Separator />

                        {/* Properties Grid */}
                        <div className="grid gap-6 bg-card rounded-lg p-1">
                        
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
                        
                            <InputWrapper icon={User} label="Criado por">
                                <div className="flex items-center gap-2">
                                    {initialActivity?.created_by ? (
                                        <>
                                            <Avatar className="h-6 w-6">
                                                <AvatarFallback className="text-xs">
                                                    {initialActivity.created_by.charAt(0).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="text-sm">
                                                {initialActivity.created_by}
                                            </span>
                                        </>
                                    ) : (
                                        <span className="text-muted-foreground text-sm">—</span>
                                    )}
                                </div>
                            </InputWrapper>
                        
                            <InputWrapper icon={User} label="Responsável">
                                <div className="flex items-center gap-2">
                                    {initialActivity?.assignees && initialActivity.assignees.length > 0 ? (
                                        <>
                                            <Avatar className="h-6 w-6">
                                                <AvatarFallback className="text-xs">
                                                    {initialActivity.assignees[0].profiles?.full_name?.charAt(0).toUpperCase() || '?'}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="text-sm">
                                                {initialActivity.assignees[0].profiles?.full_name || initialActivity.assignees[0].user_id}
                                            </span>
                                        </>
                                    ) : (
                                        <span className="text-muted-foreground text-sm">—</span>
                                    )}
                                </div>
                            </InputWrapper>
                        
                            <InputWrapper icon={Calendar} label="Data Inicial">
                                <Input
                                    type="date"
                                    value={formData.schedule_start}
                                    onChange={(e) => handleChange('schedule_start', e.target.value)}
                                    className="w-[180px]"
                                />
                            </InputWrapper>
                        
                            <InputWrapper icon={Calendar} label="Data Final">
                                <Input
                                    type="date"
                                    value={formData.schedule_end}
                                    onChange={(e) => handleChange('schedule_end', e.target.value)}
                                    className="w-[180px]"
                                />
                            </InputWrapper>
                        
                            <InputWrapper icon={AlertCircle} label="Prazo">
                                <Input
                                    type="date"
                                    value={formData.deadline}
                                    onChange={(e) => handleChange('deadline', e.target.value)}
                                    className="w-[180px]"
                                />
                            </InputWrapper>
                        
                            <InputWrapper icon={Flag} label="Prioridade">
                                <Select value={formData.priority} onValueChange={(val) => handleChange('priority', val)}>
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="urgente" className="text-orange-600 font-medium">URGENTE</SelectItem>
                                        <SelectItem value="media_urgencia" className="text-blue-600 font-medium">MÉDIA URGÊNCIA</SelectItem>
                                        <SelectItem value="nao_urgente" className="text-slate-500 font-medium">NÃO URGENTE</SelectItem>
                                    </SelectContent>
                                </Select>
                            </InputWrapper>
                        
                            <div className="grid grid-cols-[140px_1fr] items-start gap-4 pt-2">
                                <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium mt-2">
                                    <Tag className="h-4 w-4" />
                                    Descrição
                                </div>
                                <Textarea
                                    value={formData.description}
                                    onChange={(e) => handleChange('description', e.target.value)}
                                    placeholder="Adicione uma descrição detalhada..."
                                    className="min-h-[150px] resize-none text-sm leading-relaxed"
                                />
                            </div>
                        
                        </div>
                        <Separator />

                        {/* Checklist Section */}
                        <div className="space-y-4">
                            <h3 className="font-semibold flex items-center gap-2 text-lg">
                                <ListTodo className="h-5 w-5" />
                                Checklist
                            </h3>

                            <div className="space-y-2">
                                {checklistItems.map((item) => (
                                    <div key={item.id} className="flex items-center gap-3 group">
                                        <Checkbox
                                            checked={item.completed}
                                            onCheckedChange={(checked) => toggleChecklistItem(item.id, checked as boolean)}
                                        />
                                        <span className={`flex-1 text-sm ${item.completed ? 'line-through text-muted-foreground' : ''}`}>
                                            {item.text}
                                        </span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => deleteChecklistItem(item.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>

                            <form onSubmit={handleAddChecklistItem} className="flex items-center gap-2">
                                <Plus className="h-4 w-4 text-muted-foreground" />
                                <Input
                                    value={newChecklistItemText}
                                    onChange={(e) => setNewChecklistItemText(e.target.value)}
                                    placeholder="Adicionar item ao checklist..."
                                    className="border-none shadow-none focus-visible:ring-0 px-0 h-auto placeholder:text-muted-foreground/70"
                                />
                            </form>
                        </div>

                        <Separator />


                        {/* Comments Section */}
                        {(mode === 'view' || initialActivity) && (
                            <div className="space-y-6">
                                <h3 className="font-semibold flex items-center gap-2 text-lg">
                                    <MessageSquare className="h-5 w-5" />
                                    Comentários
                                </h3>
                                {/* Mock comments */}
                                <div className="flex gap-3 pt-2">
                                    <Avatar className="h-8 w-8">
                                        <AvatarFallback className="text-xs">EU</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                        <Button variant="outline" className="w-full text-muted-foreground justify-start h-20 items-start pt-2">
                                            Adicionar um comentário...
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
}
