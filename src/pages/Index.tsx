
import React, { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Dashboard from '@/components/Dashboard';
import SecurityEvents from '@/components/SecurityEvents';
import Alerts from '@/components/Alerts';
import LogAnalysis from '@/components/LogAnalysis';

const Index = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'events':
        return <SecurityEvents />;
      case 'alerts':
        return <Alerts />;
      case 'logs':
        return <LogAnalysis />;
      case 'network':
        return <div className="p-6 text-white">Network Monitor - Coming Soon</div>;
      case 'compliance':
        return <div className="p-6 text-white">Compliance Reports - Coming Soon</div>;
      case 'users':
        return <div className="p-6 text-white">User Activity - Coming Soon</div>;
      case 'settings':
        return <div className="p-6 text-white">Settings - Coming Soon</div>;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex-1 overflow-auto">
        {renderContent()}
      </div>
    </div>
  );
};

export default Index;
