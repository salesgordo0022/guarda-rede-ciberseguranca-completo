import { Users, Mail, Shield, UserCog, User as UserIcon, Plus, Pencil, Key } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface TeamMember {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
    role: "admin" | "gestor" | "colaborador";
    departments: { id: string; name: string }[];
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
    const [editDepartments, setEditDepartments] = useState<string[]>([]);
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

    // Form para editar
    const editForm = useForm<z.infer<typeof editUserSchema>>({
        resolver: zodResolver(editUserSchema),
        defaultValues: {
            fullName: "",
            role: "colaborador",
            password: "",
        },
    });

    // Atualizar form quando membro é selecionado para edição
    useEffect(() => {
        if (editingMember) {
            editForm.reset({
                fullName: editingMember.full_name,
                role: editingMember.role,
                password: "",
            });
            setEditDepartments(editingMember.departments.map(d => d.id));
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

    // Buscar membros da equipe combinando profiles, user_companies e user_departments
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

            // Buscar departamentos dos usuários (um usuário pode ter vários)
            const { data: userDepts, error: deptsError } = await supabase
                .from("user_departments")
                .select(`
                    user_id,
                    department_id,
                    department:departments(id, name)
                `)
                .in("user_id", userIds);

            if (deptsError) throw deptsError;

            // Combinar dados - agora com múltiplos departamentos
            const members: TeamMember[] = (profiles || []).map(profile => {
                const companyUser = companyUsers.find(u => u.user_id === profile.id);
                const userDepartments = userDepts?.filter(d => d.user_id === profile.id) || [];
                
                return {
                    id: profile.id,
                    full_name: profile.full_name,
                    email: profile.email,
                    avatar_url: profile.avatar_url,
                    role: (companyUser?.role as "admin" | "gestor" | "colaborador") || "colaborador",
                    departments: userDepartments
                        .map(d => d.department as { id: string; name: string })
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
            if (!selectedCompanyId) throw new Error("Nenhuma empresa selecionada");

            const { data: sessionData } = await supabase.auth.getSession();
            if (!sessionData.session) throw new Error("Usuário não autenticado");

            const response = await supabase.functions.invoke("create-team-member", {
                body: {
                    email: values.email,
                    fullName: `${values.firstName} ${values.lastName}`,
                    companyId: selectedCompanyId,
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
                    password: values.password || undefined,
                    departmentIds: editDepartments,
                },
            });

            if (response.error) {
                throw new Error(response.error.message || "Erro ao atualizar usuário");
            }

            if (response.data?.error) {
                throw new Error(response.data.error);
            }

            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["team-members"] });
            toast({
                title: "Usuário atualizado com sucesso!",
                description: "As alterações foram salvas.",
            });
            setEditDialogOpen(false);
            setEditingMember(null);
            editForm.reset();
            setEditDepartments([]);
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

    const handleDepartmentToggle = (deptId: string) => {
        setSelectedDepartments(prev => 
            prev.includes(deptId) 
                ? prev.filter(id => id !== deptId)
                : [...prev, deptId]
        );
    };

    const handleEditDepartmentToggle = (deptId: string) => {
        setEditDepartments(prev => 
            prev.includes(deptId) 
                ? prev.filter(id => id !== deptId)
                : [...prev, deptId]
        );
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
                                    <FormLabel>Departamentos</FormLabel>
                                    <FormDescription>
                                        Selecione um ou mais departamentos para o usuário
                                    </FormDescription>
                                    <div className="grid grid-cols-2 gap-2 mt-2 max-h-40 overflow-y-auto border rounded-md p-3">
                                        {departments?.map((dept) => (
                                            <div key={dept.id} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`dept-${dept.id}`}
                                                    checked={selectedDepartments.includes(dept.id)}
                                                    onCheckedChange={() => handleDepartmentToggle(dept.id)}
                                                />
                                                <label
                                                    htmlFor={`dept-${dept.id}`}
                                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                                >
                                                    {dept.name}
                                                </label>
                                            </div>
                                        ))}
                                        {(!departments || departments.length === 0) && (
                                            <p className="text-sm text-muted-foreground col-span-2">
                                                Nenhum departamento cadastrado
                                            </p>
                                        )}
                                    </div>
                                </FormItem>

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

                            <FormItem>
                                <FormLabel>Departamentos</FormLabel>
                                <FormDescription>
                                    Selecione um ou mais departamentos
                                </FormDescription>
                                <div className="grid grid-cols-2 gap-2 mt-2 max-h-40 overflow-y-auto border rounded-md p-3">
                                    {departments?.map((dept) => (
                                        <div key={dept.id} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`edit-dept-${dept.id}`}
                                                checked={editDepartments.includes(dept.id)}
                                                onCheckedChange={() => handleEditDepartmentToggle(dept.id)}
                                            />
                                            <label
                                                htmlFor={`edit-dept-${dept.id}`}
                                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                            >
                                                {dept.name}
                                            </label>
                                        </div>
                                    ))}
                                    {(!departments || departments.length === 0) && (
                                        <p className="text-sm text-muted-foreground col-span-2">
                                            Nenhum departamento cadastrado
                                        </p>
                                    )}
                                </div>
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
