
import React, { useState } from 'react';
import { AlertTriangle, Clock, User, MapPin, TrendingUp, Shield, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const Alerts = () => {
  const [alerts, setAlerts] = useState([
    {
      id: 1,
      title: 'Critical: Advanced Persistent Threat Detected',
      description: 'Sophisticated malware with command and control communication detected on multiple endpoints',
      severity: 'Critical',
      timestamp: '2024-01-15 14:45:32',
      source: 'Endpoint Detection',
      affectedAssets: ['WORKSTATION-01', 'WORKSTATION-05', 'SERVER-DB01'],
      status: 'Active',
      assignee: 'John Smith',
      category: 'Malware'
    },
    {
      id: 2,
      title: 'High: Suspicious Lateral Movement',
      description: 'Unusual network connections suggesting potential lateral movement attack',
      severity: 'High',
      timestamp: '2024-01-15 14:30:15',
      source: 'Network Monitor',
      affectedAssets: ['192.168.1.100', '192.168.1.150'],
      status: 'Investigating',
      assignee: 'Sarah Johnson',
      category: 'Network'
    },
    {
      id: 3,
      title: 'Medium: Privilege Escalation Attempt',
      description: 'User account attempting to gain unauthorized administrative privileges',
      severity: 'Medium',
      timestamp: '2024-01-15 14:15:28',
      source: 'Active Directory',
      affectedAssets: ['USER-JDOE'],
      status: 'Resolved',
      assignee: 'Mike Wilson',
      category: 'Access Control'
    },
    {
      id: 4,
      title: 'High: Data Exfiltration Alert',
      description: 'Large volume of sensitive data transferred to external location',
      severity: 'High',
      timestamp: '2024-01-15 13:58:45',
      source: 'DLP System',
      affectedAssets: ['FILE-SERVER-01'],
      status: 'Containment',
      assignee: 'Lisa Chen',
      category: 'Data Loss'
    }
  ]);

  const severityColors = {
    'Critical': 'destructive',
    'High': 'secondary',
    'Medium': 'outline',
    'Low': 'default'
  };

  const statusColors = {
    'Active': 'bg-red-500',
    'Investigating': 'bg-yellow-500',
    'Containment': 'bg-orange-500',
    'Resolved': 'bg-green-500'
  };

  const handleDismissAlert = (alertId: number) => {
    setAlerts(alerts.filter(alert => alert.id !== alertId));
  };

  const handleStatusChange = (alertId: number, newStatus: string) => {
    setAlerts(alerts.map(alert => 
      alert.id === alertId ? { ...alert, status: newStatus } : alert
    ));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Security Alerts & Incidents</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
            Configure Rules
          </Button>
        </div>
      </div>

      {/* Alert Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Active Alerts</p>
                <p className="text-2xl font-bold text-red-400">4</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Critical Incidents</p>
                <p className="text-2xl font-bold text-red-400">1</p>
              </div>
              <Shield className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Avg Response Time</p>
                <p className="text-2xl font-bold text-blue-400">12m</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Resolution Rate</p>
                <p className="text-2xl font-bold text-green-400">94%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Alerts */}
      <div className="space-y-4">
        {alerts.map((alert) => (
          <Card key={alert.id} className="bg-slate-800 border-slate-700">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Badge variant={severityColors[alert.severity as keyof typeof severityColors] as any}>
                      {alert.severity}
                    </Badge>
                    <span className={`w-3 h-3 rounded-full ${statusColors[alert.status as keyof typeof statusColors]}`}></span>
                    <span className="text-sm text-slate-400">{alert.status}</span>
                  </div>
                  <CardTitle className="text-white text-lg">{alert.title}</CardTitle>
                  <CardDescription className="text-slate-300 mt-2">
                    {alert.description}
                  </CardDescription>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => handleDismissAlert(alert.id)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-slate-400 mb-1">Timestamp</p>
                  <p className="text-white font-mono">{alert.timestamp}</p>
                </div>
                <div>
                  <p className="text-slate-400 mb-1">Source</p>
                  <p className="text-white">{alert.source}</p>
                </div>
                <div>
                  <p className="text-slate-400 mb-1">Assignee</p>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-slate-400" />
                    <p className="text-white">{alert.assignee}</p>
                  </div>
                </div>
                <div>
                  <p className="text-slate-400 mb-1">Category</p>
                  <p className="text-white">{alert.category}</p>
                </div>
              </div>
              
              <div className="mt-4">
                <p className="text-slate-400 mb-2">Affected Assets</p>
                <div className="flex flex-wrap gap-2">
                  {alert.affectedAssets.map((asset, index) => (
                    <Badge key={index} variant="outline" className="bg-slate-700 text-slate-300 border-slate-600">
                      {asset}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex items-center gap-3">
                <select 
                  value={alert.status}
                  onChange={(e) => handleStatusChange(alert.id, e.target.value)}
                  className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white text-sm"
                >
                  <option value="Active">Active</option>
                  <option value="Investigating">Investigating</option>
                  <option value="Containment">Containment</option>
                  <option value="Resolved">Resolved</option>
                </select>
                <Button variant="outline" size="sm" className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
                  View Details
                </Button>
                <Button variant="outline" size="sm" className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
                  Add Comment
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Alerts;
