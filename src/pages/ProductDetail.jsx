import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { productAPI } from "../utils/api";
import { getImageUrl } from "../utils/imageHelper";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { formatRupiah } from "../utils/formatHelper";
import ImageViewer from "../components/ImageViewer";

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { user } = useAuth();
  const [product, setProduct] = useState(null);
  const [images, setImages] = useState([]);
  const [variations, setVariations] = useState([]);
  const [addons, setAddons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [selectedVariation, setSelectedVariation] = useState(null);
  const [selectedAddons, setSelectedAddons] = useState({});

  const fetchProduct = useCallback(async () => {
    try {
      setLoading(true);
      const [productRes, imagesRes, variationsRes, addonsRes] =
        await Promise.all([
          productAPI.getById(id),
          productAPI.getImages(id),
          productAPI.getVariations(id),
          productAPI.getAddons(id),
        ]);
      setProduct(productRes.data);
      setImages(imagesRes.data || []);
      setVariations(variationsRes.data || []);
      setAddons(addonsRes.data || []);
    } catch (error) {
      console.error("Error fetching product:", error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  const handleAddToCart = async () => {
    if (!user) {
      toast.warning(
        "Silakan login terlebih dahulu untuk menambahkan produk ke keranjang",
        {
          position: "top-center",
          autoClose: 2000,
        }
      );
      setTimeout(() => {
        navigate("/login");
      }, 2000);
      return;
    }

    if (user.role !== "pembeli") {
      toast.error("Fitur keranjang hanya tersedia untuk pembeli. Gunakan 'Beli Sekarang' untuk membeli.");
      return;
    }

    try {
      // Get selected addon IDs
      const addonIds = Object.keys(selectedAddons).filter(id => selectedAddons[id]).map(id => parseInt(id));
      
      await addToCart({
        product_id: product.id,
        variant_id: selectedVariation?.id || null,
        quantity,
        addon_ids: addonIds.length > 0 ? addonIds : null,
        total_price: calculateTotalPrice,
      });
      toast.success("Produk berhasil ditambahkan ke keranjang!");
      setTimeout(() => {
        navigate("/pembeli/cart");
      }, 1000);
    } catch (err) {
      console.error("Error adding to cart:", err);
      toast.error("Gagal menambahkan produk ke keranjang");
    }
  };

  const handleBuyNow = async () => {
    const isGuest = !user;

    // Jika sudah login, batasi role yang boleh melakukan pembelian
    if (!isGuest) {
      const allowedRoles = ["pembeli", "admin", "marketing"];
      if (!allowedRoles.includes(user.role)) {
        toast.error("Anda tidak memiliki akses untuk melakukan pembelian");
        return;
      }
    }

    try {
      // Get selected addon IDs
      const addonIds = Object.keys(selectedAddons).filter(id => selectedAddons[id]).map(id => parseInt(id));
      
      // All roles: skip cart, redirect directly to checkout with product data
      const directCheckoutData = {
        product_id: product.id,
        variant_id: selectedVariation?.id || null,
        quantity,
        addon_ids: addonIds.length > 0 ? addonIds : null,
        total_price: calculateTotalPrice,
        product_name: product.name,
        variant_name: selectedVariation?.name || null,
        price: getDisplayPrice,
        discounted_price: getDiscountedDisplayPrice,
        addons: addons.filter(addon => selectedAddons[addon.id]).map(addon => ({
          id: addon.id,
          name: addon.name,
          price: addon.price
        }))
      };
      
      navigate("/pembeli/checkout", { state: { directCheckout: directCheckoutData } });
    } catch (err) {
      console.error("Error processing purchase:", err);
      toast.error("Gagal melakukan pembelian");
    }
  };

  const handleVariationToggle = (variation) => {
    // If clicking a variant that's already selected, deselect it (unselect)
    if (selectedVariation?.id === variation.id) {
      setSelectedVariation(null);
      console.log("✅ Variant deselected, back to default price");
    } else {
      // Otherwise, select the new variant
      setSelectedVariation(variation);
      console.log("✅ Variant selected:", variation.name);
    }
  };

  const handleAddonToggle = (addonId, checked) => {
    setSelectedAddons((prev) => {
      const updated = { ...prev };
      if (checked) {
        updated[addonId] = true;
      } else {
        delete updated[addonId];
      }
      return updated;
    });
  };

  // Helper function to safely convert any value to number
  const toNumber = (value) => {
    if (value === null || value === undefined) return 0;
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  };

  // Helper to get the display price (variant or product default)
  // If variant is selected, use ONLY the variant price (from price_adjustment field)
  // Otherwise use product base price
  const getDisplayPrice = useMemo(() => {
    if (!product) return 0;

    if (selectedVariation) {
      // Variant price_adjustment is the FULL price for that variant, not an adjustment
      return toNumber(selectedVariation.price_adjustment);
    }

    // No variant selected, use product base price
    return toNumber(product.price);
  }, [product, selectedVariation]);

  // Helper to get the discounted display price
  const getDiscountedDisplayPrice = useMemo(() => {
    if (!product) return 0;
    const displayPrice = getDisplayPrice;
    const discountPercent = toNumber(product.discount_percentage);
    return Math.round(displayPrice * (1 - discountPercent / 100));
  }, [getDisplayPrice, product]);

  const calculateAddonPrice = useMemo(() => {
    return addons
      .filter((addon) => selectedAddons[addon.id])
      .reduce((sum, addon) => sum + toNumber(addon.price), 0);
  }, [addons, selectedAddons]);

  const calculateTotalPrice = useMemo(() => {
    if (!product) return 0;

    // Get the display price (which handles variant vs product selection)
    let basePrice = getDisplayPrice;
    console.log("Step 1 - Base price:", basePrice, typeof basePrice);

    // Step 2: Apply discount
    const discountPercentage = toNumber(product.discount_percentage);
    const discountedBase = basePrice * (1 - discountPercentage / 100);
    console.log("Step 2 - After discount:", discountedBase);

    // Step 3: Add addon prices
    const addonTotal = calculateAddonPrice;
    console.log("Step 3 - Addon total:", addonTotal);

    // Step 4: Calculate final total with quantity
    const qty = toNumber(quantity);
    const totalPrice = (discountedBase + addonTotal) * qty;
    const finalTotal = Math.round(totalPrice);

    console.log("💰 FINAL CALCULATION:", {
      selected_variant: selectedVariation?.name || "None",
      base_price: basePrice,
      discount_percent: discountPercentage,
      after_discount: discountedBase,
      addons: addonTotal,
      quantity: qty,
      FINAL_TOTAL: finalTotal,
    });

    return finalTotal;
  }, [
    product,
    selectedVariation,
    quantity,
    calculateAddonPrice,
    getDisplayPrice,
  ]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Produk tidak ditemukan</p>
          <button
            onClick={() => navigate("/products")}
            className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700"
          >
            Kembali ke Produk
          </button>
        </div>
      </div>
    );
  }

  const displayImage =
    images.length > 0
      ? images[currentImageIndex]?.media_url
      : product.image_url;
  const hasVariations = variations.length > 0;
  const hasAddons = addons.length > 0;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
        <button
          onClick={() => navigate("/products")}
          className="mb-6 text-gray-600 hover:text-gray-900 flex items-center"
        >
          ← Kembali
        </button>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-8">
            {/* IMAGE GALLERY */}
            <div>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsImageViewerOpen(true)}
                  className="block w-full focus:outline-none"
                >
                  <img
                    src={getImageUrl(displayImage)}
                    alt={product.name}
                    className="w-full rounded-lg object-cover h-96 cursor-zoom-in"
                  />
                </button>

                {/* Image Navigation */}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={() =>
                        setCurrentImageIndex(
                          (prev) => (prev - 1 + images.length) % images.length
                        )
                      }
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-white bg-opacity-70 hover:bg-opacity-100 rounded-full p-2 transition"
                    >
                      <ChevronLeft size={24} />
                    </button>
                    <button
                      onClick={() =>
                        setCurrentImageIndex(
                          (prev) => (prev + 1) % images.length
                        )
                      }
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-white bg-opacity-70 hover:bg-opacity-100 rounded-full p-2 transition"
                    >
                      <ChevronRight size={24} />
                    </button>
                  </>
                )}
              </div>

              {/* IMAGE THUMBNAILS */}
              {images.length > 1 && (
                <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition ${
                        currentImageIndex === idx
                          ? "border-primary-600"
                          : "border-gray-200"
                      }`}
                    >
                      <img
                        src={getImageUrl(img.media_url)}
                        alt={`View ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* PRODUCT INFO */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-primary-600 uppercase">
                  {product.category}
                </span>
                {product.is_promo && product.discount_percentage > 0 && (
                  <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                    Diskon {product.discount_percentage}%
                  </span>
                )}
              </div>

              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                {product.name}
              </h1>

              {/* PRICE */}

              <div className="mb-6">
                <p className="text-xs text-gray-500 mt-2">
                  {selectedVariation ? `${selectedVariation.name} • ` : ""}Harga
                  mulai dari
                </p>
                {product.discount_percentage > 0 ? (
                  <>
                    <span className="text-gray-400 line-through text-lg block mb-2">
                      Rp {formatRupiah(getDisplayPrice)}
                    </span>
                    <span className="text-primary-600 font-bold text-4xl">
                      Rp {formatRupiah(getDiscountedDisplayPrice)}
                    </span>
                  </>
                ) : (
                  <span className="text-primary-600 font-bold text-4xl">
                    Rp {formatRupiah(getDisplayPrice)}
                  </span>
                )}
              </div>

              {/* DESCRIPTION */}
              <div className="mb-6 pb-6 border-b">
                <p className="text-gray-700 leading-relaxed">
                  {product.description}
                </p>
              </div>

              {/* STOCK & SOLD */}
              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-2">
                  Stok: {product.stock}
                </p>
                <p className="text-sm text-gray-600">
                  Terjual: {product.sold_count || 0} unit
                </p>
              </div>

              {/* VARIATIONS */}
              {hasVariations && (
                <div className="mb-6 pb-6 border-b">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Pilih Variasi
                  </label>
                  <div className="space-y-2">
                    {variations.map((variation) => (
                      <button
                        key={variation.id}
                        onClick={() => handleVariationToggle(variation)}
                        className={`w-full text-left p-3 border rounded-lg transition cursor-pointer ${
                          selectedVariation?.id === variation.id
                            ? "border-primary-600 bg-primary-50 ring-2 ring-primary-200"
                            : "border-gray-300 hover:border-primary-600"
                        }`}
                        title={
                          selectedVariation?.id === variation.id
                            ? "Klik untuk batalkan pilihan"
                            : "Klik untuk memilih"
                        }
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium text-gray-900">
                              {variation.name}
                            </p>
                            {variation.description && (
                              <p className="text-xs text-gray-500">
                                {variation.description}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            {variation.price_adjustment > 0 && (
                              <p className="text-sm font-medium text-primary-600">
                                Rp {formatRupiah(variation.price_adjustment)}
                              </p>
                            )}
                            <p className="text-xs text-gray-500">
                              Stok: {variation.stock}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ADD-ONS */}
              {hasAddons && (
                <div className="mb-6 pb-6 border-b">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Tambahan (Add-on)
                  </label>
                  <div className="space-y-2">
                    {addons.map((addon) => (
                      <label
                        key={addon.id}
                        className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition"
                      >
                        <input
                          type="checkbox"
                          checked={selectedAddons[addon.id] || false}
                          onChange={(e) =>
                            handleAddonToggle(addon.id, e.target.checked)
                          }
                          className="w-4 h-4 text-primary-600 border-gray-300 rounded"
                        />
                        <div className="ml-3 flex-1">
                          <p className="font-medium text-gray-900">
                            {addon.name}
                          </p>
                          {addon.description && (
                            <p className="text-xs text-gray-500">
                              {addon.description}
                            </p>
                          )}
                        </div>
                        <p className="font-medium text-primary-600">
                          +Rp {formatRupiah(addon.price)}
                        </p>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* QUANTITY */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Jumlah
                </label>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 border border-gray-300 rounded-lg flex items-center justify-center hover:bg-gray-50"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) =>
                      setQuantity(Math.max(1, parseInt(e.target.value) || 1))
                    }
                    min="1"
                    max={product.stock}
                    className="w-20 text-center border border-gray-300 rounded-lg px-4 py-2"
                  />
                  <button
                    onClick={() =>
                      setQuantity(Math.min(product.stock, quantity + 1))
                    }
                    className="w-10 h-10 border border-gray-300 rounded-lg flex items-center justify-center hover:bg-gray-50"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* TOTAL PRICE */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-gray-600">Subtotal:</p>
                  <p className="font-semibold text-gray-900">
                    Rp {formatRupiah(calculateTotalPrice)}
                  </p>
                </div>
              </div>

              {/* ADD TO CART AND BUY NOW BUTTONS */}
              <div className="flex gap-3">
                <button
                  onClick={handleAddToCart}
                  disabled={product.stock === 0}
                  className="flex-1 bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition font-semibold disabled:bg-gray-400"
                >
                  {product.stock === 0 ? "Stok Habis" : "Tambah ke Keranjang"}
                </button>
                <button
                  onClick={handleBuyNow}
                  disabled={product.stock === 0}
                  className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition font-semibold disabled:bg-gray-400"
                >
                  {product.stock === 0 ? "Stok Habis" : "Beli Sekarang"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <ImageViewer
        imageUrl={getImageUrl(displayImage)}
        isOpen={isImageViewerOpen}
        onClose={() => setIsImageViewerOpen(false)}
        title={product.name}
      />
    </div>
  );
};

export default ProductDetail;
