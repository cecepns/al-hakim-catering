import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { commissionAPI } from '../../utils/api';
import { formatRupiah } from '../../utils/formatHelper';
import DashboardLayout from '../../components/DashboardLayout';

const MarketingDashboard = () => {
  const [commission, setCommission] = useState({
    balance: 0,
    thisMonth: 0,
    totalEarned: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const balanceRes = await commissionAPI.getBalance();
      setCommission(balanceRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout role="marketing">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Memuat...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="marketing">
      <div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-primary-100 text-sm">Komisi Tersedia</p>
                <p className="text-3xl font-bold mt-2">
                  Rp {formatRupiah(commission.balance)}
                </p>
              </div>
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <Link to="/marketing/commission" className="mt-4 text-sm text-primary-100 hover:text-white flex items-center">
              Lihat detail
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Komisi Bulan Ini</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  Rp {formatRupiah(commission.thisMonth)}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Komisi</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  Rp {formatRupiah(commission.totalEarned)}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Link to="/products" className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Jual Produk</h3>
                <p className="text-sm text-gray-600">Lihat dan jual produk dengan komisi</p>
              </div>
            </div>
          </Link>

          <Link to="/marketing/pricing" className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Atur Harga</h3>
                <p className="text-sm text-gray-600">Tentukan margin harga Anda</p>
              </div>
            </div>
          </Link>
        </div>

        <div className="mt-8 bg-primary-50 border-l-4 border-primary-500 p-6 rounded-lg">
          <div className="flex items-start">
            <svg className="w-6 h-6 text-primary-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="w-full">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Prosedur & Peraturan Marketing Al-Hakim
              </h3>
              
              <div className="space-y-4 text-sm text-gray-700">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">1. STRUKTUR PEMASARAN</h4>
                  <p className="mb-2">Terdapat tiga kategori dalam sistem pemasaran Al-Hakim:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li><strong>Marketing Resmi</strong> - Adalah pegawai atau tim internal Al-Hakim yang bertugas langsung mempromosikan produk, checkout pesanan di sistem, dan melakukan follow-up pelanggan.</li>
                    <li><strong>Reseller</strong> - Adalah pihak luar yang menjual kembali produk Al-Hakim dengan menaikkan harga (margin).</li>
                    <li><strong>Mitra Resmi</strong> - Adalah pihak luar yang berizin resmi menggunakan sistem, katalog, dan konten promosi Al-Hakim, dengan sistem komisi tetap tanpa menaikkan harga.</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">2. PROSEDUR MARKETING RESMI</h4>
                  <ol className="list-decimal list-inside space-y-1 ml-4">
                    <li>Wajib memantau target penjualan mingguan/bulanan yang ditetapkan oleh manajemen.</li>
                    <li>Komisi hanya dapat diambil jika target penjualan tercapai minimal sesuai ketentuan yang berlaku.</li>
                    <li>Setiap transaksi harus dicatat melalui sistem resmi (dashboard admin/marketing).</li>
                    <li>Tidak diperkenankan melakukan transaksi di luar sistem atau menggunakan rekening pribadi tanpa izin.</li>
                    <li>Marketing resmi wajib memberikan laporan progres penjualan secara rutin ke bagian operasional.</li>
                    <li>Dilarang mengubah harga jual, bonus, atau promo tanpa persetujuan manajemen.</li>
                    <li>Wajib menjaga citra dan komunikasi profesional atas nama Al-Hakim.</li>
                  </ol>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">3. PROSEDUR RESELLER</h4>
                  <ol className="list-decimal list-inside space-y-1 ml-4">
                    <li>Reseller boleh menaikkan harga dari harga dasar yang ditetapkan Al-Hakim, dengan margin sesuai kebijakan masing-masing.</li>
                    <li>Produk yang dikirim ke pembeli tidak memakai branding Al-Hakim.</li>
                    <li>Reseller bertanggung jawab penuh terhadap pelayanan pelanggan mereka sendiri.</li>
                    <li>Transaksi harus tetap melalui sistem resmi agar stok dan data pesanan terpantau.</li>
                    <li>Reseller berhak atas komisi tambahan dari sistem Al-Hakim dan keuntungan yang diambil dari margin harga.</li>
                    <li>Dilarang menjual di bawah harga dasar resmi agar tidak merusak pasar.</li>
                    <li>Dilarang menggunakan nama &quot;Al-Hakim&quot; di toko online tanpa izin tertulis dari manajemen.</li>
                  </ol>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">4. PROSEDUR MITRA RESMI</h4>
                  <ol className="list-decimal list-inside space-y-1 ml-4">
                    <li>Mitra resmi boleh menggunakan seluruh konten promosi, foto, caption, dan materi iklan resmi dari Al-Hakim.</li>
                    <li>Tidak diperkenankan menaikkan atau menurunkan harga dari harga resmi Al-Hakim.</li>
                    <li>Komisi diperoleh dari setiap transaksi yang berhasil.</li>
                    <li>Semua transaksi wajib melalui dashboard resmi agar sistem dapat mencatat komisi secara otomatis.</li>
                    <li>Mitra wajib menjaga keaslian informasi produk dan tidak memodifikasi konten yang dapat menyesatkan.</li>
                    <li>Dilarang menjual produk Al-Hakim dengan mengubah nama merek, label, atau kemasan.</li>
                    <li>Dilarang membeli produk di tempat lain</li>
                    <li>Jika terjadi pelanggaran harga atau penyalahgunaan konten, status kemitraan dapat dicabut.</li>
                  </ol>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">5. KETENTUAN KOMISI DAN TARGET</h4>
                  <ol className="list-decimal list-inside space-y-1 ml-4">
                    <li>Pembayaran komisi dilakukan setiap saat (Minimal komisi yang dapat di tarik: 50.000)</li>
                    <li>Penjualan palsu atau pesanan fiktif akan membatalkan hak komisi.</li>
                  </ol>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">6. PERATURAN UMUM</h4>
                  <ol className="list-decimal list-inside space-y-1 ml-4">
                    <li>Semua pihak wajib menjunjung integritas dan kejujuran dalam promosi serta transaksi.</li>
                    <li>Penggunaan nama, logo, dan materi promosi Al-Hakim hanya untuk tujuan pemasaran resmi dan tidak boleh disalahgunakan.</li>
                    <li>Setiap pelanggaran SOP, manipulasi data, atau pelanggaran harga dapat dikenai sanksi berupa:
                      <ul className="list-disc list-inside ml-6 mt-1">
                        <li>Peringatan tertulis</li>
                        <li>Pemotongan komisi</li>
                        <li>Pemblokiran akun marketing/reseller/mitra</li>
              </ul>
                    </li>
                    <li>Semua pihak wajib mematuhi pedoman komunikasi sopan dan ramah kepada pelanggan.</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default MarketingDashboard;
