import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { orderAPI, voucherAPI, cashbackAPI } from '../../utils/api';
import { formatRupiah } from '../../utils/formatHelper';
import DashboardLayout from '../../components/DashboardLayout';

const Checkout = () => {
  const navigate = useNavigate();
  const { cart, getCartTotal, clearCart } = useCart();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [cashbackBalance, setCashbackBalance] = useState(0);
  const [formData, setFormData] = useState({
    delivery_address: user?.address || '',
    delivery_notes: '',
    payment_method: 'transfer',
    voucher_code: '',
    cashback_used: 0,
  });
  const [discount, setDiscount] = useState(0);

  useEffect(() => {
    if (cart.length === 0) {
      navigate('/pembeli/cart');
    }
    fetchCashback();
  }, []);

  const fetchCashback = async () => {
    try {
      const response = await cashbackAPI.getBalance();
      setCashbackBalance(response.data.balance || 0);
    } catch (error) {
      console.error('Error fetching cashback:', error);
    }
  };

  const handleVoucherCheck = async () => {
    if (!formData.voucher_code) return;
    try {
      const response = await voucherAPI.validate(formData.voucher_code);
      const voucher = response.data;
      let discountAmount = 0;
      if (voucher.discount_type === 'percentage') {
        discountAmount = getCartTotal() * (voucher.discount_value / 100);
        if (voucher.max_discount > 0 && discountAmount > voucher.max_discount) {
          discountAmount = voucher.max_discount;
        }
      } else {
        discountAmount = voucher.discount_value;
      }
      setDiscount(discountAmount);
      toast.success('Voucher berhasil diterapkan!');
    } catch (error) {
      toast.error('Voucher tidak valid atau sudah tidak berlaku');
      setDiscount(0);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const items = cart.map((item) => ({
        product_id: item.product_id,
        variant_id: item.variant_id,
        quantity: item.quantity,
      }));

      await orderAPI.create({
        items,
        voucher_code: formData.voucher_code,
        cashback_used: formData.cashback_used,
        payment_method: formData.payment_method,
        delivery_address: formData.delivery_address,
        delivery_notes: formData.delivery_notes,
      });

      await clearCart();
      toast.success('Pesanan berhasil dibuat!');
      setTimeout(() => {
        navigate('/pembeli/orders');
      }, 1000);
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Gagal membuat pesanan. Silakan coba lagi');
    } finally {
      setLoading(false);
    }
  };

  const subtotal = getCartTotal();
  const finalAmount = subtotal - discount - formData.cashback_used;

  return (
    <DashboardLayout role="pembeli">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Checkout</h1>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Informasi Pengiriman</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Alamat Pengiriman *</label>
                  <textarea value={formData.delivery_address} onChange={(e) => setFormData({ ...formData, delivery_address: e.target.value })} required rows="3" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Catatan (Opsional)</label>
                  <textarea value={formData.delivery_notes} onChange={(e) => setFormData({ ...formData, delivery_notes: e.target.value })} rows="2" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Metode Pembayaran</h2>
              <div className="space-y-3">
                {[
                  { value: 'transfer', label: 'Transfer Bank' },
                  { value: 'dp', label: 'DP (Down Payment)' },
                  { value: 'cod', label: 'COD (Cash on Delivery)' },
                ].map((method) => (
                  <label key={method.value} className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input type="radio" name="payment" value={method.value} checked={formData.payment_method === method.value} onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })} className="w-4 h-4 text-primary-600" />
                    <span className="ml-3 font-medium">{method.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Ringkasan Pesanan</h2>
              <div className="space-y-3 mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-semibold">Rp {formatRupiah(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Diskon Voucher:</span>
                    <span>- Rp {formatRupiah(discount)}</span>
                  </div>
                )}
                {formData.cashback_used > 0 && (
                  <div className="flex justify-between text-primary-600">
                    <span>Cashback:</span>
                    <span>- Rp {formatRupiah(formData.cashback_used)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xl font-bold text-gray-900 pt-3 border-t">
                  <span>Total:</span>
                  <span className="text-primary-600">Rp {formatRupiah(finalAmount)}</span>
                </div>
              </div>

              <div className="space-y-4 mb-6 pt-4 border-t">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Kode Voucher</label>
                  <div className="flex space-x-2">
                    <input type="text" value={formData.voucher_code} onChange={(e) => setFormData({ ...formData, voucher_code: e.target.value.toUpperCase() })} className="flex-1 px-4 py-2 border rounded-lg" placeholder="KODE" />
                    <button type="button" onClick={handleVoucherCheck} className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">Gunakan</button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gunakan Cashback (Saldo: Rp {formatRupiah(cashbackBalance)})
                  </label>
                  <input type="number" value={formData.cashback_used} onChange={(e) => setFormData({ ...formData, cashback_used: Math.min(cashbackBalance, Math.max(0, parseInt(e.target.value) || 0)) })} max={cashbackBalance} min="0" className="w-full px-4 py-2 border rounded-lg" />
                </div>
              </div>

              <button type="submit" disabled={loading || finalAmount < 0} className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-semibold disabled:bg-gray-400">
                {loading ? 'Memproses...' : 'Buat Pesanan'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default Checkout;
