import { formatRupiah, parseDeliveryNotes } from '../utils/formatHelper';
import headerInvoice from '../assets/header-invoice.jpeg';

const Invoice = ({ order, items, company }) => {
  return (
    <div
      id="invoice-content"
      className="bg-white p-4 sm:p-8 max-w-4xl mx-auto"
      style={{ fontFamily: 'Arial, sans-serif' }}
    >
      {/* Header */}
      <div className="flex flex-row justify-between md:items-start gap-4 mb-8 border-b-2 border-gray-300 pb-6">
        <div className="md:flex-1">
          {(company.company_logo_url || headerInvoice) && (
            <img
              src={
                company.company_logo_url
                  ? `https://api-inventory.isavralabel.com/al-hakim${company.company_logo_url}`
                  : headerInvoice
              }
              alt="Logo"
              className="h-32 mb-4 object-contain"
            />
          )}
          {/* <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {company.company_name || 'Al Hakim Catering'}
          </h1> */}
          {company.company_address && (
            <p className="text-gray-600 mt-2">{company.company_address}</p>
          )}
          <div className="mt-2 text-sm text-gray-600">
            {company.company_phone && <p>Telp: {company.company_phone}</p>}
            {company.company_email && <p>Email: {company.company_email}</p>}
            {company.tax_id && <p>NPWP: {company.tax_id}</p>}
          </div>
        </div>
        <div className="text-left md:text-right md:flex-1">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">FAKTUR / NOTA</h2>
          <p className="text-gray-600">No. Pesanan: #{order.id}</p>
          <p className="text-gray-600">Tanggal: {new Date(order.created_at).toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
          })}</p>
        </div>
      </div>

      {/* Customer & Payment Info */}
      <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        <div>
          <h3 className="font-semibold text-gray-900 mb-2">Kepada:</h3>
          <p className="text-gray-700 font-medium">{order.customer_name}</p>
          {order.customer_phone && (
            <p className="text-gray-600 text-sm">Telp: {order.customer_phone}</p>
          )}
          {order.customer_email && (
            <p className="text-gray-600 text-sm">Email: {order.customer_email}</p>
          )}
          {order.customer_address && (
            <p className="text-gray-600 text-sm mt-2 whitespace-pre-line">
              {order.customer_address}
            </p>
          )}

          {/* Detail acara & pengiriman dari delivery_notes */}
          {order.delivery_notes && (() => {
            const notes = parseDeliveryNotes(order.delivery_notes, true);
            if (!notes) return null;

            return (
              <div className="mt-3 text-xs text-gray-700 bg-gray-50 rounded-lg p-3 space-y-1">
                <p className="font-semibold text-gray-800">
                  Detail Acara & Pengiriman:
                </p>
                {Array.isArray(notes) ? (
                  notes.map((line, idx) => (
                    <p key={idx}>{line}</p>
                  ))
                ) : (
                  <p>{notes}</p>
                )}
              </div>
            );
          })()}
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 mb-2">Informasi Pembayaran:</h3>
          <p className="text-gray-700">
            Metode:{' '}
            <span className="uppercase">{order.payment_method}</span>
          </p>
          <p className="text-gray-700">
            Status:{' '}
            <span className="capitalize">{order.payment_status}</span>
          </p>
          {order.payment_amount != null && (
            <p className="text-gray-700">
              Dibayar:{' '}
              <span className="font-medium">
                Rp {formatRupiah(order.payment_amount)}
              </span>
            </p>
          )}
          {order.margin_amount != null && order.margin_amount > 0 && (
            <p className="text-gray-700">
              Margin Marketing:{' '}
              <span className="font-medium">
                Rp {formatRupiah(order.margin_amount)}
              </span>
            </p>
          )}
          {company.bank_name && company.bank_account_number && (
            <div className="mt-3 text-sm text-gray-600">
              <p>Bank: {company.bank_name}</p>
              <p>No. Rek: {company.bank_account_number}</p>
              {company.bank_account_name && (
                <p>a.n. {company.bank_account_name}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Items Table */}
      <div className="mb-8">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900">No</th>
              <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900">Nama Produk</th>
              <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-900">Qty</th>
              <th className="border border-gray-300 px-4 py-3 text-right font-semibold text-gray-900">Harga Satuan</th>
              <th className="border border-gray-300 px-4 py-3 text-right font-semibold text-gray-900">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              // Parse addons_json if it exists
              let addons = [];
              if (item.addons_json) {
                try {
                  addons = typeof item.addons_json === 'string' 
                    ? JSON.parse(item.addons_json) 
                    : item.addons_json;
                  // Ensure it's an array
                  if (!Array.isArray(addons)) {
                    addons = [];
                  }
                } catch (error) {
                  console.error('Error parsing addons_json:', error);
                  addons = [];
                }
              }

              return (
                <tr key={index}>
                  <td className="border border-gray-300 px-4 py-3 text-gray-700">{index + 1}</td>
                  <td className="border border-gray-300 px-4 py-3 text-gray-700">
                    {item.product_name}
                    {item.variant_name && (
                      <span className="text-sm text-gray-600 block">Varian: {item.variant_name}</span>
                    )}
                    {addons.length > 0 && (
                      <div className="mt-1">
                        <span className="text-xs font-medium text-gray-600">Add-on:</span>
                        <ul className="text-xs text-gray-600 ml-4 list-disc mt-1">
                          {addons.map((addon, addonIndex) => (
                            <li key={addonIndex}>
                              {addon.name || addon}
                              {addon.price && (
                                <span className="text-gray-500 ml-1">
                                  (+Rp {formatRupiah(addon.price)})
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-center text-gray-700">{item.quantity}</td>
                  <td className="border border-gray-300 px-4 py-3 text-right text-gray-700">Rp {formatRupiah(item.price)}</td>
                  <td className="border border-gray-300 px-4 py-3 text-right text-gray-700 font-medium">Rp {formatRupiah(item.subtotal)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="mb-8 flex justify-end">
        <div className="w-80">
          <div className="flex justify-between py-2 border-b border-gray-300">
            <span className="text-gray-700">Subtotal:</span>
            <span className="text-gray-900 font-medium">Rp {formatRupiah(order.total_amount)}</span>
          </div>
          {order.discount_amount > 0 && (
            <div className="flex justify-between py-2 border-b border-gray-300">
              <span className="text-green-600">Diskon:</span>
              <span className="text-green-600 font-medium">- Rp {formatRupiah(order.discount_amount)}</span>
            </div>
          )}
          {order.cashback_used > 0 && (
            <div className="flex justify-between py-2 border-b border-gray-300">
              <span className="text-primary-600">Cashback:</span>
              <span className="text-primary-600 font-medium">- Rp {formatRupiah(order.cashback_used)}</span>
            </div>
          )}
          <div className="flex justify-between py-3 mt-2 border-t-2 border-gray-400">
            <span className="text-lg font-bold text-gray-900">Total:</span>
            <span className="text-lg font-bold text-gray-900">Rp {formatRupiah(order.final_amount)}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-12 pt-6 border-t border-gray-300 text-center text-sm text-gray-600">
        <p>Terima kasih atas kepercayaan Anda!</p>
        <p className="mt-2">{company.company_name || 'Al Hakim Catering'}</p>
      </div>
    </div>
  );
};

export default Invoice;

