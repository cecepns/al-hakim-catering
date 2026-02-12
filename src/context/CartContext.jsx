import { createContext, useContext, useState, useEffect } from 'react';
import { cartAPI } from '../utils/api';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);

  // Helper to safely convert any harga (string/number) ke number
  const toNumber = (value) => {
    if (value === null || value === undefined) return 0;
    const num = Number(value);
    return Number.isNaN(num) ? 0 : num;
  };

  const fetchCart = async () => {
    try {
      setLoading(true);
      const response = await cartAPI.get();
      setCart(response.data);
    } catch (error) {
      console.error('Error fetching cart:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async (item) => {
    try {
      await cartAPI.add(item);
      await fetchCart();
    } catch (error) {
      throw error;
    }
  };

  const updateCart = async (id, data) => {
    try {
      await cartAPI.update(id, data);
      await fetchCart();
    } catch (error) {
      throw error;
    }
  };

  const removeFromCart = async (id) => {
    try {
      await cartAPI.remove(id);
      await fetchCart();
    } catch (error) {
      throw error;
    }
  };

  const clearCart = async () => {
    try {
      await cartAPI.clear();
      setCart([]);
    } catch (error) {
      throw error;
    }
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => {
      // Gunakan total_price jika tersedia (sudah termasuk variant + addon)
      if (item.total_price !== null && item.total_price !== undefined) {
        return total + toNumber(item.total_price);
      }

      // Jika tidak ada total_price, hitung dari harga dasar * quantity
      const basePrice = toNumber(item.discounted_price || item.price);
      const qty = toNumber(item.quantity || 1);
      return total + basePrice * qty;
    }, 0);
  };

  const getCartCount = () => {
    return cart.reduce((count, item) => count + item.quantity, 0);
  };

  const value = {
    cart,
    loading,
    fetchCart,
    addToCart,
    updateCart,
    removeFromCart,
    clearCart,
    getCartTotal,
    getCartCount,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
