
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient, useQuery } from "@tanstack/react-query";

interface Department {
    id: string;
    name: string;
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
    const [loading, setLoading] = useState(false);

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
        enabled: !!selectedCompanyId && open // Fetch when open
    });

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
            const { error } = await supabase
                .from('department_activities')
                .insert({
                    name,
                    description: description || null,
                    department_id: departmentId,
                    deadline: deadline || null,
                    schedule_start: scheduleStart || null,
                    schedule_end: scheduleEnd || null,
                    priority: priority,
                    created_by: profile.id,
                });

            if (error) throw error;

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
            <DialogContent>
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

                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? "Criando..." : "Criar Atividade"}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
