'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { MainLayout } from '../../../components/layout/main-layout';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../store/auth-store';
import { Calendar, DollarSign, FileText, Plus, Upload, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function ProjectDetailPage() {
  const params = useParams();
  const { user } = useAuthStore();
  const projectId = params.id as string;
  const [project, setProject] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'schedules' | 'invoices' | 'costs'>('schedules');
  const [loading, setLoading] = useState(true);
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showCostModal, setShowCostModal] = useState(false);
  const [milestoneForm, setMilestoneForm] = useState({ name: '', description: '', deadline: '' });
  const [invoiceForm, setInvoiceForm] = useState({ vendor: '', amount: '', poNumber: '', dueDate: '', file: null as File | null });
  const [costForm, setCostForm] = useState({ category: '', planned: '', actual: '', reason: '' });
  const [costControl, setCostControl] = useState<any>(null);

  useEffect(() => {
    if (projectId) {
      loadProject();
      loadCostControl();
    }
  }, [projectId]);

  const loadProject = async () => {
    try {
      const response = await api.get(`/projects/${projectId}`);
      setProject(response.data);
    } catch (error) {
      console.error('Failed to load project:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCostControl = async () => {
    try {
      const response = await api.get(`/projects/${projectId}/cost-control`);
      setCostControl(response.data);
    } catch (error) {
      console.error('Failed to load cost control:', error);
    }
  };

  const handleCreateMilestone = async () => {
    if (!milestoneForm.name || !milestoneForm.deadline) {
      alert('Please fill in all required fields');
      return;
    }
    try {
      await api.post(`/projects/${projectId}/milestones`, milestoneForm);
      setShowMilestoneModal(false);
      setMilestoneForm({ name: '', description: '', deadline: '' });
      await loadProject();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to create milestone');
    }
  };

  const handleCreateInvoice = async () => {
    if (!invoiceForm.vendor || !invoiceForm.amount || !invoiceForm.dueDate) {
      alert('Please fill in all required fields');
      return;
    }
    try {
      // First create the invoice
      const invoiceResponse = await api.post('/projects/invoices', {
        projectId,
        vendor: invoiceForm.vendor,
        amount: parseFloat(invoiceForm.amount),
        poNumber: invoiceForm.poNumber || undefined,
        dueDate: invoiceForm.dueDate,
      });

      // Then upload file if provided
      if (invoiceForm.file && invoiceResponse.data?.id) {
        const formData = new FormData();
        formData.append('file', invoiceForm.file);
        await api.post(`/projects/invoices/${invoiceResponse.data.id}/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      setShowInvoiceModal(false);
      setInvoiceForm({ vendor: '', amount: '', poNumber: '', dueDate: '', file: null });
      await loadProject();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to create invoice');
    }
  };

  const handleCreateCost = async () => {
    if (!costForm.category || !costForm.planned || !costForm.actual) {
      alert('Please fill in all required fields');
      return;
    }
    try {
      await api.post(`/projects/${projectId}/costs`, costForm);
      setShowCostModal(false);
      setCostForm({ category: '', planned: '', actual: '', reason: '' });
      await loadCostControl();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to create cost entry');
    }
  };

  const handleUpdateMilestone = async (milestoneId: string, progress: number) => {
    try {
      await api.patch(`/projects/milestones/${milestoneId}`, { progress });
      await loadProject();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to update milestone');
    }
  };

  const handleUpdateInvoiceStatus = async (invoiceId: string, status: string) => {
    try {
      await api.patch(`/projects/invoices/${invoiceId}/status`, { status });
      await loadProject();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to update invoice status');
    }
  };

  const getMilestoneStatus = (milestone: any) => {
    const now = new Date();
    const deadline = new Date(milestone.deadline);
    const daysUntilDeadline = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (milestone.progress === 100) return { status: 'COMPLETE', color: 'bg-green-100 text-green-800' };
    if (daysUntilDeadline < 0) return { status: 'LATE', color: 'bg-red-100 text-red-800' };
    if (daysUntilDeadline <= 7) return { status: 'AT_RISK', color: 'bg-orange-100 text-orange-800' };
    return { status: 'ON_TRACK', color: 'bg-blue-100 text-blue-800' };
  };

  const getInvoiceStatus = (invoice: any) => {
    const now = new Date();
    const dueDate = new Date(invoice.dueDate);
    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (invoice.status === 'PAID') return { status: 'PAID', color: 'bg-green-100 text-green-800 border-green-300' };
    if (daysUntilDue < 0) return { status: 'OVERDUE', color: 'bg-red-100 text-red-800 border-red-300' };
    if (daysUntilDue <= 7) return { status: 'DUE_SOON', color: 'bg-orange-100 text-orange-800 border-orange-300' };
    return { status: 'PENDING', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' };
  };

  const renderGanttView = () => {
    if (!project?.milestones || project.milestones.length === 0) {
      return <p className="text-gray-500">No milestones. Create one to see the Gantt view.</p>;
    }

    const milestones = project.milestones.map((m: any) => {
      const start = new Date(project.startDate || new Date());
      const deadline = new Date(m.deadline);
      const daysFromStart = Math.ceil((deadline.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      return { ...m, daysFromStart, duration: 7 };
    });

    const maxDays = Math.max(...milestones.map((m: any) => m.daysFromStart + m.duration), 30);

    return (
      <div className="space-y-2">
        {milestones.map((milestone: any) => {
          const status = getMilestoneStatus(milestone);
          const widthPercent = (milestone.duration / maxDays) * 100;
          const leftPercent = (milestone.daysFromStart / maxDays) * 100;
          
          return (
            <div key={milestone.id} className="relative h-16 rounded border border-gray-200 bg-gray-50">
              <div className="absolute left-4 top-1/2 -translate-y-1/2">
                <p className="font-medium">{milestone.name}</p>
                <p className="text-xs text-gray-500">
                  Due: {new Date(milestone.deadline).toLocaleDateString()} | Progress: {milestone.progress}%
                </p>
              </div>
              <div
                className={`absolute top-0 h-full rounded ${status.color}`}
                style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
              >
                <div className="flex h-full items-center justify-center">
                  <span className="text-xs font-medium">{milestone.progress}%</span>
                </div>
              </div>
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <span className={`rounded-full px-2 py-1 text-xs font-medium ${status.color}`}>
                  {status.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="p-8">Loading...</div>
      </MainLayout>
    );
  }

  if (!project) {
    return (
      <MainLayout>
        <div className="p-8">Project not found</div>
      </MainLayout>
    );
  }

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  return (
    <MainLayout>
      <div className="p-8">
        <h1 className="mb-6 text-3xl font-bold text-gray-900">{project.name}</h1>

        <div className="mb-6 border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('schedules')}
              className={`border-b-2 px-1 py-4 text-sm font-medium ${
                activeTab === 'schedules'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              <Calendar className="mr-2 inline h-4 w-4" />
              Schedules & Milestones
            </button>
            <button
              onClick={() => setActiveTab('invoices')}
              className={`border-b-2 px-1 py-4 text-sm font-medium ${
                activeTab === 'invoices'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              <FileText className="mr-2 inline h-4 w-4" />
              Invoices
            </button>
            <button
              onClick={() => setActiveTab('costs')}
              className={`border-b-2 px-1 py-4 text-sm font-medium ${
                activeTab === 'costs'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              <DollarSign className="mr-2 inline h-4 w-4" />
              Cost Control
            </button>
          </nav>
        </div>

        {activeTab === 'schedules' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Schedules & Milestones</h2>
              {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
                <button
                  onClick={() => setShowMilestoneModal(true)}
                  className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                  <Plus className="h-5 w-5" />
                  Add Milestone
                </button>
              )}
            </div>

            <div className="rounded-lg bg-white p-6 shadow">
              <h3 className="mb-4 font-semibold">Gantt View</h3>
              {renderGanttView()}
            </div>

            <div className="rounded-lg bg-white p-6 shadow">
              <h3 className="mb-4 font-semibold">Milestone List</h3>
              {project.milestones?.length === 0 ? (
                <p className="text-gray-500">No milestones</p>
              ) : (
                <div className="space-y-4">
                  {project.milestones?.map((milestone: any) => {
                    const status = getMilestoneStatus(milestone);
                    return (
                      <div key={milestone.id} className="rounded-lg border border-gray-200 p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold">{milestone.name}</h4>
                            {milestone.description && (
                              <p className="mt-1 text-sm text-gray-600">{milestone.description}</p>
                            )}
                            <p className="mt-2 text-sm text-gray-500">
                              Deadline: {new Date(milestone.deadline).toLocaleDateString()}
                            </p>
                            <div className="mt-3">
                              <div className="flex items-center justify-between text-sm">
                                <span>Progress</span>
                                <span>{milestone.progress}%</span>
                              </div>
                              <div className="mt-1 h-2 w-full rounded-full bg-gray-200">
                                <div
                                  className="h-2 rounded-full bg-blue-600"
                                  style={{ width: `${milestone.progress}%` }}
                                />
                              </div>
                            </div>
                          </div>
                          <div className="ml-4 flex flex-col items-end gap-2">
                            <span className={`rounded-full px-3 py-1 text-xs font-medium ${status.color}`}>
                              {status.status}
                            </span>
                            {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={milestone.progress}
                                onChange={(e) => handleUpdateMilestone(milestone.id, parseInt(e.target.value))}
                                className="w-32"
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'invoices' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Invoices</h2>
              {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
                <button
                  onClick={() => setShowInvoiceModal(true)}
                  className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                  <Plus className="h-5 w-5" />
                  Add Invoice
                </button>
              )}
            </div>

            <div className="rounded-lg bg-white p-6 shadow">
              {project.invoices?.length === 0 ? (
                <p className="text-gray-500">No invoices</p>
              ) : (
                <div className="space-y-4">
                  {project.invoices?.map((invoice: any) => {
                    const status = getInvoiceStatus(invoice);
                    return (
                      <div
                        key={invoice.id}
                        className={`rounded-lg border-2 p-4 ${status.color.replace('bg-', 'bg-').replace('text-', 'border-')}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold">{invoice.vendor}</h4>
                            <p className="mt-1 text-sm text-gray-600">
                              Amount: ${Number(invoice.amount).toLocaleString()}
                            </p>
                            {invoice.poNumber && (
                              <p className="text-sm text-gray-600">PO Number: {invoice.poNumber}</p>
                            )}
                            <p className="text-sm text-gray-600">
                              Due: {new Date(invoice.dueDate).toLocaleDateString()}
                            </p>
                            {invoice.fileKey && (
                              <button
                                onClick={async () => {
                                  try {
                                    const token = localStorage.getItem('accessToken');
                                    const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/projects/invoices/${invoice.id}/file`;
                                    const response = await fetch(url, {
                                      headers: {
                                        Authorization: `Bearer ${token}`,
                                      },
                                    });
                                    if (response.ok) {
                                      const blob = await response.blob();
                                      const fileUrl = window.URL.createObjectURL(blob);
                                      window.open(fileUrl, '_blank');
                                    } else {
                                      alert('Failed to load file');
                                    }
                                  } catch (error) {
                                    alert('Failed to load file');
                                  }
                                }}
                                className="mt-2 inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                              >
                                <FileText className="h-4 w-4" />
                                View PDF
                              </button>
                            )}
                          </div>
                          <div className="ml-4 flex flex-col items-end gap-2">
                            <span className={`rounded-full px-3 py-1 text-xs font-medium ${status.color}`}>
                              {status.status}
                            </span>
                            {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && invoice.status !== 'PAID' && (
                              <button
                                onClick={() => handleUpdateInvoiceStatus(invoice.id, 'PAID')}
                                className="rounded-md bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700"
                              >
                                Mark Paid
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'costs' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Cost Control</h2>
              {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
                <button
                  onClick={() => setShowCostModal(true)}
                  className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                  <Plus className="h-5 w-5" />
                  Add Cost Entry
                </button>
              )}
            </div>

            {costControl && (
              <>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  <div className="rounded-lg bg-white p-6 shadow">
                    <p className="text-sm font-medium text-gray-600">Total Budget</p>
                    <p className="mt-2 text-2xl font-bold text-gray-900">
                      ${Number(project.budget || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-lg bg-white p-6 shadow">
                    <p className="text-sm font-medium text-gray-600">Planned Cost</p>
                    <p className="mt-2 text-2xl font-bold text-blue-600">
                      ${Number(costControl.summary?.totalPlanned || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-lg bg-white p-6 shadow">
                    <p className="text-sm font-medium text-gray-600">Actual Cost</p>
                    <p className="mt-2 text-2xl font-bold text-green-600">
                      ${Number(costControl.summary?.totalActual || 0).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="rounded-lg bg-white p-6 shadow">
                  <h3 className="mb-4 font-semibold">Budget vs Actual</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={[
                      { name: 'Budget', Planned: costControl.summary?.totalPlanned || 0, Actual: costControl.summary?.totalActual || 0 }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Planned" fill="#0088FE" />
                      <Bar dataKey="Actual" fill="#00C49F" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {costControl.monthlyBreakdown && Object.keys(costControl.monthlyBreakdown).length > 0 && (
                  <div className="rounded-lg bg-white p-6 shadow">
                    <h3 className="mb-4 font-semibold">Monthly Cash Flow</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart
                        data={Object.entries(costControl.monthlyBreakdown).map(([month, data]: [string, any]) => ({
                          month,
                          Planned: data.planned,
                          Actual: data.actual,
                        }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="Planned" stroke="#0088FE" strokeWidth={2} />
                        <Line type="monotone" dataKey="Actual" stroke="#00C49F" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {costControl.byCategory && Object.keys(costControl.byCategory).length > 0 && (
                  <div className="rounded-lg bg-white p-6 shadow">
                    <h3 className="mb-4 font-semibold">Cost Breakdown by Category</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={Object.entries(costControl.byCategory).map(([category, data]: [string, any]) => ({
                            name: category,
                            value: data.actual,
                          }))}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {Object.keys(costControl.byCategory).map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}

                <div className="rounded-lg bg-white p-6 shadow">
                  <h3 className="mb-4 font-semibold">Cost Deviations</h3>
                  {costControl.deviations?.length === 0 ? (
                    <p className="text-gray-500">No deviations</p>
                  ) : (
                    <div className="space-y-3">
                      {costControl.deviations?.map((deviation: any, index: number) => (
                        <div key={index} className="rounded-lg border border-gray-200 p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium">{deviation.category}</p>
                              <p className="mt-1 text-sm text-gray-600">
                                Planned: ${Number(deviation.planned).toLocaleString()} | Actual: ${Number(deviation.actual).toLocaleString()}
                              </p>
                              <p className="mt-1 text-sm font-semibold text-red-600">
                                Variance: ${Number(deviation.variance).toLocaleString()}
                              </p>
                              {deviation.reason && (
                                <p className="mt-2 text-sm text-gray-700">Reason: {deviation.reason}</p>
                              )}
                            </div>
                            <AlertTriangle className="h-5 w-5 text-orange-500" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Milestone Modal */}
        {showMilestoneModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
              <h2 className="mb-4 text-xl font-semibold">Add Milestone</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name *</label>
                  <input
                    type="text"
                    value={milestoneForm.name}
                    onChange={(e) => setMilestoneForm({ ...milestoneForm, name: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={milestoneForm.description}
                    onChange={(e) => setMilestoneForm({ ...milestoneForm, description: e.target.value })}
                    rows={3}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Deadline *</label>
                  <input
                    type="date"
                    value={milestoneForm.deadline}
                    onChange={(e) => setMilestoneForm({ ...milestoneForm, deadline: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => {
                    setShowMilestoneModal(false);
                    setMilestoneForm({ name: '', description: '', deadline: '' });
                  }}
                  className="flex-1 rounded-md border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateMilestone}
                  className="flex-1 rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Invoice Modal */}
        {showInvoiceModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
              <h2 className="mb-4 text-xl font-semibold">Add Invoice</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Vendor *</label>
                  <input
                    type="text"
                    value={invoiceForm.vendor}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, vendor: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Amount *</label>
                    <input
                      type="number"
                      value={invoiceForm.amount}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: e.target.value })}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">PO Number</label>
                    <input
                      type="text"
                      value={invoiceForm.poNumber}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, poNumber: e.target.value })}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Due Date *</label>
                  <input
                    type="date"
                    value={invoiceForm.dueDate}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Upload PDF</label>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, file: e.target.files?.[0] || null })}
                    className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => {
                    setShowInvoiceModal(false);
                    setInvoiceForm({ vendor: '', amount: '', poNumber: '', dueDate: '', file: null });
                  }}
                  className="flex-1 rounded-md border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateInvoice}
                  className="flex-1 rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cost Modal */}
        {showCostModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
              <h2 className="mb-4 text-xl font-semibold">Add Cost Entry</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Category *</label>
                  <input
                    type="text"
                    value={costForm.category}
                    onChange={(e) => setCostForm({ ...costForm, category: e.target.value })}
                    placeholder="e.g., Materials, Labor, Equipment"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Planned *</label>
                    <input
                      type="number"
                      value={costForm.planned}
                      onChange={(e) => setCostForm({ ...costForm, planned: e.target.value })}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Actual *</label>
                    <input
                      type="number"
                      value={costForm.actual}
                      onChange={(e) => setCostForm({ ...costForm, actual: e.target.value })}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Reason for Deviation</label>
                  <textarea
                    value={costForm.reason}
                    onChange={(e) => setCostForm({ ...costForm, reason: e.target.value })}
                    rows={3}
                    placeholder="Explain any variance between planned and actual..."
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => {
                    setShowCostModal(false);
                    setCostForm({ category: '', planned: '', actual: '', reason: '' });
                  }}
                  className="flex-1 rounded-md border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateCost}
                  className="flex-1 rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
