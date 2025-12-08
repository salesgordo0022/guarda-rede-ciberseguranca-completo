import { ReactNode } from 'react';
import { usePermissions, Permission } from '@/hooks/usePermissions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface PermissionGuardProps {
    children: ReactNode;
    permission?: Permission;
    permissions?: Permission[];
    requireAll?: boolean;
    fallback?: ReactNode;
    showMessage?: boolean;
}

export function PermissionGuard({
    children,
    permission,
    permissions = [],
    requireAll = false,
    fallback,
    showMessage = false,
}: PermissionGuardProps) {
    const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermissions();

    let hasAccess = false;

    if (permission) {
        hasAccess = hasPermission(permission);
    } else if (permissions.length > 0) {
        hasAccess = requireAll
            ? hasAllPermissions(permissions)
            : hasAnyPermission(permissions);
    }

    if (!hasAccess) {
        if (fallback) {
            return <>{fallback}</>;
        }

        if (showMessage) {
            return (
                <Alert variant="destructive" className="m-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        Você não tem permissão para acessar este recurso.
                    </AlertDescription>
                </Alert>
            );
        }

        return null;
    }

    return <>{children}</>;
}
