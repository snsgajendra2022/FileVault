import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { FaCheck, FaTimes, FaEye, FaImage, FaRupeeSign, FaClock, FaUser, FaFileImage } from 'react-icons/fa';
import toast from 'react-hot-toast';

interface PendingPayment {
  id: number;
  utrNumber: string;
  totalAmount: number;
  purchaseType: 'FULL_ALBUM' | 'INDIVIDUAL_IMAGES' | 'RELATED_USER_IMAGES';
  albumId?: number;
  imageIds?: number[];
  ownerUserId?: number;
  paymentScreenshot?: string;
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
  userEmail?: string;
  userName?: string;
  albumName?: string;
  imageCount?: number;
}

interface ConfirmPaymentData {
  ownerNotes?: string;
}

interface RejectPaymentData {
  reason: string;
}

const PaymentManagement = () => {
  const [selectedPayment, setSelectedPayment] = useState<PendingPayment | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [ownerNotes, setOwnerNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  const queryClient = useQueryClient();

  // Fetch pending payments
  const { data: pendingPayments, isLoading, refetch } = useQuery({
    queryKey: ['pendingPayments'],
    queryFn: async () => {
      const response = await api.get('/api/payments/owner/pending');
      return response.data as PendingPayment[] | { payments: PendingPayment[] } | { data: PendingPayment[] };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Extract payments array from response
  const payments = React.useMemo(() => {
    if (!pendingPayments) return [];
    if (Array.isArray(pendingPayments)) return pendingPayments;
    if ('payments' in pendingPayments && Array.isArray(pendingPayments.payments)) {
      return pendingPayments.payments;
    }
    if ('data' in pendingPayments && Array.isArray(pendingPayments.data)) {
      return pendingPayments.data;
    }
    return [];
  }, [pendingPayments]);


  // Confirm payment mutation
  const confirmPaymentMutation = useMutation({
    mutationFn: async ({ paymentId, data }: { paymentId: number; data: ConfirmPaymentData }) => {
      const response = await api.put(`/api/payments/owner/${paymentId}/confirm`, data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Payment confirmed successfully');
      setShowConfirmModal(false);
      setOwnerNotes('');
      setSelectedPayment(null);
      queryClient.invalidateQueries({ queryKey: ['pendingPayments'] });
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Failed to confirm payment';
      toast.error(errorMessage);
    },
  });

  // Reject payment mutation
  const rejectPaymentMutation = useMutation({
    mutationFn: async ({ paymentId, data }: { paymentId: number; data: RejectPaymentData }) => {
      const response = await api.put(`/api/payments/owner/${paymentId}/reject`, data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Payment rejected successfully');
      setShowRejectModal(false);
      setRejectReason('');
      setSelectedPayment(null);
      queryClient.invalidateQueries({ queryKey: ['pendingPayments'] });
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Failed to reject payment';
      toast.error(errorMessage);
    },
  });

  const handleConfirm = (payment: PendingPayment) => {
    setSelectedPayment(payment);
    setOwnerNotes('');
    setShowConfirmModal(true);
  };

  const handleReject = (payment: PendingPayment) => {
    setSelectedPayment(payment);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const handleViewDetails = (payment: PendingPayment) => {
    setSelectedPayment(payment);
    setShowDetailsModal(true);
  };

  const handleConfirmSubmit = () => {
    if (!selectedPayment) return;
    confirmPaymentMutation.mutate({
      paymentId: selectedPayment.id,
      data: { ownerNotes: ownerNotes.trim() || undefined },
    });
  };

  const handleRejectSubmit = () => {
    if (!selectedPayment) return;
    if (!rejectReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    rejectPaymentMutation.mutate({
      paymentId: selectedPayment.id,
      data: { reason: rejectReason.trim() },
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <FaRupeeSign className="mr-2 text-[#2731db]" />
            Payment Management
          </h1>
          <p className="text-gray-600 mt-1">Review and manage pending payment submissions</p>
        </div>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-[#2731db] text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Payments</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{payments.length}</p>
            </div>
            <FaClock className="text-3xl text-yellow-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Amount</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatAmount(payments.reduce((sum, p) => sum + (p.totalAmount || 0), 0))}
              </p>
            </div>
            <FaRupeeSign className="text-3xl text-green-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Images</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {payments.reduce((sum, p) => sum + (p.imageCount || p.imageIds?.length || 0), 0)}
              </p>
            </div>
            <FaImage className="text-3xl text-blue-500" />
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Purchase Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Submitted
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    Loading payments...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    No pending payments found
                  </td>
                </tr>
              ) : (
                payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="text-sm font-medium text-gray-900">UTR: {payment.utrNumber}</p>
                        <p className="text-xs text-gray-500">ID: {payment.id}</p>
                        {payment.albumName && (
                          <p className="text-xs text-gray-500">Album: {payment.albumName}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FaUser className="text-gray-400 mr-2" />
                        <div>
                          <p className="text-sm text-gray-900">{payment.userName || 'N/A'}</p>
                          <p className="text-xs text-gray-500">{payment.userEmail || 'N/A'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          {payment.purchaseType.replace('_', ' ')}
                        </span>
                        <p className="text-xs text-gray-500 mt-1">
                          {payment.imageCount || payment.imageIds?.length || 0} image(s)
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-green-600 font-semibold">
                        <FaRupeeSign className="mr-1" />
                        {payment.totalAmount}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(payment.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewDetails(payment)}
                          className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded"
                          title="View Details"
                        >
                          <FaEye />
                        </button>
                        <button
                          onClick={() => handleConfirm(payment)}
                          className="text-green-600 hover:text-green-900 p-2 hover:bg-green-50 rounded"
                          title="Confirm Payment"
                        >
                          <FaCheck />
                        </button>
                        <button
                          onClick={() => handleReject(payment)}
                          className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded"
                          title="Reject Payment"
                        >
                          <FaTimes />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirm Payment Modal */}
      {showConfirmModal && selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <FaCheck className="mr-2 text-green-600" />
                Confirm Payment
              </h2>
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setOwnerNotes('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes className="text-xl" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-2">Payment Details</p>
                <div className="space-y-1 text-sm">
                  <p><strong>UTR:</strong> {selectedPayment.utrNumber}</p>
                  <p><strong>Amount:</strong> {formatAmount(selectedPayment.totalAmount)}</p>
                  <p><strong>Type:</strong> {selectedPayment.purchaseType.replace('_', ' ')}</p>
                  <p><strong>Images:</strong> {selectedPayment.imageCount || selectedPayment.imageIds?.length || 0}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Owner Notes (Optional)
                </label>
                <textarea
                  value={ownerNotes}
                  onChange={(e) => setOwnerNotes(e.target.value)}
                  placeholder="Add any notes about this payment confirmation..."
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2731db] focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setOwnerNotes('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSubmit}
                disabled={confirmPaymentMutation.isPending}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {confirmPaymentMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Confirming...
                  </>
                ) : (
                  <>
                    <FaCheck className="mr-1" />
                    Confirm Payment
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Payment Modal */}
      {showRejectModal && selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <FaTimes className="mr-2 text-red-600" />
                Reject Payment
              </h2>
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes className="text-xl" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-2">Payment Details</p>
                <div className="space-y-1 text-sm">
                  <p><strong>UTR:</strong> {selectedPayment.utrNumber}</p>
                  <p><strong>Amount:</strong> {formatAmount(selectedPayment.totalAmount)}</p>
                  <p><strong>Type:</strong> {selectedPayment.purchaseType.replace('_', ' ')}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rejection Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Please provide a reason for rejecting this payment..."
                  rows={4}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500">
                  This reason will be communicated to the user.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectSubmit}
                disabled={rejectPaymentMutation.isPending || !rejectReason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {rejectPaymentMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Rejecting...
                  </>
                ) : (
                  <>
                    <FaTimes className="mr-1" />
                    Reject Payment
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Details Modal */}
      {showDetailsModal && selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <FaEye className="mr-2 text-blue-600" />
                Payment Details
              </h2>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes className="text-xl" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Payment ID</p>
                  <p className="text-lg font-semibold text-gray-900">{selectedPayment.id}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">UTR Number</p>
                  <p className="text-lg font-semibold text-gray-900">{selectedPayment.utrNumber}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Amount</p>
                  <p className="text-lg font-semibold text-green-600">
                    {formatAmount(selectedPayment.totalAmount)}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Purchase Type</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {selectedPayment.purchaseType.replace('_', ' ')}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">User</p>
                  <p className="text-sm font-medium text-gray-900">{selectedPayment.userName || 'N/A'}</p>
                  <p className="text-xs text-gray-500">{selectedPayment.userEmail || 'N/A'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Image Count</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {selectedPayment.imageCount || selectedPayment.imageIds?.length || 0}
                  </p>
                </div>
              </div>

              {selectedPayment.albumId && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Album ID</p>
                  <p className="text-sm font-medium text-gray-900">{selectedPayment.albumId}</p>
                  {selectedPayment.albumName && (
                    <p className="text-xs text-gray-500">Name: {selectedPayment.albumName}</p>
                  )}
                </div>
              )}

              {selectedPayment.imageIds && selectedPayment.imageIds.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-2">Image IDs</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedPayment.imageIds.map((id) => (
                      <span
                        key={id}
                        className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
                      >
                        {id}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedPayment.paymentScreenshot && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-2">Payment Screenshot</p>
                  <img
                    src={selectedPayment.paymentScreenshot}
                    alt="Payment screenshot"
                    className="max-w-full h-auto rounded-lg border border-gray-300"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Created At</p>
                  <p className="text-sm text-gray-900">{formatDate(selectedPayment.createdAt)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Updated At</p>
                  <p className="text-sm text-gray-900">{formatDate(selectedPayment.updatedAt)}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end p-6 border-t border-gray-200">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentManagement;

