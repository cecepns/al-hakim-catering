import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">AH</span>
              </div>
              <span className="text-xl font-bold">Al Hakim Catering</span>
            </div>
            <p className="text-gray-400 text-sm">
              Menyediakan layanan catering, aqiqah, event organizer, dan produk makanan berkualitas.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Menu</h3>
            <ul className="space-y-2 text-gray-400">
              <li><Link to="/" className="hover:text-primary-400 transition">Beranda</Link></li>
              <li><Link to="/products" className="hover:text-primary-400 transition">Produk</Link></li>
              <li><Link to="/about" className="hover:text-primary-400 transition">Tentang Kami</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Kategori</h3>
            <ul className="space-y-2 text-gray-400">
              <li><Link to="/products?category=catering" className="hover:text-primary-400 transition">Catering</Link></li>
              <li><Link to="/products?category=aqiqah" className="hover:text-primary-400 transition">Aqiqah</Link></li>
              <li><Link to="/products?category=event" className="hover:text-primary-400 transition">Event</Link></li>
              <li><Link to="/products?category=store" className="hover:text-primary-400 transition">Store</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Kontak</h3>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li className="flex items-start">
                <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span>+62 812-3456-7890</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>info@alhakimcatering.com</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Jl. Contoh No. 123, Jakarta</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400 text-sm">
          <p>&copy; 2025 Al Hakim Catering. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
