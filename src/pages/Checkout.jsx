import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { MapPin, Calendar, Clock, FileCheck, Flag, Upload, Phone, Link as LinkIcon, MessageSquare, CheckCircle2, User } from 'lucide-react';
import { orderAPI, productAPI } from '../utils/api';
import { formatRupiah } from '../utils/formatHelper';

const Checkout = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [formData, setFormData] = useState({
    reference: '',
    reference_detail: '',
    event_name: '',
    event_date: '',
    event_time: '',
    delivery_type: 'diambil',
    customer_name: '',
    wa_number_1: '',
    wa_number_2: '',
    delivery_address: '',
    landmark: '',
    sharelok_link: '',
    payment_method: 'transfer',
    payment_proof: null,
    notes: '',
    verification: false,
  });

  useEffect(() => {
    const productId = searchParams.get('product_id');
    const qty = parseInt(searchParams.get('quantity')) || 1;
    
    if (productId) {
      setQuantity(qty);
      fetchProduct(productId);
    } else {
      toast.error('Produk tidak ditemukan');
      navigate('/products');
    }
  }, [searchParams, navigate]);

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

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, payment_proof: file });
    }
  };

  const calculateTotal = () => {
    if (!product) return 0;
    const price = product.discounted_price || product.price;
    return price * quantity;
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
      
      const formDataToSend = new FormData();
      formDataToSend.append('items', JSON.stringify([{
        product_id: product.id,
        quantity: quantity,
      }]));
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
        notes: formData.notes,
      }));
      formDataToSend.append('payment_method', formData.payment_method);
      
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

  const total = calculateTotal();
  const price = product.discounted_price || product.price;

  return (
    <div className="min-h-screen bg-gray-50 py-14 md:py-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
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
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Alamat Pengiriman</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2"><MapPin size={16} /> Alamat Lengkap *</label>
                  <textarea
                    value={formData.delivery_address}
                    onChange={(e) => handleInputChange('delivery_address', e.target.value)}
                    rows="3"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2"><MapPin size={16} /> Patokan</label>
                  <input
                    type="text"
                    value={formData.landmark}
                    onChange={(e) => handleInputChange('landmark', e.target.value)}
                    placeholder="Contoh: Depan sekolah, samping masjid, dll"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2"><LinkIcon size={16} /> Link Sharelok</label>
                  <input
                    type="url"
                    value={formData.sharelok_link}
                    onChange={(e) => handleInputChange('sharelok_link', e.target.value)}
                    placeholder="https://..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Order Summary */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Ringkasan Pesanan</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span>Produk:</span>
                <span className="font-medium">{product.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Jumlah:</span>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                  >
                    -
                  </button>
                  <span className="font-medium w-8 text-center">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="flex justify-between">
                <span>Harga Satuan:</span>
                <span className="font-medium">Rp {formatRupiah(price)}</span>
              </div>
              <div className="flex justify-between text-xl font-bold text-primary-600 pt-2 border-t">
                <span>TOTAL:</span>
                <span>Rp {formatRupiah(total)}</span>
              </div>
              <p className="text-sm text-gray-500 mt-2">* Harga belum termasuk ongkir</p>
            </div>
          </div>

          {/* Payment Method */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><Flag size={16} /> Metode Pembayaran:</h3>
            <div className="space-y-3">
              {[
                { value: 'tunai', label: 'TUNAI', requiresProof: true, proofLabel: 'Upload bukti nota' },
                { value: 'transfer', label: 'TRANSFER', requiresProof: true, proofLabel: 'Upload bukti transfer' },
                { value: 'cod', label: 'COD', requiresProof: false },
                { value: 'dp', label: 'DP', requiresProof: true, proofLabel: 'Upload bukti pembayaran' },
              ].map((method) => (
                <div key={method.value}>
                  <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="payment_method"
                      value={method.value}
                      checked={formData.payment_method === method.value}
                      onChange={(e) => handleInputChange('payment_method', e.target.value)}
                      className="w-4 h-4 text-primary-600"
                    />
                    <span className="ml-3 font-medium">{method.label}</span>
                  </label>
                  {formData.payment_method === method.value && (method.value === 'transfer' || method.value === 'dp') && (
                    <div className="mt-3 ml-7 p-4 bg-gray-50 rounded-lg text-sm">
                      <p className="font-medium mb-2">Transfer ke:</p>
                      <ul className="space-y-1 text-gray-700">
                        <li>Shopee pay: 083841161663</li>
                        <li>Dana: 083848099742</li>
                        <li>BRI: 3642-01-032854-53-5 a/n Muhammad Al Hakim Pamungkas</li>
                        <li>Seabank: 901677967857 a/n Muhammad Al-Hakim Pamungkas</li>
                      </ul>
                    </div>
                  )}
                  {formData.payment_method === method.value && method.requiresProof && (
                    <div className="mt-3 ml-7">
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2"><Upload size={16} /> {method.proofLabel}</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                        required={formData.payment_method === method.value}
                      />
                      {formData.payment_proof && (
                        <p className="mt-2 text-sm text-green-600">✓ File terpilih: {formData.payment_proof.name}</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="border-t pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <MessageSquare size={16} /> Catatan: (Permintaan khusus atau permintaan tambahan)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows="3"
              placeholder="Tulis catatan khusus atau permintaan tambahan..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Verification */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><FileCheck size={16} /> Verifikasi Pemesanan:</h3>
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.verification}
                onChange={(e) => handleInputChange('verification', e.target.checked)}
                className="mt-1 w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                required
              />
              <span className="text-gray-700 flex items-center gap-2">
                <CheckCircle2 size={16} /> Saya telah memeriksa data dan menyetujui pesanan sesuai informasi di atas.
              </span>
            </label>
          </div>

          {/* Submit Button */}
          <div className="border-t pt-6">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-semibold disabled:bg-gray-400 transition"
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
