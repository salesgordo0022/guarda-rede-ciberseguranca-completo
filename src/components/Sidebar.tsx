
import React from 'react';
import { Shield, Activity, AlertTriangle, BarChart3, FileText, Settings, Users, Network } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Sidebar = ({ activeTab, setActiveTab }: SidebarProps) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'events', label: 'Security Events', icon: Activity },
    { id: 'alerts', label: 'Alerts & Incidents', icon: AlertTriangle },
    { id: 'logs', label: 'Log Analysis', icon: FileText },
    { id: 'network', label: 'Network Monitor', icon: Network },
    { id: 'compliance', label: 'Compliance', icon: Shield },
    { id: 'users', label: 'User Activity', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="w-64 bg-slate-900 border-r border-slate-700 p-4">
      <div className="flex items-center gap-3 mb-8">
        <Shield className="h-8 w-8 text-blue-500" />
        <h1 className="text-xl font-bold text-white">SecureSOC</h1>
      </div>
      
      <nav className="space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors",
                activeTab === item.id 
                  ? "bg-blue-600 text-white" 
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default Sidebar;
