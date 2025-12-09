import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role: string;
  department_name: string | null;
}

const Users = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const { selectedCompanyId } = useAuth();

  useEffect(() => {
    if (selectedCompanyId) {
      fetchUsers();
    }
  }, [selectedCompanyId]);

  const fetchUsers = async () => {
    if (!selectedCompanyId) return;

    // Get users in this company
    const { data: userCompanies, error: ucError } = await supabase
      .from("user_companies")
      .select("user_id, role")
      .eq("company_id", selectedCompanyId);

    if (ucError) {
      toast.error("Erro ao carregar usuários");
      return;
    }

    if (!userCompanies || userCompanies.length === 0) {
      setUsers([]);
      return;
    }

    const userIds = userCompanies.map(uc => uc.user_id);

    // Get profiles
    const { data: profiles, error: pError } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds)
      .order("full_name");

    if (pError) {
      toast.error("Erro ao carregar perfis");
      return;
    }

    // Get user departments
    const { data: userDepts, error: udError } = await supabase
      .from("user_departments")
      .select("user_id, departments(name)")
      .in("user_id", userIds);

    if (udError) {
      console.error("Error fetching departments:", udError);
    }

    // Combine data
    const combinedUsers: UserProfile[] = profiles?.map(profile => {
      const uc = userCompanies.find(u => u.user_id === profile.id);
      const ud = userDepts?.find(u => u.user_id === profile.id);
      return {
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
        role: uc?.role || "colaborador",
        department_name: (ud?.departments as any)?.name || null,
      };
    }) || [];

    setUsers(combinedUsers);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Usuários</h1>
        <p className="text-muted-foreground">Lista de usuários cadastrados no sistema</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usuários Cadastrados</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Departamento</TableHead>
                <TableHead>Função</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    Nenhum usuário encontrado
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.full_name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {user.department_name ? (
                        <Badge variant="outline">{user.department_name}</Badge>
                      ) : (
                        <span className="text-muted-foreground">Não atribuído</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge>{user.role}</Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Users;
