'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '../../../../components/layout/main-layout';
import { api } from '../../../../lib/api';
import { useAuthStore } from '../../../../store/auth-store';
import {
  Clock,
  MapPin,
  TrendingUp,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  BarChart3,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

type ViewMode = 'daily' | 'monthly';

export default function AttendanceDashboardPage() {
  const { user } = useAuthStore();
  const [dashboard, setDashboard] = useState<any>(null);
  const [monthlyAnalytics, setMonthlyAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (user?.role === 'ADMIN' || user?.role === 'MANAGER') {
      loadDashboard();
      if (viewMode === 'monthly') {
        loadMonthlyAnalytics();
      }
      // Auto-refresh every 30 seconds
      const interval = setInterval(() => {
        loadDashboard();
        if (viewMode === 'monthly') {
          loadMonthlyAnalytics();
        }
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [user, viewMode, selectedMonth, selectedYear]);

  const loadDashboard = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayEnd = new Date(today);
      todayEnd.setHours(23, 59, 59, 999);

      const response = await api.get('/attendance/dashboard', {
        params: {
          startDate: today.toISOString(),
          endDate: todayEnd.toISOString(),
        },
      });
      setDashboard(response.data);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMonthlyAnalytics = async () => {
    try {
      const response = await api.get('/attendance/monthly-analytics', {
        params: {
          year: selectedYear,
          month: selectedMonth,
        },
      });
      setMonthlyAnalytics(response.data);
    } catch (error) {
      console.error('Failed to load monthly analytics:', error);
    }
  };

  const getStatusColor = (status: string, signedOutEarly?: boolean, completedHours?: boolean) => {
    if (status === 'ON_LEAVE') {
      return 'bg-purple-100 text-purple-800 border-purple-300';
    }
    if (status === 'ON_TIME') {
      if (completedHours) {
        return 'bg-green-100 text-green-800 border-green-300';
      }
      return 'bg-green-100 text-green-800 border-green-300';
    }
    if (status === 'LATE') {
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    }
    if (status === 'MISSED') {
      return 'bg-red-100 text-red-800 border-red-300';
    }
    if (signedOutEarly) {
      return 'bg-red-100 text-red-800 border-red-300';
    }
    return 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getStatusBadge = (item: any) => {
    if (item.status === 'ON_LEAVE') {
      return (
        <span className="rounded-full bg-purple-600 px-3 py-1 text-xs font-bold text-white">
          🏖️ On Leave ({item.leave?.type})
        </span>
      );
    }
    if (item.status === 'ON_TIME') {
      if (item.completedHours) {
        return (
          <span className="rounded-full bg-green-600 px-3 py-1 text-xs font-bold text-white">
            ✓ On Time (Complete)
          </span>
        );
      }
      return (
        <span className="rounded-full bg-green-600 px-3 py-1 text-xs font-bold text-white">
          ✓ On Time
        </span>
      );
    }
    if (item.status === 'LATE') {
      return (
        <span className="rounded-full bg-yellow-600 px-3 py-1 text-xs font-bold text-white">
          ⚠ Late ({item.lateMinutes ? `${item.lateMinutes}m` : ''})
        </span>
      );
    }
    if (item.status === 'MISSED') {
      return (
        <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white">
          ✗ Did Not Sign In
        </span>
      );
    }
    if (item.signedOutEarly) {
      return (
        <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white">
          ⚠ Signed Out Early
        </span>
      );
    }
    return null;
  };

  const formatHours = (minutes?: number) => {
    if (!minutes) return '0h 0m';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatLocation = (item: any) => {
    const parts = [];
    if (item.signInCity) parts.push(item.signInCity);
    if (item.signInIp) parts.push(`IP: ${item.signInIp}`);
    if (item.signInDevice) parts.push(item.signInDevice);
    return parts.length > 0 ? parts.join(' • ') : 'Location not available';
  };

  if (user?.role !== 'ADMIN' && user?.role !== 'MANAGER') {
    return (
      <MainLayout>
        <div className="p-8">
          <div className="rounded-lg bg-red-50 p-4 text-red-800">
            Access denied. Only admins and managers can view this page.
          </div>
        </div>
      </MainLayout>
    );
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="p-8">Loading...</div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Attendance Dashboard</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('daily')}
              className={`rounded-md px-4 py-2 text-sm font-medium ${
                viewMode === 'daily'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <Clock className="mr-2 inline h-4 w-4" />
              Daily View
            </button>
            <button
              onClick={() => {
                setViewMode('monthly');
                loadMonthlyAnalytics();
              }}
              className={`rounded-md px-4 py-2 text-sm font-medium ${
                viewMode === 'monthly'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <BarChart3 className="mr-2 inline h-4 w-4" />
              Monthly Analytics
            </button>
          </div>
        </div>

        {viewMode === 'daily' && (
          <>
            {/* Daily Summary Metrics */}
            {dashboard?.stats && (
              <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-7">
                <div className="rounded-lg bg-white p-4 shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-600">Total Employees</p>
                      <p className="mt-1 text-2xl font-bold text-gray-900">{dashboard.stats.totalEmployees}</p>
                    </div>
                    <Users className="h-6 w-6 text-gray-400" />
                  </div>
                </div>
                <div className="rounded-lg bg-green-50 p-4 shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-green-700">On Time</p>
                      <p className="mt-1 text-2xl font-bold text-green-600">{dashboard.stats.onTimeToday}</p>
                    </div>
                    <CheckCircle className="h-6 w-6 text-green-400" />
                  </div>
                </div>
                <div className="rounded-lg bg-yellow-50 p-4 shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-yellow-700">Late</p>
                      <p className="mt-1 text-2xl font-bold text-yellow-600">{dashboard.stats.lateToday}</p>
                    </div>
                    <AlertCircle className="h-6 w-6 text-yellow-400" />
                  </div>
                </div>
                <div className="rounded-lg bg-red-50 p-4 shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-red-700">Did Not Sign In</p>
                      <p className="mt-1 text-2xl font-bold text-red-600">{dashboard.stats.missedToday}</p>
                    </div>
                    <XCircle className="h-6 w-6 text-red-400" />
                  </div>
                </div>
                <div className="rounded-lg bg-red-50 p-4 shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-red-700">Signed Out Early</p>
                      <p className="mt-1 text-2xl font-bold text-red-600">
                        {dashboard.stats.signedOutEarlyToday || 0}
                      </p>
                    </div>
                    <Clock className="h-6 w-6 text-red-400" />
                  </div>
                </div>
                <div className="rounded-lg bg-green-50 p-4 shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-green-700">Completed Hours</p>
                      <p className="mt-1 text-2xl font-bold text-green-600">
                        {dashboard.stats.completedHoursToday || 0}
                      </p>
                    </div>
                    <CheckCircle className="h-6 w-6 text-green-400" />
                  </div>
                </div>
                <div className="rounded-lg bg-purple-50 p-4 shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-purple-700">On Leave</p>
                      <p className="mt-1 text-2xl font-bold text-purple-600">
                        {dashboard.stats.onLeaveToday || 0}
                      </p>
                    </div>
                    <Calendar className="h-6 w-6 text-purple-400" />
                  </div>
                </div>
              </div>
            )}

            {/* Daily Attendance Table */}
            <div className="rounded-lg bg-white p-6 shadow">
              <h2 className="mb-4 text-xl font-semibold">Today's Attendance ({new Date().toLocaleDateString()})</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Employee</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Department</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Sign-In Time</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Sign-Out Time</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Location</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Work Hours</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard?.todayStatus?.map((item: any) => (
                      <tr
                        key={item.user.id}
                        className={`border-b border-gray-100 transition-colors hover:bg-gray-50 ${
                          item.status === 'ON_TIME' && item.completedHours
                            ? 'bg-green-50'
                            : item.status === 'ON_TIME'
                              ? 'bg-green-50'
                              : item.status === 'LATE'
                                ? 'bg-yellow-50'
                                : item.status === 'ON_LEAVE'
                                  ? 'bg-purple-50'
                                  : 'bg-red-50'
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-900">
                            {item.user.firstName} {item.user.lastName}
                          </div>
                          {item.user.role && (
                            <div className="text-xs text-gray-500">{item.user.role}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {item.user.department || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {item.signInAt ? (
                            <div>
                              <div className="font-medium">
                                {new Date(item.signInAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </div>
                              {item.lateMinutes && item.lateMinutes >= 30 && (
                                <div className="text-xs text-yellow-600">
                                  {item.lateMinutes} min late
                                </div>
                              )}
                            </div>
                          ) : item.leave ? (
                            <span className="text-purple-600">On Leave</span>
                          ) : (
                            <span className="text-red-600">No sign-in</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {item.signOutAt ? (
                            <div>
                              <div className="font-medium">
                                {new Date(item.signOutAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </div>
                              {item.signedOutEarly && (
                                <div className="text-xs text-red-600">Early</div>
                              )}
                              {item.completedHours && (
                                <div className="text-xs text-green-600">Complete</div>
                              )}
                            </div>
                          ) : item.leave ? (
                            <span className="text-purple-600">-</span>
                          ) : (
                            <span className="text-gray-400">Not signed out</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {item.leave ? (
                            <div className="text-purple-600">
                              <div className="font-medium">{item.leave.type}</div>
                              <div className="text-xs">
                                {new Date(item.leave.startDate).toLocaleDateString()} -{' '}
                                {new Date(item.leave.endDate).toLocaleDateString()}
                              </div>
                              <div className="text-xs">
                                {item.leave.daysRemaining} day(s) remaining
                              </div>
                            </div>
                          ) : item.signInAt ? (
                            <div className="flex items-center gap-1 text-xs">
                              <MapPin className="h-3 w-3" />
                              <span>{formatLocation(item)}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {item.totalMinutes ? (
                            <div>
                              <div className="font-medium">{formatHours(item.totalMinutes)}</div>
                              {item.completedHours ? (
                                <div className="text-xs text-green-600">✓ Complete</div>
                              ) : item.signedOutEarly ? (
                                <div className="text-xs text-red-600">⚠ Incomplete</div>
                              ) : null}
                            </div>
                          ) : item.leave ? (
                            <span className="text-purple-600">-</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">{getStatusBadge(item)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {viewMode === 'monthly' && (
          <div className="space-y-6">
            {/* Month/Year Selector */}
            <div className="rounded-lg bg-white p-4 shadow">
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-gray-700">Month:</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => {
                    setSelectedMonth(parseInt(e.target.value, 10));
                  }}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {new Date(2000, m - 1, 1).toLocaleString('default', { month: 'long' })}
                    </option>
                  ))}
                </select>
                <label className="text-sm font-medium text-gray-700">Year:</label>
                <select
                  value={selectedYear}
                  onChange={(e) => {
                    setSelectedYear(parseInt(e.target.value, 10));
                  }}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <button
                  onClick={loadMonthlyAnalytics}
                  className="ml-auto rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Load Analytics
                </button>
              </div>
            </div>

            {monthlyAnalytics && (
              <>
                {/* Monthly Summary */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg bg-white p-6 shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Work Days</p>
                        <p className="mt-2 text-3xl font-bold text-gray-900">
                          {monthlyAnalytics.totalWorkDays}
                        </p>
                      </div>
                      <Calendar className="h-8 w-8 text-gray-400" />
                    </div>
                  </div>
                  <div className="rounded-lg bg-green-50 p-6 shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-700">On Time Days</p>
                        <p className="mt-2 text-3xl font-bold text-green-600">
                          {monthlyAnalytics.summary.totalOnTimeDays}
                        </p>
                        <p className="mt-1 text-xs text-green-600">
                          {monthlyAnalytics.summary.onTimePercentage.toFixed(1)}%
                        </p>
                      </div>
                      <CheckCircle className="h-8 w-8 text-green-400" />
                    </div>
                  </div>
                  <div className="rounded-lg bg-yellow-50 p-6 shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-yellow-700">Late Days</p>
                        <p className="mt-2 text-3xl font-bold text-yellow-600">
                          {monthlyAnalytics.summary.totalLateDays}
                        </p>
                        <p className="mt-1 text-xs text-yellow-600">
                          {monthlyAnalytics.summary.latePercentage.toFixed(1)}%
                        </p>
                      </div>
                      <AlertCircle className="h-8 w-8 text-yellow-400" />
                    </div>
                  </div>
                  <div className="rounded-lg bg-red-50 p-6 shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-red-700">Absent Days</p>
                        <p className="mt-2 text-3xl font-bold text-red-600">
                          {monthlyAnalytics.summary.totalAbsentDays}
                        </p>
                        <p className="mt-1 text-xs text-red-600">
                          {monthlyAnalytics.summary.absentPercentage.toFixed(1)}%
                        </p>
                      </div>
                      <XCircle className="h-8 w-8 text-red-400" />
                    </div>
                  </div>
                </div>

                {/* Leave Summary */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="rounded-lg bg-blue-50 p-6 shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-700">Sick Days</p>
                        <p className="mt-2 text-3xl font-bold text-blue-600">
                          {monthlyAnalytics.summary.totalSickDays}
                        </p>
                      </div>
                      <Calendar className="h-8 w-8 text-blue-400" />
                    </div>
                  </div>
                  <div className="rounded-lg bg-purple-50 p-6 shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-purple-700">Vacation Days</p>
                        <p className="mt-2 text-3xl font-bold text-purple-600">
                          {monthlyAnalytics.summary.totalVacationDays}
                        </p>
                      </div>
                      <Calendar className="h-8 w-8 text-purple-400" />
                    </div>
                  </div>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div className="rounded-lg bg-white p-6 shadow">
                    <h3 className="mb-4 text-lg font-semibold">Attendance Distribution</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={[
                          {
                            name: 'On Time',
                            value: monthlyAnalytics.summary.totalOnTimeDays,
                            percentage: monthlyAnalytics.summary.onTimePercentage,
                          },
                          {
                            name: 'Late',
                            value: monthlyAnalytics.summary.totalLateDays,
                            percentage: monthlyAnalytics.summary.latePercentage,
                          },
                          {
                            name: 'Absent',
                            value: monthlyAnalytics.summary.totalAbsentDays,
                            percentage: monthlyAnalytics.summary.absentPercentage,
                          },
                        ]}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip
                          formatter={(value: number, name: string, props: any) => [
                            `${value} days (${props.payload.percentage.toFixed(1)}%)`,
                            name,
                          ]}
                        />
                        <Legend />
                        <Bar dataKey="value" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="rounded-lg bg-white p-6 shadow">
                    <h3 className="mb-4 text-lg font-semibold">Attendance Breakdown</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={[
                            {
                              name: 'On Time',
                              value: monthlyAnalytics.summary.totalOnTimeDays,
                              color: '#10b981',
                            },
                            {
                              name: 'Late',
                              value: monthlyAnalytics.summary.totalLateDays,
                              color: '#f59e0b',
                            },
                            {
                              name: 'Absent',
                              value: monthlyAnalytics.summary.totalAbsentDays,
                              color: '#ef4444',
                            },
                            {
                              name: 'Sick',
                              value: monthlyAnalytics.summary.totalSickDays,
                              color: '#3b82f6',
                            },
                            {
                              name: 'Vacation',
                              value: monthlyAnalytics.summary.totalVacationDays,
                              color: '#a855f7',
                            },
                          ]}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {[
                            { name: 'On Time', color: '#10b981' },
                            { name: 'Late', color: '#f59e0b' },
                            { name: 'Absent', color: '#ef4444' },
                            { name: 'Sick', color: '#3b82f6' },
                            { name: 'Vacation', color: '#a855f7' },
                          ].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Employee Monthly Summaries */}
                <div className="rounded-lg bg-white p-6 shadow">
                  <h2 className="mb-4 text-xl font-semibold">Employee Monthly Summaries</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Employee</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Department</th>
                          <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">On Time</th>
                          <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Late</th>
                          <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Absent</th>
                          <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Sick Days</th>
                          <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Vacation</th>
                          <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Reliability</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthlyAnalytics.employeeSummaries?.map((summary: any) => (
                          <tr
                            key={summary.user.id}
                            className="border-b border-gray-100 transition-colors hover:bg-gray-50"
                          >
                            <td className="px-4 py-3">
                              <div className="font-semibold text-gray-900">
                                {summary.user.firstName} {summary.user.lastName}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {summary.user.department || 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                                {summary.onTimeDays}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-800">
                                {summary.lateDays}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-800">
                                {summary.absentDays}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
                                {summary.sickDays}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="rounded-full bg-purple-100 px-3 py-1 text-sm font-medium text-purple-800">
                                {summary.vacationDays}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <div className="flex-1 rounded-full bg-gray-200" style={{ maxWidth: '100px' }}>
                                  <div
                                    className={`h-2 rounded-full ${
                                      summary.reliability >= 90
                                        ? 'bg-green-600'
                                        : summary.reliability >= 70
                                          ? 'bg-yellow-600'
                                          : 'bg-red-600'
                                    }`}
                                    style={{ width: `${Math.min(summary.reliability, 100)}%` }}
                                  />
                                </div>
                                <span className="text-sm font-medium text-gray-700">
                                  {summary.reliability.toFixed(1)}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
