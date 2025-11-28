import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { commissionAPI, orderAPI } from '../../utils/api';
import { formatRupiah } from '../../utils/formatHelper';
import DashboardLayout from '../../components/DashboardLayout';
import InvoiceModal from '../../components/InvoiceModal';

const MarketingOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [savingNotesId, setSavingNotesId] = useState(null);
  const [notesDrafts, setNotesDrafts] = useState({});

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const params = filter !== 'all' ? { status: filter } : {};
      const response = await commissionAPI.getOrders(params);
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const statuses = [
    { value: 'all', label: 'Semua' },
    { value: 'pending', label: 'Pending' },
    { value: 'completed', label: 'Selesai' },
    { value: 'cancelled', label: 'Dibatalkan' },
  ];

  const totalCommission = orders.reduce(
    (sum, order) => sum + (order.commission_amount || 0),
    0
  );

  const handleNotesChange = (orderId, value) => {
    setNotesDrafts((prev) => ({
      ...prev,
      [orderId]: value,
    }));
  };

  const handleNotesBlur = async (orderId) => {
    const value =
      notesDrafts[orderId] !== undefined
        ? notesDrafts[orderId]
        : orders.find((o) => o.id === orderId)?.admin_notes || '';

    try {
      setSavingNotesId(orderId);
      await orderAPI.updateMarketingAdminNotes(orderId, { notes: value });

      // Refresh list so latest notes from server are shown
      await fetchOrders();
    } catch (error) {
      console.error('Error updating admin notes:', error);
      // Optionally you can show toast/alert here
    } finally {
      setSavingNotesId(null);
    }
  };

  return (
    <DashboardLayout role="marketing">
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Pesanan Saya</h1>
          <p className="text-gray-600 mt-1">Pantau semua pesanan dan komisi Anda</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <p className="text-sm text-gray-600">Total Pesanan</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{orders.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <p className="text-sm text-gray-600">Pesanan Selesai</p>
            <p className="text-3xl font-bold text-green-600 mt-2">
              {orders.filter((o) => o.status === 'completed').length}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <p className="text-sm text-gray-600">Total Komisi</p>
            <p className="text-2xl font-bold text-primary-600 mt-2">
              Rp {formatRupiah(totalCommission)}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex space-x-2 mb-6 overflow-x-auto">
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
              <p className="text-gray-600 mb-4">Belum ada pesanan</p>
              <Link
                to="/products"
                className="inline-block bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700"
              >
                Mulai Berjualan
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      ID Pesanan
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Nama Pemesan & WA
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Tgl Pemesanan
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Alamat
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Kategori Produk
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Metode Pembayaran
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Sisa Pembayaran
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Catatan untuk Admin
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Komisi
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.map((order) => {
                    const sisaPembayaran =
                      (order.final_amount || 0) - (order.payment_amount || 0);
                    const status = order.commission_status || 'pending';
                    const draftNotes =
                      notesDrafts[order.id] !== undefined
                        ? notesDrafts[order.id]
                        : order.admin_notes || '';

                    return (
                      <tr key={order.id} className="hover:bg-gray-50 align-top">
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          #{order.id}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {order.customer_name || order.guest_customer_name || '-'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {order.customer_phone || order.guest_wa_number_1 || '-'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                          {new Date(order.created_at).toLocaleDateString('id-ID')}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900 max-w-xs truncate">
                          {order.delivery_address || '-'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                          {order.categories || '-'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 uppercase">
                          {order.payment_method || '-'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          Rp {formatRupiah(Math.max(0, sisaPembayaran))}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900 max-w-xs">
                          <textarea
                            className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1 focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                            rows={2}
                            value={draftNotes}
                            onChange={(e) => handleNotesChange(order.id, e.target.value)}
                            onBlur={() => handleNotesBlur(order.id)}
                            placeholder="Catatan untuk admin..."
                          />
                          {savingNotesId === order.id && (
                            <p className="mt-1 text-[10px] text-gray-400">Menyimpan...</p>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                          Rp {formatRupiah(order.commission_amount || 0)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span
                            className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                              status
                            )}`}
                          >
                            {status}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex flex-col gap-1">
                            <Link
                              to={`/marketing/orders/${order.id}`}
                              className="text-primary-600 hover:text-primary-900 text-xs"
                            >
                              Detail
                            </Link>
                            {order.status !== 'cancelled' && (
                              <button
                                onClick={() => {
                                  setSelectedOrderId(order.id);
                                  setInvoiceModalOpen(true);
                                }}
                                className="text-green-600 hover:text-green-900 text-xs text-left"
                                title="Lihat Faktur/Nota"
                              >
                                Faktur
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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

export default MarketingOrders;

