'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '../../../components/layout/main-layout';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../store/auth-store';
import { Clock, MapPin, BarChart3, Calendar } from 'lucide-react';
import Link from 'next/link';

export default function AttendancePage() {
  const { user } = useAuthStore();
  const [signedIn, setSignedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [todayRecord, setTodayRecord] = useState<any>(null);
  const [location, setLocation] = useState<{ city?: string; ip?: string; device?: string }>({});
  const [myAttendance, setMyAttendance] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadTodayStatus();
    getLocation();
    loadMyAttendance();
  }, []);

  const getLocation = async () => {
    try {
      // Get device info
      const device = navigator.userAgent;
      // In production, you'd get IP and city from an API
      setLocation({ 
        city: 'Unknown', 
        ip: 'Unknown',
        device: device.substring(0, 50) // Limit device string length
      });
    } catch (error) {
      console.error('Failed to get location:', error);
    }
  };

  const loadTodayStatus = async () => {
    try {
      const response = await api.get('/attendance/me', {
        params: {
          startDate: new Date().toISOString().split('T')[0],
        },
      });
      const records = response.data;
      const today = records.find((r: any) => {
        const recordDate = new Date(r.signInAt).toDateString();
        return recordDate === new Date().toDateString();
      });
      if (today && !today.signOutAt) {
        setSignedIn(true);
        setTodayRecord(today);
      } else if (today) {
        setTodayRecord(today);
      }
    } catch (error) {
      console.error('Failed to load attendance:', error);
    }
  };

  const loadMyAttendance = async () => {
    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const response = await api.get('/attendance/me', {
        params: {
          startDate: monthStart.toISOString(),
        },
      });
      setMyAttendance(response.data || []);
      
      // Calculate stats
      const totalDays = response.data?.length || 0;
      const totalMinutes = response.data?.reduce((sum: number, r: any) => sum + (r.totalMinutes || 0), 0) || 0;
      const onTimeDays = response.data?.filter((r: any) => r.status === 'ON_TIME').length || 0;
      
      setStats({
        totalDays,
        totalHours: Math.floor(totalMinutes / 60),
        totalMinutes: totalMinutes % 60,
        onTimeDays,
        onTimePercentage: totalDays > 0 ? (onTimeDays / totalDays) * 100 : 0,
      });
    } catch (error) {
      console.error('Failed to load attendance:', error);
    }
  };

  const handleSignIn = async () => {
    setLoading(true);
    try {
      await api.post('/attendance/sign-in', { location });
      setSignedIn(true);
      await loadTodayStatus();
      await loadMyAttendance();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await api.post('/attendance/sign-out', { location });
      setSignedIn(false);
      await loadTodayStatus();
      await loadMyAttendance();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to sign out');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ON_TIME':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'LATE':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'MISSED':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const formatHours = (minutes?: number) => {
    if (!minutes) return '0h 0m';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <MainLayout>
      <div className="p-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Attendance</h1>
          {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
            <Link
              href="/hr/attendance/dashboard"
              className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              <BarChart3 className="h-5 w-5" />
              View Dashboard
            </Link>
          )}
        </div>

        <div className="mb-8 rounded-lg bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Today's Status</h2>
              {todayRecord ? (
                <div className="mt-2">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(todayRecord.status)}`}>
                      {todayRecord.status === 'ON_TIME' ? '✓ On Time' : todayRecord.status === 'LATE' ? '⚠ Late' : '✗ Missed'}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    <p>Signed in: {new Date(todayRecord.signInAt).toLocaleTimeString()}</p>
                    {todayRecord.signOutAt && (
                      <>
                        <p>Signed out: {new Date(todayRecord.signOutAt).toLocaleTimeString()}</p>
                        <p>Total hours: {formatHours(todayRecord.totalMinutes)}</p>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-sm text-gray-500">Not signed in today</p>
              )}
            </div>
            <div className="flex gap-4">
              {!signedIn ? (
                <button
                  onClick={handleSignIn}
                  disabled={loading}
                  className="flex items-center gap-2 rounded-md bg-green-600 px-6 py-2 font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  <Clock className="h-5 w-5" />
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              ) : (
                <button
                  onClick={handleSignOut}
                  disabled={loading}
                  className="flex items-center gap-2 rounded-md bg-red-600 px-6 py-2 font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  <Clock className="h-5 w-5" />
                  {loading ? 'Signing out...' : 'Sign Out'}
                </button>
              )}
            </div>
          </div>
          {location.city && (
            <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
              <MapPin className="h-4 w-4" />
              <span>Location: {location.city}</span>
            </div>
          )}
        </div>

        {stats && (
          <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-4">
            <div className="rounded-lg bg-white p-6 shadow">
              <p className="text-sm font-medium text-gray-600">This Month</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{stats.totalDays} days</p>
            </div>
            <div className="rounded-lg bg-white p-6 shadow">
              <p className="text-sm font-medium text-gray-600">Total Hours</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {stats.totalHours}h {stats.totalMinutes}m
              </p>
            </div>
            <div className="rounded-lg bg-white p-6 shadow">
              <p className="text-sm font-medium text-gray-600">On-Time Rate</p>
              <p className="mt-2 text-2xl font-bold text-green-600">{stats.onTimePercentage.toFixed(1)}%</p>
            </div>
            <div className="rounded-lg bg-white p-6 shadow">
              <p className="text-sm font-medium text-gray-600">On-Time Days</p>
              <p className="mt-2 text-2xl font-bold text-green-600">{stats.onTimeDays}</p>
            </div>
          </div>
        )}

        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold">My Attendance History</h2>
          {myAttendance.length === 0 ? (
            <p className="text-gray-500">No attendance records</p>
          ) : (
            <div className="space-y-3">
              {myAttendance.map((record: any) => (
                <div
                  key={record.id}
                  className={`flex items-center justify-between rounded-lg border-2 p-4 ${getStatusColor(record.status)}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-4">
                      <Calendar className="h-5 w-5" />
                      <div>
                        <p className="font-semibold">{new Date(record.signInAt).toLocaleDateString()}</p>
                        <div className="mt-1 flex gap-4 text-sm">
                          <span>In: {new Date(record.signInAt).toLocaleTimeString()}</span>
                          {record.signOutAt && (
                            <span>Out: {new Date(record.signOutAt).toLocaleTimeString()}</span>
                          )}
                          {record.totalMinutes && (
                            <span>Hours: {formatHours(record.totalMinutes)}</span>
                          )}
                        </div>
                        {record.signInCity && (
                          <p className="mt-1 text-xs text-gray-600">
                            <MapPin className="mr-1 inline h-3 w-3" />
                            {record.signInCity}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className="rounded-full px-3 py-1 text-xs font-bold">
                    {record.status === 'ON_TIME' ? '✓' : record.status === 'LATE' ? '⚠' : '✗'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}


