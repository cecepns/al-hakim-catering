import { useEffect, useRef, useState } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import Invoice from './Invoice';
import { invoiceAPI } from '../utils/api';

const InvoiceModal = ({ isOpen, onClose, orderId }) => {
  const [loading, setLoading] = useState(true);
  const [invoiceData, setInvoiceData] = useState(null);
  const invoiceRef = useRef(null);

  useEffect(() => {
    if (isOpen && orderId) {
      fetchInvoiceData();
    }
  }, [isOpen, orderId]);

  const fetchInvoiceData = async () => {
    try {
      setLoading(true);
      const response = await invoiceAPI.getInvoiceData(orderId);
      setInvoiceData(response.data);
    } catch (error) {
      console.error('Error fetching invoice data:', error);
      alert('Gagal memuat data invoice');
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async () => {
    if (!invoiceRef.current) return;

    try {
      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`invoice-${orderId}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Gagal membuat PDF');
    }
  };

  const downloadImage = async () => {
    if (!invoiceRef.current) return;

    try {
      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `invoice-${orderId}.png`;
      link.href = imgData;
      link.click();
    } catch (error) {
      console.error('Error generating image:', error);
      alert('Gagal membuat gambar');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start sm:items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl max-w-5xl w-full my-8">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex flex-col gap-5 md:flex-row items-center justify-between z-10">
          <h2 className="text-xl font-bold text-gray-900">Faktur / Nota Pesanan #{orderId}</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={downloadPDF}
              disabled={loading || !invoiceData}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
            >
              Download PDF
            </button>
            <button
              onClick={downloadImage}
              disabled={loading || !invoiceData}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition"
            >
              Download Gambar
            </button>
            <button
              onClick={onClose}
              className="text-gray-600 hover:text-gray-900 text-2xl font-bold"
            >
              ×
            </button>
          </div>
        </div>
        <div className="p-4 sm:p-6 overflow-auto max-h-[calc(100vh-180px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : invoiceData ? (
            <div className="overflow-x-auto">
              <div
                ref={invoiceRef}
                className="min-w-[800px] sm:min-w-0"
              >
                <Invoice
                  order={invoiceData.order}
                  items={invoiceData.items}
                  company={invoiceData.company}
                />
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600">Gagal memuat data invoice</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvoiceModal;

