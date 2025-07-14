
import React, { useState } from 'react';
import { Search, Filter, Download, RefreshCw, AlertTriangle, Shield, Activity } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const SecurityEvents = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('all');

  const events = [
    {
      id: 1,
      timestamp: '2024-01-15 14:32:45',
      type: 'Authentication Failure',
      severity: 'High',
      source: '192.168.1.100',
      description: 'Multiple failed login attempts detected',
      status: 'Open',
      category: 'Authentication'
    },
    {
      id: 2,
      timestamp: '2024-01-15 14:28:12',
      type: 'Malware Detection',
      severity: 'Critical',
      source: '10.0.2.50',
      description: 'Trojan.Win32.Agent detected in file system',
      status: 'In Progress',
      category: 'Malware'
    },
    {
      id: 3,
      timestamp: '2024-01-15 14:25:33',
      type: 'Network Anomaly',
      severity: 'Medium',
      source: '172.16.0.25',
      description: 'Unusual network traffic pattern detected',
      status: 'Resolved',
      category: 'Network'
    },
    {
      id: 4,
      timestamp: '2024-01-15 14:20:18',
      type: 'Privilege Escalation',
      severity: 'Critical',
      source: 'WORKSTATION-01',
      description: 'Unauthorized admin privileges granted',
      status: 'Open',
      category: 'Access Control'
    },
    {
      id: 5,
      timestamp: '2024-01-15 14:15:07',
      type: 'Data Exfiltration',
      severity: 'High',
      source: '192.168.1.75',
      description: 'Large data transfer to external IP',
      status: 'In Progress',
      category: 'Data Loss'
    }
  ];

  const severityColors = {
    'Critical': 'bg-red-500 text-white',
    'High': 'bg-orange-500 text-white',
    'Medium': 'bg-yellow-500 text-black',
    'Low': 'bg-green-500 text-white'
  };

  const statusColors = {
    'Open': 'bg-red-100 text-red-800',
    'In Progress': 'bg-yellow-100 text-yellow-800',
    'Resolved': 'bg-green-100 text-green-800'
  };

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.source.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = selectedSeverity === 'all' || event.severity === selectedSeverity;
    return matchesSearch && matchesSeverity;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Security Events</h1>
        <div className="flex items-center gap-4">
          <Button variant="outline" className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Total Events</p>
                <p className="text-2xl font-bold text-white">1,247</p>
              </div>
              <Activity className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Critical Events</p>
                <p className="text-2xl font-bold text-red-400">23</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Open Events</p>
                <p className="text-2xl font-bold text-orange-400">89</p>
              </div>
              <Shield className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Resolved Today</p>
                <p className="text-2xl font-bold text-green-400">156</p>
              </div>
              <Shield className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search events..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                />
              </div>
            </div>
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white"
            >
              <option value="all">All Severities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Events Table */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Recent Security Events</CardTitle>
          <CardDescription className="text-slate-400">
            Showing {filteredEvents.length} events
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left p-4 text-slate-300 font-medium">Timestamp</th>
                  <th className="text-left p-4 text-slate-300 font-medium">Type</th>
                  <th className="text-left p-4 text-slate-300 font-medium">Severity</th>
                  <th className="text-left p-4 text-slate-300 font-medium">Source</th>
                  <th className="text-left p-4 text-slate-300 font-medium">Description</th>
                  <th className="text-left p-4 text-slate-300 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((event) => (
                  <tr key={event.id} className="border-b border-slate-700 hover:bg-slate-700/50 transition-colors">
                    <td className="p-4 text-slate-300 font-mono text-sm">{event.timestamp}</td>
                    <td className="p-4 text-white font-medium">{event.type}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${severityColors[event.severity as keyof typeof severityColors]}`}>
                        {event.severity}
                      </span>
                    </td>
                    <td className="p-4 text-slate-300 font-mono">{event.source}</td>
                    <td className="p-4 text-slate-300">{event.description}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[event.status as keyof typeof statusColors]}`}>
                        {event.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SecurityEvents;
