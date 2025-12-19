import { Users, Mail, Shield, UserCog, User as UserIcon, Plus, Pencil, Key, FolderKanban } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { MultiSelect } from "@/components/ui/multi-select";

interface TeamMember {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
    role: "admin" | "gestor" | "colaborador";
    departments: { id: string; name: string }[];
    companies: { id: string; name: string }[];
    projects: { id: string; name: string }[];
}

const getRoleInfo = (role: string) => {
    switch (role) {
        case "admin":
            return {
                label: "Admin",
                description: "Acesso total a todos os departamentos e visão diversificada de cada departamento e suas atividades, podendo ver cada demanda e suas informações.",
                color: "bg-red-600 text-white",
                icon: Shield,
            };
        case "gestor":
            return {
                label: "Gestor",
                description: "Acesso total apenas ao seu próprio departamento, podendo visualizar todas as atividades e demandas do seu setor.",
                color: "bg-blue-600 text-white",
                icon: UserCog,
            };
        case "colaborador":
            return {
                label: "Colaborador",
                description: "Acesso apenas às tarefas que estão envolvidas dentro do seu departamento ou as que foram atribuídas diretamente a ele.",
                color: "bg-green-600 text-white",
                icon: UserIcon,
            };
        default:
            return {
                label: role,
                description: "",
                color: "bg-gray-600 text-white",
                icon: UserIcon,
            };
    }
};

const getInitials = (name: string) => {
    return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
};

// Schema de validação para criação de usuário com múltiplos departamentos
const createUserSchema = z.object({
    firstName: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
    lastName: z.string().min(2, "Sobrenome deve ter pelo menos 2 caracteres"),
    email: z.string().email("Email inválido"),
    password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
    department_ids: z.array(z.string()).optional(),
    role: z.enum(["admin", "gestor", "colaborador"], {
        required_error: "Selecione um tipo de usuário",
    }),
});

// Schema de validação para edição de usuário
const editUserSchema = z.object({
    fullName: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
    email: z.string().email("Email inválido"),
    role: z.enum(["admin", "gestor", "colaborador"], {
        required_error: "Selecione um tipo de usuário",
    }),
    password: z.string().optional().refine((val) => !val || val.length >= 6, {
        message: "Senha deve ter pelo menos 6 caracteres",
    }),
});

export const TeamTabContent = () => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { selectedCompanyId } = useAuth();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
    const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
    const [editDepartments, setEditDepartments] = useState<string[]>([]);
    const [editCompanies, setEditCompanies] = useState<string[]>([]);
    const [editProjects, setEditProjects] = useState<string[]>([]);
    const [editingMember, setEditingMember] = useState<TeamMember | null>(null);

    // Form para criar
    const form = useForm<z.infer<typeof createUserSchema>>({
        resolver: zodResolver(createUserSchema),
        defaultValues: {
            firstName: "",
            lastName: "",
            email: "",
            password: "",
            department_ids: [],
            role: "colaborador",
        },
    });

    // Buscar todas as empresas que o admin tem acesso
    const { data: companies } = useQuery({
        queryKey: ["all-companies"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("companies")
                .select("id, name")
                .order("name");
            if (error) throw error;
            return data;
        },
    });

    // Buscar departamentos de todas as empresas selecionadas
    const { data: allDepartments } = useQuery({
        queryKey: ["all-departments-for-companies", selectedCompanies],
        queryFn: async () => {
            if (selectedCompanies.length === 0) return [];
            const { data, error } = await supabase
                .from("departments")
                .select("id, name, company_id, companies:company_id(name)")
                .in("company_id", selectedCompanies)
                .order("name");
            if (error) throw error;
            return data;
        },
        enabled: selectedCompanies.length > 0,
    });

    // Form para editar
    const editForm = useForm<z.infer<typeof editUserSchema>>({
        resolver: zodResolver(editUserSchema),
        defaultValues: {
            fullName: "",
            email: "",
            role: "colaborador",
            password: "",
        },
    });

    // Atualizar form quando membro é selecionado para edição
    useEffect(() => {
        if (editingMember) {
            editForm.reset({
                fullName: editingMember.full_name,
                email: editingMember.email,
                role: editingMember.role,
                password: "",
            });
            setEditDepartments(editingMember.departments.map(d => d.id));
            setEditCompanies(editingMember.companies.map(c => c.id));
            setEditProjects(editingMember.projects.map(p => p.id));
        }
    }, [editingMember, editForm]);

    // Buscar departamentos
    const { data: departments } = useQuery({
        queryKey: ["departments", selectedCompanyId],
        queryFn: async () => {
            if (!selectedCompanyId) return [];
            const { data, error } = await supabase
                .from("departments")
                .select("*")
                .eq("company_id", selectedCompanyId)
                .order("name");
            if (error) throw error;
            return data;
        },
        enabled: !!selectedCompanyId,
    });

    // Buscar projetos da empresa
    const { data: projects } = useQuery({
        queryKey: ["projects-for-team", selectedCompanyId],
        queryFn: async () => {
            if (!selectedCompanyId) return [];
            const { data, error } = await supabase
                .from("projects")
                .select("id, name")
                .eq("company_id", selectedCompanyId)
                .eq("status", "ativo")
                .order("name");
            if (error) throw error;
            return data;
        },
        enabled: !!selectedCompanyId,
    });

    // Buscar membros da equipe combinando profiles, user_companies, user_departments e project_members
    const { data: teamMembers, isLoading, error } = useQuery({
        queryKey: ["team-members", selectedCompanyId],
        queryFn: async () => {
            if (!selectedCompanyId) return [];

            // Buscar usuários da empresa
            const { data: companyUsers, error: companyError } = await supabase
                .from("user_companies")
                .select("user_id, role")
                .eq("company_id", selectedCompanyId);

            if (companyError) throw companyError;

            if (!companyUsers || companyUsers.length === 0) return [];

            const userIds = companyUsers.map(u => u.user_id);

            // Buscar perfis
            const { data: profiles, error: profilesError } = await supabase
                .from("profiles")
                .select("id, full_name, email, avatar_url")
                .in("id", userIds);

            if (profilesError) throw profilesError;

            // Buscar departamentos dos usuários (apenas da empresa selecionada)
            const { data: userDepts, error: deptsError } = await supabase
                .from("user_departments")
                .select(`
                    user_id,
                    department_id,
                    department:departments!inner(id, name, company_id)
                `)
                .in("user_id", userIds)
                .eq("department.company_id", selectedCompanyId);

            if (deptsError) throw deptsError;

            // Buscar empresas dos usuários
            const { data: userComps, error: compsError } = await supabase
                .from("user_companies")
                .select(`
                    user_id,
                    company_id,
                    company:companies(id, name)
                `)
                .in("user_id", userIds);

            if (compsError) throw compsError;

            // Buscar projetos dos usuários
            const { data: userProjects, error: projectsError } = await supabase
                .from("project_members")
                .select(`
                    user_id,
                    project_id,
                    project:projects(id, name)
                `)
                .in("user_id", userIds);

            if (projectsError) throw projectsError;

            // Combinar dados - agora com múltiplos departamentos, empresas e projetos
            const members: TeamMember[] = (profiles || []).map(profile => {
                const companyUser = companyUsers.find(u => u.user_id === profile.id);
                const userDepartments = userDepts?.filter(d => d.user_id === profile.id) || [];
                const userCompanies = userComps?.filter(c => c.user_id === profile.id) || [];
                const userProjectsList = userProjects?.filter(p => p.user_id === profile.id) || [];
                
                return {
                    id: profile.id,
                    full_name: profile.full_name,
                    email: profile.email,
                    avatar_url: profile.avatar_url,
                    role: (companyUser?.role as "admin" | "gestor" | "colaborador") || "colaborador",
                    departments: userDepartments
                        .map(d => d.department as { id: string; name: string })
                        .filter(Boolean),
                    companies: userCompanies
                        .map(c => c.company as { id: string; name: string })
                        .filter(Boolean),
                    projects: userProjectsList
                        .map(p => p.project as { id: string; name: string })
                        .filter(Boolean),
                };
            });

            return members;
        },
        enabled: !!selectedCompanyId,
    });

    // Mutation para criar usuário via Edge Function
    const createUserMutation = useMutation({
        mutationFn: async (values: z.infer<typeof createUserSchema>) => {
            if (selectedCompanies.length === 0) throw new Error("Selecione pelo menos uma empresa");

            const { data: sessionData } = await supabase.auth.getSession();
            if (!sessionData.session) throw new Error("Usuário não autenticado");

            const response = await supabase.functions.invoke("create-team-member", {
                body: {
                    email: values.email,
                    fullName: `${values.firstName} ${values.lastName}`,
                    companyIds: selectedCompanies,
                    role: values.role,
                    departmentIds: selectedDepartments,
                    password: values.password,
                },
            });

            if (response.error) {
                throw new Error(response.error.message || "Erro ao criar usuário");
            }

            if (response.data?.error) {
                throw new Error(response.data.error);
            }

            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["team-members"] });
            toast({
                title: "Usuário criado com sucesso!",
                description: "O novo membro foi adicionado à equipe.",
            });
            setDialogOpen(false);
            form.reset();
            setSelectedDepartments([]);
            setSelectedCompanies([]);
        },
        onError: (error: any) => {
            toast({
                title: "Erro ao criar usuário",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    // Mutation para editar usuário via Edge Function
    const updateUserMutation = useMutation({
        mutationFn: async (values: z.infer<typeof editUserSchema>) => {
            if (!selectedCompanyId || !editingMember) throw new Error("Dados incompletos");

            const { data: sessionData } = await supabase.auth.getSession();
            if (!sessionData.session) throw new Error("Usuário não autenticado");

            const response = await supabase.functions.invoke("update-team-member", {
                body: {
                    userId: editingMember.id,
                    companyId: selectedCompanyId,
                    role: values.role,
                    fullName: values.fullName,
                    email: values.email,
                    password: values.password || undefined,
                    departmentIds: editDepartments,
                    companyIds: editCompanies,
                },
            });

            if (response.error) {
                throw new Error(response.error.message || "Erro ao atualizar usuário");
            }

            if (response.data?.error) {
                throw new Error(response.data.error);
            }

            // Atualizar projetos do usuário (se não for admin)
            if (values.role !== 'admin') {
                // Remover projetos antigos
                const { error: deleteError } = await supabase
                    .from("project_members")
                    .delete()
                    .eq("user_id", editingMember.id);

                if (deleteError) {
                    console.error("Error deleting old project memberships:", deleteError);
                }

                // Adicionar novos projetos
                if (editProjects.length > 0) {
                    const projectMemberships = editProjects.map(projectId => ({
                        project_id: projectId,
                        user_id: editingMember.id
                    }));

                    const { error: insertError } = await supabase
                        .from("project_members")
                        .insert(projectMemberships);

                    if (insertError) {
                        console.error("Error adding project memberships:", insertError);
                    }
                }
            }

            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["team-members"] });
            queryClient.invalidateQueries({ queryKey: ["projects"] });
            toast({
                title: "Usuário atualizado com sucesso!",
                description: "As alterações foram salvas.",
            });
            setEditDialogOpen(false);
            setEditingMember(null);
            editForm.reset();
            setEditDepartments([]);
            setEditCompanies([]);
            setEditProjects([]);
        },
        onError: (error: any) => {
            toast({
                title: "Erro ao atualizar usuário",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const onSubmit = (values: z.infer<typeof createUserSchema>) => {
        createUserMutation.mutate({ ...values, department_ids: selectedDepartments });
    };

    const onEditSubmit = (values: z.infer<typeof editUserSchema>) => {
        updateUserMutation.mutate(values);
    };

    const openEditDialog = (member: TeamMember) => {
        setEditingMember(member);
        setEditDialogOpen(true);
    };

    // Estatísticas
    const stats = {
        total: teamMembers?.length || 0,
        admins: teamMembers?.filter((m) => m.role === "admin").length || 0,
        gestores: teamMembers?.filter((m) => m.role === "gestor").length || 0,
        colaboradores: teamMembers?.filter((m) => m.role === "colaborador").length || 0,
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div>
                    <h2 className="text-2xl font-bold mb-2">Equipe</h2>
                    <p className="text-muted-foreground">
                        Gerencie os membros da sua equipe e suas permissões
                    </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <Skeleton key={i} className="h-48" />
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-6">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        Erro ao carregar membros da equipe: {(error as Error).message}
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold mb-2">Equipe</h2>
                    <p className="text-muted-foreground">
                        Gerencie os membros da sua equipe e suas permissões
                    </p>
                </div>

                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Novo Usuário
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>Criar Novo Usuário</DialogTitle>
                            <DialogDescription>
                                Preencha os dados do novo membro da equipe
                            </DialogDescription>
                        </DialogHeader>

                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="firstName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Nome</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="João" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="lastName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Sobrenome</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Silva" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Email</FormLabel>
                                            <FormControl>
                                                <Input type="email" placeholder="joao.silva@empresa.com" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="password"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Senha</FormLabel>
                                            <FormControl>
                                                <Input type="password" placeholder="Mínimo 6 caracteres" {...field} />
                                            </FormControl>
                                            <FormDescription>
                                                Defina a senha inicial do usuário
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormItem>
                                    <FormLabel>Empresas</FormLabel>
                                    <FormDescription>
                                        Selecione uma ou mais empresas para o usuário
                                    </FormDescription>
                                    <MultiSelect
                                        options={companies?.map(c => ({ value: c.id, label: c.name })) || []}
                                        selected={selectedCompanies}
                                        onChange={setSelectedCompanies}
                                        placeholder="Selecione as empresas..."
                                        emptyMessage="Nenhuma empresa cadastrada"
                                    />
                                </FormItem>

                                {selectedCompanies.length > 0 && (
                                    <FormItem>
                                        <FormLabel>Departamentos</FormLabel>
                                        <FormDescription>
                                            Selecione um ou mais departamentos para o usuário
                                        </FormDescription>
                                        <MultiSelect
                                            options={allDepartments?.map(d => ({ 
                                                value: d.id, 
                                                label: d.name,
                                                description: (d.companies as any)?.name
                                            })) || []}
                                            selected={selectedDepartments}
                                            onChange={setSelectedDepartments}
                                            placeholder="Selecione os departamentos..."
                                            emptyMessage="Nenhum departamento nas empresas selecionadas"
                                        />
                                    </FormItem>
                                )}

                                <FormField
                                    control={form.control}
                                    name="role"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Tipo de Usuário</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Selecione o tipo" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="colaborador">
                                                        <div className="flex items-center gap-2">
                                                            <UserIcon className="h-4 w-4" />
                                                            Colaborador
                                                        </div>
                                                    </SelectItem>
                                                    <SelectItem value="gestor">
                                                        <div className="flex items-center gap-2">
                                                            <UserCog className="h-4 w-4" />
                                                            Gestor
                                                        </div>
                                                    </SelectItem>
                                                    <SelectItem value="admin">
                                                        <div className="flex items-center gap-2">
                                                            <Shield className="h-4 w-4" />
                                                            Admin
                                                        </div>
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormDescription>
                                                {field.value && getRoleInfo(field.value).description}
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <DialogFooter>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            setDialogOpen(false);
                                            setSelectedDepartments([]);
                                        }}
                                    >
                                        Cancelar
                                    </Button>
                                    <Button type="submit" disabled={createUserMutation.isPending}>
                                        {createUserMutation.isPending ? "Criando..." : "Criar Usuário"}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.total}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-red-600">Admins</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.admins}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-blue-600">Gestores</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.gestores}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-green-600">Colaboradores</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.colaboradores}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Legenda de papéis */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Legenda de Papéis</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                        {["admin", "gestor", "colaborador"].map((role) => {
                            const roleInfo = getRoleInfo(role);
                            const RoleIcon = roleInfo.icon;
                            return (
                                <div key={role} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                                    <Badge className={roleInfo.color}>
                                        <RoleIcon className="h-3 w-3 mr-1" />
                                        {roleInfo.label}
                                    </Badge>
                                    <p className="text-xs text-muted-foreground">
                                        {roleInfo.description}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {teamMembers?.map((member) => {
                    const roleInfo = getRoleInfo(member.role);
                    const RoleIcon = roleInfo.icon;

                    return (
                        <Card key={member.id} className="hover:shadow-md transition-shadow">
                            <CardHeader className="pb-2">
                                <div className="flex items-start gap-4">
                                    <Avatar className="h-12 w-12">
                                        <AvatarImage src={member.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.full_name}`} />
                                        <AvatarFallback>{getInitials(member.full_name)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <CardTitle className="text-base truncate">{member.full_name}</CardTitle>
                                        <CardDescription className="flex items-center gap-1 text-xs truncate">
                                            <Mail className="h-3 w-3" />
                                            {member.email}
                                        </CardDescription>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => openEditDialog(member)}
                                        className="h-8 w-8"
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Badge className={roleInfo.color}>
                                        <RoleIcon className="h-3 w-3 mr-1" />
                                        {roleInfo.label}
                                    </Badge>
                                </div>
                                {member.departments.length > 0 && (
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground font-medium">
                                            Departamentos:
                                        </p>
                                        <div className="flex flex-wrap gap-1">
                                            {member.departments.map((dept) => (
                                                <Badge key={dept.id} variant="outline" className="text-xs">
                                                    {dept.name}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {member.role !== 'admin' && member.projects.length > 0 && (
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground font-medium">
                                            Projetos:
                                        </p>
                                        <div className="flex flex-wrap gap-1">
                                            {member.projects.map((project) => (
                                                <Badge key={project.id} variant="secondary" className="text-xs">
                                                    {project.name}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {member.departments.length === 0 && (
                                    <p className="text-xs text-muted-foreground">
                                        Nenhum departamento atribuído
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}

                {teamMembers?.length === 0 && (
                    <div className="col-span-full text-center py-8 text-muted-foreground">
                        Nenhum membro encontrado na equipe
                    </div>
                )}
            </div>

            {/* Dialog de Edição */}
            <Dialog open={editDialogOpen} onOpenChange={(open) => {
                setEditDialogOpen(open);
                if (!open) {
                    setEditingMember(null);
                    setEditDepartments([]);
                    setEditCompanies([]);
                    setEditProjects([]);
                }
            }}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Editar Usuário</DialogTitle>
                        <DialogDescription>
                            Altere os dados do membro da equipe
                        </DialogDescription>
                    </DialogHeader>

                    <Form {...editForm}>
                        <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                            <FormField
                                control={editForm.control}
                                name="fullName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nome Completo</FormLabel>
                                        <FormControl>
                                            <Input placeholder="João Silva" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={editForm.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center gap-2">
                                            <Mail className="h-4 w-4" />
                                            E-mail
                                        </FormLabel>
                                        <FormControl>
                                            <Input 
                                                type="email" 
                                                placeholder="email@exemplo.com" 
                                                {...field} 
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormItem>
                                <FormLabel>Empresas</FormLabel>
                                <FormDescription>
                                    Selecione uma ou mais empresas
                                </FormDescription>
                                <MultiSelect
                                    options={companies?.map(c => ({ value: c.id, label: c.name })) || []}
                                    selected={editCompanies}
                                    onChange={setEditCompanies}
                                    placeholder="Selecione as empresas..."
                                    emptyMessage="Nenhuma empresa cadastrada"
                                />
                            </FormItem>

                            <FormItem>
                                <FormLabel>Departamentos</FormLabel>
                                <FormDescription>
                                    Selecione um ou mais departamentos
                                </FormDescription>
                                <MultiSelect
                                    options={departments?.map(d => ({ value: d.id, label: d.name })) || []}
                                    selected={editDepartments}
                                    onChange={setEditDepartments}
                                    placeholder="Selecione os departamentos..."
                                    emptyMessage="Nenhum departamento cadastrado"
                                />
                            </FormItem>

                            <FormField
                                control={editForm.control}
                                name="role"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Tipo de Usuário</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione o tipo" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="admin">
                                                    <div className="flex items-center gap-2">
                                                        <Shield className="h-4 w-4 text-red-600" />
                                                        Admin
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="gestor">
                                                    <div className="flex items-center gap-2">
                                                        <UserCog className="h-4 w-4 text-blue-600" />
                                                        Gestor
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="colaborador">
                                                    <div className="flex items-center gap-2">
                                                        <UserIcon className="h-4 w-4 text-green-600" />
                                                        Colaborador
                                                    </div>
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Seleção de Projetos - apenas para não-admin */}
                            {editForm.watch('role') !== 'admin' && (
                                <FormItem>
                                    <FormLabel className="flex items-center gap-2">
                                        <FolderKanban className="h-4 w-4" />
                                        Projetos com Acesso
                                    </FormLabel>
                                    <FormDescription>
                                        Selecione os projetos que este usuário pode visualizar
                                    </FormDescription>
                                    <MultiSelect
                                        options={projects?.map(p => ({ value: p.id, label: p.name })) || []}
                                        selected={editProjects}
                                        onChange={setEditProjects}
                                        placeholder="Selecione os projetos..."
                                        emptyMessage="Nenhum projeto cadastrado"
                                    />
                                </FormItem>
                            )}

                            <FormField
                                control={editForm.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center gap-2">
                                            <Key className="h-4 w-4" />
                                            Nova Senha
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                type="password"
                                                placeholder="Deixe em branco para manter a atual"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Mínimo 6 caracteres. Deixe vazio para não alterar.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setEditDialogOpen(false);
                                        setEditingMember(null);
                                        setEditDepartments([]);
                                        setEditCompanies([]);
                                        setEditProjects([]);
                                    }}
                                >
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={updateUserMutation.isPending}>
                                    {updateUserMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </div>
    );
};
