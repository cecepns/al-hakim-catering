# Bug Fix: Product Variant Subtotal Not Calculated

## Problem
When users selected a product variant during checkout, the subtotal displayed as "Rp 0" or did not include the variant price adjustment in the order total amount.

## Root Cause
In the backend order creation endpoints (`/api/orders` and `/api/orders/guest`), the price calculation did not include the `price_adjustment` from the selected product variant. The system only used:
- Base product price: `product.price`
- Or discounted price: `product.discounted_price`

But ignored:
- Variant price adjustment: `product_variant.price_adjustment`

## Solution
Modified both order creation endpoints (authenticated and guest) to:

1. Check if a `variant_id` is provided in the order item
2. Query the `product_variants` table to get the `price_adjustment` for that variant
3. Add the variant price adjustment to the calculated price

### Code Changes
**File:** `backend/server.js`

**Added logic in both `/api/orders/guest` and `/api/orders` endpoints:**
```javascript
let price = product.discounted_price || product.price;

// Add variant price adjustment if variant is selected
if (item.variant_id) {
  const [variants] = await connection.query(
    'SELECT price_adjustment FROM product_variants WHERE id = ? AND product_id = ?',
    [item.variant_id, item.product_id]
  );
  if (variants.length > 0) {
    price += variants[0].price_adjustment;
  }
}

const subtotal = price * item.quantity;
total_amount += subtotal;
```

## Impact
- ✅ Subtotal now correctly includes variant price adjustments
- ✅ Order total amount calculation is accurate
- ✅ Order items display correct individual prices with variants
- ✅ Discount and cashback calculations work correctly with accurate subtotals
- ✅ Both guest and authenticated orders affected

## Testing
Test by:
1. Selecting a product with variant that has price_adjustment
2. Creating an order with that variant
3. View the order detail page - subtotal should now show correct Rp amount including variant price

## Files Modified
- `backend/server.js` (2 locations in guest and authenticated order creation)
