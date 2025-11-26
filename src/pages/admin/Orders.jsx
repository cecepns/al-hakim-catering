import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pin, PinOff } from 'lucide-react';
import { orderAPI } from '../../utils/api';
import { formatRupiah } from '../../utils/formatHelper';
import DashboardLayout from '../../components/DashboardLayout';
import InvoiceModal from '../../components/InvoiceModal';

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [editingNotes, setEditingNotes] = useState(null);
  const [notesValue, setNotesValue] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [pinningOrderId, setPinningOrderId] = useState(null);

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = filter !== 'all' ? { status: filter } : {};
      const response = await orderAPI.getAll(params);
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditNotes = (order) => {
    // Extract kitchen notes or admin notes from delivery_notes
    let existingNotes = '';
    if (order.delivery_notes) {
      try {
        const parsed = typeof order.delivery_notes === 'string' && order.delivery_notes.trim().startsWith('{')
          ? JSON.parse(order.delivery_notes)
          : { notes: order.delivery_notes };
        existingNotes = parsed.kitchen_notes || parsed.admin_notes || parsed.notes || '';
      } catch {
        existingNotes = order.delivery_notes || '';
      }
    }
    setEditingNotes(order.id);
    setNotesValue(existingNotes);
  };

  const handleSaveNotes = async (orderId) => {
    try {
      setSavingNotes(true);
      await orderAPI.updateNotes(orderId, { notes: notesValue });
      alert('Catatan berhasil disimpan');
      setEditingNotes(null);
      setNotesValue('');
      fetchOrders();
    } catch (error) {
      console.error('Error saving notes:', error);
      alert('Gagal menyimpan catatan');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingNotes(null);
    setNotesValue('');
  };

  const getStatusColor = (status) => {
    const colors = {
      dibuat: 'bg-blue-100 text-blue-800',
      diproses: 'bg-yellow-100 text-yellow-800',
      dikirim: 'bg-purple-100 text-purple-800',
      selesai: 'bg-green-100 text-green-800',
      dibatalkan: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPaymentStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      partial: 'bg-orange-100 text-orange-800',
      paid: 'bg-green-100 text-green-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getNotesDisplay = (order) => {
    if (!order.delivery_notes) return '-';
    try {
      const parsed = typeof order.delivery_notes === 'string' && order.delivery_notes.trim().startsWith('{')
        ? JSON.parse(order.delivery_notes)
        : { notes: order.delivery_notes };
      return parsed.kitchen_notes || parsed.admin_notes || parsed.notes || '-';
    } catch {
      return order.delivery_notes || '-';
    }
  };

  const handlePinOrder = async (orderId, currentPinnedStatus) => {
    try {
      setPinningOrderId(orderId);
      await orderAPI.pinOrder(orderId, !currentPinnedStatus);
      await fetchOrders();
    } catch (error) {
      console.error('Error pinning/unpinning order:', error);
      alert(error.response?.data?.message || 'Gagal mengubah status sematkan');
    } finally {
      setPinningOrderId(null);
    }
  };

  const statuses = [
    { value: 'all', label: 'Semua' },
    { value: 'dibuat', label: 'Dibuat' },
    { value: 'diproses', label: 'Diproses' },
    { value: 'dikirim', label: 'Dikirim' },
    { value: 'selesai', label: 'Selesai' },
    { value: 'dibatalkan', label: 'Dibatalkan' },
  ];

  const formatTime = (time) => {
    if (!time) return '-';
    // Format time from HH:MM:SS to HH:MM
    return time.substring(0, 5);
  };

  return (
    <DashboardLayout role="admin">
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Manajemen Pesanan</h1>
          <p className="text-gray-600 mt-1">Pantau dan kelola semua pesanan</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex space-x-2 overflow-x-auto">
              {statuses.map((status) => (
                <button
                  key={status.value}
                  onClick={() => setFilter(status.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
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
          ) : orders.length === 0 ? (
            <div className="text-center py-12">
              <svg
                className="w-16 h-16 text-gray-400 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              <p className="text-gray-600">Belum ada pesanan</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1400px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                      Id Pesanan
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                      Pelanggan
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                      No. WA
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                      Alamat
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                      Kategori
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                      Tgl Acara
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                      Jam Acara
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                      Pembayaran
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                      Catatan
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                      Aksi
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                      Sematkan
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.map((order) => (
                    <tr
                      key={order.id}
                      className={`hover:bg-gray-50 transition-colors ${
                        order.is_pinned ? 'bg-yellow-50 border-l-4 border-yellow-400' : ''
                      }`}
                    >
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          {!!order.is_pinned && (
                            <Pin size={16} className="text-yellow-600" fill="currentColor" />
                          )}
                          <span>#{order.id}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        <div className="font-medium text-gray-900">{order.customer_name}</div>
                        <div className="text-gray-500 text-xs">{order.customer_email}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                        {order.customer_phone || order.guest_wa_number_1 || '-'}
                        {order.guest_wa_number_2 && (
                          <div className="text-xs text-gray-500">{order.guest_wa_number_2}</div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600 max-w-xs">
                        <div className="truncate" title={order.delivery_address}>
                          {order.delivery_address || '-'}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                        {order.categories || '-'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                        {order.guest_event_date
                          ? new Date(order.guest_event_date).toLocaleDateString('id-ID', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })
                          : '-'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatTime(order.guest_event_time)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        <div className="flex flex-col gap-1">
                          <span
                            className={`px-2 py-1 inline-flex text-xs leading-4 font-semibold rounded-full ${getPaymentStatusColor(
                              order.payment_status
                            )}`}
                          >
                            {order.payment_method} - {order.payment_status}
                          </span>
                          <span className="text-xs text-gray-600">
                            Rp {formatRupiah(order.final_amount)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600 min-w-[200px]">
                        {editingNotes === order.id ? (
                          <div className="space-y-2">
                            <textarea
                              value={notesValue}
                              onChange={(e) => setNotesValue(e.target.value)}
                              className="w-full px-2 py-1 text-xs border border-gray-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
                              rows="3"
                              placeholder="Catatan untuk proses dapur..."
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleSaveNotes(order.id)}
                                disabled={savingNotes}
                                className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 transition"
                              >
                                {savingNotes ? 'Menyimpan...' : 'Simpan'}
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                disabled={savingNotes}
                                className="px-2 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400 disabled:opacity-50 transition"
                              >
                                Batal
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start gap-2">
                            <div className="flex-1 truncate max-w-[180px]" title={getNotesDisplay(order)}>
                              {getNotesDisplay(order) || '-'}
                            </div>
                            <button
                              onClick={() => handleEditNotes(order)}
                              className="flex-shrink-0 text-primary-600 hover:text-primary-800 text-xs transition p-1 hover:bg-primary-50 rounded"
                              title="Edit catatan"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                />
                              </svg>
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 inline-flex text-xs leading-4 font-semibold rounded-full ${getStatusColor(
                            order.status
                          )}`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/admin/orders/${order.id}`}
                            className="text-primary-600 hover:text-primary-900 text-xs"
                          >
                            Detail
                          </Link>
                          {order.status !== 'dibatalkan' && (
                            <button
                              onClick={() => {
                                setSelectedOrderId(order.id);
                                setInvoiceModalOpen(true);
                              }}
                              className="text-green-600 hover:text-green-900 text-xs"
                              title="Lihat Faktur/Nota"
                            >
                              Faktur
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => handlePinOrder(order.id, order.is_pinned)}
                          disabled={pinningOrderId === order.id}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            order.is_pinned
                              ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                          title={order.is_pinned ? 'Batalkan Sematkan' : 'Sematkan Pesanan'}
                        >
                          {pinningOrderId === order.id ? (
                            <span className="animate-spin">⏳</span>
                          ) : order.is_pinned ? (
                            <>
                              <PinOff size={14} />
                              Batal Sematkan
                            </>
                          ) : (
                            <>
                              <Pin size={14} />
                              Sematkan
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <InvoiceModal
          isOpen={invoiceModalOpen}
          onClose={() => {
            setInvoiceModalOpen(false);
            setSelectedOrderId(null);
          }}
          orderId={selectedOrderId}
        />
      </div>
    </DashboardLayout>
  );
};

export default AdminOrders;