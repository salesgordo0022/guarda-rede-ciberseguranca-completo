
import React, { useState } from 'react';
import { Search, Filter, Calendar, Download, TrendingUp, AlertCircle, FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

const LogAnalysis = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLogType, setSelectedLogType] = useState('all');

  const logData = [
    { time: '00:00', apache: 245, nginx: 189, system: 67, security: 23 },
    { time: '04:00', apache: 189, nginx: 156, system: 45, security: 12 },
    { time: '08:00', apache: 389, nginx: 298, system: 89, security: 34 },
    { time: '12:00', apache: 567, nginx: 445, system: 123, security: 56 },
    { time: '16:00', apache: 634, nginx: 523, system: 156, security: 67 },
    { time: '20:00', apache: 445, nginx: 378, system: 98, security: 45 },
  ];

  const recentLogs = [
    {
      id: 1,
      timestamp: '2024-01-15 14:45:32.123',
      level: 'ERROR',
      source: 'apache.access',
      message: 'Failed authentication attempt from 192.168.1.100',
      details: 'User: admin, Method: POST, URL: /admin/login'
    },
    {
      id: 2,
      timestamp: '2024-01-15 14:44:18.456',
      level: 'WARN',
      source: 'system.security',
      message: 'Multiple failed login attempts detected',
      details: 'Source IP: 10.0.2.50, Attempts: 5, Time window: 2 minutes'
    },
    {
      id: 3,
      timestamp: '2024-01-15 14:43:05.789',
      level: 'INFO',
      source: 'nginx.access',
      message: 'GET /api/users/profile HTTP/1.1 200',
      details: 'Response time: 45ms, User-Agent: Mozilla/5.0'
    },
    {
      id: 4,
      timestamp: '2024-01-15 14:42:33.012',
      level: 'ERROR',
      source: 'system.kernel',
      message: 'Disk space critically low on /var partition',
      details: 'Available: 2.1GB, Used: 97.8%, Mount: /var'
    },
    {
      id: 5,
      timestamp: '2024-01-15 14:41:27.345',
      level: 'WARN',
      source: 'database.mysql',
      message: 'Slow query detected',
      details: 'Query time: 5.23s, Table: user_sessions, Rows examined: 1,240,567'
    }
  ];

  const logStats = [
    { name: 'Total Logs', value: '2.4M', change: '+12%', color: 'text-blue-500' },
    { name: 'Error Rate', value: '0.8%', change: '-0.2%', color: 'text-red-500' },
    { name: 'Avg Response Time', value: '145ms', change: '+5ms', color: 'text-orange-500' },
    { name: 'Data Processed', value: '1.2TB', change: '+8%', color: 'text-green-500' }
  ];

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'ERROR': return 'text-red-400 bg-red-900/20';
      case 'WARN': return 'text-yellow-400 bg-yellow-900/20';
      case 'INFO': return 'text-blue-400 bg-blue-900/20';
      case 'DEBUG': return 'text-gray-400 bg-gray-900/20';
      default: return 'text-gray-400 bg-gray-900/20';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Log Analysis</h1>
        <div className="flex items-center gap-4">
          <Button variant="outline" className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
            <Calendar className="h-4 w-4 mr-2" />
            Date Range
          </Button>
          <Button variant="outline" className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
            <Download className="h-4 w-4 mr-2" />
            Export Logs
          </Button>
        </div>
      </div>

      {/* Log Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {logStats.map((stat, index) => (
          <Card key={index} className="bg-slate-800 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">{stat.name}</p>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                  <p className={`text-sm ${stat.change.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
                    {stat.change} from yesterday
                  </p>
                </div>
                <FileText className={`h-8 w-8 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Log Volume Chart */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Log Volume by Source</CardTitle>
          <CardDescription className="text-slate-400">Hourly log distribution across different sources</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={logData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="time" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1f2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#fff'
                }} 
              />
              <Bar dataKey="apache" stackId="a" fill="#3b82f6" />
              <Bar dataKey="nginx" stackId="a" fill="#10b981" />
              <Bar dataKey="system" stackId="a" fill="#f59e0b" />
              <Bar dataKey="security" stackId="a" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Search and Filters */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search logs... (e.g., ERROR, failed, authentication)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                />
              </div>
            </div>
            <select
              value={selectedLogType}
              onChange={(e) => setSelectedLogType(e.target.value)}
              className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white"
            >
              <option value="all">All Sources</option>
              <option value="apache">Apache</option>
              <option value="nginx">Nginx</option>
              <option value="system">System</option>
              <option value="security">Security</option>
              <option value="database">Database</option>
            </select>
            <Button variant="outline" className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
              <Filter className="h-4 w-4 mr-2" />
              Advanced Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Logs */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Recent Log Entries</CardTitle>
          <CardDescription className="text-slate-400">Latest log messages from all sources</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentLogs.map((log) => (
              <div key={log.id} className="p-4 bg-slate-700 rounded-lg border border-slate-600">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-slate-400">{log.timestamp}</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getLevelColor(log.level)}`}>
                      {log.level}
                    </span>
                    <span className="text-xs text-slate-400 bg-slate-600 px-2 py-1 rounded">
                      {log.source}
                    </span>
                  </div>
                </div>
                <p className="text-white font-medium mb-1">{log.message}</p>
                <p className="text-sm text-slate-400 font-mono">{log.details}</p>
              </div>
            ))}
          </div>
          
          <div className="mt-6 flex justify-center">
            <Button variant="outline" className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
              Load More Logs
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LogAnalysis;
