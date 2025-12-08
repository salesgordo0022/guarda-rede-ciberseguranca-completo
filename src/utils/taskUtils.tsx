import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const formatSchedule = (start: string | null, end: string | null) => {
    if (!start || !end) return "—";
    try {
        const startDate = new Date(start);
        const endDate = new Date(end);
        const startFormatted = format(startDate, "dd/MM", { locale: ptBR });
        const endFormatted = format(endDate, "dd/MM", { locale: ptBR });
        return `${startFormatted} – ${endFormatted}`;
    } catch {
        return "—";
    }
};

export const getPriorityBadge = (priority: string) => {
    switch (priority.toLowerCase()) {
        case "urgente":
            return <Badge className="bg-red-600 hover:bg-red-700">Obrigação</Badge>;
        case "alta":
            return <Badge className="bg-orange-500 hover:bg-orange-600">Ação</Badge>;
        case "média":
        case "media":
            return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-black">Rotina</Badge>;
        case "baixa":
            return <Badge className="bg-green-500 hover:bg-green-600">Baixa</Badge>;
        default:
            return <Badge variant="outline">{priority}</Badge>;
    }
};

export const getStatusColor = (status: string) => {
    switch (status) {
        case "Feito": return "bg-green-100 text-green-800 border-green-200";
        case "Em andamento": return "bg-blue-100 text-blue-800 border-blue-200";
        case "Parado": return "bg-red-100 text-red-800 border-red-200";
        default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
};
