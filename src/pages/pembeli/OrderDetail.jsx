import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { orderAPI } from '../../utils/api';
import { formatRupiah } from '../../utils/formatHelper';
import DashboardLayout from '../../components/DashboardLayout';

const PembeliOrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const response = await orderAPI.getById(id);
      setOrder(response.data);
    } catch (error) {
      console.error('Error fetching order:', error);
    } finally {
      setLoading(false);
    }
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

  if (loading) {
    return (
      <DashboardLayout role="pembeli">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!order) {
    return (
      <DashboardLayout role="pembeli">
        <div className="text-center py-12">
          <p className="text-gray-600">Pesanan tidak ditemukan</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="pembeli">
      <div>
        <button onClick={() => navigate('/pembeli/orders')} className="mb-6 text-gray-600 hover:text-gray-900">← Kembali</button>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Pesanan #{order.id}</h1>
              <p className="text-gray-600 mt-1">{new Date(order.created_at).toLocaleString('id-ID')}</p>
            </div>
            <span className={`px-4 py-2 rounded-lg font-semibold ${getStatusColor(order.status)}`}>{order.status}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 pb-6 border-b">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Alamat Pengiriman</h3>
              <p className="text-gray-700">{order.delivery_address}</p>
              {order.delivery_notes && <p className="text-sm text-gray-600 mt-2">Catatan: {order.delivery_notes}</p>}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Pembayaran</h3>
              <p className="text-gray-700 capitalize">{order.payment_method}</p>
              <p className="text-sm text-gray-600">Status: {order.payment_status}</p>
            </div>
          </div>

          <h3 className="font-semibold text-gray-900 mb-4">Item Pesanan</h3>
          <div className="space-y-4 mb-6">
            {order.items?.map((item, index) => (
              <div key={index} className="flex justify-between items-center py-3 border-b">
                <div>
                  <p className="font-medium text-gray-900">{item.product_name}</p>
                  {item.variant_name && <p className="text-sm text-gray-600">Varian: {item.variant_name}</p>}
                  <p className="text-sm text-gray-600">Qty: {item.quantity} x Rp {formatRupiah(item.price)}</p>
                </div>
                <p className="font-semibold text-gray-900">Rp {formatRupiah(item.subtotal)}</p>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-gray-700">
              <span>Subtotal:</span>
              <span>Rp {formatRupiah(order.total_amount)}</span>
            </div>
            {order.discount_amount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Diskon:</span>
                <span>- Rp {formatRupiah(order.discount_amount)}</span>
              </div>
            )}
            {order.cashback_used > 0 && (
              <div className="flex justify-between text-primary-600">
                <span>Cashback:</span>
                <span>- Rp {formatRupiah(order.cashback_used)}</span>
              </div>
            )}
            <div className="flex justify-between text-xl font-bold text-gray-900 pt-3 border-t">
              <span>Total:</span>
              <span className="text-primary-600">Rp {formatRupiah(order.final_amount)}</span>
            </div>
          </div>
        </div>

        {order.statusLogs && order.statusLogs.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Riwayat Pesanan</h2>
            <div className="space-y-4">
              {order.statusLogs.map((log, index) => (
                <div key={index} className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-primary-600 font-semibold text-sm">{index + 1}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${getStatusColor(log.status)}`}>{log.status}</span>
                      <span className="text-sm text-gray-600">{new Date(log.created_at).toLocaleString('id-ID')}</span>
                    </div>
                    <p className="text-sm text-gray-700">Oleh: {log.handler_name}</p>
                    {log.notes && <p className="text-sm text-gray-600 mt-1">{log.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default PembeliOrderDetail;
