import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, AlertCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSearchParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Database } from "@/integrations/supabase/types";

import { ActivityTable } from "@/components/ActivityTable";
import { ActivityDetailsSheet } from "@/components/ActivityDetailsSheet";

type ActivityStatus = Database['public']['Enums']['activity_status'];

interface Department {
  id: string;
  name: string;
}

interface DepartmentActivity {
  id: string;
  name: string;
  description: string | null;
  status: ActivityStatus;
  deadline: string | null;
  scheduled_date: string | null;
  deadline_status: Database['public']['Enums']['deadline_status'] | null;
  updated_at: string;
  department_id: string;
  priority: string | null;
  created_by: string | null;
  created_at: string | null;
  assignees?: {
    user_id: string;
    profiles?: {
      id: string;
      full_name: string;
    } | null;
  }[];
}

const Activities = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const departmentFilterId = searchParams.get("department");
  const { isAdmin, isGestor, selectedCompanyId, profile } = useAuth();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Fetch departments
  const { data: departments = [] } = useQuery({
    queryKey: ['departments', selectedCompanyId],
    queryFn: async () => {
      if (!selectedCompanyId) return [];

      const { data } = await supabase
        .from('departments')
        .select('id, name')
        .eq('company_id', selectedCompanyId)
        .order('name');

      return data as Department[] || [];
    },
    enabled: !!selectedCompanyId
  });

  // Fetch company users (profiles)
  const { data: companyUsers = [] } = useQuery({
    queryKey: ['company-users', selectedCompanyId],
    queryFn: async () => {
      if (!selectedCompanyId) return [];

      // Primeiro busca os user_ids da empresa
      const { data: userCompanies, error: ucError } = await supabase
        .from('user_companies')
        .select('user_id')
        .eq('company_id', selectedCompanyId);

      if (ucError) {
        console.error('Erro ao buscar membros da empresa:', ucError);
        return [];
      }

      if (!userCompanies || userCompanies.length === 0) return [];

      const userIds = userCompanies.map(uc => uc.user_id);

      // Depois busca os perfis desses usuários
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      if (profilesError) {
        console.error('Erro ao buscar perfis:', profilesError);
        return [];
      }

      return profiles || [];
    },
    enabled: !!selectedCompanyId
  });

  // Redirect to first department if none selected
  useEffect(() => {
    if (departments.length > 0 && !departmentFilterId) {
      navigate(`/activities?department=${departments[0].id}`, { replace: true });
    }
  }, [departments, departmentFilterId, navigate]);



  // Fetch department activities (excluding completed ones) with assignees
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['department-activities', departmentFilterId, selectedCompanyId],
    queryFn: async (): Promise<DepartmentActivity[]> => {
      if (!departmentFilterId || !selectedCompanyId) return [];

      const { data: activitiesData, error } = await supabase
        .from('department_activities')
        .select(`
          *,
          department:departments(id, name, company_id)
        `)
        .eq('department_id', departmentFilterId)
        .neq('status', 'concluida')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const filteredActivities = (activitiesData || []).filter((activity: any) =>
        activity.department?.company_id === selectedCompanyId
      );

      // Fetch assignees for all activities
      const activityIds = filteredActivities.map((a: any) => a.id);
      const { data: assigneesData } = await supabase
        .from("department_activity_assignees")
        .select("activity_id, user_id")
        .in("activity_id", activityIds);

      // Fetch profiles for assignees
      const userIds = [...new Set(assigneesData?.map(a => a.user_id) || [])];
      let profilesData: { id: string; full_name: string }[] = [];
      if (userIds.length > 0) {
        const { data } = await supabase.from("profiles").select("id, full_name").in("id", userIds);
        profilesData = data || [];
      }

      // Map profiles to assignees
      const profilesMap = new Map<string, { id: string; full_name: string }>(
        profilesData.map(p => [p.id, p])
      );

      // Attach assignees to activities
      return filteredActivities.map((activity: any) => ({
        id: activity.id,
        name: activity.name,
        description: activity.description,
        status: activity.status,
        deadline: activity.deadline,
        scheduled_date: activity.scheduled_date,
        deadline_status: activity.deadline_status,
        updated_at: activity.updated_at,
        department_id: activity.department_id,
        priority: activity.priority,
        created_by: activity.created_by,
        created_at: activity.created_at,
        assignees: (assigneesData || [])
          .filter(a => a.activity_id === activity.id)
          .map(a => ({
            user_id: a.user_id,
            profiles: profilesMap.get(a.user_id) || null
          }))
      }));
    },
    enabled: !!departmentFilterId && !!selectedCompanyId
  });



  // Update activity mutation
  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; name?: string; description?: string; status?: ActivityStatus; deadline?: string }) => {
      const { id, ...updates } = data;
      const { error } = await supabase
        .from('department_activities')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['department-activities'] });
      toast.success('Atividade atualizada!');
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar atividade: ${error.message}`);
    }
  });

  // Delete activity mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('department_activities')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['department-activities'] });
      toast.success('Atividade excluída!');
    },
    onError: (error) => {
      toast.error(`Erro ao excluir atividade: ${error.message}`);
    }
  });

  // Complete activity mutation
  const completeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('department_activities')
        .update({
          status: 'concluida' as ActivityStatus,
          completed_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['department-activities'] });
      toast.success('Atividade concluída!');
    },
    onError: (error) => {
      toast.error(`Erro ao concluir atividade: ${error.message}`);
    }
  });

  const handleDelete = (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta atividade?")) return;
    deleteMutation.mutate(id);
  };


  const handleStatusChange = (id: string, status: ActivityStatus) => {
    updateMutation.mutate({ id, status });
  };

  const handleEdit = (activity: any) => {
    setViewing(activity);
  };


  const currentDepartmentName = departments.find(d => d.id === departmentFilterId)?.name;

  if (!departmentFilterId && departments.length === 0) {
    return (
      <div className="p-6 text-center text-muted-foreground animate-fade-in">
        <p>Nenhum departamento encontrado. Crie um novo em Configurações.</p>
      </div>
    );
  }

  if (!departmentFilterId) {
    return null;
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {currentDepartmentName || "Departamento"}
          </h1>
          <p className="text-muted-foreground">
            Gerencie as atividades deste departamento
          </p>
        </div>

        <Button
          onClick={() => setIsCreating(true)}
          className="bg-primary hover:bg-primary/90 text-white shadow-lg hover:shadow-xl transition-all"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nova Atividade
        </Button>
      </div>

      <Card className="border-none shadow-md bg-card/50 backdrop-blur-sm">
        <CardContent className="p-0">
          <ActivityTable
            activities={activities}
            isLoading={isLoading}
            onStatusChange={handleStatusChange}
            onEdit={(isAdmin || isGestor) ? handleEdit : undefined}
            onDelete={(isAdmin || isGestor) ? handleDelete : undefined}
            onComplete={(id) => completeMutation.mutate(id)}
            showActions={true}
            emptyMessage="Nenhuma atividade encontrada."
            currentUserId={profile?.id}
            isAdmin={isAdmin}
            onView={(activity) => setViewing(activity)}
          />
        </CardContent>
      </Card>

      <ActivityDetailsSheet
        activity={viewing}
        open={!!viewing}
        onOpenChange={(open) => !open && setViewing(null)}
        mode="view"
      />

      <ActivityDetailsSheet
        activity={null}
        open={isCreating}
        onOpenChange={setIsCreating}
        mode="create"
        preselectedDepartmentId={departmentFilterId || undefined}
      />
    </div>
  );
};

export default Activities;