
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea"; // Assuming Textarea component exists, if not I'll use textarea
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { notifyProjectCreated } from "@/utils/notificationService";

interface CreateProjectDialogProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    trigger?: React.ReactNode;
}

export function CreateProjectDialog({ open: controlledOpen, onOpenChange: setControlledOpen, trigger }: CreateProjectDialogProps) {
    const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
    const open = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen;
    const setOpen = setControlledOpen || setUncontrolledOpen;

    const { profile, selectedCompanyId } = useAuth();
    const queryClient = useQueryClient();
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        if (!selectedCompanyId || !profile?.id) {
            toast.error("Erro: Empresa ou usuário não identificado");
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("projects")
                .insert({
                    name,
                    description: description || null,
                    company_id: selectedCompanyId,
                    created_by: profile.id,
                })
                .select()
                .single();

            if (error) throw error;

            // Notificar todos da empresa
            await notifyProjectCreated(
                selectedCompanyId,
                name,
                data.id,
                profile.full_name || 'Usuário',
                profile.id
            );

            toast.success("Projeto criado com sucesso!");
            setOpen(false);
            setName("");
            setDescription("");
            queryClient.invalidateQueries({ queryKey: ["projects"] });
        } catch (error: any) {
            toast.error(`Erro ao criar projeto: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Criar Novo Projeto</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="projectName">Nome do Projeto *</Label>
                        <Input
                            id="projectName"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ex: Expansão Q4"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="projectDescription">Descrição</Label>
                        <Textarea
                            id="projectDescription"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Descreva o projeto..."
                            className="resize-none"
                            rows={3}
                        />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? "Criando..." : "Criar Projeto"}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
