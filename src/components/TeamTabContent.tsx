import { Users, Mail, Shield, UserCog, User as UserIcon, Plus } from "lucide-react";
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
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface TeamMember {
    id: string;
    full_name: string;
    role: "admin" | "gestor" | "colaborador";
    department_id: string | null;
    department?: {
        id: string;
        name: string;
    };
    email?: string;
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

// Schema de validação para criação de usuário
const createUserSchema = z.object({
    firstName: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
    lastName: z.string().min(2, "Sobrenome deve ter pelo menos 2 caracteres"),
    email: z.string().email("Email inválido"),
    department_id: z.string().min(1, "Selecione um departamento"),
    role: z.enum(["admin", "gestor", "colaborador"], {
        required_error: "Selecione um tipo de usuário",
    }),
});

export const TeamTabContent = () => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [dialogOpen, setDialogOpen] = useState(false);

    // Form
    const form = useForm<z.infer<typeof createUserSchema>>({
        resolver: zodResolver(createUserSchema),
        defaultValues: {
            firstName: "",
            lastName: "",
            email: "",
            department_id: "",
            role: "colaborador",
        },
    });

    // Buscar departamentos
    const { data: departments } = useQuery({
        queryKey: ["departments"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("departments")
                .select("*")
                .order("name");
            if (error) throw error;
            return data;
        },
    });

    // Buscar membros da equipe do banco de dados
    const { data: teamMembers, isLoading, error } = useQuery({
        queryKey: ["team-members"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("profiles")
                .select(`
          id,
          full_name,
          role,
          department_id,
          department:departments(id, name)
        `)
                .order("full_name");

            if (error) throw error;
            return data as TeamMember[];
        },
    });

    // Buscar emails dos usuários
    const { data: users } = useQuery({
        queryKey: ["auth-users"],
        queryFn: async () => {
            const { data: { users }, error } = await supabase.auth.admin.listUsers();
            if (error) throw error;
            return users;
        },
    });

    // Mutation para criar usuário
    const createUserMutation = useMutation({
        mutationFn: async (values: z.infer<typeof createUserSchema>) => {
            // 1. Criar usuário no Auth
            const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                email: values.email,
                email_confirm: true,
                user_metadata: {
                    full_name: `${values.firstName} ${values.lastName}`,
                },
            });

            if (authError) throw authError;

            // 2. Criar/atualizar perfil
            const { error: profileError } = await supabase
                .from("profiles")
                .upsert({
                    id: authData.user.id,
                    full_name: `${values.firstName} ${values.lastName}`,
                    department_id: values.department_id,
                    role: values.role,
                });

            if (profileError) throw profileError;

            return authData.user;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["team-members"] });
            queryClient.invalidateQueries({ queryKey: ["auth-users"] });
            toast({
                title: "Usuário criado com sucesso!",
                description: "O novo membro foi adicionado à equipe.",
            });
            setDialogOpen(false);
            form.reset();
        },
        onError: (error: any) => {
            toast({
                title: "Erro ao criar usuário",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const onSubmit = (values: z.infer<typeof createUserSchema>) => {
        createUserMutation.mutate(values);
    };

    // Combinar dados de profiles com emails
    const membersWithEmails = teamMembers?.map((member) => {
        const user = users?.find((u) => u.id === member.id);
        return {
            ...member,
            email: user?.email,
        };
    });

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
                        Erro ao carregar membros da equipe: {error.message}
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
                                            <FormDescription>
                                                O usuário receberá um email para definir a senha
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="department_id"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Departamento</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Selecione o departamento" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {departments?.map((dept) => (
                                                        <SelectItem key={dept.id} value={dept.id}>
                                                            {dept.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

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
                                        onClick={() => setDialogOpen(false)}
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
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Total de Membros
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{stats.total}</div>
                    </CardContent>
                </Card>

                <Card className="border-red-200 bg-red-50/50">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-red-700">
                            Administradores
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-red-700">{stats.admins}</div>
                    </CardContent>
                </Card>

                <Card className="border-blue-200 bg-blue-50/50">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-blue-700">
                            Gestores
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-blue-700">{stats.gestores}</div>
                    </CardContent>
                </Card>

                <Card className="border-green-200 bg-green-50/50">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-green-700">
                            Colaboradores
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-green-700">{stats.colaboradores}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Cards de Informação sobre Roles */}
            <div className="grid gap-4 md:grid-cols-3">
                {["admin", "gestor", "colaborador"].map((role) => {
                    const roleInfo = getRoleInfo(role);
                    const Icon = roleInfo.icon;
                    return (
                        <Card key={role} className="hover:shadow-lg transition-shadow">
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${roleInfo.color}`}>
                                        <Icon className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <CardTitle>{roleInfo.label}</CardTitle>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <CardDescription className="text-sm leading-relaxed">
                                    {roleInfo.description}
                                </CardDescription>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Lista de Membros */}
            <div>
                <h2 className="text-2xl font-bold mb-4">Membros da Equipe</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {membersWithEmails?.map((member) => {
                        const roleInfo = getRoleInfo(member.role);
                        const Icon = roleInfo.icon;
                        return (
                            <Card
                                key={member.id}
                                className="hover:shadow-lg transition-all hover-scale cursor-pointer animate-fade-in"
                            >
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-12 w-12">
                                                <AvatarImage
                                                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${member.full_name}`}
                                                />
                                                <AvatarFallback>{getInitials(member.full_name)}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <CardTitle className="text-lg">{member.full_name}</CardTitle>
                                                <p className="text-sm text-muted-foreground">
                                                    {member.department?.name || "Sem departamento"}
                                                </p>
                                            </div>
                                        </div>
                                        <Badge className={roleInfo.color}>
                                            <Icon className="h-3 w-3 mr-1" />
                                            {roleInfo.label}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    {member.email && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <Mail className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-muted-foreground truncate">{member.email}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 text-sm">
                                        <Users className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-muted-foreground">
                                            {member.department?.name || "Sem departamento"}
                                        </span>
                                    </div>
                                    <div className="pt-2 border-t">
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            {roleInfo.description}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>

            {/* Legenda de Permissões */}
            <Card>
                <CardHeader>
                    <CardTitle>Níveis de Permissão</CardTitle>
                    <CardDescription>
                        Entenda o que cada tipo de usuário pode fazer no sistema
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <Badge className="bg-red-600 text-white mt-1">
                                <Shield className="h-3 w-3 mr-1" />
                                Admin
                            </Badge>
                            <div className="flex-1">
                                <p className="font-medium">Administrador</p>
                                <p className="text-sm text-muted-foreground">
                                    Acesso total a todos os departamentos e visão diversificada de cada departamento e suas atividades, podendo ver cada demanda e suas informações.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <Badge className="bg-blue-600 text-white mt-1">
                                <UserCog className="h-3 w-3 mr-1" />
                                Gestor
                            </Badge>
                            <div className="flex-1">
                                <p className="font-medium">Gestor de Departamento</p>
                                <p className="text-sm text-muted-foreground">
                                    Acesso total apenas ao seu próprio departamento, podendo visualizar todas as atividades e demandas do seu setor.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <Badge className="bg-green-600 text-white mt-1">
                                <UserIcon className="h-3 w-3 mr-1" />
                                Colaborador
                            </Badge>
                            <div className="flex-1">
                                <p className="font-medium">Colaborador</p>
                                <p className="text-sm text-muted-foreground">
                                    Acesso apenas às tarefas que estão envolvidas dentro do seu departamento ou as que foram atribuídas diretamente a ele.
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
