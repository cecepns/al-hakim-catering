import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { MapPin, Calendar, Clock, FileCheck, Flag, Upload, Phone, Link as LinkIcon, MessageSquare, CheckCircle2, User } from 'lucide-react';
import { orderAPI, productAPI, voucherAPI } from '../utils/api';
import { formatRupiah } from '../utils/formatHelper';
import { useAuth } from '../context/AuthContext';

const Checkout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const directCheckout = location.state?.directCheckout || null;
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [voucherCode, setVoucherCode] = useState('');
  const [voucher, setVoucher] = useState(null);
  const [voucherError, setVoucherError] = useState('');
  const [formData, setFormData] = useState({
    reference: user?.role === 'marketing' ? 'marketing' : '',
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

  const fetchProduct = async (productId) => {
    try {
      const response = await productAPI.getById(productId);
      setProduct(response.data);
    } catch (error) {
      console.error('Error fetching product:', error);
      toast.error('Gagal memuat data produk');
      navigate('/products');
    }
  };

  useEffect(() => {
    // Support both directCheckout from state (from ProductDetail) and query params (legacy)
    if (directCheckout) {
      // Use directCheckout data from state
      setQuantity(directCheckout.quantity || 1);
      fetchProduct(directCheckout.product_id);
    } else {
      // Fallback to query params (legacy support)
      const productId = searchParams.get('product_id');
      const qty = parseInt(searchParams.get('quantity')) || 1;
      
      if (productId) {
        setQuantity(qty);
        fetchProduct(productId);
      } else {
        toast.error('Produk tidak ditemukan');
        navigate('/products');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, navigate, directCheckout]);

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, payment_proof: file });
    }
  };

  const handleValidateVoucher = async () => {
    if (!voucherCode.trim()) {
      setVoucherError('Masukkan kode voucher');
      return;
    }

    try {
      setVoucherError('');
      const response = await voucherAPI.validate(voucherCode);
      
      // Use directCheckout total_price if available (includes variant + addons), otherwise calculate from product price
      let baseTotal;
      if (directCheckout && directCheckout.total_price) {
        baseTotal = directCheckout.total_price;
      } else {
        baseTotal = (product.discounted_price || product.price) * quantity;
      }
      
      if (baseTotal < response.data.min_purchase) {
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
    if (!voucher || !product) return 0;
    
    // Use directCheckout total_price if available (includes variant + addons), otherwise calculate from product price
    let baseTotal;
    if (directCheckout && directCheckout.total_price) {
      baseTotal = directCheckout.total_price;
    } else {
      baseTotal = (product.discounted_price || product.price) * quantity;
    }
    
    if (baseTotal < voucher.min_purchase) return 0;

    if (voucher.discount_type === 'percentage') {
      const discount = baseTotal * (voucher.discount_value / 100);
      return voucher.max_discount > 0 
        ? Math.min(discount, voucher.max_discount)
        : discount;
    } else {
      return voucher.discount_value;
    }
  };

  const calculateTotal = () => {
    if (!product) return 0;
    
    // Use directCheckout total_price if available (includes variant + addons + quantity), otherwise calculate from product price
    let baseTotal;
    if (directCheckout && directCheckout.total_price) {
      baseTotal = directCheckout.total_price;
    } else {
      const price = product.discounted_price || product.price;
      baseTotal = price * quantity;
    }
    
    const discount = calculateDiscount();
    const baseAmount = baseTotal - discount;
    const marginAmount = user?.role === 'marketing' ? (parseFloat(formData.margin_amount) || 0) : 0;
    return Math.max(0, baseAmount + marginAmount);
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
      
      const marginAmount = user?.role === 'marketing' ? (parseFloat(formData.margin_amount) || 0) : 0;
      
      const formDataToSend = new FormData();
      // Support directCheckout with variant_id and addon_ids
      const items = [{
        product_id: product.id,
        variant_id: directCheckout?.variant_id || null,
        quantity: quantity,
        addon_ids: (directCheckout?.addon_ids && Array.isArray(directCheckout.addon_ids) && directCheckout.addon_ids.length > 0) 
          ? directCheckout.addon_ids 
          : null,
      }];
      formDataToSend.append('items', JSON.stringify(items));
      formDataToSend.append('voucher_code', voucher?.code || '');
      formDataToSend.append('delivery_address', formData.delivery_address || '-');
      formDataToSend.append('delivery_notes', JSON.stringify({
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
        margin_amount: marginAmount,
      }));
      formDataToSend.append('payment_method', formData.payment_method);
      formDataToSend.append('margin_amount', marginAmount.toString());
      
      if (formData.payment_proof) {
        formDataToSend.append('payment_proof', formData.payment_proof);
      }

      await orderAPI.createGuest(formDataToSend);
      toast.success('Pesanan berhasil dibuat!');
      setTimeout(() => {
        navigate('/products');
      }, 2000);
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Gagal membuat pesanan. Silakan coba lagi');
    } finally {
      setLoading(false);
    }
  };

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Use price from directCheckout if available (includes variant), otherwise use product price
  const price = directCheckout 
    ? (directCheckout.discounted_price || directCheckout.price)
    : (product.discounted_price || product.price);

  return (
    <div className="min-h-screen bg-gray-50 py-6 sm:py-10 md:py-14 lg:py-24">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-4 sm:mb-6 text-center px-2 pt-14">
          FORMAT PEMESANAN AL-HAKIM CATERING
        </h1>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-4 sm:p-5 md:p-6 space-y-4 sm:space-y-5 md:space-y-6">
          {/* Reference */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
              <span className="flex items-center gap-1 sm:gap-2 flex-wrap"><MapPin className="w-4 h-4 sm:w-4 sm:h-4 flex-shrink-0" /> <span className="break-words">REFERENSI: (Tahu produk kami dari mana?)</span></span>
            </label>
            <select
              value={formData.reference}
              onChange={(e) => handleInputChange('reference', e.target.value)}
              className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
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
                className="w-full mt-2 px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                required
              />
            )}
            {/* Show partner fields for marketing users or when reference is marketing */}
            {(user?.role === 'marketing' || formData.reference === 'marketing') && (
              <div className="mt-4 space-y-3 sm:space-y-4 border-t pt-3 sm:pt-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Nama usaha mitra:
                  </label>
                  <input
                    type="text"
                    value={formData.partner_business_name}
                    onChange={(e) => handleInputChange('partner_business_name', e.target.value)}
                    placeholder="Nama usaha mitra..."
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2 flex items-center gap-1 sm:gap-2 flex-wrap"><Phone className="w-4 h-4 sm:w-4 sm:h-4 flex-shrink-0" /> <span>Nomer WA mitra:</span></label>
                  <input
                    type="tel"
                    value={formData.partner_wa_number}
                    onChange={(e) => handleInputChange('partner_wa_number', e.target.value)}
                    placeholder="08xxxxxxxxxx"
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Event Details */}
          <div className="border-t pt-3 sm:pt-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Untuk acara:</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Nama Acara</label>
                <input
                  type="text"
                  value={formData.event_name}
                  onChange={(e) => handleInputChange('event_name', e.target.value)}
                  placeholder="Contoh: Aqiqah, Walimah, dll"
                  className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2 flex items-center gap-1 sm:gap-2"><Calendar className="w-4 h-4 sm:w-4 sm:h-4 flex-shrink-0" /> <span>Tanggal</span></label>
                <input
                  type="date"
                  value={formData.event_date}
                  onChange={(e) => handleInputChange('event_date', e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2 flex items-center gap-1 sm:gap-2"><Clock className="w-4 h-4 sm:w-4 sm:h-4 flex-shrink-0" /> <span>Waktu</span></label>
                <input
                  type="time"
                  value={formData.event_time}
                  onChange={(e) => handleInputChange('event_time', e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Delivery Type */}
          <div className="border-t pt-3 sm:pt-4">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-3 sm:mb-4">DIANTAR/DIAMBIL?</label>
            <div className="flex flex-wrap gap-3 sm:gap-4">
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
          <div className="border-t pt-3 sm:pt-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
              {formData.delivery_type === 'diambil' ? 'Jika Diambil:' : 'Jika Diantar:'}
            </h3>
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2 flex items-center gap-1 sm:gap-2 flex-wrap"><User className="w-4 h-4 sm:w-4 sm:h-4 flex-shrink-0" /> <span>Nama Pemesan *</span></label>
                <input
                  type="text"
                  value={formData.customer_name}
                  onChange={(e) => handleInputChange('customer_name', e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2 flex items-center gap-1 sm:gap-2 flex-wrap"><Phone className="w-4 h-4 sm:w-4 sm:h-4 flex-shrink-0" /> <span>No.WA 1 *</span></label>
                  <input
                    type="tel"
                    value={formData.wa_number_1}
                    onChange={(e) => handleInputChange('wa_number_1', e.target.value)}
                    placeholder="08xxxxxxxxxx"
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2 flex items-center gap-1 sm:gap-2 flex-wrap"><Phone className="w-4 h-4 sm:w-4 sm:h-4 flex-shrink-0" /> <span>No.WA 2</span></label>
                  <input
                    type="tel"
                    value={formData.wa_number_2}
                    onChange={(e) => handleInputChange('wa_number_2', e.target.value)}
                    placeholder="08xxxxxxxxxx (Opsional)"
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Delivery Address (only if diantar) */}
          {formData.delivery_type === 'diantar' && (
            <div className="border-t pt-3 sm:pt-4">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Alamat Pengiriman</h3>
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2 flex items-center gap-1 sm:gap-2 flex-wrap"><MapPin className="w-4 h-4 sm:w-4 sm:h-4 flex-shrink-0" /> <span>Alamat Lengkap *</span></label>
                  <textarea
                    value={formData.delivery_address}
                    onChange={(e) => handleInputChange('delivery_address', e.target.value)}
                    rows="3"
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2 flex items-center gap-1 sm:gap-2 flex-wrap"><MapPin className="w-4 h-4 sm:w-4 sm:h-4 flex-shrink-0" /> <span>Patokan</span></label>
                  <input
                    type="text"
                    value={formData.landmark}
                    onChange={(e) => handleInputChange('landmark', e.target.value)}
                    placeholder="Contoh: Depan sekolah, samping masjid, dll"
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2 flex items-center gap-1 sm:gap-2 flex-wrap"><LinkIcon className="w-4 h-4 sm:w-4 sm:h-4 flex-shrink-0" /> <span>Link Sharelok</span></label>
                  <input
                    type="url"
                    value={formData.sharelok_link}
                    onChange={(e) => handleInputChange('sharelok_link', e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Order Summary */}
          <div className="border-t pt-3 sm:pt-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Ringkasan Pesanan</h3>
            <div className="bg-gray-50 rounded-lg p-3 sm:p-4 space-y-2">
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="break-words pr-2">Produk:</span>
                <span className="font-medium text-right break-words">{product.name}</span>
              </div>
              <div className="flex justify-between items-center text-xs sm:text-sm">
                <span>Jumlah:</span>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-sm sm:text-base"
                  >
                    -
                  </button>
                  <span className="font-medium w-6 sm:w-8 text-center">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-sm sm:text-base"
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="flex justify-between text-xs sm:text-sm">
                <span>Harga Satuan:</span>
                <span className="font-medium">Rp {formatRupiah(price)}</span>
              </div>
              {/* Show variant and addons info if from directCheckout */}
              {directCheckout && directCheckout.variant_name && (
                <div className="flex justify-between text-xs sm:text-sm text-gray-600">
                  <span>Variasi:</span>
                  <span className="text-right">{directCheckout.variant_name}</span>
                </div>
              )}
              {directCheckout && directCheckout.addons && directCheckout.addons.length > 0 && (
                <div className="flex justify-between text-xs sm:text-sm text-gray-600">
                  <span>Add-on:</span>
                  <span className="text-right">{directCheckout.addons.map(a => a.name).join(', ')}</span>
                </div>
              )}
              <div className="flex justify-between text-xs sm:text-sm">
                <span>Subtotal:</span>
                <span className="font-medium">
                  Rp {formatRupiah(
                    directCheckout && directCheckout.total_price 
                      ? directCheckout.total_price 
                      : price * quantity
                  )}
                </span>
              </div>

              {/* Voucher */}
              <div className="border-t pt-2">
                <div className="flex flex-col sm:flex-row gap-2 mb-2">
                  <input
                    type="text"
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value)}
                    placeholder="Kode voucher"
                    className="flex-1 px-3 py-2 border rounded-lg text-xs sm:text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleValidateVoucher}
                    className="px-3 sm:px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-xs sm:text-sm whitespace-nowrap"
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

              {/* Marketing Margin */}
              {user?.role === 'marketing' && (
                <div className="border-t pt-2">
                  <label className="block text-xs text-gray-600 mb-1 break-words">
                    Margin Tambahan (akan ditambahkan ke total yang ditagih ke customer)
                  </label>
                  <input
                    type="number"
                    value={formData.margin_amount || ''}
                    onChange={(e) => handleInputChange('margin_amount', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm"
                    placeholder="0"
                  />
                  {formData.margin_amount && parseFloat(formData.margin_amount) > 0 && (
                    <div className="flex justify-between text-green-600 text-xs sm:text-sm mt-1">
                      <span>Margin Tambahan:</span>
                      <span className="break-words text-right">+ Rp {formatRupiah(parseFloat(formData.margin_amount) || 0)}</span>
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1 break-words">
                    Komisi Anda = Komisi dari Admin (otomatis) + Margin ini
                  </p>
                </div>
              )}
              <div className="flex justify-between text-base sm:text-lg md:text-xl font-bold text-primary-600 pt-2 border-t">
                <span>TOTAL:</span>
                <span className="break-words text-right">Rp {formatRupiah(calculateTotal())}</span>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 mt-2">* Harga belum termasuk ongkir</p>
            </div>
          </div>

          {/* Payment Method */}
          <div className="border-t pt-3 sm:pt-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-1 sm:gap-2 flex-wrap"><Flag className="w-4 h-4 sm:w-4 sm:h-4 flex-shrink-0" /> <span>Metode Pembayaran:</span></h3>
            <div className="space-y-2 sm:space-y-3">
              {[
                { value: 'tunai', label: 'TUNAI', requiresProof: true, proofLabel: 'Upload bukti nota' },
                { value: 'transfer', label: 'TRANSFER', requiresProof: true, proofLabel: 'Upload bukti transfer' },
                { value: 'cod', label: 'COD', requiresProof: false },
                { value: 'dp', label: 'DP', requiresProof: true, proofLabel: 'Upload bukti pembayaran' },
              ].map((method) => (
                <div key={method.value}>
                  <label className="flex items-center p-3 sm:p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="payment_method"
                      value={method.value}
                      checked={formData.payment_method === method.value}
                      onChange={(e) => handleInputChange('payment_method', e.target.value)}
                      className="w-4 h-4 text-primary-600 flex-shrink-0"
                    />
                    <span className="ml-2 sm:ml-3 font-medium text-sm sm:text-base">{method.label}</span>
                  </label>
                  {formData.payment_method === method.value && (method.value === 'transfer' || method.value === 'dp') && (
                    <div className="mt-2 sm:mt-3 ml-6 sm:ml-7 p-3 sm:p-4 bg-gray-50 rounded-lg text-xs sm:text-sm">
                      <p className="font-medium mb-2">Transfer ke:</p>
                      <ul className="space-y-1 text-gray-700 break-words">
                        <li>Shopee pay: 083841161663</li>
                        <li>Dana: 083848099742</li>
                        <li className="break-words">BRI: 3642-01-032854-53-5 a/n Muhammad Al Hakim Pamungkas</li>
                        <li className="break-words">Seabank: 901677967857 a/n Muhammad Al-Hakim Pamungkas</li>
                      </ul>
                    </div>
                  )}
                  {formData.payment_method === method.value && method.requiresProof && (
                    <div className="mt-2 sm:mt-3 ml-6 sm:ml-7">
                      {(method.value === 'transfer' || method.value === 'dp' || method.value === 'tunai') && (
                        <div className="mb-3">
                          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                            {method.value === 'dp' ? 'Nominal DP:' : method.value === 'transfer' ? 'Nominal Transfer:' : 'Nominal Pembayaran:'}
                          </label>
                          <input
                            type="number"
                            value={formData.payment_amount}
                            onChange={(e) => handleInputChange('payment_amount', e.target.value)}
                            placeholder={`Masukkan nominal ${method.value === 'dp' ? 'DP' : method.value === 'transfer' ? 'transfer' : 'pembayaran'}`}
                            className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                            required={formData.payment_method === method.value}
                          />
                        </div>
                      )}
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2 flex items-center gap-1 sm:gap-2 flex-wrap"><Upload className="w-4 h-4 sm:w-4 sm:h-4 flex-shrink-0" /> <span>{method.proofLabel}</span></label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="w-full px-2 sm:px-4 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                        required={formData.payment_method === method.value}
                      />
                      {formData.payment_proof && (
                        <p className="mt-2 text-xs sm:text-sm text-green-600 break-words">✓ File terpilih: {formData.payment_proof.name}</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="border-t pt-3 sm:pt-4">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2 flex items-center gap-1 sm:gap-2 flex-wrap">
              <MessageSquare className="w-4 h-4 sm:w-4 sm:h-4 flex-shrink-0" /> <span className="break-words">Catatan: (Permintaan khusus atau permintaan tambahan)</span>
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows="3"
              placeholder="Tulis catatan khusus atau permintaan tambahan..."
              className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Verification */}
          <div className="border-t pt-3 sm:pt-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-1 sm:gap-2 flex-wrap"><FileCheck className="w-4 h-4 sm:w-4 sm:h-4 flex-shrink-0" /> <span>Verifikasi Pemesanan:</span></h3>
            <label className="flex items-start space-x-2 sm:space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.verification}
                onChange={(e) => handleInputChange('verification', e.target.checked)}
                className="mt-1 w-4 h-4 sm:w-5 sm:h-5 text-primary-600 rounded focus:ring-primary-500 flex-shrink-0"
                required
              />
              <span className="text-xs sm:text-sm text-gray-700 flex items-start gap-1 sm:gap-2">
                <CheckCircle2 className="w-4 h-4 sm:w-4 sm:h-4 flex-shrink-0 mt-0.5" /> <span className="break-words">Saya telah memeriksa data dan menyetujui pesanan sesuai informasi di atas.</span>
              </span>
            </label>
          </div>

          {/* Submit Button */}
          <div className="border-t pt-4 sm:pt-6">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 text-white px-4 sm:px-6 py-3 sm:py-3 rounded-lg hover:bg-primary-700 font-semibold disabled:bg-gray-400 transition text-sm sm:text-base"
            >
              {loading ? 'Memproses...' : 'Kirim Pesanan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Checkout;
