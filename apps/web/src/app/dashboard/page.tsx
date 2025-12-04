'use client';

import { MainLayout } from '../../components/layout/main-layout';
import { useAuthStore } from '../../store/auth-store';

export default function DashboardPage() {
  const { user } = useAuthStore();

  return (
    <MainLayout>
      <div className="p-8">
        <h1 className="mb-6 text-3xl font-bold text-gray-900">Dashboard</h1>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="text-sm font-medium text-gray-500">Welcome</h3>
            <p className="mt-2 text-2xl font-semibold text-gray-900">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="mt-1 text-sm text-gray-600">{user?.role}</p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="text-sm font-medium text-gray-500">Quick Actions</h3>
            <div className="mt-4 space-y-2">
              <a href="/hr/attendance" className="block text-sm text-blue-600 hover:text-blue-800">
                Sign In/Out
              </a>
              <a href="/tasks" className="block text-sm text-blue-600 hover:text-blue-800">
                View Tasks
              </a>
              <a href="/hr/leave" className="block text-sm text-blue-600 hover:text-blue-800">
                Request Leave
              </a>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}


