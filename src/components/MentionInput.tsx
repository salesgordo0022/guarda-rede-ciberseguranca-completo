import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface TeamMember {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
}

interface MentionInputProps {
    value: string;
    onChange: (value: string) => void;
    onSubmit: () => void;
    placeholder?: string;
    teamMembers: TeamMember[];
}

export function MentionInput({ value, onChange, onSubmit, placeholder, teamMembers }: MentionInputProps) {
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [mentionSearch, setMentionSearch] = useState("");
    const [cursorPosition, setCursorPosition] = useState(0);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const suggestionsRef = useRef<HTMLDivElement>(null);

    // Filter team members based on mention search
    const filteredMembers = teamMembers.filter(member =>
        member.full_name.toLowerCase().includes(mentionSearch.toLowerCase())
    ).slice(0, 5);

    // Handle input change
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        const newCursorPos = e.target.selectionStart || 0;
        
        onChange(newValue);
        setCursorPosition(newCursorPos);

        // Check if we should show mention suggestions
        const textBeforeCursor = newValue.slice(0, newCursorPos);
        const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
        
        if (mentionMatch) {
            setMentionSearch(mentionMatch[1]);
            setShowSuggestions(true);
            setSelectedIndex(0);
        } else {
            setShowSuggestions(false);
            setMentionSearch("");
        }
    };

    // Handle selecting a mention
    const selectMention = (member: TeamMember) => {
        const textBeforeCursor = value.slice(0, cursorPosition);
        const textAfterCursor = value.slice(cursorPosition);
        
        // Find the @ position
        const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
        if (mentionMatch) {
            const atPosition = textBeforeCursor.lastIndexOf('@');
            const newText = textBeforeCursor.slice(0, atPosition) + 
                           `@[${member.id}:${member.full_name}] ` + 
                           textAfterCursor;
            
            onChange(newText);
            setShowSuggestions(false);
            setMentionSearch("");
            
            // Focus back on input
            setTimeout(() => {
                inputRef.current?.focus();
            }, 0);
        }
    };

    // Handle keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (showSuggestions && filteredMembers.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => 
                    prev < filteredMembers.length - 1 ? prev + 1 : prev
                );
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => prev > 0 ? prev - 1 : 0);
            } else if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                selectMention(filteredMembers[selectedIndex]);
            } else if (e.key === 'Escape') {
                setShowSuggestions(false);
            }
        } else if (e.key === 'Enter' && !showSuggestions) {
            onSubmit();
        }
    };

    // Close suggestions when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node) &&
                inputRef.current && !inputRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Get display value (convert mention format to readable)
    const getDisplayValue = () => {
        return value.replace(/@\[([a-f0-9-]+):([^\]]+)\]/g, '@$2');
    };

    return (
        <div className="relative flex-1">
            <Input
                ref={inputRef}
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder || "Digite @ para mencionar..."}
            />
            
            {showSuggestions && filteredMembers.length > 0 && (
                <div 
                    ref={suggestionsRef}
                    className="absolute bottom-full left-0 right-0 mb-1 bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden"
                >
                    <div className="p-1">
                        <p className="text-xs text-muted-foreground px-2 py-1">
                            Mencionar pessoa
                        </p>
                        {filteredMembers.map((member, index) => (
                            <button
                                key={member.id}
                                type="button"
                                onClick={() => selectMention(member)}
                                className={cn(
                                    "w-full flex items-center gap-2 px-2 py-2 rounded-md text-left transition-colors",
                                    index === selectedIndex 
                                        ? "bg-primary/10 text-primary" 
                                        : "hover:bg-muted"
                                )}
                            >
                                <Avatar className="h-6 w-6">
                                    <AvatarImage src={member.avatar_url || undefined} />
                                    <AvatarFallback className="text-xs bg-primary/10">
                                        {member.full_name.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">
                                        {member.full_name}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate">
                                        {member.email}
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
            
            {/* Hint */}
            {!showSuggestions && value === "" && (
                <p className="text-xs text-muted-foreground mt-1">
                    💡 Digite @ para mencionar alguém
                </p>
            )}
        </div>
    );
}
