import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { orderAPI } from '../../utils/api';
import { formatRupiah, parseDeliveryNotes } from '../../utils/formatHelper';
import DashboardLayout from '../../components/DashboardLayout';

const MarketingOrderDetail = () => {
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
      alert('Gagal memuat detail pesanan');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <DashboardLayout role="marketing">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!order) {
    return (
      <DashboardLayout role="marketing">
        <div className="text-center py-12">
          <p className="text-gray-600">Pesanan tidak ditemukan</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="marketing">
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Detail Pesanan #{order.id}</h1>
            <p className="text-gray-600 mt-1">
              {new Date(order.created_at).toLocaleString('id-ID')}
            </p>
          </div>
          <button
            onClick={() => navigate('/marketing/orders')}
            className="text-gray-600 hover:text-gray-900"
          >
            ← Kembali
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Informasi Pesanan</h2>
                <span
                  className={`px-4 py-2 rounded-lg text-sm font-semibold ${getStatusColor(
                    order.status
                  )}`}
                >
                  {order.status}
                </span>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Pelanggan:</span>
                  <span className="font-medium">{order.customer_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Email:</span>
                  <span className="font-medium">{order.customer_email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Telepon:</span>
                  <span className="font-medium">{order.customer_phone}</span>
                </div>

                {/* Alamat & Detail Acara */}
                <div className="pt-4 border-t space-y-2">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-1">
                      Alamat & Detail Acara
                    </h3>
                    <p className="text-sm text-gray-700 whitespace-pre-line">
                      {order.delivery_address}
                    </p>
                  </div>

                  {order.delivery_notes && (() => {
                    const notes = parseDeliveryNotes(order.delivery_notes, true);
                    if (!notes) return null;

                    return (
                      <div className="mt-2 text-xs text-gray-700 bg-gray-50 rounded-lg p-3 space-y-1">
                        <p className="font-medium text-gray-800 mb-1">
                          Detail Acara & Pengiriman:
                        </p>
                        {Array.isArray(notes) ? (
                          notes.map((line, idx) => (
                            <p key={idx}>{line}</p>
                          ))
                        ) : (
                          <p>{notes}</p>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Item Pesanan</h2>
              <div className="space-y-4">
                {order.items?.map((item, index) => {
                  // Parse addons_json if it exists
                  let addons = [];
                  if (item.addons_json) {
                    try {
                      addons = typeof item.addons_json === 'string' 
                        ? JSON.parse(item.addons_json) 
                        : item.addons_json;
                      // Ensure it's an array
                      if (!Array.isArray(addons)) {
                        addons = [];
                      }
                    } catch (error) {
                      console.error('Error parsing addons_json:', error);
                      addons = [];
                    }
                  }

                  return (
                    <div key={index} className="flex justify-between items-center py-3 border-b">
                      <div>
                        <p className="font-medium text-gray-900">{item.product_name}</p>
                        {item.variant_name && (
                          <p className="text-sm text-gray-600">Varian: {item.variant_name}</p>
                        )}
                        {addons.length > 0 && (
                          <div className="mt-1">
                            <p className="text-sm font-medium text-gray-700">Add-on:</p>
                            <ul className="text-sm text-gray-600 ml-4 list-disc">
                              {addons.map((addon, addonIndex) => (
                                <li key={addonIndex}>
                                  {addon.name || addon}
                                  {addon.price && (
                                    <span className="text-primary-600 ml-1">
                                      (+Rp {formatRupiah(addon.price)})
                                    </span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          Rp {formatRupiah(item.subtotal)}
                        </p>
                        <p className="text-sm text-gray-600">@ Rp {formatRupiah(item.price)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 space-y-2">
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
                <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t">
                  <span>Total:</span>
                  <span>Rp {formatRupiah(order.final_amount)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-green-50 border-l-4 border-green-500 rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Komisi Anda</h2>
              <p className="text-4xl font-bold text-green-600">
                Rp {formatRupiah(order.commission_amount || 0)}
              </p>
              <p className="text-sm text-gray-600 mt-2">
                Dari pesanan Rp {formatRupiah(order.final_amount)}
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Informasi Pembayaran</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Metode:</span>
                  <span className="font-medium uppercase">{order.payment_method}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className="font-medium">{order.payment_status}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default MarketingOrderDetail;

