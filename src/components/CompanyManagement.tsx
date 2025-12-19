import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
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
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Building2, Users, Shield, UserPlus, Trash2, Pencil, Crown, Search } from "lucide-react";
import { toast } from "sonner";
import { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface CompanyMember {
    id: string;
    user_id: string;
    company_id: string;
    role: AppRole;
    created_at: string;
    profile?: {
        id: string;
        full_name: string;
        email: string;
        avatar_url: string | null;
    };
}

interface Company {
    id: string;
    name: string;
    description: string | null;
    cnpj: string | null;
    logo_url: string | null;
    created_by: string;
    created_at: string;
}

const roleLabels: Record<AppRole, string> = {
    admin: "Administrador",
    gestor: "Gestor",
    colaborador: "Colaborador",
};

const roleBadgeColors: Record<AppRole, string> = {
    admin: "bg-red-500/10 text-red-500 border-red-500/20",
    gestor: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    colaborador: "bg-green-500/10 text-green-500 border-green-500/20",
};

export function CompanyManagement() {
    const { user, selectedCompanyId, isAdmin } = useAuth();
    const queryClient = useQueryClient();
    const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
    const [editingMember, setEditingMember] = useState<CompanyMember | null>(null);
    const [newRole, setNewRole] = useState<AppRole>("colaborador");
    const [removingMember, setRemovingMember] = useState<CompanyMember | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    // Buscar todas as empresas que o usuário tem acesso
    const { data: companies, isLoading: loadingCompanies } = useQuery({
        queryKey: ["user-companies", user?.id],
        queryFn: async () => {
            if (!user?.id) return [];

            const { data, error } = await supabase
                .from("user_companies")
                .select(`
                    company_id,
                    role,
                    companies:company_id (
                        id,
                        name,
                        description,
                        cnpj,
                        logo_url,
                        created_by,
                        created_at
                    )
                `)
                .eq("user_id", user.id);

            if (error) throw error;

            return data?.map(item => ({
                ...item.companies as Company,
                userRole: item.role as AppRole,
            })) || [];
        },
        enabled: !!user?.id,
    });

    // Buscar membros de uma empresa específica
    const { data: companyMembers, isLoading: loadingMembers } = useQuery({
        queryKey: ["company-members", selectedCompany?.id],
        queryFn: async () => {
            if (!selectedCompany?.id) return [];

            const { data, error } = await supabase
                .from("user_companies")
                .select(`
                    id,
                    user_id,
                    company_id,
                    role,
                    created_at
                `)
                .eq("company_id", selectedCompany.id);

            if (error) throw error;

            // Buscar perfis separadamente
            const userIds = data?.map(m => m.user_id) || [];
            const { data: profiles } = await supabase
                .from("profiles")
                .select("id, full_name, email, avatar_url")
                .in("id", userIds);

            const profileMap = new Map(profiles?.map(p => [p.id, p]));

            return data?.map(member => ({
                ...member,
                profile: profileMap.get(member.user_id),
            })) as CompanyMember[];
        },
        enabled: !!selectedCompany?.id,
    });

    // Mutation para atualizar role
    const updateRoleMutation = useMutation({
        mutationFn: async ({ memberId, role }: { memberId: string; role: AppRole }) => {
            const { error } = await supabase
                .from("user_companies")
                .update({ role })
                .eq("id", memberId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["company-members", selectedCompany?.id] });
            toast.success("Nível de acesso atualizado com sucesso!");
            setEditingMember(null);
        },
        onError: (error: any) => {
            toast.error("Erro ao atualizar nível de acesso: " + error.message);
        },
    });

    // Mutation para remover membro
    const removeMemberMutation = useMutation({
        mutationFn: async (memberId: string) => {
            const { error } = await supabase
                .from("user_companies")
                .delete()
                .eq("id", memberId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["company-members", selectedCompany?.id] });
            toast.success("Membro removido da empresa!");
            setRemovingMember(null);
        },
        onError: (error: any) => {
            toast.error("Erro ao remover membro: " + error.message);
        },
    });

    const filteredMembers = companyMembers?.filter(member =>
        member.profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.profile?.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getUserRoleInCompany = (companyId: string) => {
        const company = companies?.find(c => c.id === companyId);
        return company?.userRole;
    };

    const canManageCompany = (companyId: string) => {
        const role = getUserRoleInCompany(companyId);
        return role === "admin";
    };

    if (loadingCompanies) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold">Gerenciamento de Empresas</h2>
                <p className="text-muted-foreground">
                    Gerencie as empresas e níveis de acesso dos membros
                </p>
            </div>

            {/* Lista de Empresas */}
            <Accordion type="single" collapsible className="space-y-4">
                {companies?.map((company) => (
                    <AccordionItem
                        key={company.id}
                        value={company.id}
                        className="border rounded-lg overflow-hidden"
                    >
                        <AccordionTrigger
                            className="px-4 py-3 hover:no-underline hover:bg-muted/50"
                            onClick={() => setSelectedCompany(company)}
                        >
                            <div className="flex items-center gap-4 w-full">
                                <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-primary/10">
                                    <Building2 className="h-6 w-6 text-primary" />
                                </div>
                                <div className="flex-1 text-left">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-semibold">{company.name}</h3>
                                        {company.created_by === user?.id && (
                                            <Crown className="h-4 w-4 text-yellow-500" />
                                        )}
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        {company.description || "Sem descrição"}
                                    </p>
                                </div>
                                <Badge className={roleBadgeColors[company.userRole]}>
                                    {roleLabels[company.userRole]}
                                </Badge>
                            </div>
                        </AccordionTrigger>

                        <AccordionContent className="px-4 pb-4">
                            <Card>
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle className="text-lg flex items-center gap-2">
                                                <Users className="h-5 w-5" />
                                                Membros da Empresa
                                            </CardTitle>
                                            <CardDescription>
                                                {canManageCompany(company.id)
                                                    ? "Gerencie os níveis de acesso dos membros"
                                                    : "Visualize os membros da empresa"}
                                            </CardDescription>
                                        </div>
                                    </div>

                                    <div className="relative mt-3">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Buscar membro..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pl-10"
                                        />
                                    </div>
                                </CardHeader>

                                <CardContent>
                                    {loadingMembers && selectedCompany?.id === company.id ? (
                                        <div className="space-y-2">
                                            <Skeleton className="h-12 w-full" />
                                            <Skeleton className="h-12 w-full" />
                                        </div>
                                    ) : (
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Membro</TableHead>
                                                    <TableHead>Email</TableHead>
                                                    <TableHead>Nível de Acesso</TableHead>
                                                    {canManageCompany(company.id) && (
                                                        <TableHead className="text-right">Ações</TableHead>
                                                    )}
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {filteredMembers?.map((member) => (
                                                    <TableRow key={member.id}>
                                                        <TableCell>
                                                            <div className="flex items-center gap-3">
                                                                <Avatar className="h-8 w-8">
                                                                    <AvatarImage src={member.profile?.avatar_url || undefined} />
                                                                    <AvatarFallback>
                                                                        {member.profile?.full_name?.charAt(0).toUpperCase() || "U"}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-medium">
                                                                        {member.profile?.full_name || "Usuário"}
                                                                    </span>
                                                                    {member.user_id === company.created_by && (
                                                                        <Crown className="h-4 w-4 text-yellow-500" />
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-muted-foreground">
                                                            {member.profile?.email || "-"}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge className={roleBadgeColors[member.role]}>
                                                                <Shield className="h-3 w-3 mr-1" />
                                                                {roleLabels[member.role]}
                                                            </Badge>
                                                        </TableCell>
                                                        {canManageCompany(company.id) && (
                                                            <TableCell className="text-right">
                                                                <div className="flex items-center justify-end gap-2">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => {
                                                                            setEditingMember(member);
                                                                            setNewRole(member.role);
                                                                        }}
                                                                        disabled={member.user_id === company.created_by}
                                                                    >
                                                                        <Pencil className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="text-destructive hover:text-destructive"
                                                                        onClick={() => setRemovingMember(member)}
                                                                        disabled={member.user_id === company.created_by || member.user_id === user?.id}
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            </TableCell>
                                                        )}
                                                    </TableRow>
                                                ))}
                                                {(!filteredMembers || filteredMembers.length === 0) && (
                                                    <TableRow>
                                                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                                            Nenhum membro encontrado
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Legenda de Níveis de Acesso */}
                            <Card className="mt-4">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm">Níveis de Acesso</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid gap-3 text-sm">
                                        <div className="flex items-start gap-3">
                                            <Badge className={roleBadgeColors.admin}>Admin</Badge>
                                            <span className="text-muted-foreground">
                                                Acesso total: criar/editar/excluir departamentos, projetos, atividades e gerenciar membros
                                            </span>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <Badge className={roleBadgeColors.gestor}>Gestor</Badge>
                                            <span className="text-muted-foreground">
                                                Gerenciar projetos e atividades, visualizar relatórios
                                            </span>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <Badge className={roleBadgeColors.colaborador}>Colaborador</Badge>
                                            <span className="text-muted-foreground">
                                                Visualizar e atualizar atividades atribuídas a ele
                                            </span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>

            {(!companies || companies.length === 0) && (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Nenhuma empresa encontrada</h3>
                        <p className="text-muted-foreground text-center">
                            Você ainda não está vinculado a nenhuma empresa
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Dialog para editar nível de acesso */}
            <Dialog open={!!editingMember} onOpenChange={() => setEditingMember(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Alterar Nível de Acesso</DialogTitle>
                        <DialogDescription>
                            Altere o nível de acesso de {editingMember?.profile?.full_name} nesta empresa
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                            <Avatar>
                                <AvatarImage src={editingMember?.profile?.avatar_url || undefined} />
                                <AvatarFallback>
                                    {editingMember?.profile?.full_name?.charAt(0).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-medium">{editingMember?.profile?.full_name}</p>
                                <p className="text-sm text-muted-foreground">{editingMember?.profile?.email}</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Novo Nível de Acesso</label>
                            <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="admin">
                                        <div className="flex items-center gap-2">
                                            <Badge className={roleBadgeColors.admin}>Admin</Badge>
                                            <span>Acesso total</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="gestor">
                                        <div className="flex items-center gap-2">
                                            <Badge className={roleBadgeColors.gestor}>Gestor</Badge>
                                            <span>Gerenciar projetos</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="colaborador">
                                        <div className="flex items-center gap-2">
                                            <Badge className={roleBadgeColors.colaborador}>Colaborador</Badge>
                                            <span>Acesso básico</span>
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingMember(null)}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={() => {
                                if (editingMember) {
                                    updateRoleMutation.mutate({
                                        memberId: editingMember.id,
                                        role: newRole,
                                    });
                                }
                            }}
                            disabled={updateRoleMutation.isPending}
                        >
                            {updateRoleMutation.isPending ? "Salvando..." : "Salvar"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* AlertDialog para remover membro */}
            <AlertDialog open={!!removingMember} onOpenChange={() => setRemovingMember(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remover membro da empresa?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {removingMember?.profile?.full_name} será removido desta empresa e perderá acesso a todos os recursos. Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (removingMember) {
                                    removeMemberMutation.mutate(removingMember.id);
                                }
                            }}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Remover
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
