import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useToast } from "@/hooks/use-toast";

export interface CategoryColors {
    obligations: string;
    action: string;
    attention: string;
    pending: string;
    completed: string;
}

export interface Theme {
    name: string;
    label: string;
}

const DEFAULT_COLORS: CategoryColors = {
    obligations: "#eab308",
    action: "#ea580c",
    attention: "#6b7280",
    pending: "#22c55e",
    completed: "#9333ea",
};

const DEFAULT_THEME: Theme = {
    name: "light",
    label: "Claro",
};

interface SystemSettingsContextType {
    categoryColors: CategoryColors;
    theme: Theme;
    updateColors: (newColors: CategoryColors) => void;
    updateTheme: (newTheme: Theme) => void;
    isUpdatingColors: boolean;
    isUpdatingTheme: boolean;
    getCategoryColor: (category: keyof CategoryColors) => string;
}

const SystemSettingsContext = createContext<SystemSettingsContextType | undefined>(undefined);

export const SystemSettingsProvider = ({ children }: { children: ReactNode }) => {
    const { toast } = useToast();

    // Estado local inicializado com valores do localStorage ou padrão
    const [categoryColors, setCategoryColors] = useState<CategoryColors>(() => {
        try {
            const saved = localStorage.getItem("category_colors");
            return saved ? JSON.parse(saved) : DEFAULT_COLORS;
        } catch (e) {
            return DEFAULT_COLORS;
        }
    });

    const [theme, setTheme] = useState<Theme>(() => {
        try {
            const saved = localStorage.getItem("system_theme");
            return saved ? JSON.parse(saved) : DEFAULT_THEME;
        } catch (e) {
            return DEFAULT_THEME;
        }
    });

    // Função para atualizar cores
    const updateColors = (newColors: CategoryColors) => {
        try {
            localStorage.setItem("category_colors", JSON.stringify(newColors));
            setCategoryColors(newColors);
            toast({
                title: "Cores atualizadas!",
                description: "As cores das categorias foram salvas localmente.",
            });
        } catch (error) {
            toast({
                title: "Erro ao salvar cores",
                description: "Não foi possível salvar as cores localmente.",
                variant: "destructive",
            });
        }
    };

    // Função para atualizar tema
    const updateTheme = (newTheme: Theme) => {
        try {
            localStorage.setItem("system_theme", JSON.stringify(newTheme));
            setTheme(newTheme);
            toast({
                title: "Tema atualizado!",
                description: `O tema ${newTheme.label} foi aplicado localmente.`,
            });
        } catch (error) {
            toast({
                title: "Erro ao alterar tema",
                description: "Não foi possível salvar o tema localmente.",
                variant: "destructive",
            });
        }
    };

    // Função helper para obter cor de uma categoria
    const getCategoryColor = (category: keyof CategoryColors): string => {
        return categoryColors[category] || DEFAULT_COLORS[category];
    };

    return (
        <SystemSettingsContext.Provider
            value={{
                categoryColors,
                theme,
                updateColors,
                updateTheme,
                isUpdatingColors: false,
                isUpdatingTheme: false,
                getCategoryColor,
            }}
        >
            {children}
        </SystemSettingsContext.Provider>
    );
};

export const useSystemSettings = () => {
    const context = useContext(SystemSettingsContext);
    if (context === undefined) {
        throw new Error("useSystemSettings must be used within a SystemSettingsProvider");
    }
    return context;
};
