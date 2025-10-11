import { useEffect } from 'react';
import { Users, Target, Award, Heart } from 'lucide-react';
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
          <h1 className="text-4xl md:text-6xl font-bold mb-4">Tentang Kami</h1>
          <p className="text-xl md:text-2xl">Al Hakim Catering - Mitra Terpercaya Anda</p>
        </div>
      </div>

      {/* Company Profile Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-16">
          <div data-aos="fade-right">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Sejarah Kami
            </h2>
            <div className="space-y-4 text-gray-600 text-lg">
              <p>
                Al Hakim Catering didirikan dengan komitmen untuk menyediakan layanan 
                catering berkualitas tinggi yang memadukan cita rasa lezat, kebersihan, 
                dan pelayanan profesional untuk setiap acara spesial Anda.
              </p>
              <p>
                Sejak awal berdiri, kami telah melayani ribuan pelanggan dengan berbagai 
                jenis acara, mulai dari pernikahan, aqiqah, gathering perusahaan, hingga 
                event-event besar lainnya.
              </p>
              <p>
                Dengan tim yang berpengalaman dan dedikasi tinggi, kami terus berinovasi 
                untuk memberikan pengalaman kuliner terbaik bagi setiap klien kami.
              </p>
            </div>
          </div>
          <div data-aos="fade-left">
            <div className="bg-primary-50 rounded-2xl p-8 shadow-lg">
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center">
                  <div className="text-4xl font-bold text-primary-600 mb-2">10+</div>
                  <div className="text-gray-600">Tahun Pengalaman</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-primary-600 mb-2">5000+</div>
                  <div className="text-gray-600">Pelanggan Puas</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-primary-600 mb-2">100+</div>
                  <div className="text-gray-600">Menu Pilihan</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-primary-600 mb-2">50+</div>
                  <div className="text-gray-600">Event Per Bulan</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Core Values Section */}
        <div className="mb-16">
          <div className="text-center mb-12" data-aos="fade-up">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Nilai-Nilai Kami
            </h2>
            <p className="text-gray-600 text-lg">
              Prinsip yang kami pegang dalam setiap layanan
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div 
              className="bg-white rounded-xl shadow-lg p-6 text-center hover:shadow-xl transition"
              data-aos="fade-up"
              data-aos-delay="100"
            >
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
                  <Award className="w-8 h-8 text-primary-600" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Kualitas</h3>
              <p className="text-gray-600">
                Menggunakan bahan premium dan proses yang higienis untuk hasil terbaik
              </p>
            </div>

            <div 
              className="bg-white rounded-xl shadow-lg p-6 text-center hover:shadow-xl transition"
              data-aos="fade-up"
              data-aos-delay="200"
            >
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
                  <Users className="w-8 h-8 text-primary-600" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Profesional</h3>
              <p className="text-gray-600">
                Tim berpengalaman yang siap memberikan pelayanan terbaik
              </p>
            </div>

            <div 
              className="bg-white rounded-xl shadow-lg p-6 text-center hover:shadow-xl transition"
              data-aos="fade-up"
              data-aos-delay="300"
            >
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
                  <Target className="w-8 h-8 text-primary-600" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Tepat Waktu</h3>
              <p className="text-gray-600">
                Komitmen untuk selalu tepat waktu dalam setiap pengiriman
              </p>
            </div>

            <div 
              className="bg-white rounded-xl shadow-lg p-6 text-center hover:shadow-xl transition"
              data-aos="fade-up"
              data-aos-delay="400"
            >
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
                  <Heart className="w-8 h-8 text-primary-600" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Kepuasan</h3>
              <p className="text-gray-600">
                Kepuasan pelanggan adalah prioritas utama kami
              </p>
            </div>
          </div>
        </div>

        {/* Services Section */}
        <div className="bg-primary-50 rounded-2xl p-8 md:p-12" data-aos="fade-up">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 text-center">
            Layanan Kami
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg p-6 shadow-md">
              <h3 className="text-xl font-bold text-primary-600 mb-3">Catering Event</h3>
              <p className="text-gray-600">
                Layanan catering lengkap untuk berbagai acara seperti pernikahan, 
                ulang tahun, gathering perusahaan, dan event lainnya dengan menu 
                beragam dan porsi yang dapat disesuaikan.
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-md">
              <h3 className="text-xl font-bold text-primary-600 mb-3">Paket Aqiqah</h3>
              <p className="text-gray-600">
                Paket aqiqah lengkap dengan berbagai pilihan menu, termasuk daging 
                kambing berkualitas, nasi, dan pelengkap lainnya. Tersedia dalam 
                berbagai paket sesuai kebutuhan.
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-md">
              <h3 className="text-xl font-bold text-primary-600 mb-3">Event Organizer</h3>
              <p className="text-gray-600">
                Layanan perencanaan dan pengelolaan event secara profesional, mulai 
                dari konsep, persiapan, hingga eksekusi acara untuk memastikan 
                event Anda berjalan sempurna.
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-md">
              <h3 className="text-xl font-bold text-primary-600 mb-3">Toko Makanan</h3>
              <p className="text-gray-600">
                Menyediakan berbagai makanan siap saji dan frozen food berkualitas 
                yang dapat dibeli secara langsung atau melalui platform online kami.
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
              href="https://wa.me/6281234567890"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-primary-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary-700 transition"
            >
              Hubungi via WhatsApp
            </a>
            <a
              href="tel:+6281234567890"
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

