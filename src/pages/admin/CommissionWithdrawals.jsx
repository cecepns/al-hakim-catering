import { useEffect, useState } from 'react';
import { adminCommissionAPI } from '../../utils/api';
import { formatRupiah } from '../../utils/formatHelper';
import DashboardLayout from '../../components/DashboardLayout';
import { getImageUrl } from '../../utils/imageHelper';

const AdminCommissionWithdrawals = () => {
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
  const [statusModal, setStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchWithdrawals();
  }, [filter]);

  const fetchWithdrawals = async () => {
    try {
      setLoading(true);
      const params = filter !== 'all' ? { status: filter } : {};
      const response = await adminCommissionAPI.getWithdrawals(params);
      setWithdrawals(response.data);
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    // Selalu kirim status saat ini; jika user tidak mengubah dropdown,
    // newStatus sudah di-set ke status existing ketika modal dibuka.
    if (!newStatus || !selectedWithdrawal) return;

    try {
      setUpdating(true);
      const formData = new FormData();
      formData.append('status', newStatus);
      formData.append('admin_notes', adminNotes);
      if (proofFile) {
        formData.append('proof', proofFile);
      }

      await adminCommissionAPI.updateWithdrawalStatus(selectedWithdrawal.id, formData);
      alert('Status penarikan berhasil diupdate');
      setStatusModal(false);
      setSelectedWithdrawal(null);
      setNewStatus('');
      setAdminNotes('');
      setProofFile(null);
      fetchWithdrawals();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Gagal mengupdate status');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-blue-100 text-blue-800',
      rejected: 'bg-red-100 text-red-800',
      completed: 'bg-green-100 text-green-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Pending',
      approved: 'Disetujui',
      rejected: 'Ditolak',
      completed: 'Selesai',
    };
    return labels[status] || status;
  };

  const statuses = [
    { value: 'all', label: 'Semua' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Disetujui' },
    { value: 'rejected', label: 'Ditolak' },
    { value: 'completed', label: 'Selesai' },
  ];

  return (
    <DashboardLayout role="admin">
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Request Penarikan Komisi</h1>
          <p className="text-gray-600 mt-1">Kelola permintaan penarikan komisi dari marketing</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex space-x-2">
            {statuses.map((status) => (
              <button
                key={status.value}
                onClick={() => setFilter(status.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  filter === status.value
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : withdrawals.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl">
            <p className="text-gray-600">Tidak ada request penarikan</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Tanggal
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Marketing
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Jumlah
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Bank
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Rekening
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {withdrawals.map((withdrawal) => (
                    <tr key={withdrawal.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(withdrawal.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {withdrawal.marketing_name}
                        </div>
                        <div className="text-sm text-gray-500">{withdrawal.marketing_email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        Rp {formatRupiah(withdrawal.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {withdrawal.bank_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>{withdrawal.account_number}</div>
                        <div className="text-xs text-gray-500">{withdrawal.account_name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                            withdrawal.status
                          )}`}
                        >
                          {getStatusLabel(withdrawal.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => {
                            setSelectedWithdrawal(withdrawal);
                            setNewStatus(withdrawal.status || '');
                            setAdminNotes(withdrawal.admin_notes || '');
                            setProofFile(null);
                            setStatusModal(true);
                          }}
                          className={`${
                            withdrawal.status === 'pending'
                              ? 'text-primary-600 hover:text-primary-900'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          {withdrawal.status === 'pending' ? 'Proses' : 'Detail'}
                        </button>
                        {withdrawal.admin_notes && (
                          <div className="text-xs text-gray-500 mt-1">
                            Catatan: {withdrawal.admin_notes}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Status Update Modal */}
        {statusModal && selectedWithdrawal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6">
              {(() => {
                const isCompleted = selectedWithdrawal.status === 'completed';
                return null;
              })()}
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Detail & Update Penarikan Komisi
              </h3>
              <p className="text-xs text-gray-500 mb-4">
                Status saat ini:{' '}
                <span className="font-semibold">{getStatusLabel(selectedWithdrawal.status)}</span>
              </p>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-2">
                    Marketing: <span className="font-medium">{selectedWithdrawal.marketing_name}</span>
                  </p>
                  <p className="text-sm text-gray-600 mb-2">
                    Jumlah: <span className="font-medium">Rp {formatRupiah(selectedWithdrawal.amount)}</span>
                  </p>
                  <p className="text-sm text-gray-600 mb-4">
                    Bank: <span className="font-medium">{selectedWithdrawal.bank_name} - {selectedWithdrawal.account_number}</span>
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  {selectedWithdrawal.status === 'completed' && (
                    <p className="text-xs text-gray-500 mb-1">
                      Status sudah <span className="font-semibold">Selesai</span> dan tidak dapat diubah lagi.
                    </p>
                  )}
                  <select
                    value={newStatus}
                    onChange={(e) => {
                      if (selectedWithdrawal.status !== 'completed') {
                        setNewStatus(e.target.value);
                      }
                    }}
                    disabled={selectedWithdrawal.status === 'completed'}
                    className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 ${
                      selectedWithdrawal.status === 'completed' ? 'bg-gray-100 cursor-not-allowed' : ''
                    }`}
                  >
                    <option value="">Pilih Status</option>
                    <option value="approved">Disetujui</option>
                    <option value="rejected">Ditolak</option>
                    <option value="completed">Selesai</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Bukti Transfer (opsional)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                    className="w-full text-sm text-gray-700"
                  />
                  {selectedWithdrawal.proof_image_url && (
                    <div className="mt-3">
                      <p className="text-xs text-gray-500 mb-2">
                        Bukti saat ini sudah tersimpan. Upload baru akan menggantikan bukti lama.
                      </p>
                      <div className="border rounded-lg overflow-hidden bg-gray-50 p-2 max-h-72">
                        <img
                          src={getImageUrl(selectedWithdrawal.proof_image_url)}
                          alt="Bukti transfer"
                          className="max-h-64 mx-auto object-contain"
                        />
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Catatan Admin
                  </label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows="3"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="Tambahkan catatan..."
                  />
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setStatusModal(false);
                      setSelectedWithdrawal(null);
                      setNewStatus('');
                      setAdminNotes('');
                      setProofFile(null);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleStatusUpdate}
                    disabled={!newStatus || updating}
                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-400"
                  >
                    {updating ? 'Updating...' : 'Update'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminCommissionWithdrawals;

