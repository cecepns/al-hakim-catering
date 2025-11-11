-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Waktu pembuatan: 11 Nov 2025 pada 13.32
-- Versi server: 10.11.14-MariaDB-cll-lve
-- Versi PHP: 8.4.14

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `isad8273_alhakim`
--

-- --------------------------------------------------------

--
-- Struktur dari tabel `banners`
--

CREATE TABLE `banners` (
  `id` int(11) NOT NULL,
  `title` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `image_url` varchar(500) NOT NULL,
  `video_url` varchar(500) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `display_order` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `banners`
--

INSERT INTO `banners` (`id`, `title`, `description`, `image_url`, `video_url`, `is_active`, `display_order`, `created_at`, `updated_at`) VALUES
(4, '', '', '/uploads/1760234032865-IMG-20250930-WA0007(1).jpg', NULL, 1, 0, '2025-10-12 01:53:52', '2025-10-12 01:53:52');

-- --------------------------------------------------------

--
-- Struktur dari tabel `cart`
--

CREATE TABLE `cart` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `variant_id` int(11) DEFAULT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `cart`
--

INSERT INTO `cart` (`id`, `user_id`, `product_id`, `variant_id`, `quantity`, `created_at`, `updated_at`) VALUES
(1, 1, 3, NULL, 9, '2025-10-08 13:06:17', '2025-10-10 16:36:27');

-- --------------------------------------------------------

--
-- Struktur dari tabel `cashback_history`
--

CREATE TABLE `cashback_history` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `order_id` int(11) DEFAULT NULL,
  `amount` decimal(15,2) NOT NULL,
  `type` enum('earned','used') NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `cashback_history`
--

INSERT INTO `cashback_history` (`id`, `user_id`, `order_id`, `amount`, `type`, `description`, `created_at`) VALUES
(1, 6, 1, 630.00, 'earned', 'Cashback dari pesanan #1', '2025-10-10 16:20:56'),
(2, 6, 2, 71565.00, 'earned', 'Cashback dari pesanan #2', '2025-10-10 16:27:49'),
(3, 7, 3, 630.00, 'earned', 'Cashback dari pesanan #3', '2025-10-12 04:52:11'),
(4, 7, 4, 630.00, 'earned', 'Cashback dari pesanan #4', '2025-10-15 03:47:57'),
(5, 6, 5, 712.50, 'earned', 'Cashback dari pesanan #5', '2025-11-04 07:07:08');

-- --------------------------------------------------------

--
-- Struktur dari tabel `commissions`
--

CREATE TABLE `commissions` (
  `id` int(11) NOT NULL,
  `marketing_id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL,
  `base_amount` decimal(15,2) NOT NULL,
  `commission_percentage` decimal(5,2) NOT NULL,
  `commission_amount` decimal(15,2) NOT NULL,
  `status` enum('pending','completed','cancelled') DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `complaints`
--

CREATE TABLE `complaints` (
  `id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `subject` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `image_url` varchar(500) DEFAULT NULL,
  `status` enum('pending','processed','resolved','rejected') DEFAULT 'pending',
  `admin_response` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `marketing_prices`
--

CREATE TABLE `marketing_prices` (
  `id` int(11) NOT NULL,
  `marketing_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `custom_price` decimal(15,2) NOT NULL,
  `margin_percentage` decimal(5,2) NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `orders`
--

CREATE TABLE `orders` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `marketing_id` int(11) DEFAULT NULL,
  `voucher_id` int(11) DEFAULT NULL,
  `total_amount` decimal(15,2) NOT NULL,
  `discount_amount` decimal(15,2) DEFAULT 0.00,
  `cashback_used` decimal(15,2) DEFAULT 0.00,
  `final_amount` decimal(15,2) NOT NULL,
  `payment_method` enum('transfer','dp','cod','tunai') NOT NULL,
  `payment_status` enum('pending','partial','paid') DEFAULT 'pending',
  `status` enum('dibuat','diproses','dikirim','selesai','dibatalkan') DEFAULT 'dibuat',
  `delivery_address` text NOT NULL,
  `guest_sharelok_link` text DEFAULT NULL,
  `guest_landmark` text DEFAULT NULL,
  `guest_delivery_type` enum('diambil','diantar') DEFAULT NULL,
  `guest_customer_name` varchar(255) DEFAULT NULL,
  `guest_wa_number_1` varchar(20) DEFAULT NULL,
  `guest_wa_number_2` varchar(20) DEFAULT NULL,
  `guest_reference` varchar(50) DEFAULT NULL,
  `guest_reference_detail` varchar(255) DEFAULT NULL,
  `guest_event_name` varchar(255) DEFAULT NULL,
  `guest_event_date` date DEFAULT NULL,
  `guest_event_time` time DEFAULT NULL,
  `delivery_notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `orders`
--

INSERT INTO `orders` (`id`, `user_id`, `marketing_id`, `voucher_id`, `total_amount`, `discount_amount`, `cashback_used`, `final_amount`, `payment_method`, `payment_status`, `status`, `delivery_address`, `guest_sharelok_link`, `guest_landmark`, `guest_delivery_type`, `guest_customer_name`, `guest_wa_number_1`, `guest_wa_number_2`, `guest_reference`, `guest_reference_detail`, `guest_event_name`, `guest_event_date`, `guest_event_time`, `delivery_notes`, `created_at`, `updated_at`) VALUES
(1, 6, NULL, NULL, 63000.00, 0.00, 0.00, 63000.00, 'cod', 'pending', 'selesai', 'indonesia\nindonesia', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', '2025-10-10 16:20:56', '2025-10-11 09:02:58'),
(2, 6, NULL, NULL, 7156500.00, 0.00, 0.00, 7156500.00, 'cod', 'pending', 'dikirim', 'ss', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'ss', '2025-10-10 16:27:49', '2025-10-11 03:49:11'),
(3, 7, NULL, NULL, 63000.00, 0.00, 0.00, 63000.00, 'transfer', 'pending', 'dibuat', 'Indo', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', '2025-10-12 04:52:11', '2025-10-12 04:52:11'),
(4, 7, NULL, NULL, 63000.00, 0.00, 0.00, 63000.00, 'transfer', 'pending', 'selesai', 'Indonesia ', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', '2025-10-15 03:47:57', '2025-10-15 09:03:01'),
(5, 6, NULL, NULL, 71250.00, 0.00, 0.00, 71250.00, 'cod', 'pending', 'dibuat', 'indonesia\nindonesia', 'https://maps', 'sd bantarwaru 1', 'diantar', 'cecep', '082214094779', NULL, 'brosur', NULL, 'Aqiqah', '2025-11-05', '14:08:00', '{\"reference\":\"brosur\",\"reference_detail\":\"\",\"event_name\":\"Aqiqah\",\"event_date\":\"2025-11-05\",\"event_time\":\"14:08\",\"delivery_type\":\"diantar\",\"customer_name\":\"cecep\",\"wa_number_1\":\"082214094779\",\"wa_number_2\":\"\",\"landmark\":\"sd bantarwaru 1\",\"sharelok_link\":\"https://maps\",\"notes\":\"\"}', '2025-11-04 07:07:08', '2025-11-04 07:07:08');

-- --------------------------------------------------------

--
-- Struktur dari tabel `order_items`
--

CREATE TABLE `order_items` (
  `id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `variant_id` int(11) DEFAULT NULL,
  `product_name` varchar(255) NOT NULL,
  `variant_name` varchar(100) DEFAULT NULL,
  `quantity` int(11) NOT NULL,
  `price` decimal(15,2) NOT NULL,
  `subtotal` decimal(15,2) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `addons_json` text DEFAULT NULL,
  `addons_price` decimal(15,2) DEFAULT 0.00,
  `variant_selections_json` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `order_items`
--

INSERT INTO `order_items` (`id`, `order_id`, `product_id`, `variant_id`, `product_name`, `variant_name`, `quantity`, `price`, `subtotal`, `created_at`, `addons_json`, `addons_price`, `variant_selections_json`) VALUES
(1, 1, 1, NULL, 'Paket Nasi Box Premium', NULL, 2, 31500.00, 63000.00, '2025-10-10 16:20:56', NULL, 0.00, NULL),
(2, 2, 1, NULL, 'Paket Nasi Box Premium', NULL, 1, 31500.00, 31500.00, '2025-10-10 16:27:49', NULL, 0.00, NULL),
(3, 2, 3, NULL, 'Paket Event Gathering 50 Orang', NULL, 1, 7125000.00, 7125000.00, '2025-10-10 16:27:49', NULL, 0.00, NULL),
(4, 3, 1, NULL, 'Paket Nasi Box Premium', NULL, 2, 31500.00, 63000.00, '2025-10-12 04:52:11', NULL, 0.00, NULL),
(5, 4, 1, NULL, 'Paket Nasi Box Premium', NULL, 2, 31500.00, 63000.00, '2025-10-15 03:47:57', NULL, 0.00, NULL),
(6, 5, 3, NULL, 'Paket Event Gathering 50 Orang', NULL, 1, 71250.00, 71250.00, '2025-11-04 07:07:08', NULL, 0.00, NULL);

-- --------------------------------------------------------

--
-- Struktur dari tabel `order_status_logs`
--

CREATE TABLE `order_status_logs` (
  `id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL,
  `status` enum('dibuat','diproses','dikirim','selesai','dibatalkan') NOT NULL,
  `handler_id` int(11) DEFAULT NULL,
  `handler_name` varchar(255) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `proof_image_url` varchar(500) DEFAULT NULL,
  `proof_video_url` varchar(500) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `order_status_logs`
--

INSERT INTO `order_status_logs` (`id`, `order_id`, `status`, `handler_id`, `handler_name`, `notes`, `proof_image_url`, `proof_video_url`, `created_at`) VALUES
(1, 1, 'dibuat', 6, 'Customer', 'Pesanan dibuat', NULL, NULL, '2025-10-10 16:20:56'),
(2, 2, 'dibuat', 6, 'Customer', 'Pesanan dibuat', NULL, NULL, '2025-10-10 16:27:49'),
(3, 2, 'dikirim', 1, 'Admin Al Hakim', '', NULL, NULL, '2025-10-11 03:49:11'),
(4, 1, 'diproses', 1, 'Admin Al Hakim', '', NULL, NULL, '2025-10-11 08:59:06'),
(5, 1, 'dikirim', 1, 'Admin Al Hakim', '', NULL, NULL, '2025-10-11 09:02:11'),
(6, 1, 'selesai', 1, 'Admin Al Hakim', '', NULL, NULL, '2025-10-11 09:02:58'),
(7, 3, 'dibuat', 7, 'Customer', 'Pesanan dibuat', NULL, NULL, '2025-10-12 04:52:11'),
(8, 4, 'dibuat', 7, 'Customer', 'Pesanan dibuat', NULL, NULL, '2025-10-15 03:47:57'),
(9, 4, 'diproses', 4, 'Dapur', 'Pesanan mulai diproses dapur', '/uploads/1760516094456-Screenshot_20251015-145147.png', NULL, '2025-10-15 08:14:54'),
(10, 4, 'dikirim', 4, 'Dapur', 'Pesanan selesai diproses dan siap dikirim', NULL, NULL, '2025-10-15 08:15:50'),
(11, 4, 'selesai', 5, 'Kurir', 'Pesanan telah diterima pelanggan', NULL, NULL, '2025-10-15 09:03:01'),
(12, 5, 'dibuat', 6, 'Customer', 'Pesanan dibuat', NULL, NULL, '2025-11-04 07:07:08');

-- --------------------------------------------------------

--
-- Struktur dari tabel `products`
--

CREATE TABLE `products` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `category` enum('catering','aqiqah','event','store') NOT NULL,
  `price` decimal(15,2) NOT NULL,
  `discount_percentage` int(11) DEFAULT 0,
  `discounted_price` decimal(15,2) GENERATED ALWAYS AS (`price` - `price` * `discount_percentage` / 100) STORED,
  `image_url` varchar(500) DEFAULT NULL,
  `video_url` varchar(500) DEFAULT NULL,
  `is_promo` tinyint(1) DEFAULT 0,
  `stock` int(11) DEFAULT 0,
  `sold_count` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `min_price` decimal(15,2) DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `products`
--

INSERT INTO `products` (`id`, `name`, `description`, `category`, `price`, `discount_percentage`, `image_url`, `video_url`, `is_promo`, `stock`, `sold_count`, `created_at`, `updated_at`, `min_price`) VALUES
(1, 'Paket Nasi Box Premium', 'Nasi box dengan lauk lengkap dan berkualitas', 'catering', 35000.00, 10, '/uploads/1760157858626-Paket-Nasi-Box-Kebuli-Ayam-Goreng.jpg', NULL, 1, 93, 7, '2025-10-08 11:27:47', '2025-10-15 03:47:57', 0.00),
(3, 'Paket Event Gathering 50 Orang', 'Paket lengkap untuk acara gathering perusahaan', 'event', 75000.00, 5, '/uploads/1760157866763-Paket-Nasi-Box-Kebuli-Ayam-Goreng.jpg', NULL, 1, 3, 2, '2025-10-08 11:27:47', '2025-11-04 07:07:08', 0.00);

--
-- Trigger `products`
--
DELIMITER $$
CREATE TRIGGER `trg_product_insert_update_min_price` BEFORE INSERT ON `products` FOR EACH ROW BEGIN
  SET NEW.min_price = NEW.price;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `trg_product_update_set_min_price` BEFORE UPDATE ON `products` FOR EACH ROW BEGIN
  SET NEW.min_price = LEAST(NEW.price, COALESCE((SELECT MIN(price + price_adjustment) FROM product_variants WHERE product_id = NEW.id), NEW.price));
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Struktur dari tabel `product_addons`
--

CREATE TABLE `product_addons` (
  `id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `price` decimal(15,2) NOT NULL,
  `max_quantity` int(11) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `product_images`
--

CREATE TABLE `product_images` (
  `id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `media_url` varchar(500) NOT NULL,
  `media_type` enum('image','video') DEFAULT 'image',
  `display_order` int(11) DEFAULT 0,
  `is_primary` tinyint(1) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `product_images`
--

INSERT INTO `product_images` (`id`, `product_id`, `media_url`, `media_type`, `display_order`, `is_primary`, `created_at`) VALUES
(1, 1, '/uploads/1760157858626-Paket-Nasi-Box-Kebuli-Ayam-Goreng.jpg', 'image', 0, 1, '2025-11-11 06:18:19'),
(2, 3, '/uploads/1760157866763-Paket-Nasi-Box-Kebuli-Ayam-Goreng.jpg', 'image', 0, 1, '2025-11-11 06:18:19'),
(4, 1, '/uploads/1762842183779-ChatGPT Image 31 Okt 2025, 11.34.17.png', 'image', 0, NULL, '2025-11-11 06:23:03');

-- --------------------------------------------------------

--
-- Struktur dari tabel `product_variants`
--

CREATE TABLE `product_variants` (
  `id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `price_adjustment` decimal(15,2) DEFAULT 0.00,
  `stock` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `description` text DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Trigger `product_variants`
--
DELIMITER $$
CREATE TRIGGER `trg_variant_delete_update_product_min_price` AFTER DELETE ON `product_variants` FOR EACH ROW BEGIN
  UPDATE products 
  SET min_price = COALESCE((SELECT MIN(price + price_adjustment) FROM product_variants WHERE product_id = OLD.product_id), price)
  WHERE id = OLD.product_id;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `trg_variant_insert_update_product_min_price` AFTER INSERT ON `product_variants` FOR EACH ROW BEGIN
  UPDATE products 
  SET min_price = LEAST(price, COALESCE((SELECT MIN(price + price_adjustment) FROM product_variants WHERE product_id = NEW.product_id), price))
  WHERE id = NEW.product_id;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `trg_variant_update_update_product_min_price` AFTER UPDATE ON `product_variants` FOR EACH ROW BEGIN
  UPDATE products 
  SET min_price = LEAST(price, COALESCE((SELECT MIN(price + price_adjustment) FROM product_variants WHERE product_id = NEW.product_id), price))
  WHERE id = NEW.product_id;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Struktur dari tabel `product_variant_images`
--

CREATE TABLE `product_variant_images` (
  `id` int(11) NOT NULL,
  `variant_id` int(11) NOT NULL,
  `image_url` varchar(500) NOT NULL,
  `display_order` int(11) DEFAULT 0,
  `is_primary` tinyint(1) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `product_variant_options`
--

CREATE TABLE `product_variant_options` (
  `id` int(11) NOT NULL,
  `tier_id` int(11) NOT NULL,
  `option_name` varchar(100) NOT NULL,
  `price_adjustment` decimal(15,2) DEFAULT 0.00,
  `display_order` int(11) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `product_variant_tiers`
--

CREATE TABLE `product_variant_tiers` (
  `id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `tier_level` int(11) NOT NULL,
  `tier_name` varchar(100) NOT NULL,
  `is_required` tinyint(1) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `reviews`
--

CREATE TABLE `reviews` (
  `id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `rating` int(11) NOT NULL CHECK (`rating` between 1 and 5),
  `comment` text DEFAULT NULL,
  `image_url` varchar(500) DEFAULT NULL,
  `is_approved` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `address` text DEFAULT NULL,
  `role` enum('pembeli','admin','marketing','operasional','dapur','kurir') DEFAULT 'pembeli',
  `cashback_balance` decimal(15,2) DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `password`, `phone`, `address`, `role`, `cashback_balance`, `created_at`, `updated_at`) VALUES
(1, 'Admin Al Hakim', 'admin@alhakim.com', '$2a$12$EYLTM0mhWq2plrN.A7giBOQl.1TnrSrEFZUiNB2Dt/3Ky3IgkEn2y', '081234567890', 'Jakarta', 'admin', 0.00, '2025-10-08 11:27:47', '2025-10-08 11:28:51'),
(2, 'Marketing 1', 'marketing@alhakim.com', '$2a$12$0SO/9BHcVp1m1I3iPe0LA.73M6P2QjcH8BAiGz.kxQdDnBuvPoO0y', '081234567891', 'Jakarta', 'marketing', 0.00, '2025-10-08 11:27:47', '2025-10-08 11:29:03'),
(3, 'Operasional', 'ops@alhakim.com', '$2a$12$qLQQyEM.xsDXGNcwbDSf1uHi3RZpQMOBYRTrfyk1EQK24w3dvRVkG', '081234567892', 'Jakarta', 'operasional', 0.00, '2025-10-08 11:27:47', '2025-10-08 11:29:17'),
(4, 'Dapur', 'dapur@alhakim.com', '$2a$12$L5mm6pErvemj/tHACNDHjOuuzudWtHp94A8jZv2ZtjZRw8bAeDLh6', '081234567893', 'Jakarta', 'dapur', 0.00, '2025-10-08 11:27:47', '2025-10-08 11:29:28'),
(5, 'Kurir', 'kurir@alhakim.com', '$2a$12$bj8Rn.seI/jxcejS6.UeQeoVJKMYPw8My2Hm7HAEq2tv3JuPgiFGi', '081234567894', 'Jakarta', 'kurir', 0.00, '2025-10-08 11:27:47', '2025-10-08 11:29:38'),
(6, 'cecep', 'cecep@gmail.com', '$2a$10$aHdBs7UrryvvDhCP1Paun.zpPzxNKTT/vWK6WOBtp9xGTe954Ryi2', '082214094779', 'indonesia\nindonesia', 'pembeli', 72907.50, '2025-10-10 16:05:16', '2025-11-04 07:07:08'),
(7, 'Si A', 'aaa@gmail.com', '$2a$10$Hv.EjzzNyVeq19.GE01WIuv5c/ZbYFVQWJ4RW8pU7nDSNtBwOBAJu', '08188888888', 'Indonesia ', 'pembeli', 1260.00, '2025-10-12 04:49:26', '2025-10-15 03:47:57');

-- --------------------------------------------------------

--
-- Struktur dari tabel `vouchers`
--

CREATE TABLE `vouchers` (
  `id` int(11) NOT NULL,
  `code` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `discount_type` enum('percentage','fixed') NOT NULL,
  `discount_value` decimal(15,2) NOT NULL,
  `min_purchase` decimal(15,2) DEFAULT 0.00,
  `max_discount` decimal(15,2) DEFAULT 0.00,
  `quota` int(11) DEFAULT 0,
  `used_count` int(11) DEFAULT 0,
  `valid_from` datetime NOT NULL,
  `valid_until` datetime NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `vouchers`
--

INSERT INTO `vouchers` (`id`, `code`, `name`, `discount_type`, `discount_value`, `min_purchase`, `max_discount`, `quota`, `used_count`, `valid_from`, `valid_until`, `is_active`, `created_at`) VALUES
(1, 'WELCOME10', 'Diskon Selamat Datang', 'percentage', 10.00, 100000.00, 50000.00, 100, 0, '2024-01-01 00:00:00', '2024-12-31 00:00:00', 1, '2025-10-08 11:27:47'),
(2, 'CASHBACK50K', 'Cashback 50 Ribu', 'fixed', 50000.00, 500000.00, 50000.00, 50, 0, '2024-01-01 00:00:00', '2024-12-31 00:00:00', 1, '2025-10-08 11:27:47');

-- --------------------------------------------------------

--
-- Struktur dari tabel `wholesale_prices`
--

CREATE TABLE `wholesale_prices` (
  `id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `min_quantity` int(11) NOT NULL,
  `price` decimal(15,2) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Indexes for dumped tables
--

--
-- Indeks untuk tabel `banners`
--
ALTER TABLE `banners`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_active` (`is_active`);

--
-- Indeks untuk tabel `cart`
--
ALTER TABLE `cart`
  ADD PRIMARY KEY (`id`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `variant_id` (`variant_id`),
  ADD KEY `idx_user` (`user_id`);

--
-- Indeks untuk tabel `cashback_history`
--
ALTER TABLE `cashback_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `order_id` (`order_id`),
  ADD KEY `idx_user` (`user_id`);

--
-- Indeks untuk tabel `commissions`
--
ALTER TABLE `commissions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_marketing` (`marketing_id`),
  ADD KEY `idx_order` (`order_id`);

--
-- Indeks untuk tabel `complaints`
--
ALTER TABLE `complaints`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `idx_order` (`order_id`),
  ADD KEY `idx_status` (`status`);

--
-- Indeks untuk tabel `marketing_prices`
--
ALTER TABLE `marketing_prices`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_marketing` (`marketing_id`),
  ADD KEY `idx_product` (`product_id`);

--
-- Indeks untuk tabel `orders`
--
ALTER TABLE `orders`
  ADD PRIMARY KEY (`id`),
  ADD KEY `voucher_id` (`voucher_id`),
  ADD KEY `idx_user` (`user_id`),
  ADD KEY `idx_marketing` (`marketing_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_guest_customer` (`guest_customer_name`),
  ADD KEY `idx_guest_wa` (`guest_wa_number_1`),
  ADD KEY `idx_guest_reference` (`guest_reference`),
  ADD KEY `idx_guest_event_date` (`guest_event_date`),
  ADD KEY `idx_guest_delivery_type` (`guest_delivery_type`);

--
-- Indeks untuk tabel `order_items`
--
ALTER TABLE `order_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `variant_id` (`variant_id`),
  ADD KEY `idx_order` (`order_id`);

--
-- Indeks untuk tabel `order_status_logs`
--
ALTER TABLE `order_status_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `handler_id` (`handler_id`),
  ADD KEY `idx_order` (`order_id`);

--
-- Indeks untuk tabel `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_category` (`category`),
  ADD KEY `idx_promo` (`is_promo`),
  ADD KEY `idx_min_price` (`min_price`);

--
-- Indeks untuk tabel `product_addons`
--
ALTER TABLE `product_addons`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_product` (`product_id`),
  ADD KEY `idx_active` (`is_active`);

--
-- Indeks untuk tabel `product_images`
--
ALTER TABLE `product_images`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_product` (`product_id`),
  ADD KEY `idx_primary` (`is_primary`);

--
-- Indeks untuk tabel `product_variants`
--
ALTER TABLE `product_variants`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_product` (`product_id`),
  ADD KEY `idx_active` (`is_active`);

--
-- Indeks untuk tabel `product_variant_images`
--
ALTER TABLE `product_variant_images`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_variant` (`variant_id`),
  ADD KEY `idx_primary` (`is_primary`);

--
-- Indeks untuk tabel `product_variant_options`
--
ALTER TABLE `product_variant_options`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_tier` (`tier_id`),
  ADD KEY `idx_active` (`is_active`);

--
-- Indeks untuk tabel `product_variant_tiers`
--
ALTER TABLE `product_variant_tiers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_tier` (`product_id`,`tier_level`),
  ADD KEY `idx_product` (`product_id`);

--
-- Indeks untuk tabel `reviews`
--
ALTER TABLE `reviews`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `idx_order` (`order_id`),
  ADD KEY `idx_approved` (`is_approved`);

--
-- Indeks untuk tabel `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_email` (`email`),
  ADD KEY `idx_role` (`role`);

--
-- Indeks untuk tabel `vouchers`
--
ALTER TABLE `vouchers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`),
  ADD KEY `idx_code` (`code`),
  ADD KEY `idx_active` (`is_active`);

--
-- Indeks untuk tabel `wholesale_prices`
--
ALTER TABLE `wholesale_prices`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_product` (`product_id`);

--
-- AUTO_INCREMENT untuk tabel yang dibuang
--

--
-- AUTO_INCREMENT untuk tabel `banners`
--
ALTER TABLE `banners`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT untuk tabel `cart`
--
ALTER TABLE `cart`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT untuk tabel `cashback_history`
--
ALTER TABLE `cashback_history`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT untuk tabel `commissions`
--
ALTER TABLE `commissions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `complaints`
--
ALTER TABLE `complaints`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `marketing_prices`
--
ALTER TABLE `marketing_prices`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `orders`
--
ALTER TABLE `orders`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT untuk tabel `order_items`
--
ALTER TABLE `order_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT untuk tabel `order_status_logs`
--
ALTER TABLE `order_status_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT untuk tabel `products`
--
ALTER TABLE `products`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT untuk tabel `product_addons`
--
ALTER TABLE `product_addons`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `product_images`
--
ALTER TABLE `product_images`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT untuk tabel `product_variants`
--
ALTER TABLE `product_variants`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `product_variant_images`
--
ALTER TABLE `product_variant_images`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `product_variant_options`
--
ALTER TABLE `product_variant_options`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `product_variant_tiers`
--
ALTER TABLE `product_variant_tiers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `reviews`
--
ALTER TABLE `reviews`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT untuk tabel `vouchers`
--
ALTER TABLE `vouchers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT untuk tabel `wholesale_prices`
--
ALTER TABLE `wholesale_prices`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Ketidakleluasaan untuk tabel pelimpahan (Dumped Tables)
--

--
-- Ketidakleluasaan untuk tabel `cart`
--
ALTER TABLE `cart`
  ADD CONSTRAINT `cart_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `cart_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `cart_ibfk_3` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`id`) ON DELETE SET NULL;

--
-- Ketidakleluasaan untuk tabel `cashback_history`
--
ALTER TABLE `cashback_history`
  ADD CONSTRAINT `cashback_history_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `cashback_history_ibfk_2` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE SET NULL;

--
-- Ketidakleluasaan untuk tabel `commissions`
--
ALTER TABLE `commissions`
  ADD CONSTRAINT `commissions_ibfk_1` FOREIGN KEY (`marketing_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `commissions_ibfk_2` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `complaints`
--
ALTER TABLE `complaints`
  ADD CONSTRAINT `complaints_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `complaints_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `marketing_prices`
--
ALTER TABLE `marketing_prices`
  ADD CONSTRAINT `marketing_prices_ibfk_1` FOREIGN KEY (`marketing_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `marketing_prices_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `orders`
--
ALTER TABLE `orders`
  ADD CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `orders_ibfk_2` FOREIGN KEY (`marketing_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `orders_ibfk_3` FOREIGN KEY (`voucher_id`) REFERENCES `vouchers` (`id`) ON DELETE SET NULL;

--
-- Ketidakleluasaan untuk tabel `order_items`
--
ALTER TABLE `order_items`
  ADD CONSTRAINT `order_items_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `order_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  ADD CONSTRAINT `order_items_ibfk_3` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`id`) ON DELETE SET NULL;

--
-- Ketidakleluasaan untuk tabel `order_status_logs`
--
ALTER TABLE `order_status_logs`
  ADD CONSTRAINT `order_status_logs_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `order_status_logs_ibfk_2` FOREIGN KEY (`handler_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Ketidakleluasaan untuk tabel `product_addons`
--
ALTER TABLE `product_addons`
  ADD CONSTRAINT `product_addons_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `product_images`
--
ALTER TABLE `product_images`
  ADD CONSTRAINT `product_images_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `product_variants`
--
ALTER TABLE `product_variants`
  ADD CONSTRAINT `product_variants_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `product_variant_images`
--
ALTER TABLE `product_variant_images`
  ADD CONSTRAINT `product_variant_images_ibfk_1` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `product_variant_options`
--
ALTER TABLE `product_variant_options`
  ADD CONSTRAINT `product_variant_options_ibfk_1` FOREIGN KEY (`tier_id`) REFERENCES `product_variant_tiers` (`id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `product_variant_tiers`
--
ALTER TABLE `product_variant_tiers`
  ADD CONSTRAINT `product_variant_tiers_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `reviews`
--
ALTER TABLE `reviews`
  ADD CONSTRAINT `reviews_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `reviews_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `wholesale_prices`
--
ALTER TABLE `wholesale_prices`
  ADD CONSTRAINT `wholesale_prices_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
