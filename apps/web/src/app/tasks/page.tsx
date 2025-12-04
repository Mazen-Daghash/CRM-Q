'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '../../components/layout/main-layout';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth-store';
import { CheckSquare, Plus, XCircle, Clock, Filter, Edit, MessageSquare } from 'lucide-react';

export default function TasksPage() {
  const { user } = useAuthStore();
  const [tasks, setTasks] = useState<any[]>([]);
  const [allTasks, setAllTasks] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'assigned' | 'created' | 'team' | 'completed' | 'overdue' | 'all'>('assigned');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    assigneeId: '',
    dueAt: '',
    priority: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
    type: 'DESIGN' as 'DESIGN' | 'TENDER' | 'TECHNICAL_OFFICE' | 'PROJECTS' | 'PROJECT_CONTROL',
  });
  const [declineComment, setDeclineComment] = useState('');

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      let endpoint = '/tasks/me';
      
      if (user?.role === 'ADMIN') {
        endpoint = '/tasks/all';
        const response = await api.get(endpoint);
        setAllTasks(response.data);
        filterTasks(response.data, activeTab);
      } else if (user?.role === 'MANAGER') {
        if (activeTab === 'created') {
          endpoint = '/tasks/created';
        } else if (activeTab === 'team') {
          endpoint = '/tasks/team';
        } else if (activeTab === 'completed') {
          endpoint = '/tasks/created';
          const response = await api.get(endpoint);
          filterTasks(response.data.filter((t: any) => t.status === 'COMPLETED'), activeTab);
          setLoading(false);
          return;
        } else if (activeTab === 'overdue') {
          endpoint = '/tasks/created';
          const response = await api.get(endpoint);
          filterTasks(response.data.filter((t: any) => {
            return t.status !== 'COMPLETED' && new Date(t.dueAt) < new Date();
          }), activeTab);
          setLoading(false);
          return;
        } else {
          endpoint = '/tasks/me';
        }
        const response = await api.get(endpoint);
        filterTasks(response.data, activeTab);
      } else {
        if (activeTab === 'completed') {
          endpoint = '/tasks/me';
          const response = await api.get(endpoint);
          filterTasks(response.data.filter((t: any) => t.status === 'COMPLETED'), activeTab);
          setLoading(false);
          return;
        } else if (activeTab === 'overdue') {
          endpoint = '/tasks/me';
          const response = await api.get(endpoint);
          filterTasks(response.data.filter((t: any) => {
            return t.status !== 'COMPLETED' && new Date(t.dueAt) < new Date();
          }), activeTab);
          setLoading(false);
          return;
        }
        const response = await api.get(endpoint);
        filterTasks(response.data, activeTab);
      }

      if (user?.role === 'ADMIN' || user?.role === 'MANAGER') {
        const usersRes = await api.get('/users');
        setUsers(usersRes.data.filter((u: any) => u.role === 'JUNIOR'));
      }
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterTasks = (taskList: any[], tab: string) => {
    let filtered = taskList;
    
    if (tab === 'completed') {
      filtered = taskList.filter((t) => t.status === 'COMPLETED');
    } else if (tab === 'overdue') {
      filtered = taskList.filter((t) => t.status !== 'COMPLETED' && new Date(t.dueAt) < new Date());
    }
    
    if (filterType !== 'ALL') {
      filtered = filtered.filter((t) => t.type === filterType);
    }
    
    setTasks(filtered);
  };

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      filterTasks(allTasks, activeTab);
    } else {
      loadData();
    }
  }, [filterType]);

  const handleCreateTask = async () => {
    if (!taskForm.title || !taskForm.assigneeId || !taskForm.dueAt) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      await api.post('/tasks', taskForm);
      setShowCreateModal(false);
      setTaskForm({
        title: '',
        description: '',
        assigneeId: '',
        dueAt: '',
        priority: 'MEDIUM',
        type: 'DESIGN',
      });
      await loadData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to create task');
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      await api.post(`/tasks/${taskId}/complete`);
      await loadData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to complete task');
    }
  };

  const handleAcceptTask = async (taskId: string) => {
    try {
      await api.post(`/tasks/${taskId}/accept`);
      await loadData();
      setShowTaskModal(null);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to accept task');
    }
  };

  const handleDeclineTask = async (taskId: string) => {
    if (!declineComment.trim()) {
      alert('Please provide a reason for declining');
      return;
    }
    try {
      await api.post(`/tasks/${taskId}/decline`, { declineNotes: declineComment });
      await loadData();
      setShowTaskModal(null);
      setDeclineComment('');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to decline task');
    }
  };

  const handleUpdateTask = async (taskId: string, updates: any) => {
    try {
      await api.patch(`/tasks/${taskId}`, updates);
      await loadData();
      setShowTaskModal(null);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to update task');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'OVERDUE':
        return 'bg-red-100 text-red-800';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-red-100 text-red-800';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800';
      case 'LOW':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const isOverdue = (dueAt: string) => {
    return new Date(dueAt) < new Date() && tasks.find((t) => t.id === tasks.find((t) => t.dueAt === dueAt)?.id)?.status !== 'COMPLETED';
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
          <h1 className="text-3xl font-bold text-gray-900">Tasks</h1>
          <div className="flex gap-3">
            {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
              <>
                <div className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="border-none bg-transparent text-sm focus:outline-none"
                  >
                    <option value="ALL">All Types</option>
                    <option value="DESIGN">Design</option>
                    <option value="TENDER">Tender</option>
                    <option value="TECHNICAL_OFFICE">Technical Office</option>
                    <option value="PROJECTS">Projects</option>
                    <option value="PROJECT_CONTROL">Project Control</option>
                  </select>
                </div>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                  <Plus className="h-5 w-5" />
                  New Task
                </button>
              </>
            )}
          </div>
        </div>

        {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
          <div className="mb-6 flex gap-2 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('created')}
              className={`px-4 py-2 font-medium ${
                activeTab === 'created'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Tasks I Created
            </button>
            <button
              onClick={() => setActiveTab('team')}
              className={`px-4 py-2 font-medium ${
                activeTab === 'team'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Team Tasks
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`px-4 py-2 font-medium ${
                activeTab === 'completed'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Completed
            </button>
            <button
              onClick={() => setActiveTab('overdue')}
              className={`px-4 py-2 font-medium ${
                activeTab === 'overdue'
                  ? 'border-b-2 border-red-600 text-red-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Overdue
            </button>
            {user?.role === 'ADMIN' && (
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 font-medium ${
                  activeTab === 'all'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All Tasks
              </button>
            )}
          </div>
        )}

        {user?.role === 'JUNIOR' && (
          <div className="mb-6 flex gap-2 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('assigned')}
              className={`px-4 py-2 font-medium ${
                activeTab === 'assigned'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Assigned to Me
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`px-4 py-2 font-medium ${
                activeTab === 'completed'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Completed
            </button>
            <button
              onClick={() => setActiveTab('overdue')}
              className={`px-4 py-2 font-medium ${
                activeTab === 'overdue'
                  ? 'border-b-2 border-red-600 text-red-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Overdue
            </button>
          </div>
        )}

        <div className="space-y-4">
          {tasks.length === 0 ? (
            <div className="rounded-lg bg-white p-8 text-center shadow">
              <CheckSquare className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-4 text-gray-500">No tasks found</p>
            </div>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                className={`rounded-lg bg-white p-6 shadow ${isOverdue(task.dueAt) ? 'border-2 border-red-300' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-gray-900">{task.title}</h3>
                      {isOverdue(task.dueAt) && (
                        <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-800">
                          OVERDUE
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-gray-600">{task.description}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(task.status)}`}>
                        {task.status}
                      </span>
                      <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-800">
                        {task.type.replace('_', ' ')}
                      </span>
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>Due: {new Date(task.dueAt).toLocaleDateString()}</span>
                      </div>
                      {task.assignee && (
                        <span>
                          Assigned to: {task.assignee.firstName} {task.assignee.lastName}
                        </span>
                      )}
                    </div>
                    {task.comments && task.comments.length > 0 && (
                      <div className="mt-3 flex items-center gap-1 text-sm text-gray-500">
                        <MessageSquare className="h-4 w-4" />
                        <span>{task.comments.length} comment{task.comments.length > 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {user?.role === 'JUNIOR' && task.status !== 'COMPLETED' && (
                      <button
                        onClick={() => handleCompleteTask(task.id)}
                        className="flex items-center gap-1 rounded-md bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700"
                      >
                        <CheckSquare className="h-4 w-4" />
                        Mark Complete
                      </button>
                    )}
                    {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && task.status === 'COMPLETED' && (
                      <>
                        <button
                          onClick={() => {
                            setShowTaskModal(task);
                            setDeclineComment('');
                          }}
                          className="flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
                        >
                          Review
                        </button>
                      </>
                    )}
                    {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && task.createdById === user?.id && task.status !== 'COMPLETED' && (
                      <button
                        onClick={() => setShowTaskModal(task)}
                        className="flex items-center gap-1 rounded-md bg-gray-600 px-3 py-1 text-sm text-white hover:bg-gray-700"
                      >
                        <Edit className="h-4 w-4" />
                        Edit
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
              <h2 className="mb-4 text-xl font-semibold">Create New Task</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Title *</label>
                  <input
                    type="text"
                    value={taskForm.title}
                    onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={taskForm.description}
                    onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                    rows={4}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Assign To *</label>
                    <select
                      value={taskForm.assigneeId}
                      onChange={(e) => setTaskForm({ ...taskForm, assigneeId: e.target.value })}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    >
                      <option value="">Select user...</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.firstName} {u.lastName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Due Date *</label>
                    <input
                      type="datetime-local"
                      value={taskForm.dueAt}
                      onChange={(e) => setTaskForm({ ...taskForm, dueAt: e.target.value })}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Priority</label>
                    <select
                      value={taskForm.priority}
                      onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as any })}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Task Type</label>
                    <select
                      value={taskForm.type}
                      onChange={(e) => setTaskForm({ ...taskForm, type: e.target.value as any })}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    >
                      <option value="DESIGN">Design</option>
                      <option value="TENDER">Tender</option>
                      <option value="TECHNICAL_OFFICE">Technical Office</option>
                      <option value="PROJECTS">Projects</option>
                      <option value="PROJECT_CONTROL">Project Control</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setTaskForm({
                      title: '',
                      description: '',
                      assigneeId: '',
                      dueAt: '',
                      priority: 'MEDIUM',
                      type: 'DESIGN',
                    });
                  }}
                  className="flex-1 rounded-md border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateTask}
                  className="flex-1 rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
                >
                  Create Task
                </button>
              </div>
            </div>
          </div>
        )}

        {showTaskModal && showTaskModal.status === 'COMPLETED' && (user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
              <h2 className="mb-4 text-xl font-semibold">Review Completed Task</h2>
              <div className="mb-4 rounded-lg border border-gray-200 p-4">
                <h3 className="font-semibold">{showTaskModal.title}</h3>
                <p className="mt-2 text-sm text-gray-600">{showTaskModal.description}</p>
                <div className="mt-3 flex gap-2">
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(showTaskModal.status)}`}>
                    {showTaskModal.status}
                  </span>
                  <span className="rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-800">
                    {showTaskModal.type}
                  </span>
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Decline Reason (if declining)</label>
                <textarea
                  value={declineComment}
                  onChange={(e) => setDeclineComment(e.target.value)}
                  rows={3}
                  placeholder="Provide feedback for the junior..."
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowTaskModal(null);
                    setDeclineComment('');
                  }}
                  className="flex-1 rounded-md border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeclineTask(showTaskModal.id)}
                  className="flex-1 rounded-md bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700"
                >
                  <XCircle className="mr-2 inline h-4 w-4" />
                  Decline
                </button>
                <button
                  onClick={() => handleAcceptTask(showTaskModal.id)}
                  className="flex-1 rounded-md bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-700"
                >
                  <CheckSquare className="mr-2 inline h-4 w-4" />
                  Accept
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
