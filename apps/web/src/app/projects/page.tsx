'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '../../components/layout/main-layout';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth-store';
import { FolderKanban, Plus } from 'lucide-react';

export default function ProjectsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [projectForm, setProjectForm] = useState({
    name: '',
    code: '',
    description: '',
    startDate: '',
    endDate: '',
    budget: '',
  });

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const response = await api.get('/projects');
      setProjects(response.data);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!projectForm.name || !projectForm.code || !projectForm.startDate) {
      alert('Please fill in all required fields (Name, Code, Start Date)');
      return;
    }

    try {
      const response = await api.post('/projects', {
        name: projectForm.name,
        code: projectForm.code,
        description: projectForm.description || undefined,
        startDate: projectForm.startDate,
        endDate: projectForm.endDate || undefined,
        budget: projectForm.budget ? parseFloat(projectForm.budget) : undefined,
      });
      
      setShowCreateModal(false);
      setProjectForm({
        name: '',
        code: '',
        description: '',
        startDate: '',
        endDate: '',
        budget: '',
      });
      
      // Navigate to the new project
      router.push(`/projects/${response.data.id}`);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to create project');
    }
  };

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
          <h1 className="text-3xl font-bold text-gray-900">Project Control</h1>
          {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              <Plus className="h-5 w-5" />
              New Project
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.length === 0 ? (
            <div className="col-span-full rounded-lg bg-white p-8 text-center shadow">
              <FolderKanban className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-4 text-gray-500">No projects found</p>
              {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                  Create Your First Project
                </button>
              )}
            </div>
          ) : (
            projects.map((project) => (
              <div key={project.id} className="rounded-lg bg-white p-6 shadow hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
                    <p className="mt-1 text-sm text-gray-600">Code: {project.code}</p>
                    {project.description && (
                      <p className="mt-2 text-sm text-gray-500 line-clamp-2">{project.description}</p>
                    )}
                    {project.budget && (
                      <p className="mt-2 text-sm font-medium text-gray-700">
                        Budget: ${Number(project.budget).toLocaleString()}
                      </p>
                    )}
                    <div className="mt-4 flex gap-4 text-sm text-gray-600">
                      <span>Milestones: {project._count?.milestones || 0}</span>
                      <span>Tasks: {project._count?.tasks || 0}</span>
                      <span>Invoices: {project._count?.invoices || 0}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <a
                    href={`/projects/${project.id}`}
                    className="text-sm font-medium text-blue-600 hover:text-blue-800"
                  >
                    View Details →
                  </a>
                </div>
              </div>
            ))
          )}
        </div>

        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
              <h2 className="mb-4 text-xl font-semibold">Create New Project</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Project Name *</label>
                  <input
                    type="text"
                    value={projectForm.name}
                    onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                    placeholder="e.g., Office Building Construction"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Project Code *</label>
                  <input
                    type="text"
                    value={projectForm.code}
                    onChange={(e) => setProjectForm({ ...projectForm, code: e.target.value.toUpperCase() })}
                    placeholder="e.g., PROJ-2024-001"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">Unique project identifier</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={projectForm.description}
                    onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                    rows={3}
                    placeholder="Project description..."
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Start Date *</label>
                    <input
                      type="date"
                      value={projectForm.startDate}
                      onChange={(e) => setProjectForm({ ...projectForm, startDate: e.target.value })}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">End Date</label>
                    <input
                      type="date"
                      value={projectForm.endDate}
                      onChange={(e) => setProjectForm({ ...projectForm, endDate: e.target.value })}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Budget</label>
                  <input
                    type="number"
                    value={projectForm.budget}
                    onChange={(e) => setProjectForm({ ...projectForm, budget: e.target.value })}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setProjectForm({
                      name: '',
                      code: '',
                      description: '',
                      startDate: '',
                      endDate: '',
                      budget: '',
                    });
                  }}
                  className="flex-1 rounded-md border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateProject}
                  className="flex-1 rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
                >
                  Create Project
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
