import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useDispatch } from 'react-redux';
import {
  fetchSalesOrderById,
  fetchOrderDeliveryAddress,
} from '../../../Redux/Slice/orderSlice';
import {
  Modal,
  Spin,
  Button,
  Image,
  Empty,
  Alert,
  Skeleton,
  Tooltip,
} from 'antd';
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
  ShoppingCart,
  RotateCcw,
} from 'lucide-react';
import PrintableInvoice from './PrintableInvoice';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';

/* ==================================================================
   WHY THIS MODAL FELT SLOW
   ------------------------------------------------------------------
   SalesOrderGet is fast. Two things in the UI were hiding that:

   1. Orders.jsx awaited SalesOrderGet (sometimes twice, `_id` then
      `orderCode`) BEFORE mounting this dialog. Nothing appeared until the
      network answered.

   2. This dialog then did:
        Promise.all([ fetchSalesOrderById, fetchOrderDeliveryAddress ])
          .finally(() => setPending(false))
      The content was gated on the SLOWEST of the two. So a fast sales order
      still waited for GetOrderDeliveryAddress — exactly the reported symptom.

   It also fired a duplicate SalesOrderGet, because the parent had already
   fetched the same record.

   Now: the dialog mounts immediately from the row data, runs BOTH requests
   independently, paints the order lines as soon as they land, and shows a
   skeleton in the address card until (or instead of) its request finishing.
   A slow/failed address never blocks the items, the total, or the invoice.
   ================================================================== */

/* ---------------------------------------------------------------- *
 * Identifiers
 *
 * /Order/SalesOrderGet/{Orderid}  — the row's `_id` or its `orderCode`
 * /Order/GetOrderDeliveryAddress/{OrderCode} — the BUSINESS ORDER CODE
 *                                               (per the OpenAPI document)
 *
 * Which one SalesOrderGet actually keys on can differ per deployment, so both
 * are tried and the winner is remembered for the rest of the session: after the
 * first open, subsequent opens use the working identifier FIRST (no wasted
 * round-trip on an empty/failed lookup).
 * ---------------------------------------------------------------- */
let resolvedIdKind = null; // 'id' | 'code' | null

export const buildCandidates = ({
  order,
  orderId,
  orderCode,
  fallbackOrderId,
} = {}) => {
  const id =
    order?._id ||
    order?.orderID ||
    order?.OrderId ||
    order?.id ||
    orderId ||
    fallbackOrderId ||
    null;

  const code = order?.orderCode || order?.OrderCode || orderCode || null;

  const pairs = [];

  if (resolvedIdKind === 'code') {
    if (code) pairs.push({ value: code, kind: 'code' });
    if (id) pairs.push({ value: id, kind: 'id' });
  } else {
    if (id) pairs.push({ value: id, kind: 'id' });
    if (code) pairs.push({ value: code, kind: 'code' });
  }

  // Dedupe (orderId often equals orderCode) while keeping priority order.
  const seen = new Set();

  return pairs.filter(({ value }) => {
    const key = String(value);

    if (seen.has(key) || !key.trim()) return false;

    seen.add(key);
    return true;
  });
};

/* Never assume the payload is an array.
 *
 * This API also answers HTTP 200 with a status wrapper on failure
 * (`{ responseCode: "0", responseMessage: "..." }`). That is NOT an order line
 * and must not be rendered as one — otherwise a failed lookup looks like an
 * order with no product name. */
export const toItems = (value) => {
  if (Array.isArray(value)) return value;
  if (value == null || value === '') return [];

  const inner = value.data ?? value.result ?? value.items ?? value;

  if (Array.isArray(inner)) return inner;
  if (!inner || typeof inner !== 'object') return [];

  const isStatusWrapper =
    inner.responseCode !== undefined || inner.ResponseCode !== undefined;

  const looksLikeItem =
    inner.productName !== undefined ||
    inner.ProductName !== undefined ||
    inner.id !== undefined ||
    inner.Id !== undefined;

  if (isStatusWrapper && !looksLikeItem) return [];

  return Object.keys(inner).length > 0 ? [inner] : [];
};

const pickText = (source, ...keys) => {
  for (const key of keys) {
    const value = source?.[key];

    if (value != null && value !== '') return value;
  }

  return '';
};

/* GetOrderDeliveryAddress can answer with [], [addr], {data:[addr]}, a bare
 * object, or a status wrapper. Normalize to an object or null. */
export const toAddress = (payload) => {
  if (!payload) return null;

  let candidate = null;

  if (Array.isArray(payload)) {
    candidate = payload[0] || null;
  } else if (typeof payload === 'object') {
    if (Array.isArray(payload.data)) {
      candidate = payload.data[0] || null;
    } else if (Array.isArray(payload.result)) {
      candidate = payload.result[0] || null;
    } else if (payload.data && typeof payload.data === 'object') {
      candidate = payload.data;
    } else {
      candidate = payload;
    }
  }

  if (!candidate || typeof candidate !== 'object') return null;

  const normalized = {
    recipientName: pickText(
      candidate,
      'recipientName',
      'RecipientName',
      'fullName',
      'FullName'
    ),
    recipientContactNumber: pickText(
      candidate,
      'recipientContactNumber',
      'RecipientContactNumber',
      'contactNumber',
      'ContactNumber',
      'phone'
    ),
    address: pickText(
      candidate,
      'address',
      'Address',
      'deliveryAddress',
      'DeliveryAddress'
    ),
    orderNote: pickText(
      candidate,
      'orderNote',
      'OrderNote',
      'note',
      'Note'
    ),
  };

  const hasContent = Object.values(normalized).some((value) => value !== '');

  return hasContent ? normalized : null;
};

const readErrorText = (error, fallback = '') => {
  if (!error) return fallback;
  if (typeof error === 'string') return error;

  return error.message || error.responseMessage || fallback;
};

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const formatPrice = (amount) =>
  String(toNumber(amount)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

/**
 * Returns a tag only when it contains meaningful, non-numeric text.
 *
 * Examples:
 * "53274769"  -> hidden
 * 53274769    -> hidden
 * ""          -> hidden
 * null        -> hidden
 * "VIP"       -> displayed
 * "URGENT-02" -> displayed
 */
const getDisplayTag = (item) => {
  const value = item?.tag ?? item?.Tag;

  if (value == null) return '';

  const tag = String(value).trim();

  // Hide empty values and numeric tags.
  if (!tag || Number.isFinite(Number(tag))) return '';

  return tag;
};

const backendBaseURL = 'https://cms.frankotrading.com';

const OrderDetailsModal = ({
  order,
  orderId,
  orderCode,
  fallbackOrderId,
  onClose,
}) => {
  const dispatch = useDispatch();
  const printRef = useRef();

  /* ------------------------- order details ------------------------- */
  const [items, setItems] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(true);
  const [detailsError, setDetailsError] = useState(null);
  const [resolvedId, setResolvedId] = useState(null);
  const [detailsRetry, setDetailsRetry] = useState(0);

  /* ------------------------ delivery address ----------------------- */
  const [address, setAddress] = useState(null);
  const [addressLoading, setAddressLoading] = useState(true);
  const [addressError, setAddressError] = useState(null);
  const [addressRetry, setAddressRetry] = useState(0);

  const candidates = useMemo(
    () =>
      buildCandidates({
        order,
        orderId,
        orderCode,
        fallbackOrderId,
      }),
    [order, orderId, orderCode, fallbackOrderId]
  );

  // Stable primitive for the effect deps.
  const candidatesKey = candidates
    .map((candidate) => `${candidate.kind}:${candidate.value}`)
    .join('|');

  // {OrderCode} for the address endpoint — the business code, never the _id
  // unless no code exists at all.
  const deliveryCode = useMemo(() => {
    const code = order?.orderCode || order?.OrderCode || orderCode;

    if (code) return code;

    const anyId = candidates[0]?.value;
    return anyId || null;
  }, [order, orderCode, candidates]);

  const rowOrderDate = order?.orderDate || order?.OrderDate || null;

  const headerCode =
    order?.orderCode ||
    orderCode ||
    resolvedId ||
    orderId ||
    fallbackOrderId ||
    'N/A';

  /* ------------------------------------------------------------------
     /Order/SalesOrderGet/{Orderid}
     Runs by itself. Tries each candidate until one returns actual items.
     ------------------------------------------------------------------ */
  useEffect(() => {
    let alive = true;

    const list = candidatesKey
      ? candidatesKey.split('|').map((pair) => {
          const separatorIndex = pair.indexOf(':');

          return {
            kind: pair.slice(0, separatorIndex),
            value: pair.slice(separatorIndex + 1),
          };
        })
      : [];

    if (!list.length) {
      setDetailsLoading(false);
      setDetailsError('This order has no id to look up.');
      return undefined;
    }

    setDetailsLoading(true);
    setDetailsError(null);

    (async () => {
      let lastError = null;
      let found = null;

      for (const candidate of list) {
        const result = await dispatch(
          fetchSalesOrderById(candidate.value)
        );

        if (!alive) return;

        if (result?.error) {
          lastError = readErrorText(
            result.payload,
            'Failed to fetch sales order'
          );
          continue;
        }

        const nextItems = toItems(result?.payload);

        if (nextItems.length) {
          found = {
            ...candidate,
            items: nextItems,
          };
          break;
        }

        // Empty but successful: try the next identifier.
      }

      if (!alive) return;

      if (found) {
        resolvedIdKind = found.kind;
        setItems(found.items);
        setResolvedId(found.value);
        setDetailsError(null);
      } else {
        setItems([]);
        setDetailsError(lastError || null);
      }

      setDetailsLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [dispatch, candidatesKey, detailsRetry]);

  /* ------------------------------------------------------------------
     /Order/GetOrderDeliveryAddress/{OrderCode}
     Deliberately NOT chained to the details request: independent effect,
     independent loading/error, never blocks the order lines.
     ------------------------------------------------------------------ */
  useEffect(() => {
    if (!deliveryCode) {
      setAddressLoading(false);
      setAddress(null);
      return undefined;
    }

    let alive = true;

    setAddressLoading(true);
    setAddressError(null);

    dispatch(fetchOrderDeliveryAddress(deliveryCode))
      .then((result) => {
        if (!alive) return;

        if (result?.error) {
          setAddress(null);
          setAddressError(
            readErrorText(
              result.payload,
              'Could not load the delivery address.'
            )
          );
          return;
        }

        setAddress(toAddress(result?.payload));
      })
      .finally(() => {
        if (alive) setAddressLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [dispatch, deliveryCode, addressRetry]);

  const totalAmount = useMemo(
    () =>
      items.reduce(
        (accumulator, item) =>
          accumulator + toNumber(item?.total ?? item?.Total),
        0
      ),
    [items]
  );

  const hasData =
    !detailsLoading && !detailsError && items.length > 0;

  const handlePrint = () => {
    const printContent = printRef.current;

    if (!printContent) return;

    const newWindow = window.open('', '_blank');

    if (!newWindow) return;

    newWindow.document.write(printContent.innerHTML);
    newWindow.document.close();
    newWindow.print();
    onClose();
  };

  const exportToExcel = () => {
    if (!items.length) return;

    const invoiceData = [
      ['Invoice Details'],
      ['Order No', String(headerCode).slice(-7) || 'N/A'],
      ['Order Date', new Date().toLocaleDateString('en-GB')],
      [],
      [
        'S.NO',
        'Product Name',
        'Quantity',
        'Unit Price (₵)',
        'Total Price (₵)',
      ],
      ...items.map((item, index) => [
        index + 1,
        item.productName ?? item.ProductName,
        item.quantity ?? item.Quantity,
        item.price ?? item.Price,
        item.total ?? item.Total,
      ]),
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(invoiceData);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      'Invoice'
    );

    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array',
    });

    const data = new Blob([excelBuffer], {
      type:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    saveAs(
      data,
      `Invoice_${String(headerCode).slice(-7) || 'Unknown'}.xlsx`
    );
  };

  const retryDetails = useCallback(() => {
    setDetailsRetry((retry) => retry + 1);
  }, []);

  const retryAddress = useCallback(() => {
    setAddressRetry((retry) => retry + 1);
  }, []);

  /* ------------------------- delivery card ------------------------- */
  const deliveryCardBody = addressLoading ? (
    <Skeleton active paragraph={{ rows: 3 }} title={false} />
  ) : addressError ? (
    <div className="text-sm text-gray-600">
      <div className="text-red-600 mb-2">{addressError}</div>

      <Button
        size="small"
        onClick={retryAddress}
        icon={<RotateCcw className="w-3.5 h-3.5" />}
      >
        Retry
      </Button>
    </div>
  ) : address ? (
    <div className="space-y-3">
      <div className="flex items-start space-x-3">
        <User className="w-4 h-4 text-red-600 mt-1" />

        <div>
          <div className="text-sm text-gray-500">
            Recipient Name
          </div>
          <div className="font-medium text-gray-900">
            {address.recipientName || '—'}
          </div>
        </div>
      </div>

      <div className="flex items-start space-x-3">
        <Phone className="w-4 h-4 text-red-600 mt-1" />

        <div>
          <div className="text-sm text-gray-500">Contact</div>
          <div className="font-medium text-gray-900">
            {address.recipientContactNumber || '—'}
          </div>
        </div>
      </div>

      <div className="flex items-start space-x-3">
        <MapPin className="w-4 h-4 text-red-600 mt-1" />

        <div>
          <div className="text-sm text-gray-500">Address</div>
          <div className="font-medium text-gray-900">
            {address.address || '—'}
          </div>
        </div>
      </div>

      {address.orderNote && (
        <div className="flex items-start space-x-3">
          <Edit3 className="w-4 h-4 text-red-600 mt-1" />

          <div>
            <div className="text-sm text-gray-500">Note</div>
            <div className="font-medium text-gray-900">
              {address.orderNote}
            </div>
          </div>
        </div>
      )}
    </div>
  ) : (
    <div className="text-gray-500 italic">
      No delivery address available.
    </div>
  );

  /* --------------------------- order items ------------------------- */
  const itemsSection = detailsLoading ? (
    <div className="p-4">
      <div className="flex items-center space-x-2 mb-4 text-gray-500 text-sm">
        <Spin size="small" />
        <span>Loading order items…</span>
      </div>

      <Skeleton active avatar paragraph={{ rows: 2 }} />
      <Skeleton active avatar paragraph={{ rows: 2 }} />
    </div>
  ) : detailsError ? (
    <div className="p-4">
      <Alert
        type="error"
        showIcon
        message="Could not load order details"
        description={detailsError}
        action={
          <Button
            size="small"
            onClick={retryDetails}
            icon={<RotateCcw className="w-4 h-4" />}
          >
            Retry
          </Button>
        }
      />
    </div>
  ) : items.length === 0 ? (
    <div className="p-8">
      <Empty
        description={`No order details found for ${headerCode}.`}
      />
    </div>
  ) : (
    <div className="p-2 space-y-4">
      {items.map((item, index) => {
        const imagePath = item?.imagePath || item?.ImagePath;

        const imageUrl = imagePath
          ? `${backendBaseURL}/Media/Products_Images/${String(
              imagePath
            )
              .split('\\')
              .pop()}`
          : null;

        // Numeric tags such as "53274769" return an empty string
        // and therefore will not be rendered.
        const displayTag = getDisplayTag(item);

        return (
          <div
            key={item?.id || item?.Id || index}
            className="rounded-lg p-2 hover:bg-gray-100 transition-colors"
          >
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
                <h4 className="text-md font-semibold text-gray-900 mb-1">
                  {item.productName ?? item.ProductName}
                </h4>

                {/* Show only meaningful, non-numeric tags. */}
                {displayTag && (
                  <div className="mb-2">
                    <span className="inline-flex items-center rounded-full bg-amber-100 border border-amber-200 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                      Tag: {displayTag}
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-gray-600">
                      Quantity
                    </div>
                    <div className="font-medium text-gray-900">
                      {item.quantity ?? item.Quantity}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-gray-600">
                      Unit Price
                    </div>
                    <div className="font-medium text-gray-900">
                      ₵{formatPrice(item.price ?? item.Price)}.00
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-gray-600">
                      Total
                    </div>
                    <div className="font-bold text-red-600 text-lg">
                      ₵{formatPrice(item.total ?? item.Total)}.00
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  const customerSource = items[0] || {};

  const customerName =
    customerSource.fullName ?? customerSource.FullName;

  const customerContact =
    customerSource.contactNumber ?? customerSource.ContactNumber;

  const customerAddress =
    customerSource.address ?? customerSource.Address;

  const orderDate =
    customerSource.orderDate ??
    customerSource.OrderDate ??
    rowOrderDate;

  return (
    <Modal
      open
      onCancel={onClose}
      footer={null}
      width={900}
      className="modern-order-modal"
      style={{ top: 20 }}
      destroyOnClose
      maskClosable
      closeIcon={
        <X className="w-5 h-5 text-gray-500 hover:text-red-500 transition-colors cursor-pointer" />
      }
    >
      <div className="bg-white">
        {/* Header — rendered immediately from the row we already have */}
        <div className="bg-gradient-to-r from-green-300 to-green-400 px-4 py-2 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <FileText className="w-6 h-6" />
              </div>

              <div>
                <h2 className="text-xl font-bold">
                  Order Details
                </h2>

                <div className="flex items-center space-x-2 text-green-100 text-sm">
                  <Clock className="w-4 h-4" />
                  <span>
                    {orderDate
                      ? new Date(orderDate).toLocaleString()
                      : '—'}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-green-100 text-sm">
                Order Code
              </div>
              <div className="font-mono text-lg">
                {headerCode}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div
          className="max-h-[70vh] overflow-y-auto p-6 space-y-6"
          style={{ scrollbarWidth: 'thin' }}
        >
          {/* Customer & Delivery Info Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Customer Information */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-5">
              <div className="flex items-center space-x-2 mb-2">
                <div className="bg-green-500 p-2 rounded-lg">
                  <User className="w-4 h-4 text-white" />
                </div>

                <h3 className="text-md font-semibold text-green-800">
                  Customer/Agent Information
                </h3>
              </div>

              {detailsLoading ? (
                <Skeleton
                  active
                  paragraph={{ rows: 3 }}
                  title={false}
                />
              ) : (
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <User className="w-4 h-4 text-green-600 mt-1" />

                    <div>
                      <div className="text-sm text-gray-500">
                        Name
                      </div>
                      <div className="font-medium text-gray-900">
                        {customerName || '—'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Phone className="w-4 h-4 text-green-600 mt-1" />

                    <div>
                      <div className="text-sm text-gray-500">
                        Contact
                      </div>
                      <div className="font-medium text-gray-900">
                        {customerContact || '—'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <MapPin className="w-4 h-4 text-green-600 mt-1" />

                    <div>
                      <div className="text-sm text-gray-500">
                        Address
                      </div>
                      <div className="font-medium text-gray-900">
                        {customerAddress || '—'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Delivery Address */}
            <div className="bg-red-50 border border-red-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className="bg-red-500 p-2 rounded-lg">
                    <Truck className="w-4 h-4 text-white" />
                  </div>

                  <h3 className="text-md font-semibold text-red-800">
                    Delivery Address
                  </h3>
                </div>

                {!addressLoading &&
                  !addressError &&
                  address && (
                    <Tooltip title="Reload address">
                      <button
                        type="button"
                        onClick={retryAddress}
                        className="text-red-400 hover:text-red-600"
                        aria-label="Reload address"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    </Tooltip>
                  )}
              </div>

              {deliveryCardBody}
            </div>
          </div>

          {/* Order Items */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <div className="bg-gray-600 p-2 rounded-lg">
                  <ShoppingCart className="w-4 h-4 text-white" />
                </div>

                <h3 className="text-lg font-semibold text-gray-600">
                  Order Items
                </h3>

                {!detailsLoading && !detailsError && (
                  <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-sm font-medium">
                    {items.length} item
                    {items.length === 1 ? '' : 's'}
                  </span>
                )}
              </div>
            </div>

            {itemsSection}
          </div>

          {/* Total — only once the items are actually here */}
          {hasData && (
            <div className="bg-red-50 border border-red-500 rounded-xl p-2 shadow-sm">
              <div className="flex items-center justify-end">
                <div className="flex items-center space-x-3">
                  <div className="bg-red-100 p-2 rounded-lg">
                    <CreditCard className="w-5 h-5 text-red-500" />
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-red-300 font-semibold">
                      Grand Total
                    </div>
                    <div className="text-xl font-bold text-red-600">
                      ₵{formatPrice(totalAmount)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          <div className="flex flex-wrap gap-3 justify-end">
            <Button
              onClick={exportToExcel}
              disabled={!hasData}
              className="flex items-center space-x-2 bg-green-500 hover:bg-green-600 border-green-500 hover:border-green-600 text-white font-medium"
              size="large"
            >
              <Download className="w-4 h-4" />
              <span>Export Excel</span>
            </Button>

            <Button
              onClick={handlePrint}
              disabled={!hasData}
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
      {hasData && (
        <div ref={printRef} style={{ display: 'none' }}>
          <PrintableInvoice
            orderId={headerCode}
            salesOrder={items}
            deliveryAddress={address}
          />
        </div>
      )}

      {/* Plain <style> instead of <style jsx> — styled-jsx only works when the
          build supports it (Next.js, or the styled-jsx babel plugin). */}
      <style>{`
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

        .modern-order-modal ::-webkit-scrollbar {
          width: 6px;
        }

        .modern-order-modal ::-webkit-scrollbar-track {
          background: #f1f1f1;
        }

        .modern-order-modal ::-webkit-scrollbar-thumb {
          background: #10b981;
          border-radius: 3px;
        }

        .modern-order-modal ::-webkit-scrollbar-thumb:hover {
          background: #059669;
        }
      `}</style>
    </Modal>
  );
};

export default OrderDetailsModal;