import { useState, useEffect } from "react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetClose,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Calendar,
    Clock,
    User,
    Tag,
    Flag,
    Building2,
    FolderKanban,
    MessageSquare,
    CheckCircle2,
    AlertCircle,
    Save,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

interface ActivityDetailsSheetProps {
    activity: any | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mode?: 'view' | 'create';
    preselectedDepartmentId?: string;
    preselectedProjectId?: string;
}

export function ActivityDetailsSheet({
    activity: initialActivity,
    open,
    onOpenChange,
    mode = 'view',
    preselectedDepartmentId,
    preselectedProjectId
}: ActivityDetailsSheetProps) {
    const { profile, selectedCompanyId } = useAuth();
    const queryClient = useQueryClient();
    const [loading, setLoading] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: "",
        status: "pendente",
        deadline: "",
        description: ""
    });

    // Initialize/Reset Form
    useEffect(() => {
        if (open) {
            if (mode === 'view' && initialActivity) {
                setFormData({
                    name: initialActivity.name || "",
                    status: initialActivity.status || "pendente",
                    deadline: initialActivity.deadline ? initialActivity.deadline.split('T')[0] : "",
                    description: initialActivity.description || ""
                });
            } else {
                // Create Mode
                setFormData({
                    name: "",
                    status: "pendente",
                    deadline: "",
                    description: ""
                });
            }
        }
    }, [open, mode, initialActivity]);

    const handleSave = async () => {
        if (!formData.name.trim()) {
            toast.error("Nome da atividade é obrigatório");
            return;
        }

        setLoading(true);
        try {
            const isProject = preselectedProjectId || (initialActivity && !initialActivity.department_id);
            const table = isProject ? 'project_activities' : 'department_activities';

            const activityData: any = {
                name: formData.name,
                status: formData.status,
                description: formData.description,
                deadline: formData.deadline ? formData.deadline : null,
            };

            let activityId = initialActivity?.id;

            if (mode === 'create') {
                if (isProject) {
                    activityData.project_id = preselectedProjectId;
                } else {
                    activityData.department_id = preselectedDepartmentId;
                }
                activityData.created_by = profile?.id;

                const { data, error } = await supabase
                    .from(table)
                    .insert(activityData)
                    .select()
                    .single();

                if (error) throw error;
                activityId = data.id;
                toast.success("Atividade criada com sucesso!");
            } else {
                const { error } = await supabase
                    .from(table)
                    .update(activityData)
                    .eq('id', activityId);

                if (error) throw error;
                toast.success("Atividade atualizada com sucesso!");
            }

            // Invalidate queries
            queryClient.invalidateQueries({ queryKey: ['department-activities'] });
            queryClient.invalidateQueries({ queryKey: ['project-activities'] });
            queryClient.invalidateQueries({ queryKey: ['global-activities'] });

            onOpenChange(false);

        } catch (error: any) {
            console.error("Erro ao salvar:", error);
            toast.error(`Erro ao salvar: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const InputWrapper = ({ icon: Icon, label, children }: { icon: any, label: string, children: React.ReactNode }) => (
        <div className="grid grid-cols-[140px_1fr] items-center gap-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium">
                <Icon className="h-4 w-4" />
                {label}
            </div>
            <div className="w-full">
                {children}
            </div>
        </div>
    );

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-2xl overflow-hidden flex flex-col p-0 border-l-4 border-l-primary/10">
                <ScrollArea className="h-full">
                    <div className="p-8 space-y-8">
                        {/* Header */}
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-muted-foreground text-sm bg-muted/30 px-3 py-1 rounded-full">
                                    {(preselectedProjectId || (initialActivity && !initialActivity.department_id)) ? (
                                        <>
                                            <FolderKanban className="h-4 w-4 text-emerald-500" />
                                            <span className="font-medium text-emerald-900 dark:text-emerald-300">Projeto</span>
                                        </>
                                    ) : (
                                        <>
                                            <Building2 className="h-4 w-4 text-blue-500" />
                                            <span className="font-medium text-blue-900 dark:text-blue-300">Departamento</span>
                                        </>
                                    )}
                                    <span className="text-muted-foreground/50">/</span>
                                    <span>{mode === 'create' ? 'Nova Atividade' : 'Editar Atividade'}</span>
                                </div>
                                <Button onClick={handleSave} disabled={loading} size="sm" className="gap-2">
                                    <Save className="h-4 w-4" />
                                    {loading ? "Salvando..." : (mode === 'create' ? "Criar Atividade" : "Salvar Alterações")}
                                </Button>
                            </div>

                            <Input
                                value={formData.name}
                                onChange={(e) => handleChange('name', e.target.value)}
                                className="text-3xl font-bold border-none shadow-none px-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/50"
                                placeholder="Nome da Atividade"
                            />
                        </div>

                        <Separator />

                        {/* Properties Grid */}
                        <div className="grid gap-6 bg-card rounded-lg p-1">
                        
                            <InputWrapper icon={CheckCircle2} label="Status">
                                <Select value={formData.status} onValueChange={(val) => handleChange('status', val)}>
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="pendente">Não iniciado</SelectItem>
                                        <SelectItem value="em_andamento">Em andamento</SelectItem>
                                        <SelectItem value="concluida">Finalizado</SelectItem>
                                        <SelectItem value="cancelada">Cancelado</SelectItem>
                                    </SelectContent>
                                </Select>
                            </InputWrapper>
                        
                            <InputWrapper icon={User} label="Criado por">
                                <div className="flex items-center gap-2">
                                    {initialActivity?.created_by ? (
                                        <>
                                            <Avatar className="h-6 w-6">
                                                <AvatarFallback className="text-xs">
                                                    {initialActivity.created_by.charAt(0).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="text-sm">
                                                {initialActivity.created_by}
                                            </span>
                                        </>
                                    ) : (
                                        <span className="text-muted-foreground text-sm">—</span>
                                    )}
                                </div>
                            </InputWrapper>
                        
                            <InputWrapper icon={AlertCircle} label="Prazo">
                                <Input
                                    type="date"
                                    value={formData.deadline}
                                    onChange={(e) => handleChange('deadline', e.target.value)}
                                    className="w-[180px]"
                                />
                            </InputWrapper>
                        </div>

                        <Separator />

                        {/* Description */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-muted-foreground font-medium">
                                <MessageSquare className="h-4 w-4" />
                                Descrição
                            </div>
                            <Textarea
                                value={formData.description}
                                onChange={(e) => handleChange('description', e.target.value)}
                                placeholder="Adicione uma descrição detalhada para esta atividade..."
                                className="min-h-[200px] resize-none"
                            />
                        </div>
                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
}
