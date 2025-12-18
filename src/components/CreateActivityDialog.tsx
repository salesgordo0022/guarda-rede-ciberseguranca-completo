
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Users, Repeat } from "lucide-react";

interface Department {
    id: string;
    name: string;
}

interface TeamMember {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
}

interface CreateActivityDialogProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    trigger?: React.ReactNode;
    preselectedDepartmentId?: string;
}

export function CreateActivityDialog({ open: controlledOpen, onOpenChange: setControlledOpen, trigger, preselectedDepartmentId }: CreateActivityDialogProps) {
    const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
    const open = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen;
    const setOpen = setControlledOpen || setUncontrolledOpen;

    const { profile, selectedCompanyId } = useAuth();
    const queryClient = useQueryClient();
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [departmentId, setDepartmentId] = useState(preselectedDepartmentId || "");
    const [deadline, setDeadline] = useState("");
    const [scheduleStart, setScheduleStart] = useState("");
    const [scheduleEnd, setScheduleEnd] = useState("");
    const [priority, setPriority] = useState<"urgente" | "media_urgencia" | "nao_urgente">("nao_urgente");
    const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    
    // Recurrence states
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurrenceType, setRecurrenceType] = useState<"daily" | "weekly" | "monthly">("weekly");
    const [recurrenceDay, setRecurrenceDay] = useState<number>(1);

    // Update departmentId if preselected changes
    useEffect(() => {
        if (preselectedDepartmentId) {
            setDepartmentId(preselectedDepartmentId);
        }
    }, [preselectedDepartmentId]);

    // Fetch departments
    const { data: departments = [] } = useQuery({
        queryKey: ['departments', selectedCompanyId],
        queryFn: async () => {
            if (!selectedCompanyId) return [];
            const { data } = await supabase
                .from('departments')
                .select('id, name')
                .eq('company_id', selectedCompanyId)
                .order('name');
            return data as Department[] || [];
        },
        enabled: !!selectedCompanyId && open
    });

    // Fetch team members from the company
    const { data: teamMembers = [] } = useQuery({
        queryKey: ['team-members', selectedCompanyId],
        queryFn: async () => {
            if (!selectedCompanyId) return [];
            
            // Get user IDs from user_companies
            const { data: userCompanies } = await supabase
                .from('user_companies')
                .select('user_id')
                .eq('company_id', selectedCompanyId);
            
            if (!userCompanies || userCompanies.length === 0) return [];
            
            const userIds = userCompanies.map(uc => uc.user_id);
            
            // Get profiles for those users
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, full_name, email, avatar_url')
                .in('id', userIds);
            
            return (profiles || []) as TeamMember[];
        },
        enabled: !!selectedCompanyId && open
    });

    const toggleAssignee = (userId: string) => {
        setSelectedAssignees(prev => 
            prev.includes(userId) 
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        if (!departmentId) {
            toast.error("Selecione um departamento (setor)");
            return;
        }
        if (!profile?.id) {
            toast.error("Usuário não autenticado");
            return;
        }

        setLoading(true);
        try {
            // Create the activity
            const { data: newActivity, error } = await supabase
                .from('department_activities')
                .insert({
                    name,
                    description: description || null,
                    department_id: departmentId,
                    deadline: deadline || null,
                    scheduled_date: scheduleStart || null,
                    goal_date: scheduleEnd || null,
                    priority: priority,
                    created_by: profile.id,
                    is_recurring: isRecurring,
                    recurrence_type: isRecurring ? recurrenceType : null,
                    recurrence_day: isRecurring ? recurrenceDay : null,
                    recurrence_active: isRecurring,
                })
                .select()
                .single();

            if (error) throw error;

            // Add assignees if any selected
            if (selectedAssignees.length > 0 && newActivity) {
                const assigneesData = selectedAssignees.map(userId => ({
                    activity_id: newActivity.id,
                    user_id: userId
                }));

                const { error: assigneesError } = await supabase
                    .from('department_activity_assignees')
                    .insert(assigneesData);

                if (assigneesError) {
                    console.error('Erro ao adicionar responsáveis:', assigneesError);
                }
            }

            toast.success("Atividade criada com sucesso!");
            setOpen(false);

            // Reset form
            setName("");
            setDescription("");
            if (!preselectedDepartmentId) setDepartmentId("");
            setDeadline("");
            setScheduleStart("");
            setScheduleEnd("");
            setPriority("nao_urgente");
            setSelectedAssignees([]);
            setIsRecurring(false);
            setRecurrenceType("weekly");
            setRecurrenceDay(1);

            queryClient.invalidateQueries({ queryKey: ['department-activities'] });
        } catch (error: any) {
            toast.error(`Erro ao criar atividade: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Criar Nova Atividade</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="activityName">Nome da Atividade *</Label>
                        <Input
                            id="activityName"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ex: Novo Relatório de Vendas"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="department">Departamento (Setor) *</Label>
                        <Select value={departmentId} onValueChange={setDepartmentId} required>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione o setor..." />
                            </SelectTrigger>
                            <SelectContent>
                                {departments.length === 0 ? (
                                    <SelectItem value="none" disabled>Nenhum departamento encontrado</SelectItem>
                                ) : (
                                    departments.map((dept) => (
                                        <SelectItem key={dept.id} value={dept.id}>
                                            {dept.name}
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="activityDescription">Descrição</Label>
                        <Textarea
                            id="activityDescription"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Detalhes da atividade..."
                            className="resize-none"
                            rows={3}
                        />
                    </div>

                    {/* Assignees Section */}
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Responsáveis
                        </Label>
                        <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                            {teamMembers.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-2">
                                    Nenhum membro encontrado
                                </p>
                            ) : (
                                teamMembers.map((member) => (
                                    <div
                                        key={member.id}
                                        className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer"
                                        onClick={() => toggleAssignee(member.id)}
                                    >
                                        <Checkbox
                                            checked={selectedAssignees.includes(member.id)}
                                            onCheckedChange={() => toggleAssignee(member.id)}
                                        />
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={member.avatar_url || undefined} />
                                            <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                                                {member.full_name?.substring(0, 2).toUpperCase() || 'US'}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{member.full_name}</p>
                                            <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        {selectedAssignees.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                                {selectedAssignees.length} responsável(eis) selecionado(s)
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="scheduleStart">Data Inicial</Label>
                            <Input
                                id="scheduleStart"
                                type="date"
                                value={scheduleStart}
                                onChange={(e) => setScheduleStart(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="scheduleEnd">Data Final</Label>
                            <Input
                                id="scheduleEnd"
                                type="date"
                                value={scheduleEnd}
                                onChange={(e) => setScheduleEnd(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="deadline">Prazo (Deadline)</Label>
                            <Input
                                id="deadline"
                                type="date"
                                value={deadline}
                                onChange={(e) => setDeadline(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="priority">Prioridade</Label>
                            <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="urgente" className="text-orange-600 font-medium">URGENTE</SelectItem>
                                    <SelectItem value="nao_urgente" className="text-slate-600 font-medium">NÃO URGENTE</SelectItem>
                                    <SelectItem value="media_urgencia" className="text-blue-600 font-medium">MÉDIA URGÊNCIA</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Recurrence Section */}
                    <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="recurring" className="flex items-center gap-2 cursor-pointer">
                                <Repeat className="h-4 w-4" />
                                Atividade Recorrente
                            </Label>
                            <Switch
                                id="recurring"
                                checked={isRecurring}
                                onCheckedChange={setIsRecurring}
                            />
                        </div>
                        
                        {isRecurring && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="space-y-2">
                                    <Label>Frequência</Label>
                                    <Select value={recurrenceType} onValueChange={(value: "daily" | "weekly" | "monthly") => {
                                        setRecurrenceType(value);
                                        if (value === 'weekly') setRecurrenceDay(1);
                                        if (value === 'monthly') setRecurrenceDay(1);
                                    }}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="daily">Diária</SelectItem>
                                            <SelectItem value="weekly">Semanal</SelectItem>
                                            <SelectItem value="monthly">Mensal</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {recurrenceType === 'weekly' && (
                                    <div className="space-y-2">
                                        <Label>Dia da Semana</Label>
                                        <Select value={String(recurrenceDay)} onValueChange={(v) => setRecurrenceDay(Number(v))}>
                                            <SelectTrigger>
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

                                {recurrenceType === 'monthly' && (
                                    <div className="space-y-2">
                                        <Label>Dia do Mês</Label>
                                        <Select value={String(recurrenceDay)} onValueChange={(v) => setRecurrenceDay(Number(v))}>
                                            <SelectTrigger>
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

                                <p className="text-xs text-muted-foreground">
                                    {recurrenceType === 'daily' && 'Uma nova atividade será criada todos os dias automaticamente.'}
                                    {recurrenceType === 'weekly' && `Uma nova atividade será criada toda ${['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'][recurrenceDay]}.`}
                                    {recurrenceType === 'monthly' && `Uma nova atividade será criada todo dia ${recurrenceDay} de cada mês.`}
                                </p>
                            </div>
                        )}
                    </div>

                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? "Criando..." : "Criar Atividade"}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
