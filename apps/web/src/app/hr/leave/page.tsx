'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '../../../components/layout/main-layout';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../store/auth-store';
import { Calendar, Plus, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function LeavePage() {
  const { user } = useAuthStore();
  const [quotas, setQuotas] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [allRequests, setAllRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestType, setRequestType] = useState<'SICK' | 'VACATION'>('SICK');
  const [requestForm, setRequestForm] = useState({
    startDate: '',
    endDate: '',
    reason: '',
  });
  const [activeTab, setActiveTab] = useState<'my' | 'pending' | 'approved'>('my');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [quotasRes, requestsRes] = await Promise.all([
        api.get('/leave/quotas'),
        api.get('/leave/me'),
      ]);
      setQuotas(quotasRes.data);
      setRequests(requestsRes.data);

      if (user?.role === 'ADMIN') {
        const allRes = await api.get('/leave/all');
        setAllRequests(allRes.data);
      }
    } catch (error) {
      console.error('Failed to load leave data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestLeave = async () => {
    if (!requestForm.startDate || !requestForm.endDate) {
      toast.error('Please select start and end dates');
      return;
    }

    try {
      await api.post('/leave/request', {
        type: requestType,
        startDate: requestForm.startDate,
        endDate: requestForm.endDate,
        reason: requestForm.reason,
      });
      setShowRequestModal(false);
      setRequestForm({ startDate: '', endDate: '', reason: '' });
      await loadData();
      toast.success(`Leave request submitted successfully${requestType === 'SICK' ? '. It will be auto-approved if you have unused quota, otherwise requires admin approval.' : '. Requires admin approval.'}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to submit leave request');
    }
  };

  const handleApprove = async (id: string, comment?: string) => {
    try {
      await api.patch(`/leave/${id}/approve`, { comment });
      await loadData();
      toast.success('Leave request approved successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to approve request');
    }
  };

  const handleReject = async (id: string, comment: string) => {
    if (!comment.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    try {
      await api.patch(`/leave/${id}/reject`, { comment });
      await loadData();
      toast.success('Leave request rejected');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reject request');
    }
  };

  const calculateDays = () => {
    if (!requestForm.startDate || !requestForm.endDate) return 0;
    const start = new Date(requestForm.startDate);
    const end = new Date(requestForm.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
      case 'AUTO_APPROVED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const pendingRequests = allRequests.filter((r) => r.status === 'PENDING');
  const autoApprovedRequests = allRequests.filter((r) => r.status === 'AUTO_APPROVED');
  const approvedRequests = allRequests.filter((r) => r.status === 'APPROVED');

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
          <h1 className="text-3xl font-bold text-gray-900">Leave Management</h1>
          <button
            onClick={() => setShowRequestModal(true)}
            className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            <Plus className="h-5 w-5" />
            Request Leave
          </button>
        </div>

        {quotas && (
          <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-lg bg-white p-6 shadow">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Sick Days</h3>
                  <p className="mt-2 text-sm text-gray-600">
                    Remaining: <span className="font-bold text-green-600">{Math.max(0, quotas.sick?.remaining || 0)}</span> /{' '}
                    {quotas.sick?.allowance || 2} per month
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    First request auto-approved if unused. Additional requests require admin approval. You can request even after quota is exhausted. Resets monthly.
                  </p>
                </div>
                <AlertCircle className="h-8 w-8 text-green-400" />
              </div>
              <div className="mt-4 h-2 w-full rounded-full bg-gray-200">
                <div
                  className="h-2 rounded-full bg-green-600"
                  style={{
                    width: `${Math.min(Math.max(0, (quotas.sick?.remaining || 0) / (quotas.sick?.allowance || 2)) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>
            <div className="rounded-lg bg-white p-6 shadow">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Vacation Days</h3>
                  <p className="mt-2 text-sm text-gray-600">
                    Remaining: <span className="font-bold text-blue-600">{Math.max(0, quotas.vacation?.remaining || 0)}</span> /{' '}
                    {quotas.vacation?.allowance || 5} per quarter
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    All vacation requests require admin approval. Days deducted from quarterly quota. Resets every quarter.
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-blue-400" />
              </div>
              <div className="mt-4 h-2 w-full rounded-full bg-gray-200">
                <div
                  className="h-2 rounded-full bg-blue-600"
                  style={{
                    width: `${Math.min(Math.max(0, (quotas.vacation?.remaining || 0) / (quotas.vacation?.allowance || 5)) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {user?.role === 'ADMIN' && (
          <div className="mb-6 flex gap-2 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-4 py-2 font-medium ${
                activeTab === 'pending'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Pending Approval ({pendingRequests.length})
            </button>
            <button
              onClick={() => setActiveTab('approved')}
              className={`px-4 py-2 font-medium ${
                activeTab === 'approved'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Approved ({approvedRequests.length + autoApprovedRequests.length})
            </button>
            <button
              onClick={() => setActiveTab('my')}
              className={`px-4 py-2 font-medium ${
                activeTab === 'my'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              My Requests
            </button>
          </div>
        )}

        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold">
            {user?.role === 'ADMIN' && activeTab === 'pending'
              ? 'Pending Approval Requests'
              : user?.role === 'ADMIN' && activeTab === 'approved'
                ? 'Approved Requests'
                : 'My Leave Requests'}
          </h2>

          {user?.role === 'ADMIN' && activeTab === 'pending' && (
            <div className="space-y-4">
              {pendingRequests.length === 0 ? (
                <p className="text-gray-500">No pending requests</p>
              ) : (
                pendingRequests.map((request) => (
                  <div key={request.id} className="rounded-lg border border-gray-200 p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <p className="font-semibold">
                            {request.user.firstName} {request.user.lastName}
                          </p>
                          <span className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(request.type)}`}>
                            {request.type}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-gray-600">
                          {new Date(request.startDate).toLocaleDateString()} -{' '}
                          {new Date(request.endDate).toLocaleDateString()}
                        </p>
                        <p className="mt-1 text-sm text-gray-600">
                          Days: {Math.ceil((new Date(request.endDate).getTime() - new Date(request.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1}
                        </p>
                        {request.reason && (
                          <p className="mt-2 text-sm text-gray-700">{request.reason}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            const comment = prompt('Add approval comment (optional):');
                            handleApprove(request.id, comment || undefined);
                          }}
                          className="flex items-center gap-1 rounded-md bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => {
                            const comment = prompt('Reason for rejection (required):');
                            if (comment) handleReject(request.id, comment);
                          }}
                          className="flex items-center gap-1 rounded-md bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
                        >
                          <XCircle className="h-4 w-4" />
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {user?.role === 'ADMIN' && activeTab === 'approved' && (
            <div className="space-y-4">
              {approvedRequests.length === 0 && autoApprovedRequests.length === 0 ? (
                <p className="text-gray-500">No approved requests</p>
              ) : (
                [...approvedRequests, ...autoApprovedRequests].map((request) => (
                  <div key={request.id} className="flex items-center justify-between border-b pb-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <p className="font-semibold">
                          {request.user.firstName} {request.user.lastName}
                        </p>
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(request.type)}`}>
                          {request.type}
                        </span>
                        {request.status === 'AUTO_APPROVED' && (
                          <span className="text-xs text-gray-500">(Auto-Approved)</span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-gray-600">
                        {new Date(request.startDate).toLocaleDateString()} -{' '}
                        {new Date(request.endDate).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(request.status)}`}>
                      {request.status === 'AUTO_APPROVED' ? 'AUTO-APPROVED' : 'APPROVED'}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {(activeTab === 'my' || user?.role !== 'ADMIN') && (
            <div className="space-y-4">
              {requests.length === 0 ? (
                <p className="text-gray-500">No leave requests</p>
              ) : (
                requests.map((request) => (
                  <div key={request.id} className="flex items-center justify-between border-b pb-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(request.type)}`}>
                          {request.type}
                        </span>
                        {request.status === 'AUTO_APPROVED' && (
                          <span className="flex items-center gap-1 text-xs text-green-600">
                            <CheckCircle className="h-3 w-3" />
                            Auto-Approved
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-gray-600">
                        {new Date(request.startDate).toLocaleDateString()} -{' '}
                        {new Date(request.endDate).toLocaleDateString()}
                      </p>
                      {request.reason && (
                        <p className="mt-1 text-sm text-gray-700">{request.reason}</p>
                      )}
                      {request.adminComment && (
                        <p className="mt-1 text-xs text-gray-500">
                          Admin: {request.adminComment}
                        </p>
                      )}
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(request.status)}`}>
                      {request.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {showRequestModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
              <h2 className="mb-4 text-xl font-semibold">Request Leave</h2>
              <div className="mb-4 flex gap-2">
                <button
                  onClick={() => setRequestType('SICK')}
                  className={`flex-1 rounded-md px-4 py-2 font-medium ${
                    requestType === 'SICK'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Sick Day
                </button>
                <button
                  onClick={() => setRequestType('VACATION')}
                  className={`flex-1 rounded-md px-4 py-2 font-medium ${
                    requestType === 'VACATION'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Vacation
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Start Date</label>
                  <input
                    type="date"
                    value={requestForm.startDate}
                    onChange={(e) => setRequestForm({ ...requestForm, startDate: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">End Date</label>
                  <input
                    type="date"
                    value={requestForm.endDate}
                    onChange={(e) => setRequestForm({ ...requestForm, endDate: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  />
                </div>
                {calculateDays() > 0 && (
                  <div className="rounded-md bg-blue-50 p-3">
                    <p className="text-sm text-blue-800">
                      Requesting {calculateDays()} day{calculateDays() > 1 ? 's' : ''}
                      {requestType === 'SICK' && calculateDays() <= 2 && (
                        <span className="ml-2 font-semibold">(Will be auto-approved)</span>
                      )}
                    </p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Reason (Optional)</label>
                  <textarea
                    value={requestForm.reason}
                    onChange={(e) => setRequestForm({ ...requestForm, reason: e.target.value })}
                    rows={3}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => {
                    setShowRequestModal(false);
                    setRequestForm({ startDate: '', endDate: '', reason: '' });
                  }}
                  className="flex-1 rounded-md border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRequestLeave}
                  className="flex-1 rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
                >
                  Submit Request
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
