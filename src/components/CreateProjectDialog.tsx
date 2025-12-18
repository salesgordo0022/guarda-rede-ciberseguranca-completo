
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Users } from "lucide-react";
import { notifyProjectCreated } from "@/utils/notificationService";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CreateProjectDialogProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    trigger?: React.ReactNode;
}

interface TeamMember {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
    role: string;
}

const getInitials = (name: string) => {
    return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
};

export function CreateProjectDialog({ open: controlledOpen, onOpenChange: setControlledOpen, trigger }: CreateProjectDialogProps) {
    const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
    const open = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen;
    const setOpen = setControlledOpen || setUncontrolledOpen;

    const { profile, selectedCompanyId } = useAuth();
    const queryClient = useQueryClient();
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    // Fetch team members from the company
    const {
        data: teamMembers = [],
        isLoading: teamMembersLoading,
        error: teamMembersError,
    } = useQuery({
        queryKey: ['team-members-for-project', selectedCompanyId, profile?.id],
        queryFn: async () => {
            if (!selectedCompanyId) return [];

            const { data: companyUsers, error: companyError } = await supabase
                .from('user_companies')
                .select('user_id, role')
                .eq('company_id', selectedCompanyId);

            if (companyError) throw companyError;
            if (!companyUsers || companyUsers.length === 0) return [];

            const userIds = companyUsers.map((u) => u.user_id);

            const { data: profiles, error: profilesError } = await supabase
                .from('profiles')
                .select('id, full_name, email, avatar_url')
                .in('id', userIds);

            if (profilesError) throw profilesError;

            return (profiles || [])
                .map((userProfile) => {
                    const companyUser = companyUsers.find((u) => u.user_id === userProfile.id);
                    return {
                        ...userProfile,
                        role: companyUser?.role || 'colaborador',
                    } as TeamMember;
                })
                .filter((member) => member.id !== profile?.id);
        },
        enabled: !!selectedCompanyId && !!profile?.id && open,
    });

    const handleSetMember = (memberId: string, checked: boolean) => {
        setSelectedMembers((prev) => {
            if (checked) return prev.includes(memberId) ? prev : [...prev, memberId];
            return prev.filter((id) => id !== memberId);
        });
    };

    const handleToggleMember = (memberId: string) => {
        setSelectedMembers((prev) =>
            prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
        );
    };

    const handleSelectAll = () => {
        if (selectedMembers.length === teamMembers.length) {
            setSelectedMembers([]);
        } else {
            setSelectedMembers(teamMembers.map(m => m.id));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        if (!selectedCompanyId || !profile?.id) {
            toast.error("Erro: Empresa ou usuário não identificado");
            return;
        }
        
        // Validação: pelo menos 1 participante deve ser selecionado
        if (selectedMembers.length === 0 && teamMembers.length > 0) {
            toast.error("Selecione pelo menos 1 participante para o projeto");
            return;
        }

        setLoading(true);
        try {
            // Create the project
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

            // Add selected members to project_members
            if (selectedMembers.length > 0) {
                const membersToInsert = selectedMembers.map(userId => ({
                    project_id: data.id,
                    user_id: userId
                }));

                const { error: membersError } = await supabase
                    .from("project_members")
                    .insert(membersToInsert);

                if (membersError) {
                    console.error("Error adding project members:", membersError);
                    // Don't fail the whole operation, just log the error
                }
            }

            // Notificar apenas os membros selecionados
            if (selectedMembers.length > 0) {
                for (const memberId of selectedMembers) {
                    await supabase.from("notifications").insert({
                        user_id: memberId,
                        title: "Novo Projeto",
                        description: `Você foi adicionado ao projeto "${name}"`,
                        type: "project_created",
                        project_id: data.id,
                        created_by: profile.id,
                    });
                }
            }

            toast.success("Projeto criado com sucesso!");
            setOpen(false);
            setName("");
            setDescription("");
            setSelectedMembers([]);
            queryClient.invalidateQueries({ queryKey: ["projects"] });
        } catch (error: any) {
            toast.error(`Erro ao criar projeto: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => {
            setOpen(isOpen);
            if (!isOpen) {
                setName("");
                setDescription("");
                setSelectedMembers([]);
            }
        }}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent className="sm:max-w-[500px]">
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
                    
                    {/* Team Members Selection */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                Membros do Projeto *
                            </Label>
                            {teamMembers.length > 0 && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleSelectAll}
                                >
                                    {selectedMembers.length === teamMembers.length ? "Desmarcar todos" : "Selecionar todos"}
                                </Button>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Selecione quem terá acesso a este projeto (obrigatório). Administradores sempre têm acesso.
                        </p>
                        <ScrollArea className="h-[200px] border rounded-lg p-3">
                            {teamMembersLoading ? (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                    Carregando membros...
                                </p>
                            ) : teamMembersError ? (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                    Não foi possível carregar os membros.
                                </p>
                            ) : teamMembers.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                    Nenhum membro disponível para selecionar
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {teamMembers.map((member) => (
                                        <div
                                            key={member.id}
                                            className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                                                selectedMembers.includes(member.id)
                                                    ? 'bg-primary/10 border border-primary/20'
                                                    : 'hover:bg-muted'
                                            }`}
                                            onClick={() => handleToggleMember(member.id)}
                                        >
                                            <div onClick={(e) => e.stopPropagation()}>
                                                <Checkbox
                                                    checked={selectedMembers.includes(member.id)}
                                                    onCheckedChange={(checked) =>
                                                        handleSetMember(member.id, checked === true)
                                                    }
                                                />
                                            </div>
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={member.avatar_url || undefined} />
                                                <AvatarFallback className="text-xs">
                                                    {getInitials(member.full_name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">{member.full_name}</p>
                                                <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                                            </div>
                                            <span className={`text-xs px-2 py-0.5 rounded ${
                                                member.role === 'gestor' 
                                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                                    : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                            }`}>
                                                {member.role === 'gestor' ? 'Gestor' : 'Colaborador'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                        {selectedMembers.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                                {selectedMembers.length} membro(s) selecionado(s)
                            </p>
                        )}
                    </div>

                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? "Criando..." : "Criar Projeto"}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
