import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Task, TaskPriority, TaskStatus } from "@/types/task";

interface Department {
    id: string;
    name: string;
}

interface Profile {
    id: string;
    full_name: string | null;
}

interface CreateTaskDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (taskData: any) => void;
    departments: Department[];
    profiles: Profile[];
    initialData?: Task | null;
    defaultDepartmentId?: string;
    isEditing?: boolean;
}

export function CreateTaskDialog({
    open,
    onOpenChange,
    onSubmit,
    departments,
    profiles,
    initialData,
    defaultDepartmentId,
    isEditing = false
}: CreateTaskDialogProps) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [departmentId, setDepartmentId] = useState("");
    const [responsible, setResponsible] = useState("");
    const [status, setStatus] = useState<TaskStatus>("Não iniciado");
    const [priority, setPriority] = useState<TaskPriority>("média");
    const [deadline, setDeadline] = useState("");
    const [scheduleStart, setScheduleStart] = useState("");
    const [scheduleEnd, setScheduleEnd] = useState("");

    useEffect(() => {
        if (open) {
            if (initialData) {
                setTitle(initialData.title);
                setDescription(initialData.description || "");
                setDepartmentId(initialData.department_id || "");
                setResponsible(initialData.responsible || "");
                setStatus(initialData.status);
                setPriority(initialData.priority);
                setDeadline(initialData.deadline || "");
                setScheduleStart(initialData.schedule_start || "");
                setScheduleEnd(initialData.schedule_end || "");
            } else {
                resetForm();
                if (defaultDepartmentId) {
                    setDepartmentId(defaultDepartmentId);
                }
            }
        }
    }, [open, initialData, defaultDepartmentId]);

    const resetForm = () => {
        setTitle("");
        setDescription("");
        setDepartmentId(defaultDepartmentId || "");
        setResponsible("");
        setStatus("Não iniciado");
        setPriority("média");
        setDeadline("");
        setScheduleStart("");
        setScheduleEnd("");
    };

    const calculateScheduleStatus = (deadline: string | null, scheduleEnd: string | null) => {
        if (!deadline || !scheduleEnd) return null;
        const deadlineDate = new Date(deadline);
        const scheduleEndDate = new Date(scheduleEnd);
        const today = new Date();
        if (today > deadlineDate || today > scheduleEndDate) {
            return "Atrasado";
        }
        return "Dentro do prazo";
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const scheduleStatus = calculateScheduleStatus(deadline, scheduleEnd);

        const taskData = {
            title,
            description,
            department_id: departmentId,
            responsible: responsible || null,
            status,
            priority,
            deadline: deadline || null,
            schedule_start: scheduleStart || null,
            schedule_end: scheduleEnd || null,
            schedule_status: scheduleStatus,
            has_fine: false
        };

        onSubmit(taskData);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold">
                        {isEditing ? "Editar Atividade" : "Criar Nova Atividade"}
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2 col-span-2">
                            <Label htmlFor="title">Título da Atividade *</Label>
                            <Input
                                id="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Ex: Fechamento Mensal"
                                required
                                className="text-lg"
                            />
                        </div>

                        <div className="space-y-2 col-span-2">
                            <Label htmlFor="description">Descrição</Label>
                            <Textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Detalhes sobre a atividade..."
                                rows={3}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="department">Departamento *</Label>
                            <Select value={departmentId} onValueChange={setDepartmentId} required>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {departments.length > 0 ? (
                                        departments.map((dept) => (
                                            <SelectItem key={dept.id} value={dept.id}>
                                                {dept.name}
                                            </SelectItem>
                                        ))
                                    ) : (
                                        <div className="p-2 text-sm text-muted-foreground text-center">
                                            Nenhum departamento encontrado.
                                        </div>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="responsible">Responsável</Label>
                            <Select value={responsible} onValueChange={setResponsible}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione um responsável..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {profiles.map((profile) => (
                                        <SelectItem key={profile.id} value={profile.full_name || ""}>
                                            {profile.full_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="priority">Tipo / Prioridade *</Label>
                            <Select value={priority} onValueChange={(value) => setPriority(value as TaskPriority)} required>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="urgente">🔴 Obrigação (Urgente)</SelectItem>
                                    <SelectItem value="alta">🟠 Ação (Alta)</SelectItem>
                                    <SelectItem value="média">🟡 Rotina (Média)</SelectItem>
                                    <SelectItem value="baixa">🟢 Baixa</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="status">Status *</Label>
                            <Select value={status} onValueChange={(value) => setStatus(value as TaskStatus)} required>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Não iniciado">Não iniciado</SelectItem>
                                    <SelectItem value="Em andamento">Em andamento</SelectItem>
                                    <SelectItem value="Parado">Parado</SelectItem>
                                    <SelectItem value="Feito">Feito</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="schedule_start">Início</Label>
                            <Input
                                id="schedule_start"
                                type="date"
                                value={scheduleStart}
                                onChange={(e) => setScheduleStart(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="schedule_end">Fim (Prazo)</Label>
                            <Input
                                id="schedule_end"
                                type="date"
                                value={scheduleEnd}
                                onChange={(e) => {
                                    setScheduleEnd(e.target.value);
                                    setDeadline(e.target.value);
                                }}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" className="bg-primary hover:bg-primary/90">
                            {isEditing ? "Salvar Alterações" : "Criar Atividade"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
