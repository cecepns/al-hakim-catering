import { useEffect } from 'react';
import { CheckCircle, Utensils, Store, Calendar, Sparkles } from 'lucide-react';
import AOS from 'aos';
import 'aos/dist/aos.css';

const About = () => {
  useEffect(() => {
    AOS.init({
      duration: 1000,
      once: true,
    });
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative h-64 md:h-96 bg-gradient-to-r from-primary-600 to-primary-800 flex items-center justify-center">
        <div className="text-center text-white px-4" data-aos="fade-up">
          <h1 className="text-3xl md:text-5xl font-bold mb-4">Al-Hakim Catering & Aqiqah</h1>
          <p className="text-xl md:text-2xl mb-2">Pilihan Bijaksana! Catering Aqiqah Zaman Now</p>
        </div>
      </div>

      {/* Company Profile Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-16">
          <div data-aos="fade-right">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Tentang Kami
            </h2>
            <div className="space-y-4 text-gray-600 text-lg">
              <p>
                Berdiri sejak tahun 2019, Al-Hakim Catering & Aqiqah hadir sebagai solusi 
                terpercaya dan kekinian untuk kebutuhan aqiqah dan katering di wilayah Jawa Timur.
              </p>
              <p>
                Kami menggabungkan nilai-nilai Islami, kualitas terbaik, dan sentuhan inovatif 
                zaman now untuk memberikan pelayanan yang profesional, lezat, dan penuh keberkahan.
              </p>
              <p>
                Mulai dari pemilihan bahan segar, proses pengolahan higienis, rasa masakan yang 
                istimewa, hingga kemasan yang menarik, semuanya kami rancang demi kepuasan 
                pelanggan dan kesempurnaan acara Anda.
              </p>
              <p>
                Saat ini, kami melayani pengantaran ke berbagai wilayah seperti Malang Raya, 
                Blitar, Pasuruan, Sidoarjo, Surabaya, Mojokerto, dan Probolinggo.
              </p>
            </div>
          </div>
          <div data-aos="fade-left">
            <div className="bg-primary-50 rounded-2xl p-8 shadow-lg">
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center">
                  <div className="text-4xl font-bold text-primary-600 mb-2">5+</div>
                  <div className="text-gray-600">Tahun Pengalaman</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-primary-600 mb-2">500+</div>
                  <div className="text-gray-600">Pelanggan Puas</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Why Choose Us Section */}
        <div className="mb-16">
          <div className="text-center mb-12" data-aos="fade-up">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              💡 Mengapa Memilih Kami?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div 
              className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition"
              data-aos="fade-up"
              data-aos-delay="100"
            >
              <div className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-primary-600 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-gray-900 font-semibold">Berdiri sejak 2019</p>
                  <p className="text-gray-600 text-sm">Berpengalaman & terpercaya</p>
                </div>
              </div>
            </div>

            <div 
              className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition"
              data-aos="fade-up"
              data-aos-delay="200"
            >
              <div className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-primary-600 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-gray-900 font-semibold">Cita rasa lezat</p>
                  <p className="text-gray-600 text-sm">Dengan bahan premium</p>
                </div>
              </div>
            </div>

            <div 
              className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition"
              data-aos="fade-up"
              data-aos-delay="300"
            >
              <div className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-primary-600 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-gray-900 font-semibold">Layanan praktis</p>
                  <p className="text-gray-600 text-sm">Dan profesional</p>
                </div>
              </div>
            </div>

            <div 
              className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition"
              data-aos="fade-up"
              data-aos-delay="400"
            >
              <div className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-primary-600 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-gray-900 font-semibold">Beragam acara</p>
                  <p className="text-gray-600 text-sm">Aqiqah, syukuran, hajatan, hingga event besar</p>
                </div>
              </div>
            </div>

            <div 
              className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition"
              data-aos="fade-up"
              data-aos-delay="500"
            >
              <div className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-primary-600 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-gray-900 font-semibold">Siap antar</p>
                  <p className="text-gray-600 text-sm">Dengan ongkir seikhlasnya</p>
                </div>
              </div>
            </div>

            <div 
              className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition"
              data-aos="fade-up"
              data-aos-delay="600"
            >
              <div className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-primary-600 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-gray-900 font-semibold">Bisa bayar di tempat</p>
                  <p className="text-gray-600 text-sm">COD (Cash on Delivery)</p>
                </div>
              </div>
            </div>

            <div 
              className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition"
              data-aos="fade-up"
              data-aos-delay="700"
            >
              <div className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-primary-600 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-gray-900 font-semibold">Free ongkir</p>
                  <p className="text-gray-600 text-sm">Untuk wilayah tertentu</p>
                </div>
              </div>
            </div>

            <div 
              className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition"
              data-aos="fade-up"
              data-aos-delay="800"
            >
              <div className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-primary-600 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-gray-900 font-semibold">Potongan harga</p>
                  <p className="text-gray-600 text-sm">Bagi reseller dan dropship</p>
                </div>
              </div>
            </div>

            <div 
              className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition"
              data-aos="fade-up"
              data-aos-delay="900"
            >
              <div className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-primary-600 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-gray-900 font-semibold">Gratis voucher diskon</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 bg-gradient-to-r from-primary-50 to-primary-100 rounded-xl p-6 text-center" data-aos="fade-up">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sparkles className="w-6 h-6 text-primary-600" />
              <p className="text-lg font-bold text-gray-900">🎁 Bonus Voucher Umroh Rp 1 Juta</p>
            </div>
            <p className="text-gray-600 text-sm">Umroh bisa COD – Bayar di Mekkah</p>
          </div>
        </div>

        {/* Services Section */}
        <div className="bg-primary-50 rounded-2xl p-8 md:p-12" data-aos="fade-up">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 text-center">
            🌟 Layanan Kami
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                  <Utensils className="w-6 h-6 text-primary-600" />
                </div>
                <h3 className="text-xl font-bold text-primary-600">🐐 Aqiqah</h3>
              </div>
              <p className="text-gray-600">
                Layanan aqiqah lengkap sesuai syariat, dari pemilihan kambing, penyembelihan, 
                hingga masakan siap saji. Dilengkapi dengan kemasan menarik dan pilihan menu 
                modern khas Al-Hakim.
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                  <Utensils className="w-6 h-6 text-primary-600" />
                </div>
                <h3 className="text-xl font-bold text-primary-600">🍱 Catering</h3>
              </div>
              <p className="text-gray-600">
                Layanan katering untuk berbagai acara seperti hajatan, arisan, syukuran, hingga 
                event kantor. Menyediakan menu prasmanan, nasi kotak, tumpeng, dan snack box 
                dengan cita rasa premium.
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                  <Store className="w-6 h-6 text-primary-600" />
                </div>
                <h3 className="text-xl font-bold text-primary-600">🛍️ Store</h3>
              </div>
              <p className="text-gray-600">
                Menyediakan beragam produk kebutuhan acara dan ibadah seperti buku Yasin, souvenir 
                pernikahan, perlengkapan ibadah, merchandise, serta oleh-oleh haji dan umroh.
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-primary-600" />
                </div>
                <h3 className="text-xl font-bold text-primary-600">🎉 Event</h3>
              </div>
              <p className="text-gray-600">
                Layanan event terlengkap untuk semua momen spesial. Mulai dari hajatan, aqiqah, 
                lamaran, siraman, wedding, khitanan, hingga event kreator konten, lengkap dengan 
                dekorasi, konsumsi, dan perlengkapan acara.
              </p>
            </div>
          </div>
        </div>

        {/* Contact CTA Section */}
        <div className="text-center mt-16" data-aos="fade-up">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Siap Bekerja Sama?
          </h2>
          <p className="text-gray-600 text-lg mb-8">
            Hubungi kami untuk konsultasi gratis dan dapatkan penawaran terbaik
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://wa.me/6283178436849"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-primary-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary-700 transition"
            >
              Hubungi via WhatsApp
            </a>
            <a
              href="tel:+6283178436849"
              className="inline-block bg-white text-primary-600 border-2 border-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-primary-50 transition"
            >
              Telepon Kami
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;

