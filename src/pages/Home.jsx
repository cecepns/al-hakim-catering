import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { UtensilsCrossed, Beef, PartyPopper, ShoppingBag } from 'lucide-react';
import AOS from 'aos';
import 'aos/dist/aos.css';
import { productAPI, bannerAPI } from '../utils/api';
import { getImageUrl } from '../utils/imageHelper';
import { formatRupiah } from '../utils/formatHelper';

const Home = () => {
  const [banners, setBanners] = useState([]);
  const [promoProducts, setPromoProducts] = useState([]);
  const [currentBanner, setCurrentBanner] = useState(0);

  useEffect(() => {
    AOS.init({
      duration: 1000,
      once: true,
    });

    fetchBanners();
    fetchPromoProducts();
  }, []);

  useEffect(() => {
    if (banners.length > 0) {
      const timer = setInterval(() => {
        setCurrentBanner((prev) => (prev + 1) % banners.length);
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [banners]);

  const fetchBanners = async () => {
    try {
      const response = await bannerAPI.getAll();
      setBanners(response.data);
    } catch (error) {
      console.error('Error fetching banners:', error);
    }
  };

  const fetchPromoProducts = async () => {
    try {
      const response = await productAPI.getPromo();
      setPromoProducts(response.data);
    } catch (error) {
      console.error('Error fetching promo products:', error);
    }
  };

  const categories = [
    {
      name: 'Catering',
      icon: UtensilsCrossed,
      description: 'Layanan catering untuk berbagai acara',
      link: '/products?category=catering',
    },
    {
      name: 'Aqiqah',
      icon: Beef,
      description: 'Paket aqiqah lengkap dan berkualitas',
      link: '/products?category=aqiqah',
    },
    {
      name: 'Event',
      icon: PartyPopper,
      description: 'Organizer untuk event spesial Anda',
      link: '/products?category=event',
    },
    {
      name: 'Store',
      icon: ShoppingBag,
      description: 'Produk makanan siap saji',
      link: '/products?category=store',
    },
  ];

  return (
    <div className="min-h-screen">
      <div className="relative h-44 md:h-[500px] mt-20 bg-gradient-to-r from-primary-600 to-primary-800 overflow-hidden">
        {banners.length > 0 ? (
          <div className="relative h-full">
            {banners.map((banner, index) => (
              <div
                key={banner.id}
                className={`absolute inset-0 transition-opacity duration-1000 ${
                  index === currentBanner ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <img
                  src={getImageUrl(banner.image_url)}
                  alt={banner.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                  <div className="text-center text-white px-4">
                    {banner.title && <h1 className="text-xl md:text-6xl font-bold mb-4">{banner.title}</h1>}
                    {banner.description && <p className="text-xl md:text-2xl">{banner.description}</p>}
                  </div>
                </div>
              </div>
            ))}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
              {banners.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentBanner(index)}
                  className={`w-3 h-3 rounded-full transition ${
                    index === currentBanner ? 'bg-white' : 'bg-white bg-opacity-50'
                  }`}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-white px-4">
            <div className="text-center" data-aos="fade-up">
              <h1 className="text-4xl md:text-6xl font-bold mb-4">
                Selamat Datang di Al Hakim Catering
              </h1>
              <p className="text-xl md:text-2xl mb-8">
                Solusi terbaik untuk kebutuhan catering, aqiqah, dan event Anda
              </p>
              <Link
                to="/products"
                className="inline-block bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
              >
                Lihat Produk
              </Link>
            </div>
          </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12" data-aos="fade-up">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Kategori Produk
          </h2>
          <p className="text-gray-600 text-lg">
            Pilih kategori sesuai kebutuhan Anda
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((category, index) => {
            const IconComponent = category.icon;
            return (
              <Link
                key={index}
                to={category.link}
                className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition transform hover:-translate-y-2"
                data-aos="fade-up"
                data-aos-delay={index * 100}
              >
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
                    <IconComponent className="w-8 h-8 text-primary-600" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-center mb-2 text-gray-900">
                  {category.name}
                </h3>
                <p className="text-gray-600 text-center text-sm">
                  {category.description}
                </p>
              </Link>
            );
          })}
        </div>
      </div>

      {promoProducts.length > 0 && (
        <div className="bg-primary-50 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12" data-aos="fade-up">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Produk Promo
              </h2>
              <p className="text-gray-600 text-lg">
                Dapatkan penawaran terbaik untuk produk pilihan
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {promoProducts.map((product, index) => (
                <div
                  key={product.id}
                  className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition"
                  data-aos="fade-up"
                  data-aos-delay={index * 100}
                >
                  <div className="relative">
                    <img
                      src={getImageUrl(product.image_url)}
                      alt={product.name}
                      className="w-full h-48 object-cover"
                    />
                    {product.discount_percentage > 0 && (
                      <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                        -{product.discount_percentage}%
                      </div>
                    )}
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {product.name}
                    </h3>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {product.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <div>
                        {product.discount_percentage > 0 ? (
                          <>
                            <span className="text-gray-400 line-through text-sm">
                              Rp {formatRupiah(product.price)}
                            </span>
                            <span className="text-primary-600 font-bold text-xl ml-2">
                              Rp {formatRupiah(product.discounted_price)}
                            </span>
                          </>
                        ) : (
                          <span className="text-primary-600 font-bold text-xl">
                            Rp {formatRupiah(product.price)}
                          </span>
                        )}
                      </div>
                      <Link
                        to={`/products/${product.id}`}
                        className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition text-sm"
                      >
                        Detail
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12" data-aos="fade-up">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Mengapa Memilih Kami?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center" data-aos="fade-up" data-aos-delay="100">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Kualitas Terjamin</h3>
              <p className="text-gray-600">
                Menggunakan bahan berkualitas dan proses yang higienis
              </p>
            </div>

            <div className="text-center" data-aos="fade-up" data-aos-delay="200">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Tepat Waktu</h3>
              <p className="text-gray-600">
                Pengiriman selalu tepat waktu sesuai jadwal
              </p>
            </div>

            <div className="text-center" data-aos="fade-up" data-aos-delay="300">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Pelayanan Terbaik</h3>
              <p className="text-gray-600">
                Tim profesional siap melayani kebutuhan Anda
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
