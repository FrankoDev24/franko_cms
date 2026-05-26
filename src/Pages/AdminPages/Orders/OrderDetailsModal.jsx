 import React, { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchSalesOrderById, fetchOrderDeliveryAddress } from '../../../Redux/Slice/orderSlice';
import { Modal, Spin,  Button,  Image } from 'antd';
import {
  User,
  Phone,
  MapPin,
  Edit3,
  FileText,
  Clock,
  Printer,
  Download,
  X,
  Package,
  CreditCard,
  Truck,
  ShoppingCart
} from 'lucide-react';
import PrintableInvoice from './PrintableInvoice';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';

const formatPrice = (amount) => {
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

const OrderDetailsModal = ({ orderId, onClose }) => {
  const dispatch = useDispatch();
  const { salesOrder, loading, error, deliveryAddress } = useSelector((state) => state.orders);

  const printRef = useRef();
  const downloadRef = useRef(null);

  useEffect(() => {
    if (orderId) {
      dispatch(fetchSalesOrderById(orderId));
      dispatch(fetchOrderDeliveryAddress(orderId));
    }
  }, [dispatch, orderId]);

  const handlePrint = () => {
    const printContent = printRef.current;
    const newWindow = window.open('', '_blank');
    newWindow.document.write(printContent.innerHTML);
    newWindow.document.close();
    newWindow.print();
    onClose();
  };

  const exportToExcel = () => {
    if (!salesOrder || salesOrder.length === 0) {
      console.error("No order details available for export.");
      return;
    }
  
    const invoiceData = [
      ["Invoice Details"],
      ["Order No", orderId?.slice(-7) || "N/A"],
      ["Order Date", new Date().toLocaleDateString('en-GB')],
      [],
      ["S.NO", "Product Name", "Quantity", "Unit Price (₵)", "Total Price (₵)"],
      ...salesOrder.map((order, index) => [
        index + 1,
        order.productName,
        order.quantity,
        order.price,
        order.total,
      ]),
    ];
  
    const ws = XLSX.utils.aoa_to_sheet(invoiceData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Invoice");
  
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const data = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  
    saveAs(data, `Invoice_${orderId?.slice(-7) || "Unknown"}.xlsx`);
  };
  
  if (loading) return <Spin size="large" className='hidden' />;
  if (error) return <div className='hidden'>Error loading order: {error.message || 'An error occurred'}</div>;
  if (!salesOrder || salesOrder.length === 0) return <div>No order details found.</div>;

  const backendBaseURL = 'https://cms.frankotrading.com';
  const totalAmount = salesOrder.reduce((acc, order) => acc + order.total, 0);
  const address = deliveryAddress?.[0] || {};

  return (
    <Modal
      open={true}
      onCancel={onClose}
      footer={null}
      width={900}
      className="modern-order-modal"
      style={{ top: 20 }}
      closeIcon={
        <X className="w-5 h-5 text-gray-500 hover:text-red-500 transition-colors cursor-pointer" />
      }
    >
      <div className="bg-white">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-300 to-green-400 px-4 py-2 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Order Details</h2>
                <div className="flex items-center space-x-2 text-green-100 text-sm">
                  <Clock className="w-4 h-4" />
                  <span>{new Date(salesOrder[0]?.orderDate).toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-green-100 text-sm">Order ID</div>
         <div className="font-mono text-lg">{orderId || 'N/A'}</div>

            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-h-[70vh] overflow-y-auto p-6 space-y-6" style={{ scrollbarWidth: 'thin' }}>
          
          {/* Customer & Delivery Info Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Customer Information */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-5">
              <div className="flex items-center space-x-2 mb-2">
                <div className="bg-green-500 p-2 rounded-lg">
                  <User className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-md font-semibold text-green-800">Customer/Agent Information</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <User className="w-4 h-4 text-green-600 mt-1" />
                  <div>
                    <div className="text-sm text-gray-500">Name</div>
                    <div className="font-medium text-gray-900">{salesOrder[0]?.fullName}</div>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Phone className="w-4 h-4 text-green-600 mt-1" />
                  <div>
                    <div className="text-sm text-gray-500">Contact</div>
                    <div className="font-medium text-gray-900">{salesOrder[0]?.contactNumber}</div>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <MapPin className="w-4 h-4 text-green-600 mt-1" />
                  <div>
                    <div className="text-sm text-gray-500">Address</div>
                    <div className="font-medium text-gray-900">{salesOrder[0]?.address}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Delivery Address */}
            <div className="bg-red-50 border border-red-200 rounded-xl p-5">
              <div className="flex items-center space-x-2 mb-4">
                <div className="bg-red-500 p-2 rounded-lg">
                  <Truck className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-md font-semibold text-red-800">Delivery Address</h3>
              </div>
              {address.recipientName ? (
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <User className="w-4 h-4 text-red-600 mt-1" />
                    <div>
                      <div className="text-sm text-gray-500">Recipient Name</div>
                      <div className="font-medium text-gray-900">{address.recipientName}</div>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Phone className="w-4 h-4 text-red-600 mt-1" />
                    <div>
                      <div className="text-sm text-gray-500">Contact</div>
                      <div className="font-medium text-gray-900">{address.recipientContactNumber}</div>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <MapPin className="w-4 h-4 text-red-600 mt-1" />
                    <div>
                      <div className="text-sm text-gray-500">Address</div>
                      <div className="font-medium text-gray-900">{address.address}</div>
                    </div>
                  </div>
                  {address.orderNote && (
                    <div className="flex items-start space-x-3">
                      <Edit3 className="w-4 h-4 text-red-600 mt-1" />
                      <div>
                        <div className="text-sm text-gray-500">Note</div>
                        <div className="font-medium text-gray-900">{address.orderNote}</div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-gray-500 italic">No delivery address available.</div>
              )}
            </div>
          </div>

          {/* Order Items */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <div className="bg-gray-600 p-2 rounded-lg">
                  <ShoppingCart className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-600">Order Items</h3>
                <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-sm font-medium">
                  {salesOrder.length} item{salesOrder.length > 1 ? 's' : ''}
                </span>
              </div>
            </div>
            
            <div className="p-2 space-y-4">
              {salesOrder.map((order, index) => {
                const imagePath = order?.imagePath;
                const imageUrl = imagePath
                  ? `${backendBaseURL}/Media/Products_Images/${imagePath.split('\\').pop()}`
                  : null;

                return (
                  <div key={index} className=" rounded-lg p-2 hover:bg-gray-100 transition-colors">
                    <div className="flex space-x-4">
                      <div className="flex-shrink-0">
                        {imageUrl ? (
                          <div className="w-20 h-20 bg-white rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                            <Image
                              src={imageUrl}
                              alt="Product"
                              className="w-full h-full object-cover"
                              preview={false}
                            />
                          </div>
                        ) : (
                          <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center">
                            <Package className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="text-md font-semibold text-gray-900 mb-1">{order.productName}</h4>
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                          <div>
                            <div className="text-sm text-gray-600">Quantity</div>
                            <div className="font-medium text-gray-900">{order.quantity}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">Unit Price</div>
                            <div className="font-medium text-gray-900">₵{formatPrice(order.price)}.00</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">Total</div>
                            <div className="font-bold text-red-600 text-lg">₵{formatPrice(order.total)}.00</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Total Section */}
 <div className="bg-red-50 border border-red-500 rounded-xl p-2 shadow-sm">
  <div className="flex items-center justify-end">
    <div className="flex items-center space-x-3">
      <div className="bg-red-100 p-2 rounded-lg">
        <CreditCard className="w-5 h-5 text-red-500" />
      </div>
      <div className="text-right">
        <div className="text-xs text-red-300 font-semibold">Grand Total</div>
        <div className="text-xl font-bold text-red-600">₵{formatPrice(totalAmount)}.00</div>
      </div>
    </div>
  </div>
</div>

        </div>

        {/* Footer Actions */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          <div className="flex flex-wrap gap-3 justify-end">
            <Button
              onClick={exportToExcel}
              className="flex items-center space-x-2 bg-green-500 hover:bg-green-600 border-green-500 hover:border-green-600 text-white font-medium"
              size="large"
            >
              <Download className="w-4 h-4" />
              <span>Export Excel</span>
            </Button>
            
            <Button
              onClick={handlePrint}
              className="flex items-center space-x-2 bg-red-500 hover:bg-red-600 border-red-500 hover:border-red-600 text-white font-medium"
              size="large"
            >
              <Printer className="w-4 h-4" />
              <span>Print Invoice</span>
            </Button>
            
            <Button
              onClick={onClose}
              size="large"
              className="flex items-center space-x-2 border-gray-300 text-gray-700 hover:border-gray-400 hover:text-gray-800 font-medium"
            >
              <X className="w-4 h-4" />
              <span>Close</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Hidden Printable Invoice */}
      <div ref={printRef} style={{ display: 'none' }}>
        <PrintableInvoice
          orderId={orderId}
          salesOrder={salesOrder}
          deliveryAddress={deliveryAddress}
        />
      </div>

      <style jsx>{`
        .modern-order-modal .ant-modal-content {
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }
        
        .modern-order-modal .ant-modal-header {
          border: none;
          padding: 0;
        }
        
        .modern-order-modal .ant-modal-body {
          padding: 0;
        }
        
        ::-webkit-scrollbar {
          width: 6px;
        }
        
        ::-webkit-scrollbar-track {
          background: #f1f1f1;
        }
        
        ::-webkit-scrollbar-thumb {
          background: #10b981;
          border-radius: 3px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: #059669;
        }
      `}</style>
    </Modal>
  );
};

export default OrderDetailsModal;