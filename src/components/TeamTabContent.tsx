import { Users, Mail, Shield, UserCog, User as UserIcon, Plus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
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
import { useAuth } from "@/hooks/useAuth";

interface TeamMember {
    id: string;
    full_name: string;
    email: string;
    role: "admin" | "gestor" | "colaborador";
    department_id: string | null;
    department?: {
        id: string;
        name: string;
    } | null;
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
    department_id: z.string().optional(),
    role: z.enum(["admin", "gestor", "colaborador"], {
        required_error: "Selecione um tipo de usuário",
    }),
});

export const TeamTabContent = () => {
    const { toast } = useToast();
    const { selectedCompanyId } = useAuth();
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

    // Buscar membros da equipe combinando profiles, user_roles e user_departments
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
                .select("id, full_name, email")
                .in("id", userIds);

            if (profilesError) throw profilesError;

            // Buscar departamentos dos usuários
            const { data: userDepts, error: deptsError } = await supabase
                .from("user_departments")
                .select(`
                    user_id,
                    department_id,
                    department:departments(id, name)
                `)
                .in("user_id", userIds);

            if (deptsError) throw deptsError;

            // Combinar dados
            const members: TeamMember[] = (profiles || []).map(profile => {
                const companyUser = companyUsers.find(u => u.user_id === profile.id);
                const userDept = userDepts?.find(d => d.user_id === profile.id);

                return {
                    id: profile.id,
                    full_name: profile.full_name,
                    email: profile.email,
                    role: (companyUser?.role as "admin" | "gestor" | "colaborador") || "colaborador",
                    department_id: userDept?.department_id || null,
                    department: userDept?.department as { id: string; name: string } | null,
                };
            });

            return members;
        },
        enabled: !!selectedCompanyId,
    });

    const onSubmit = async (values: z.infer<typeof createUserSchema>) => {
        toast({
            title: "Funcionalidade em desenvolvimento",
            description: "A criação de usuários será implementada em breve.",
        });
        setDialogOpen(false);
        form.reset();
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
                                    <Button type="submit">
                                        Criar Usuário
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

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {teamMembers?.map((member) => {
                    const roleInfo = getRoleInfo(member.role);
                    const RoleIcon = roleInfo.icon;

                    return (
                        <Card key={member.id} className="hover:shadow-md transition-shadow">
                            <CardHeader className="pb-2">
                                <div className="flex items-start gap-4">
                                    <Avatar className="h-12 w-12">
                                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${member.full_name}`} />
                                        <AvatarFallback>{getInitials(member.full_name)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <CardTitle className="text-base truncate">{member.full_name}</CardTitle>
                                        <CardDescription className="flex items-center gap-1 text-xs truncate">
                                            <Mail className="h-3 w-3" />
                                            {member.email}
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Badge className={roleInfo.color}>
                                        <RoleIcon className="h-3 w-3 mr-1" />
                                        {roleInfo.label}
                                    </Badge>
                                </div>
                                {member.department && (
                                    <p className="text-xs text-muted-foreground">
                                        Departamento: {member.department.name}
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
        </div>
    );
};
