
import React from 'react';
import { Shield, AlertTriangle, Activity, TrendingUp, Users, Globe, Clock, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';

const Dashboard = () => {
  const securityMetrics = [
    { title: "Total Events", value: "2,847", change: "+12%", icon: Activity, color: "text-blue-500" },
    { title: "Critical Alerts", value: "23", change: "-8%", icon: AlertTriangle, color: "text-red-500" },
    { title: "Active Sessions", value: "1,234", change: "+5%", icon: Users, color: "text-green-500" },
    { title: "Threat Score", value: "7.2/10", change: "+0.3", icon: Shield, color: "text-orange-500" },
  ];

  const eventData = [
    { time: '00:00', events: 45, threats: 2 },
    { time: '04:00', events: 32, threats: 1 },
    { time: '08:00', events: 78, threats: 5 },
    { time: '12:00', events: 95, threats: 8 },
    { time: '16:00', events: 123, threats: 12 },
    { time: '20:00', events: 87, threats: 6 },
  ];

  const threatTypes = [
    { name: 'Malware', value: 35, color: '#ef4444' },
    { name: 'Phishing', value: 25, color: '#f97316' },
    { name: 'DDoS', value: 20, color: '#eab308' },
    { name: 'Brute Force', value: 15, color: '#3b82f6' },
    { name: 'Others', value: 5, color: '#6b7280' },
  ];

  const recentIncidents = [
    { id: 1, type: "Malware Detection", severity: "High", time: "2 min ago", status: "Active" },
    { id: 2, type: "Failed Login Attempts", severity: "Medium", time: "15 min ago", status: "Investigating" },
    { id: 3, type: "Suspicious Network Traffic", severity: "Low", time: "1 hour ago", status: "Resolved" },
    { id: 4, type: "Unauthorized Access", severity: "Critical", time: "2 hours ago", status: "Containment" },
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'bg-red-500';
      case 'High': return 'bg-orange-500';
      case 'Medium': return 'bg-yellow-500';
      case 'Low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Security Dashboard</h1>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Clock className="h-4 w-4" />
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Security Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {securityMetrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <Card key={index} className="bg-slate-800 border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400">{metric.title}</p>
                    <p className="text-2xl font-bold text-white">{metric.value}</p>
                    <p className={`text-sm ${metric.change.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
                      {metric.change} from last hour
                    </p>
                  </div>
                  <Icon className={`h-8 w-8 ${metric.color}`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Events Timeline */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Security Events Timeline</CardTitle>
            <CardDescription className="text-slate-400">Events and threats over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={eventData}>
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
                <Area type="monotone" dataKey="events" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                <Area type="monotone" dataKey="threats" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.8} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Threat Distribution */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Threat Distribution</CardTitle>
            <CardDescription className="text-slate-400">Types of security threats detected</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={threatTypes}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {threatTypes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1f2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#fff'
                  }} 
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {threatTypes.map((type, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: type.color }}></div>
                  <span className="text-sm text-slate-300">{type.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Incidents */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Recent Security Incidents</CardTitle>
          <CardDescription className="text-slate-400">Latest security events requiring attention</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentIncidents.map((incident) => (
              <div key={incident.id} className="flex items-center justify-between p-4 bg-slate-700 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${getSeverityColor(incident.severity)}`}></div>
                  <div>
                    <p className="font-medium text-white">{incident.type}</p>
                    <p className="text-sm text-slate-400">{incident.time}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    incident.severity === 'Critical' ? 'bg-red-900 text-red-100' :
                    incident.severity === 'High' ? 'bg-orange-900 text-orange-100' :
                    incident.severity === 'Medium' ? 'bg-yellow-900 text-yellow-100' :
                    'bg-green-900 text-green-100'
                  }`}>
                    {incident.severity}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    incident.status === 'Active' ? 'bg-red-900 text-red-100' :
                    incident.status === 'Investigating' ? 'bg-yellow-900 text-yellow-100' :
                    incident.status === 'Containment' ? 'bg-orange-900 text-orange-100' :
                    'bg-green-900 text-green-100'
                  }`}>
                    {incident.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
