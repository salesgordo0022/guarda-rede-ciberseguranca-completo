import { Settings as SettingsIcon, Plus, Pencil, Trash2, Building2, Palette, Check, History, Users, User, Briefcase } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { useSystemSettings, CategoryColors, Theme } from "@/hooks/useSystemSettings";
import { useTasks } from "@/hooks/useTasks";
import { TaskHistoryTable } from "@/components/TaskHistoryTable";
import { TeamTabContent } from "@/components/TeamTabContent";
import { ProfileSettings } from "@/components/ProfileSettings";
import { CompanyManagement } from "@/components/CompanyManagement";
import { useAuth } from "@/hooks/useAuth";

interface Department {
    id: string;
    name: string;
    description: string | null;
    created_at: string;
    updated_at: string;
}

// Schema de validação para departamento
const departmentSchema = z.object({
    name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
    description: z.string().optional(),
});

// Temas disponíveis
const availableThemes: Theme[] = [
    { name: "light", label: "Claro" },
    { name: "dark", label: "Escuro" },
    { name: "blue", label: "Azul" },
    { name: "black", label: "Preto" },
];

const Settings = () => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
    const [deletingDepartment, setDeletingDepartment] = useState<Department | null>(null);
    const { selectedCompanyId, isAdmin, isGestor } = useAuth();
    const canManageTeam = isAdmin || isGestor; // Admin e Gestor podem gerenciar equipe e departamentos

    // Sistema de cores e tema
    const {
        categoryColors,
        theme,
        updateColors,
        updateTheme,
        isUpdatingColors,
        isUpdatingTheme
    } = useSystemSettings();

    const [colors, setColors] = useState<CategoryColors>({
        obligations: "#eab308",
        action: "#ea580c",
        attention: "#6b7280",
        pending: "#22c55e",
        completed: "#9333ea",
    });

    // Atualizar cores locais quando carregarem do banco
    useEffect(() => {
        if (categoryColors) {
            setColors(categoryColors);
        }
    }, [categoryColors]);

    const handleSaveColors = () => {
        updateColors(colors);
    };

    const handleThemeChange = (newTheme: Theme) => {
        updateTheme(newTheme);
    };

    // Form
    const form = useForm<z.infer<typeof departmentSchema>>({
        resolver: zodResolver(departmentSchema),
        defaultValues: {
            name: "",
            description: "",
        },
    });

    // Buscar departamentos
    const { data: departments, isLoading, error } = useQuery({
        queryKey: ["departments", selectedCompanyId],
        queryFn: async () => {
            if (!selectedCompanyId) return [];

            const { data, error } = await supabase
                .from("departments")
                .select("*")
                .eq("company_id", selectedCompanyId)
                .order("name");
            if (error) throw error;
            return data as Department[];
        },
        enabled: !!selectedCompanyId
    });

    // Mutation para criar departamento
    const { user } = useAuth();
    
    const createDepartmentMutation = useMutation({
        mutationFn: async (values: z.infer<typeof departmentSchema>) => {
            if (!selectedCompanyId) throw new Error("Nenhuma empresa selecionada");
            if (!user?.id) throw new Error("Usuário não autenticado");

            const { data, error } = await supabase
                .from("departments")
                .insert({
                    name: values.name,
                    description: values.description || null,
                    company_id: selectedCompanyId,
                    created_by: user.id
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["departments"] });
            queryClient.invalidateQueries({ queryKey: ["activities"] });
            toast({
                title: "Departamento criado!",
                description: "O novo departamento foi adicionado e sincronizado com as atividades.",
            });
            setDialogOpen(false);
            form.reset();
        },
        onError: (error: any) => {
            toast({
                title: "Erro ao criar departamento",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    // Mutation para atualizar departamento
    const updateDepartmentMutation = useMutation({
        mutationFn: async ({ id, values }: { id: string; values: z.infer<typeof departmentSchema> }) => {
            const { data, error } = await supabase
                .from("departments")
                .update({
                    name: values.name,
                    description: values.description || null,
                })
                .eq("id", id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["departments"] });
            queryClient.invalidateQueries({ queryKey: ["activities"] });
            queryClient.invalidateQueries({ queryKey: ["tasks"] });
            toast({
                title: "Departamento atualizado!",
                description: "As alterações foram sincronizadas com atividades e tarefas.",
            });
            setDialogOpen(false);
            setEditingDepartment(null);
            form.reset();
        },
        onError: (error: any) => {
            toast({
                title: "Erro ao atualizar departamento",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    // Mutation para deletar departamento
    const deleteDepartmentMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from("departments")
                .delete()
                .eq("id", id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["departments"] });
            queryClient.invalidateQueries({ queryKey: ["activities"] });
            toast({
                title: "Departamento excluído!",
                description: "O departamento foi removido e as atividades foram atualizadas.",
            });
            setDeletingDepartment(null);
        },
        onError: (error: any) => {
            toast({
                title: "Erro ao excluir departamento",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const onSubmit = (values: z.infer<typeof departmentSchema>) => {
        if (editingDepartment) {
            updateDepartmentMutation.mutate({ id: editingDepartment.id, values });
        } else {
            createDepartmentMutation.mutate(values);
        }
    };

    const handleEdit = (department: Department) => {
        setEditingDepartment(department);
        form.setValue("name", department.name);
        form.setValue("description", department.description || "");
        setDialogOpen(true);
    };

    const handleNewDepartment = () => {
        setEditingDepartment(null);
        form.reset();
        setDialogOpen(true);
    };

    if (isLoading) {
        return (
            <div className="p-6 space-y-6">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Configurações</h1>
                    <p className="text-muted-foreground">
                        Gerencie departamentos e personalize o sistema
                    </p>
                </div>
                <Skeleton className="h-96" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 space-y-6">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        Erro ao carregar configurações: {error.message}
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 space-y-4 md:space-y-6">
            <div>
                <h1 className="text-2xl md:text-3xl font-bold mb-2">Configurações</h1>
                <p className="text-sm md:text-base text-muted-foreground">
                    Gerencie departamentos e personalize o sistema
                </p>
            </div>

            <Tabs defaultValue="profile" className="w-full">
                <TabsList className={`grid w-full max-w-4xl ${canManageTeam ? 'grid-cols-3 md:grid-cols-6' : 'grid-cols-3'} h-auto`}>
                    <TabsTrigger value="profile" className="flex-col md:flex-row gap-1 py-2 text-xs md:text-sm">
                        <User className="h-4 w-4" />
                        <span className="hidden sm:inline">Perfil</span>
                    </TabsTrigger>
                    {canManageTeam && (
                        <TabsTrigger value="companies" className="flex-col md:flex-row gap-1 py-2 text-xs md:text-sm">
                            <Briefcase className="h-4 w-4" />
                            <span className="hidden sm:inline">Empresas</span>
                        </TabsTrigger>
                    )}
                    {canManageTeam && (
                        <TabsTrigger value="departments" className="flex-col md:flex-row gap-1 py-2 text-xs md:text-sm">
                            <Building2 className="h-4 w-4" />
                            <span className="hidden sm:inline">Departamentos</span>
                        </TabsTrigger>
                    )}
                    <TabsTrigger value="appearance" className="flex-col md:flex-row gap-1 py-2 text-xs md:text-sm">
                        <Palette className="h-4 w-4" />
                        <span className="hidden sm:inline">Aparência</span>
                    </TabsTrigger>
                    {canManageTeam && (
                        <TabsTrigger value="team" className="flex-col md:flex-row gap-1 py-2 text-xs md:text-sm">
                            <Users className="h-4 w-4" />
                            <span className="hidden sm:inline">Equipe</span>
                        </TabsTrigger>
                    )}
                    <TabsTrigger value="history" className="flex-col md:flex-row gap-1 py-2 text-xs md:text-sm">
                        <History className="h-4 w-4" />
                        <span className="hidden sm:inline">Histórico</span>
                    </TabsTrigger>
                </TabsList>

                {/* Tab de Perfil */}
                <TabsContent value="profile" className="space-y-4">
                    <ProfileSettings />
                </TabsContent>

                {/* Tab de Empresas */}
                {canManageTeam && (
                <TabsContent value="companies" className="space-y-4">
                    <CompanyManagement />
                </TabsContent>
                )}

                {/* Tab de Departamentos */}
                {canManageTeam && (
                <TabsContent value="departments" className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold">Departamentos</h2>
                            <p className="text-muted-foreground">
                                Gerencie os departamentos da sua organização
                            </p>
                        </div>

                        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                            <DialogTrigger asChild>
                                <Button onClick={handleNewDepartment}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Novo Departamento
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[500px]">
                                <DialogHeader>
                                    <DialogTitle>
                                        {editingDepartment ? "Editar Departamento" : "Criar Novo Departamento"}
                                    </DialogTitle>
                                    <DialogDescription>
                                        {editingDepartment
                                            ? "Atualize as informações do departamento"
                                            : "Adicione um novo departamento à organização"}
                                    </DialogDescription>
                                </DialogHeader>

                                <Form {...form}>
                                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                        <FormField
                                            control={form.control}
                                            name="name"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Nome do Departamento</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Ex: TI, Financeiro, RH" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="description"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Descrição (Opcional)</FormLabel>
                                                    <FormControl>
                                                        <Textarea
                                                            placeholder="Descreva as responsabilidades do departamento..."
                                                            className="resize-none"
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                    <FormDescription>
                                                        Uma breve descrição sobre o departamento
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
                                                    setEditingDepartment(null);
                                                    form.reset();
                                                }}
                                            >
                                                Cancelar
                                            </Button>
                                            <Button
                                                type="submit"
                                                disabled={
                                                    createDepartmentMutation.isPending ||
                                                    updateDepartmentMutation.isPending
                                                }
                                            >
                                                {createDepartmentMutation.isPending ||
                                                    updateDepartmentMutation.isPending
                                                    ? "Salvando..."
                                                    : editingDepartment
                                                        ? "Atualizar"
                                                        : "Criar"}
                                            </Button>
                                        </DialogFooter>
                                    </form>
                                </Form>
                            </DialogContent>
                        </Dialog>
                    </div>

                    {departments && departments.length > 0 ? (
                        <Card>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[50px]">
                                            <Building2 className="h-4 w-4" />
                                        </TableHead>
                                        <TableHead>Nome</TableHead>
                                        <TableHead>Descrição</TableHead>
                                        <TableHead>Criado em</TableHead>
                                        <TableHead className="text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {departments.map((department) => (
                                        <TableRow key={department.id}>
                                            <TableCell>
                                                <div className="p-2 rounded-lg bg-primary/10 w-fit">
                                                    <Building2 className="h-4 w-4 text-primary" />
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-medium">{department.name}</TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {department.description || "-"}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {new Date(department.created_at).toLocaleDateString("pt-BR")}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex gap-2 justify-end">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleEdit(department)}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                        onClick={() => setDeletingDepartment(department)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Card>
                    ) : (
                        <Card className="p-12">
                            <div className="text-center space-y-3">
                                <Building2 className="h-12 w-12 mx-auto text-muted-foreground" />
                                <h3 className="text-lg font-semibold">Nenhum departamento cadastrado</h3>
                                <p className="text-muted-foreground">
                                    Comece criando o primeiro departamento da sua organização
                                </p>
                                <Button onClick={handleNewDepartment}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Criar Primeiro Departamento
                                </Button>
                            </div>
                        </Card>
                    )}
                </TabsContent>
                )}

                <TabsContent value="appearance" className="space-y-4">
                    <div>
                        <h2 className="text-2xl font-bold mb-2">Aparência do Sistema</h2>
                        <p className="text-muted-foreground mb-6">
                            Personalize as cores e o tema do sistema
                        </p>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Tema do Sistema</CardTitle>
                            <CardDescription>
                                Escolha o tema que melhor se adapta ao seu ambiente de trabalho
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                                {availableThemes.map((themeOption) => {
                                    const isSelected = theme?.name === themeOption.name;

                                    return (
                                        <button
                                            key={themeOption.name}
                                            onClick={() => handleThemeChange(themeOption)}
                                            disabled={isUpdatingTheme}
                                            className={`group relative overflow-hidden rounded-lg border-2 transition-all ${isSelected
                                                ? 'border-primary ring-2 ring-primary ring-offset-2'
                                                : 'border-muted hover:border-primary'
                                                }`}
                                        >
                                            <div className={`aspect-video p-4 ${themeOption.name === 'light' ? 'bg-white' :
                                                themeOption.name === 'dark' ? 'bg-gray-900' :
                                                    themeOption.name === 'blue' ? 'bg-blue-50' :
                                                        'bg-black'
                                                }`}>
                                                <div className="space-y-2">
                                                    <div className={`h-2 rounded w-3/4 ${themeOption.name === 'light' ? 'bg-gray-200' :
                                                        themeOption.name === 'dark' ? 'bg-gray-700' :
                                                            themeOption.name === 'blue' ? 'bg-blue-200' :
                                                                'bg-gray-800'
                                                        }`}></div>
                                                    <div className={`h-2 rounded w-1/2 ${themeOption.name === 'light' ? 'bg-gray-200' :
                                                        themeOption.name === 'dark' ? 'bg-gray-700' :
                                                            themeOption.name === 'blue' ? 'bg-blue-200' :
                                                                'bg-gray-800'
                                                        }`}></div>
                                                    <div className="grid grid-cols-3 gap-2 mt-4">
                                                        <div className={`h-8 rounded ${themeOption.name === 'light' ? 'bg-blue-100' :
                                                            themeOption.name === 'dark' ? 'bg-blue-900' :
                                                                themeOption.name === 'blue' ? 'bg-blue-300' :
                                                                    'bg-gray-700'
                                                            }`}></div>
                                                        <div className={`h-8 rounded ${themeOption.name === 'light' ? 'bg-green-100' :
                                                            themeOption.name === 'dark' ? 'bg-green-900' :
                                                                themeOption.name === 'blue' ? 'bg-blue-400' :
                                                                    'bg-gray-600'
                                                            }`}></div>
                                                        <div className={`h-8 rounded ${themeOption.name === 'light' ? 'bg-purple-100' :
                                                            themeOption.name === 'dark' ? 'bg-purple-900' :
                                                                themeOption.name === 'blue' ? 'bg-blue-500' :
                                                                    'bg-gray-500'
                                                            }`}></div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="p-3 bg-white border-t flex items-center justify-between">
                                                <div>
                                                    <p className="font-medium text-sm">{themeOption.label}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Tema {themeOption.label.toLowerCase()}
                                                    </p>
                                                </div>
                                                {isSelected && (
                                                    <Check className="h-5 w-5 text-primary" />
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="mt-6 p-4 bg-muted rounded-lg">
                                <p className="text-sm text-muted-foreground">
                                    💡 <strong>Dica:</strong> O tema será aplicado em todo o sistema e salvo nas suas preferências.
                                    {isUpdatingTheme && " Aplicando tema..."}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Cores das Categorias</CardTitle>
                            <CardDescription>
                                Personalize as cores usadas nas categorias de tarefas
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Obrigações</label>
                                    <div className="flex items-center gap-3">
                                        <Badge style={{ backgroundColor: colors.obligations }} className="text-white">
                                            Atual
                                        </Badge>
                                        <Input
                                            type="color"
                                            value={colors.obligations}
                                            onChange={(e) => setColors({ ...colors, obligations: e.target.value })}
                                            className="w-20 h-10"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Ação</label>
                                    <div className="flex items-center gap-3">
                                        <Badge style={{ backgroundColor: colors.action }} className="text-white">
                                            Atual
                                        </Badge>
                                        <Input
                                            type="color"
                                            value={colors.action}
                                            onChange={(e) => setColors({ ...colors, action: e.target.value })}
                                            className="w-20 h-10"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Atenção</label>
                                    <div className="flex items-center gap-3">
                                        <Badge style={{ backgroundColor: colors.attention }} className="text-white">
                                            Atual
                                        </Badge>
                                        <Input
                                            type="color"
                                            value={colors.attention}
                                            onChange={(e) => setColors({ ...colors, attention: e.target.value })}
                                            className="w-20 h-10"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Pendentes</label>
                                    <div className="flex items-center gap-3">
                                        <Badge style={{ backgroundColor: colors.pending }} className="text-white">
                                            Atual
                                        </Badge>
                                        <Input
                                            type="color"
                                            value={colors.pending}
                                            onChange={(e) => setColors({ ...colors, pending: e.target.value })}
                                            className="w-20 h-10"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Concluídas</label>
                                    <div className="flex items-center gap-3">
                                        <Badge style={{ backgroundColor: colors.completed }} className="text-white">
                                            Atual
                                        </Badge>
                                        <Input
                                            type="color"
                                            value={colors.completed}
                                            onChange={(e) => setColors({ ...colors, completed: e.target.value })}
                                            className="w-20 h-10"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t">
                                <Button onClick={handleSaveColors} disabled={isUpdatingColors}>
                                    <Palette className="h-4 w-4 mr-2" />
                                    {isUpdatingColors ? "Salvando..." : "Salvar Cores"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Sincronização de Dados</CardTitle>
                            <CardDescription>
                                Departamentos e atividades estão sempre sincronizados
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="space-y-1">
                                    <p className="font-medium">Sincronização Automática</p>
                                    <p className="text-sm text-muted-foreground">
                                        Alterações em departamentos são refletidas automaticamente em atividades e tarefas
                                    </p>
                                </div>
                                <Badge className="bg-green-500 text-white">Ativo</Badge>
                            </div>

                            <Alert>
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    <strong>Sincronização Ativa:</strong> Todas as alterações em departamentos são automaticamente sincronizadas com atividades e tarefas relacionadas através do Supabase em tempo real.
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>
                </TabsContent>

                {canManageTeam && (
                <TabsContent value="team" className="space-y-4">
                    <TeamTabContent />
                </TabsContent>
                )}

                <TabsContent value="history" className="space-y-4">
                    <div>
                        <h2 className="text-2xl font-bold mb-2">Histórico de Tarefas</h2>
                        <p className="text-muted-foreground mb-6">
                            Visualize tarefas concluídas, paradas ou impedidas
                        </p>
                    </div>
                    <TaskHistoryTable />
                </TabsContent>
            </Tabs>

            <AlertDialog
                open={!!deletingDepartment}
                onOpenChange={() => setDeletingDepartment(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação não pode ser desfeita. O departamento{" "}
                            <strong>{deletingDepartment?.name}</strong> será permanentemente excluído.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (deletingDepartment) {
                                    deleteDepartmentMutation.mutate(deletingDepartment.id);
                                }
                            }}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default Settings;
