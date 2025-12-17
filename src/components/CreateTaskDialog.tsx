import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Department {
    id: string;
    name: string;
}

interface Profile {
    id: string;
    full_name: string | null;
}

interface Project {
    id: string;
    name: string;
}

interface CreateTaskDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (taskData: any) => void;
    departments: Department[];
    profiles: Profile[];
    projects?: Project[];
    defaultDepartmentId?: string;
}

export function CreateTaskDialog({
    open,
    onOpenChange,
    onSubmit,
    departments,
    profiles,
    projects = [],
    defaultDepartmentId,
}: CreateTaskDialogProps) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [projectId, setProjectId] = useState("");
    const [deadline, setDeadline] = useState("");

    useEffect(() => {
        if (open) {
            resetForm();
        }
    }, [open]);

    const resetForm = () => {
        setName("");
        setDescription("");
        setProjectId("");
        setDeadline("");
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        onSubmit({
            name,
            description,
            project_id: projectId,
            deadline: deadline || null,
        });
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold">
                        Criar Nova Atividade
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nome da Atividade *</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ex: Fechamento Mensal"
                            required
                        />
                    </div>

                    <div className="space-y-2">
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
                        <Label htmlFor="project">Projeto *</Label>
                        <Select value={projectId} onValueChange={setProjectId} required>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                                {projects.length > 0 ? (
                                    projects.map((project) => (
                                        <SelectItem key={project.id} value={project.id}>
                                            {project.name}
                                        </SelectItem>
                                    ))
                                ) : (
                                    <div className="p-2 text-sm text-muted-foreground text-center">
                                        Nenhum projeto encontrado.
                                    </div>
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="deadline">Prazo</Label>
                        <Input
                            id="deadline"
                            type="date"
                            value={deadline}
                            onChange={(e) => setDeadline(e.target.value)}
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" className="bg-primary hover:bg-primary/90">
                            Criar Atividade
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}