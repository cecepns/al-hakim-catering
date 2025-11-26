import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { MapPin, Calendar, Clock, Flag, Upload, Phone, Link as LinkIcon, MessageSquare, CheckCircle2, User } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { orderAPI, voucherAPI, cashbackAPI } from '../../utils/api';
import { formatRupiah } from '../../utils/formatHelper';
import DashboardLayout from '../../components/DashboardLayout';


const Checkout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { cart, getCartTotal, clearCart } = useCart();
  const { user } = useAuth();
  const directCheckout = location.state?.directCheckout || null;
  const [loading, setLoading] = useState(false);
  const [voucherCode, setVoucherCode] = useState('');
  const [voucher, setVoucher] = useState(null);
  const [voucherError, setVoucherError] = useState('');
  const [cashbackBalance, setCashbackBalance] = useState(0);
  const [cashbackUsed, setCashbackUsed] = useState(0);
  const [formData, setFormData] = useState({
    reference: '',
    reference_detail: '',
    event_name: '',
    event_date: '',
    event_time: '',
    delivery_type: 'diambil',
    customer_name: user?.name || '',
    wa_number_1: user?.phone || '',
    wa_number_2: '',
    delivery_address: user?.address || '',
    landmark: '',
    sharelok_link: '',
    payment_method: 'transfer',
    payment_amount: '',
    payment_proof: null,
    partner_business_name: '',
    partner_wa_number: '',
    notes: '',
    verification: false,
    margin_amount: '', // For marketing users
  });

  useEffect(() => {
    // Allow direct checkout for admin/marketing (no cart needed)
    if (!directCheckout && cart.length === 0) {
      toast.warning('Keranjang kosong');
      navigate('/pembeli/cart');
      return;
    }
    fetchCashbackBalance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchCashbackBalance = async () => {
    try {
      const response = await cashbackAPI.getBalance();
      setCashbackBalance(response.data.balance || 0);
    } catch (error) {
      console.error('Error fetching cashback:', error);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, payment_proof: file });
    }
  };

  // Helper to get current items (from cart or direct checkout)
  const getCurrentItems = () => {
    if (directCheckout) {
      return [{
        product_id: directCheckout.product_id,
        variant_id: directCheckout.variant_id,
        quantity: directCheckout.quantity,
        name: directCheckout.product_name,
        variant_name: directCheckout.variant_name,
        price: directCheckout.price,
        discounted_price: directCheckout.discounted_price,
        total_price: directCheckout.total_price
      }];
    }
    return cart;
  };

  // Helper to get current subtotal
  const getCurrentSubtotal = () => {
    if (directCheckout) {
      return directCheckout.total_price;
    }
    return getCartTotal();
  };

  const handleValidateVoucher = async () => {
    if (!voucherCode.trim()) {
      setVoucherError('Masukkan kode voucher');
      return;
    }

    try {
      setVoucherError('');
      const response = await voucherAPI.validate(voucherCode);
      const subtotal = getCurrentSubtotal();
      
      if (subtotal < response.data.min_purchase) {
        setVoucherError(`Minimal pembelian Rp ${formatRupiah(response.data.min_purchase)}`);
        return;
      }

      setVoucher(response.data);
      toast.success('Voucher berhasil digunakan');
    } catch (error) {
      setVoucher(null);
      setVoucherError(error.response?.data?.message || 'Kode voucher tidak valid');
    }
  };

  const calculateDiscount = () => {
    if (!voucher) return 0;
    
    const subtotal = getCurrentSubtotal();
    if (subtotal < voucher.min_purchase) return 0;

    if (voucher.discount_type === 'percentage') {
      const discount = subtotal * (voucher.discount_value / 100);
      return voucher.max_discount > 0 
        ? Math.min(discount, voucher.max_discount)
        : discount;
    } else {
      return voucher.discount_value;
    }
  };

  const calculateTotal = () => {
    const subtotal = getCurrentSubtotal();
    const discount = calculateDiscount();
    const baseAmount = subtotal - discount - cashbackUsed;
    const marginAmount = user?.role === 'marketing' ? (parseFloat(formData.margin_amount) || 0) : 0;
    const finalAmount = baseAmount + marginAmount;
    return Math.max(0, finalAmount);
  };

  const getBaseAmount = () => {
    const subtotal = getCurrentSubtotal();
    const discount = calculateDiscount();
    return subtotal - discount - cashbackUsed;
  };

  const handleCashbackChange = (e) => {
    const amount = parseFloat(e.target.value) || 0;
    const subtotal = getCurrentSubtotal();
    const discount = calculateDiscount();
    const maxAvailable = Math.min(cashbackBalance, subtotal - discount);
    const actualAmount = Math.min(amount, maxAvailable);
    setCashbackUsed(actualAmount);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.verification) {
      toast.error('Silakan centang verifikasi pemesanan terlebih dahulu');
      return;
    }

    if (formData.delivery_type === 'diambil') {
      if (!formData.customer_name || !formData.wa_number_1) {
        toast.error('Harap lengkapi data pemesan');
        return;
      }
    } else {
      if (!formData.customer_name || !formData.wa_number_1 || !formData.delivery_address) {
        toast.error('Harap lengkapi data pengiriman');
        return;
      }
    }

    if (['transfer', 'dp', 'tunai'].includes(formData.payment_method) && !formData.payment_proof) {
      toast.error('Harap upload bukti pembayaran');
      return;
    }

    try {
      setLoading(true);

      // Use direct checkout items if available, otherwise use cart
      const items = directCheckout 
        ? [{
            product_id: directCheckout.product_id,
            variant_id: directCheckout.variant_id,
            quantity: directCheckout.quantity,
            addon_ids: directCheckout.addon_ids
          }]
        : cart.map(item => ({
            product_id: item.product_id,
            variant_id: item.variant_id,
            quantity: item.quantity
          }));

      // Prepare delivery_notes as JSON for backend
      const deliveryNotesData = {
        reference: formData.reference,
        reference_detail: formData.reference_detail,
        event_name: formData.event_name,
        event_date: formData.event_date,
        event_time: formData.event_time,
        delivery_type: formData.delivery_type,
        customer_name: formData.customer_name,
        wa_number_1: formData.wa_number_1,
        wa_number_2: formData.wa_number_2,
        landmark: formData.landmark,
        sharelok_link: formData.sharelok_link,
        payment_amount: formData.payment_amount || null,
        partner_business_name: formData.partner_business_name || null,
        partner_wa_number: formData.partner_wa_number || null,
        notes: formData.notes,
        margin_amount: user?.role === 'marketing' ? (parseFloat(formData.margin_amount) || 0) : 0,
      };

      // For logged-in users, use FormData if payment_proof exists, otherwise JSON
      const marginAmount = user?.role === 'marketing' ? (parseFloat(formData.margin_amount) || 0) : 0;
      
      if (formData.payment_proof) {
        const formDataToSend = new FormData();
        formDataToSend.append('items', JSON.stringify(items));
        formDataToSend.append('voucher_code', voucher?.code || '');
        formDataToSend.append('cashback_used', cashbackUsed.toString());
        formDataToSend.append('payment_method', formData.payment_method);
        formDataToSend.append('payment_amount', formData.payment_amount || '');
        formDataToSend.append('delivery_address', formData.delivery_address || '-');
        formDataToSend.append('delivery_notes', JSON.stringify(deliveryNotesData));
        formDataToSend.append('margin_amount', marginAmount.toString());
        formDataToSend.append('payment_proof', formData.payment_proof);
        
        // Use createWithProof if available, otherwise use uploadProof after create
        await orderAPI.createWithProof(formDataToSend);
      } else {
        const orderData = {
          items,
          voucher_code: voucher?.code || null,
          cashback_used: cashbackUsed || 0,
          payment_method: formData.payment_method,
          payment_amount: formData.payment_amount || null,
          delivery_address: formData.delivery_address || '-',
          delivery_notes: JSON.stringify(deliveryNotesData),
          margin_amount: marginAmount
        };
        await orderAPI.create(orderData);
      }
      
      // Clear cart after successful order (only if not direct checkout)
      if (!directCheckout) {
        await clearCart();
      }
      
      toast.success('Pesanan berhasil dibuat!');
      setTimeout(() => {
        navigate('/pembeli/orders');
      }, 2000);
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error(error.response?.data?.message || 'Gagal membuat pesanan');
    } finally {
      setLoading(false);
    }
  };

  const currentItems = getCurrentItems();
  const subtotal = getCurrentSubtotal();
  const discount = calculateDiscount();
  const finalTotal = calculateTotal();

  if (!directCheckout && cart.length === 0) {
    return (
      <DashboardLayout role={user?.role || 'pembeli'}>
        <div className="text-center py-12">
          <p className="text-gray-600">Keranjang kosong</p>
          <button
            onClick={() => navigate('/pembeli/cart')}
            className="mt-4 text-primary-600 hover:text-primary-700"
          >
            Kembali ke Keranjang
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role={user?.role || 'pembeli'}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6 text-center">
          FORMAT PEMESANAN AL-HAKIM CATERING
        </h1>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-6 space-y-6">
          {/* Reference */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <span className="flex items-center gap-2"><MapPin size={16} /> REFERENSI: (Tahu produk kami dari mana?)</span>
            </label>
            <select
              value={formData.reference}
              onChange={(e) => handleInputChange('reference', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              required
            >
              <option value="">Pilih referensi</option>
              <option value="brosur">a. Brosur</option>
              <option value="facebook">b. Facebook</option>
              <option value="instagram">c. Instagram</option>
              <option value="tiktok">d. Tiktok</option>
              <option value="marketing">e. Marketing (Sebutkan nama:....)</option>
              <option value="rekomendasi">f. Rekomendasi teman/saudara</option>
              <option value="google">g. Google</option>
              <option value="lainnya">h. Lain-lain (Sebutkan:.....)</option>
            </select>
            {(formData.reference === 'marketing' || formData.reference === 'lainnya') && (
              <input
                type="text"
                value={formData.reference_detail}
                onChange={(e) => handleInputChange('reference_detail', e.target.value)}
                placeholder={formData.reference === 'marketing' ? 'Nama marketing...' : 'Sebutkan...'}
                className="w-full mt-2 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                required
              />
            )}
            {formData.reference === 'marketing' && (
              <div className="mt-4 space-y-4 border-t pt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nama usaha mitra:
                  </label>
                  <input
                    type="text"
                    value={formData.partner_business_name}
                    onChange={(e) => handleInputChange('partner_business_name', e.target.value)}
                    placeholder="Nama usaha mitra..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Phone size={16} /> Nomer WA mitra:
                  </label>
                  <input
                    type="tel"
                    value={formData.partner_wa_number}
                    onChange={(e) => handleInputChange('partner_wa_number', e.target.value)}
                    placeholder="08xxxxxxxxxx"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Event Details */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Untuk acara:</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nama Acara</label>
                <input
                  type="text"
                  value={formData.event_name}
                  onChange={(e) => handleInputChange('event_name', e.target.value)}
                  placeholder="Contoh: Aqiqah, Walimah, dll"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2"><Calendar size={16} /> Tanggal</label>
                <input
                  type="date"
                  value={formData.event_date}
                  onChange={(e) => handleInputChange('event_date', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2"><Clock size={16} /> Waktu</label>
                <input
                  type="time"
                  value={formData.event_time}
                  onChange={(e) => handleInputChange('event_time', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Delivery Type */}
          <div className="border-t pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-4">DIANTAR/DIAMBIL?</label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="delivery_type"
                  value="diambil"
                  checked={formData.delivery_type === 'diambil'}
                  onChange={(e) => handleInputChange('delivery_type', e.target.value)}
                  className="w-4 h-4 text-primary-600"
                />
                <span className="ml-2 font-medium">Diambil</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="delivery_type"
                  value="diantar"
                  checked={formData.delivery_type === 'diantar'}
                  onChange={(e) => handleInputChange('delivery_type', e.target.value)}
                  className="w-4 h-4 text-primary-600"
                />
                <span className="ml-2 font-medium">Diantar</span>
              </label>
            </div>
          </div>

          {/* Customer Information */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {formData.delivery_type === 'diambil' ? 'Jika Diambil:' : 'Jika Diantar:'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2"><User size={16} /> Nama Pemesan *</label>
                <input
                  type="text"
                  value={formData.customer_name}
                  onChange={(e) => handleInputChange('customer_name', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2"><Phone size={16} /> No.WA 1 *</label>
                  <input
                    type="tel"
                    value={formData.wa_number_1}
                    onChange={(e) => handleInputChange('wa_number_1', e.target.value)}
                    placeholder="08xxxxxxxxxx"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2"><Phone size={16} /> No.WA 2</label>
                  <input
                    type="tel"
                    value={formData.wa_number_2}
                    onChange={(e) => handleInputChange('wa_number_2', e.target.value)}
                    placeholder="08xxxxxxxxxx (Opsional)"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Delivery Address (only if diantar) */}
          {formData.delivery_type === 'diantar' && (
            <div className="border-t pt-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2"><MapPin size={16} /> Alamat Lengkap *</label>
                  <textarea
                    value={formData.delivery_address}
                    onChange={(e) => handleInputChange('delivery_address', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    rows="3"
                    placeholder="Alamat lengkap pengiriman"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2"><MapPin size={16} /> Patokan</label>
                  <input
                    type="text"
                    value={formData.landmark}
                    onChange={(e) => handleInputChange('landmark', e.target.value)}
                    placeholder="Contoh: Depan sekolah SD Negeri 1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2"><LinkIcon size={16} /> Link Sharelok</label>
                  <input
                    type="url"
                    value={formData.sharelok_link}
                    onChange={(e) => handleInputChange('sharelok_link', e.target.value)}
                    placeholder="https://share-lok.id/xxxxx"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Order Summary */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">TOTAL:</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3 mb-4">
              {/* Cart Items Summary */}
              <div className="space-y-2">
                {currentItems.map((item, index) => {
                  const itemKey = directCheckout ? `direct-${index}` : item.id;
                  const itemPrice = directCheckout 
                    ? item.total_price 
                    : (item.discounted_price || item.price) * item.quantity;
                  const addonText = directCheckout && directCheckout.addons?.length > 0
                    ? ` + ${directCheckout.addons.map(a => a.name).join(', ')}`
                    : '';
                  
                  return (
                    <div key={itemKey} className="flex justify-between text-sm">
                      <span>
                        {item.name} {item.variant_name && `(${item.variant_name})`}{addonText} x{item.quantity}
                      </span>
                      <span>Rp {formatRupiah(itemPrice)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="border-t pt-2 flex justify-between">
                <span className="font-medium">Subtotal:</span>
                <span className="font-semibold">Rp {formatRupiah(subtotal)}</span>
              </div>

              {/* Voucher */}
              <div className="border-t pt-2">
                <div className="flex space-x-2 mb-2">
                  <input
                    type="text"
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value)}
                    placeholder="Kode voucher"
                    className="flex-1 px-3 py-2 border rounded-lg text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleValidateVoucher}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm"
                  >
                    Apply
                  </button>
                </div>
                {voucherError && (
                  <p className="text-red-600 text-xs mb-2">{voucherError}</p>
                )}
                {voucher && (
                  <div className="flex justify-between text-green-600 text-sm">
                    <span>Diskon Voucher:</span>
                    <span>- Rp {formatRupiah(calculateDiscount())}</span>
                  </div>
                )}
              </div>

              {/* Cashback */}
              {cashbackBalance > 0 && (
                <div className="border-t pt-2">
                  <label className="block text-xs text-gray-600 mb-1">
                    Gunakan Cashback (Maks: Rp {formatRupiah(Math.min(cashbackBalance, subtotal - discount))})
                  </label>
                  <input
                    type="number"
                    value={cashbackUsed || ''}
                    onChange={handleCashbackChange}
                    min="0"
                    max={Math.min(cashbackBalance, subtotal - discount)}
                    step="1000"
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    placeholder="0"
                  />
                  {cashbackUsed > 0 && (
                    <div className="flex justify-between text-blue-600 text-sm mt-1">
                      <span>Cashback:</span>
                      <span>- Rp {formatRupiah(cashbackUsed)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Marketing Margin */}
              {user?.role === 'marketing' && (
                <div className="border-t pt-2">
                  <label className="block text-xs text-gray-600 mb-1">
                    Margin Tambahan (akan ditambahkan ke total yang ditagih ke customer)
                  </label>
                  <input
                    type="number"
                    value={formData.margin_amount || ''}
                    onChange={(e) => handleInputChange('margin_amount', e.target.value)}
                    min="0"
                    step="1000"
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    placeholder="0"
                  />
                  {formData.margin_amount && parseFloat(formData.margin_amount) > 0 && (
                    <div className="flex justify-between text-green-600 text-sm mt-1">
                      <span>Margin Tambahan:</span>
                      <span>+ Rp {formatRupiah(parseFloat(formData.margin_amount) || 0)}</span>
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Komisi Anda = Komisi dari Admin (otomatis) + Margin ini
                  </p>
                </div>
              )}

              <div className="border-t pt-2 flex justify-between text-lg font-bold text-gray-900">
                <span>Total:</span>
                <span className="text-primary-600">Rp {formatRupiah(calculateTotal())}</span>
              </div>
              <p className="text-xs text-gray-500">(Harga belum termasuk ongkir)</p>
            </div>
          </div>

          {/* Payment Method */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><Flag size={16} /> Metode Pembayaran:</h3>
            <div className="space-y-3">
              <label className="flex items-start space-x-3 cursor-pointer p-3 border rounded-lg hover:bg-gray-50">
                <input
                  type="radio"
                  name="payment_method"
                  value="tunai"
                  checked={formData.payment_method === 'tunai'}
                  onChange={(e) => handleInputChange('payment_method', e.target.value)}
                  className="mt-1 w-4 h-4 text-primary-600"
                />
                <div className="flex-1">
                  <span className="font-medium">TUNAI</span>
                  <p className="text-sm text-gray-600 mt-1 flex items-center gap-2"><Upload size={14} /> Upload bukti nota</p>
                  {formData.payment_method === 'tunai' && (
                    <>
                      <div className="mt-3">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Nominal Pembayaran:
                        </label>
                        <input
                          type="number"
                          value={formData.payment_amount}
                          onChange={(e) => handleInputChange('payment_amount', e.target.value)}
                          placeholder="Masukkan nominal pembayaran"
                          min="0"
                          step="1000"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                          required
                        />
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="mt-2 text-sm"
                        required
                      />
                    </>
                  )}
                </div>
              </label>

              <label className="flex items-start space-x-3 cursor-pointer p-3 border rounded-lg hover:bg-gray-50">
                <input
                  type="radio"
                  name="payment_method"
                  value="transfer"
                  checked={formData.payment_method === 'transfer'}
                  onChange={(e) => handleInputChange('payment_method', e.target.value)}
                  className="mt-1 w-4 h-4 text-primary-600"
                />
                <div className="flex-1">
                  <span className="font-medium">TRANSFER</span>
                  <p className="text-sm text-gray-600 mt-1">Transfer ke:</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Shopee pay: 083841161663<br/>
                    Dana: 083848099742<br/>
                    BRI: 3642-01-032854-53-5<br/>
                    a/n Muhammad Al Hakim Pamungkas<br/>
                    Seabank: 901677967857<br/>
                    a/n Muhammad Al-Hakim Pamungkas
                  </p>
                  <p className="text-sm text-gray-600 mt-2 flex items-center gap-2"><Upload size={14} /> Upload bukti transfer</p>
                  {formData.payment_method === 'transfer' && (
                    <>
                      <div className="mt-3">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Nominal Transfer:
                        </label>
                        <input
                          type="number"
                          value={formData.payment_amount}
                          onChange={(e) => handleInputChange('payment_amount', e.target.value)}
                          placeholder="Masukkan nominal transfer"
                          min="0"
                          step="1000"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                          required
                        />
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="mt-2 text-sm"
                        required
                      />
                    </>
                  )}
                </div>
              </label>

              <label className="flex items-start space-x-3 cursor-pointer p-3 border rounded-lg hover:bg-gray-50">
                <input
                  type="radio"
                  name="payment_method"
                  value="cod"
                  checked={formData.payment_method === 'cod'}
                  onChange={(e) => handleInputChange('payment_method', e.target.value)}
                  className="mt-1 w-4 h-4 text-primary-600"
                />
                <div className="flex-1">
                  <span className="font-medium">COD</span>
                </div>
              </label>

              <label className="flex items-start space-x-3 cursor-pointer p-3 border rounded-lg hover:bg-gray-50">
                <input
                  type="radio"
                  name="payment_method"
                  value="dp"
                  checked={formData.payment_method === 'dp'}
                  onChange={(e) => handleInputChange('payment_method', e.target.value)}
                  className="mt-1 w-4 h-4 text-primary-600"
                />
                <div className="flex-1">
                  <span className="font-medium">DP</span>
                  <p className="text-sm text-gray-600 mt-1">Transfer ke:</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Shopee pay: 083841161663<br/>
                    Dana: 083848099742<br/>
                    BRI: 3642-01-032854-53-5<br/>
                    a/n Muhammad Al Hakim Pamungkas<br/>
                    Seabank: 901677967857<br/>
                    a/n Muhammad Al-Hakim Pamungkas
                  </p>
                  <p className="text-sm text-gray-600 mt-2 flex items-center gap-2"><Upload size={14} /> Upload bukti pembayaran</p>
                  {formData.payment_method === 'dp' && (
                    <>
                      <div className="mt-3">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Nominal DP:
                        </label>
                        <input
                          type="number"
                          value={formData.payment_amount}
                          onChange={(e) => handleInputChange('payment_amount', e.target.value)}
                          placeholder="Masukkan nominal DP"
                          min="0"
                          step="1000"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                          required
                        />
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="mt-2 text-sm"
                        required
                      />
                    </>
                  )}
                </div>
              </label>
            </div>
          </div>

          {/* Notes */}
          <div className="border-t pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <MessageSquare size={16} /> Catatan:
            </label>
            <p className="text-xs text-gray-500 mb-2">(Permintaan khusus atau permintaan tambahan)</p>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              rows="3"
              placeholder="Catatan khusus untuk pesanan"
            />
          </div>

          {/* Verification */}
          <div className="border-t pt-4">
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.verification}
                onChange={(e) => handleInputChange('verification', e.target.checked)}
                className="mt-1 w-5 h-5 text-primary-600"
                required
              />
              <span className="text-sm text-gray-700 flex items-center gap-2">
                <CheckCircle2 size={16} /> Saya telah memeriksa data dan menyetujui pesanan sesuai informasi di atas.
              </span>
            </label>
            <p className="text-xs text-gray-500 mt-1 ml-8">(Tandai/centang sebelum kirim)</p>
          </div>

          {/* Submit Button */}
          <div className="border-t pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Memproses...' : 'Kirim Pemesanan'}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default Checkout;
