import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  UtensilsCrossed,
  Beef,
  PartyPopper,
  ShoppingBag,
  ArrowRight,
} from "lucide-react";
import AOS from "aos";
import "aos/dist/aos.css";
import { productAPI, bannerAPI } from "../utils/api";
import { getImageUrl } from "../utils/imageHelper";
import { formatRupiah } from "../utils/formatHelper";

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
      console.error("Error fetching banners:", error);
    }
  };

  const fetchPromoProducts = async () => {
    try {
      const response = await productAPI.getPromo();

      // Fetch images for each product and use first image if available
      const productsWithImages = await Promise.all(
        response.data.map(async (product) => {
          try {
            const imagesRes = await productAPI.getImages(product.id);
            const images = imagesRes.data || [];
            // Use first image if available, otherwise use product.image_url
            const displayImage =
              images.length > 0 ? images[0].media_url : product.image_url;
            return { ...product, image_url: displayImage };
          } catch (error) {
            // If images fetch fails, keep the original image_url
            return product;
          }
        })
      );

      setPromoProducts(productsWithImages);
    } catch (error) {
      console.error("Error fetching promo products:", error);
    }
  };

  const categories = [
    {
      name: "Catering",
      icon: UtensilsCrossed,
      description:
        "Layanan catering untuk berbagai acara — dari nasi kotak, prasmanan, tumpeng, dll",
      link: "/products?category=catering",
    },
    {
      name: "Aqiqah",
      icon: Beef,
      description:
        "Paket aqiqah lengkap dan siap saji, tersedia juga paket nasi kotak.",
      link: "/products?category=aqiqah",
    },
    {
      name: "Store",
      icon: ShoppingBag,
      description:
        "Beragam produk keperluan acara seperti buku Yasin, souvenir, perlengkapan ibadah, oleh-oleh umroh dll",
      link: "/products?category=store",
    },
    {
      name: "Event",
      icon: PartyPopper,
      description:
        "Layanan paket event lengkap: hajatan, aqiqah, lamaran, wedding, khitanan, hingga dekorasi.",
      link: "/products?category=event",
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
                  index === currentBanner ? "opacity-100" : "opacity-0"
                }`}
              >
                <img
                  src={getImageUrl(banner.image_url)}
                  alt={banner.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                  <div className="text-center text-white px-4">
                    {banner.title && (
                      <h1 className="text-xl md:text-6xl font-bold mb-4">
                        {banner.title}
                      </h1>
                    )}
                    {banner.description && (
                      <p className="text-xl md:text-2xl">
                        {banner.description}
                      </p>
                    )}
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
                    index === currentBanner
                      ? "bg-white"
                      : "bg-white bg-opacity-50"
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
                className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition transform hover:-translate-y-2 group"
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
                <p className="text-gray-600 text-center text-sm mb-4">
                  {category.description}
                </p>
                <div className="flex items-center justify-center gap-2 text-primary-600 font-semibold group-hover:gap-3 transition-all">
                  <span>Lihat selengkapnya</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
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
                Produk Recommended
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
                    </div>
                    <Link
                      to={`/products/${product.id}`}
                      className="bg-primary-600 block max-w-fit mt-5 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition text-sm"
                    >
                      Lihat Detail Produk
                    </Link>
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
            <div
              className="text-center"
              data-aos="fade-up"
              data-aos-delay="100"
            >
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-primary-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Berpengalaman & Terpercaya
              </h3>
              <p className="text-gray-600">
                Berdiri sejak 2019 dengan pengalaman melayani ribuan pelanggan
              </p>
            </div>

            <div
              className="text-center"
              data-aos="fade-up"
              data-aos-delay="200"
            >
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-primary-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Cita Rasa Lezat
              </h3>
              <p className="text-gray-600">
                Dengan bahan premium dan proses pengolahan higienis
              </p>
            </div>

            <div
              className="text-center"
              data-aos="fade-up"
              data-aos-delay="300"
            >
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-primary-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Layanan Praktis & Profesional
              </h3>
              <p className="text-gray-600">
                Tim profesional siap melayani dengan cepat dan ramah
              </p>
            </div>

            <div
              className="text-center"
              data-aos="fade-up"
              data-aos-delay="400"
            >
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-primary-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Bisa Bayar di Tempat
              </h3>
              <p className="text-gray-600">
                COD (Cash on Delivery) untuk kemudahan pembayaran
              </p>
            </div>

            <div
              className="text-center"
              data-aos="fade-up"
              data-aos-delay="500"
            >
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-primary-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Siap Antar
              </h3>
              <p className="text-gray-600">
                Dengan ongkir seikhlasnya atau free ongkir untuk wilayah
                tertentu
              </p>
            </div>

            <div
              className="text-center"
              data-aos="fade-up"
              data-aos-delay="600"
            >
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-primary-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Potongan Harga
              </h3>
              <p className="text-gray-600">
                Bagi reseller dan dropship, plus gratis voucher diskon
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
