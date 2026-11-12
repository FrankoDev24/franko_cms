import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Checkbox, Button, TextField, Tooltip, IconButton,
  Select, MenuItem, Chip, CircularProgress, Pagination, Stack, Typography,
  Box, Grid, Alert
} from "@mui/material";
import { Visibility, Edit, ContentCopy } from "@mui/icons-material";
import dayjs from "dayjs";
import * as XLSX from "xlsx";
import { useDispatch, useSelector } from "react-redux";
import { fetchOrdersByDate } from "../../../Redux/Slice/orderSlice";
import OrderDetailsModal from "./OrderDetailsModal";
import CycleUpdateModal from "./CycleUpdateModal";

const CopyButton = ({ text, title }) => (
  <Tooltip title={title || "Copy"}>
    <IconButton
      size="small"
      onClick={() => text && navigator.clipboard.writeText(text)}
      sx={{ p: 0.5 }}
    >
      <ContentCopy sx={{ fontSize: 16 }} />
    </IconButton>
  </Tooltip>
);

const agentNames = [
  "Peggy Andoh", "sarah koffie", "Florence Gbeve", "Regina Baah", "Hannah Jethro",
  "Sadam Ansamah", "Judith Tsegah", "Dorcas Kumaku", "Roseline Boateng", "Emmanuella Adjei-Mensah"
];

// loading is `false` when idle, keyed object when active (legacy union).
const readFlag = (value, key) =>
  typeof value === "boolean" ? value : Boolean(value?.[key]);

const formatDate = (value) => {
  const d = dayjs(value);
  return value && d.isValid() ? d.format("DD MMM YYYY, HH:mm") : "—";
};

/* ---------- "Admin has viewed this order" persistence ---------- */
const VIEWED_STORAGE_KEY = "orders_admin_viewed_v1";

const loadViewedOrders = () => {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(VIEWED_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

const Orders = () => {
  const dispatch = useDispatch();
  const {
    orders: rawOrders = [],
    loading: loadingState,
    error: errorState,
    lastFetchMeta,
    ordersProgress,
    ordersWarning,
  } = useSelector((state) => state.orders);

  const orders = useMemo(
    () => (Array.isArray(rawOrders) ? rawOrders : []),
    [rawOrders]
  );

  const busy = readFlag(loadingState, "orders"); // LIST request only
  const fetchError = errorState?.orders ?? null;

  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [searchText, setSearchText] = useState("");
  const [filterSource, setFilterSource] = useState("all");
  const [filterPaymentMode, setFilterPaymentMode] = useState("all");
  const [filterAgentType, setFilterAgentType] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState(null);

  // ✅ This is the "admin has already viewed the order" map (key -> true)
  const [viewedOrders, setViewedOrders] = useState(loadViewedOrders);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedOrderCycle, setSelectedOrderCycle] = useState(null);
  const [isCycleModalOpen, setIsCycleModalOpen] = useState(false);
  const [page, setPage] = useState(1);

  const activeRangeRef = useRef({ from: "", to: "" });
  const requestRef = useRef(null); // in-flight thunk promise (has .abort())

  const ITEMS_PER_PAGE = 10;

  /* ✅ Persist the "viewed" ticks so they survive a refresh */
  useEffect(() => {
    try {
      window.localStorage.setItem(VIEWED_STORAGE_KEY, JSON.stringify(viewedOrders));
    } catch {
      /* storage full / disabled – non-fatal */
    }
  }, [viewedOrders]);

  /* ✅ Abort the previous fetch before starting a new one so a slow, superseded
     request can never overwrite the range the user is actually viewing. */
  const fetchOrdersForRange = useCallback((from, to) => {
    activeRangeRef.current = { from, to };
    requestRef.current?.abort?.();
    requestRef.current = dispatch(fetchOrdersByDate({ from, to }));
  }, [dispatch]);

  const fetchCurrentMonthOrders = useCallback(() => {
    const now = dayjs();
    fetchOrdersForRange(
      now.startOf("month").format("YYYY-MM-DD"),
      now.add(1, "day").format("YYYY-MM-DD")
    );
  }, [fetchOrdersForRange]);

  const refetchActiveRange = useCallback(() => {
    const { from, to } = activeRangeRef.current;
    if (from && to) fetchOrdersForRange(from, to);
    else fetchCurrentMonthOrders();
  }, [fetchOrdersForRange, fetchCurrentMonthOrders]);

  useEffect(() => {
    fetchCurrentMonthOrders();
    return () => requestRef.current?.abort?.();
  }, [fetchCurrentMonthOrders]);

  const groupedOrders = useMemo(() => {
    const acc = {};
    orders.forEach((order, idx) => {
      const key = order?.orderCode || order?._id || `row-${idx}`;
      if (!acc[key]) acc[key] = { ...order, _key: key, orders: [order] };
      else acc[key].orders.push(order);
    });
    return Object.values(acc);
  }, [orders]);

  /* ✅ If your backend already stores the flag (adminViewed / viewedByAdmin / viewed),
     seed the local ticks from it. Harmless when the field doesn't exist. */
  useEffect(() => {
    if (!groupedOrders.length) return;
    setViewedOrders((prev) => {
      let changed = false;
      const next = { ...prev };
      groupedOrders.forEach((order) => {
        const key = order?._key;
        if (!key || next[key]) return;
        const serverViewed = order?.adminViewed ?? order?.viewedByAdmin ?? order?.viewed;
        if (serverViewed === true) {
          next[key] = true;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [groupedOrders]);

  const uniquePaymentModes = useMemo(() => {
    const modes = new Set();
    groupedOrders.forEach((o) => { if (o.paymentMode) modes.add(o.paymentMode); });
    return Array.from(modes).sort();
  }, [groupedOrders]);

  const baseFilteredOrders = useMemo(() => {
    const q = searchText.toLowerCase();
    return groupedOrders.filter((order) => {
      const matchesSearch = !q ||
        order.fullName?.toLowerCase().includes(q) ||
        order.orderCycle?.toLowerCase().includes(q) ||
        order.orderCode?.toLowerCase().includes(q);

      const matchesSource = filterSource === "all" ||
        (filterSource === "website" && !!order.orderCode?.startsWith("ORD")) ||
        (filterSource === "app" && !order.orderCode?.startsWith("ORD"));

      const matchesPaymentMode =
        filterPaymentMode === "all" || order.paymentMode === filterPaymentMode;

      const matchesAgentType = filterAgentType === "all" ||
        (filterAgentType === "agents" && agentNames.includes(order.fullName)) ||
        (filterAgentType === "non-agents" && !agentNames.includes(order.fullName));

      return matchesSearch && matchesSource && matchesPaymentMode && matchesAgentType;
    });
  }, [groupedOrders, searchText, filterSource, filterPaymentMode, filterAgentType]);

  const filteredOrders = useMemo(() => {
    return baseFilteredOrders
      .filter((o) => !selectedStatus || o.orderCycle === selectedStatus)
      .sort((a, b) =>
        (new Date(b.orderDate).getTime() || 0) - (new Date(a.orderDate).getTime() || 0)
      );
  }, [baseFilteredOrders, selectedStatus]);

  const statusCounts = useMemo(() => {
    return baseFilteredOrders.reduce((acc, order) => {
      const status = order.orderCycle || "Unknown";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
  }, [baseFilteredOrders]);

  const maxPage = Math.max(1, Math.ceil(filteredOrders.length / ITEMS_PER_PAGE));

  const paginatedOrders = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filteredOrders.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredOrders, page]);

  useEffect(() => {
    if (page > maxPage) setPage(maxPage);
  }, [page, maxPage]);

  const statusColors = {
    "Order Placement": "warning", Processing: "primary", Confirmed: "success",
    Pending: "warning", Unreachable: "error", "Out of Stock": "error",
    "Wrong Number": "secondary", Cancelled: "error", "Not Answered": "info",
    Delivery: "success", Completed: "success", "Multiple Orders": "info", Testing: "secondary"
  };

  const handleFetchOrders = useCallback(() => {
    if (dateRange.start && dateRange.end) {
      setPage(1);
      fetchOrdersForRange(
        dayjs(dateRange.start).format("YYYY-MM-DD"),
        dayjs(dateRange.end).add(1, "day").format("YYYY-MM-DD")
      );
    } else {
      alert("Please select both start and end date.");
    }
  }, [dateRange, fetchOrdersForRange]);

  /* ---------- viewed-checkbox helpers (derived, never desyncs) ---------- */
  const pageKeys = useMemo(
    () => paginatedOrders.map((o) => o._key).filter(Boolean),
    [paginatedOrders]
  );

  const allOnPageViewed =
    pageKeys.length > 0 && pageKeys.every((k) => Boolean(viewedOrders[k]));

  const someOnPageViewed =
    !allOnPageViewed && pageKeys.some((k) => Boolean(viewedOrders[k]));

  const markOrderViewed = useCallback((key) => {
    if (!key) return;
    setViewedOrders((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
  }, []);

  const toggleViewed = useCallback((key) => {
    if (!key) return;
    setViewedOrders((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleSelectAll = useCallback(() => {
    if (!pageKeys.length) return;
    const target = !allOnPageViewed;
    setViewedOrders((prev) => {
      const next = { ...prev };
      pageKeys.forEach((k) => { next[k] = target; });
      return next;
    });
  }, [allOnPageViewed, pageKeys]);

  const exportToExcel = useCallback(() => {
    if (!filteredOrders.length) { alert("No orders to export"); return; }
    const formatted = filteredOrders.map((order) => ({
      "Order Code": order.orderCode, "Order Date": order.orderDate,
      "Full Name": order.fullName, "Contact Number": order.contactNumber,
      "Payment Mode": order.paymentMode || "N/A", "Status": order.orderCycle,
      "Agent Type": agentNames.includes(order.fullName) ? "Agent" : "Non-Agent",
      "Viewed By Admin": viewedOrders[order._key] ? "Yes" : "No",
    }));
    const worksheet = XLSX.utils.json_to_sheet(formatted);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Orders");
    XLSX.writeFile(workbook, "Orders.xlsx");
  }, [filteredOrders, viewedOrders]);

  /* ✅ CORE FIX: opening the details modal ticks that order's checkbox. */
  const openDetailModal = useCallback((order) => {
    if (!order) return;
    markOrderViewed(order._key || order.orderCode || order._id);
    setSelectedOrder(order);
    setIsDetailModalOpen(true);
  }, [markOrderViewed]);

  const closeDetailModal = useCallback(() => {
    setIsDetailModalOpen(false);
    setSelectedOrder(null);
  }, []);

  const openCycleModal = useCallback((order) => {
    setSelectedOrderId(order._id || order.orderCode);
    setSelectedOrderCycle(order.orderCycle);
    setIsCycleModalOpen(true);
  }, []);

  const closeCycleModal = useCallback(() => {
    setIsCycleModalOpen(false);
    setSelectedOrderId(null);
    setSelectedOrderCycle(null);
  }, []);

  const handleCycleUpdated = useCallback(() => {
    refetchActiveRange(); // refetch the range being VIEWED
    closeCycleModal();
  }, [refetchActiveRange, closeCycleModal]);

  const handlePageChange = useCallback((_, value) => setPage(value), []);

  const handleStatusClick = useCallback((status) => {
    setSelectedStatus((prev) => (prev === status ? null : status));
    setPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setSearchText("");
    setFilterSource("all");
    setFilterPaymentMode("all");
    setFilterAgentType("all");
    setSelectedStatus(null);
    setPage(1);
  }, []);

  useEffect(() => { setPage(1); },
    [searchText, filterSource, filterPaymentMode, filterAgentType, selectedStatus]);

  const hasActiveFilters =
    Boolean(searchText) ||
    filterSource !== "all" ||
    filterPaymentMode !== "all" ||
    filterAgentType !== "all" ||
    selectedStatus !== null;

  const errorText = typeof fetchError === "string"
    ? fetchError
    : fetchError?.message || "";

  return (
    <div>
      <Typography variant="h5" sx={{ color: "#f44336", mb: 2, fontWeight: 600 }}>
        Orders
      </Typography>

      {/* ✅ Error is a banner with Retry — never replaces rows that DID load */}
      {fetchError && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={refetchActiveRange} disabled={busy}>
              Retry
            </Button>
          }
        >
          Failed to load orders{errorText ? `: ${errorText}` : ""}
        </Alert>
      )}

      {/* Partial failure: some windows loaded, some didn't */}
      {!fetchError && ordersWarning && (
        <Alert
          severity="warning"
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={refetchActiveRange} disabled={busy}>
              Retry
            </Button>
          }
        >
          {ordersWarning}
        </Alert>
      )}

      {/* Date Range and Export Controls */}
      <Box sx={{ mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              type="date" label="Start Date" fullWidth
              InputLabelProps={{ shrink: true }}
              value={dateRange.start}
              onChange={(e) => setDateRange((p) => ({ ...p, start: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              type="date" label="End Date" fullWidth
              InputLabelProps={{ shrink: true }}
              value={dateRange.end}
              onChange={(e) => setDateRange((p) => ({ ...p, end: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button variant="contained" color="success" fullWidth onClick={handleFetchOrders} disabled={busy}>
              Fetch Orders
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button variant="outlined" fullWidth onClick={exportToExcel} disabled={busy || !filteredOrders.length}>
              Export Excel
            </Button>
          </Grid>
        </Grid>
      </Box>

      <TextField
        fullWidth variant="outlined"
        placeholder="Search by name, status, or order code"
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        sx={{ mb: 2 }}
      />

      <Box sx={{ mb: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Filter by Source</Typography>
            <Select value={filterSource} onChange={(e) => setFilterSource(e.target.value)} fullWidth size="small">
              <MenuItem value="all">All Orders</MenuItem>
              <MenuItem value="website">Website Orders</MenuItem>
              <MenuItem value="app">App Orders</MenuItem>
            </Select>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Filter by Payment Mode</Typography>
            <Select value={filterPaymentMode} onChange={(e) => setFilterPaymentMode(e.target.value)} fullWidth size="small">
              <MenuItem value="all">All Payment Modes</MenuItem>
              {uniquePaymentModes.map((mode) => (<MenuItem key={mode} value={mode}>{mode}</MenuItem>))}
            </Select>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Filter by Customer Type</Typography>
            <Select value={filterAgentType} onChange={(e) => setFilterAgentType(e.target.value)} fullWidth size="small">
              <MenuItem value="all">All Users</MenuItem>
              <MenuItem value="agents">Agents Only</MenuItem>
              <MenuItem value="non-agents">Non-Agents Only</MenuItem>
            </Select>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="subtitle1" sx={{ mt: 4 }}>
              <strong>Total Orders:</strong>{" "}
              <span style={{ color: "#7cb342", fontWeight: 600 }}>{filteredOrders.length}</span>
            </Typography>
          </Grid>
        </Grid>
      </Box>

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
        <Chip
          label={`All Status (${baseFilteredOrders.length})`}
          color="info"
          variant={selectedStatus === null ? "filled" : "outlined"}
          onClick={() => handleStatusClick(null)}
          clickable
          sx={{ fontWeight: 600 }}
        />
        {Object.entries(statusCounts).map(([status, count]) => (
          <Chip
            key={status}
            label={`${status} (${count})`}
            color={statusColors[status] || "default"}
            variant={status === selectedStatus ? "filled" : "outlined"}
            onClick={() => handleStatusClick(status)}
            clickable
          />
        ))}
      </Box>

      <TableContainer component={Paper} sx={{ position: "relative", minHeight: 400 }}>
        <Table
          sx={{
            filter: busy && orders.length ? "blur(2px)" : "none",
            opacity: busy && orders.length ? 0.7 : 1,
            transition: "filter 0.25s ease, opacity 0.25s ease",
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Tooltip title={allOnPageViewed ? "Unmark page as viewed" : "Mark page as viewed"}>
                  <span>
                    <Checkbox
                      checked={allOnPageViewed}
                      indeterminate={someOnPageViewed}
                      onChange={handleSelectAll}
                      disabled={busy || pageKeys.length === 0}
                      inputProps={{ "aria-label": "Mark all rows on this page as viewed" }}
                    />
                  </span>
                </Tooltip>
              </TableCell>
              <TableCell>Order Code</TableCell>
              <TableCell>Order Date</TableCell>
              <TableCell>Customer Name</TableCell>
              <TableCell>Contact Number</TableCell>
              <TableCell>Payment Mode</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Agent Type</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {paginatedOrders.length > 0 ? (
              paginatedOrders.map((order) => {
                const isViewed = Boolean(viewedOrders[order._key]);
                return (
                  <TableRow key={order._key} hover>
                    <TableCell padding="checkbox">
                      <Tooltip title={isViewed ? "Admin has viewed this order" : "Not viewed yet by admin"}>
                        <Checkbox
                          checked={isViewed}
                          onChange={() => toggleViewed(order._key)}
                          disabled={busy}
                          inputProps={{ "aria-label": "Admin has viewed this order" }}
                          sx={{
                            color: isViewed ? "#7cb342" : "inherit",
                            "&.Mui-checked": { color: "#7cb342" },
                          }}
                        />
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography variant="body2">{order.orderCode || "—"}</Typography>
                        <CopyButton text={order.orderCode} title="Copy Order Code" />
                        {!isViewed && (
                          <Chip label="New" color="error" size="small" variant="outlined" />
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>{formatDate(order.orderDate)}</TableCell>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography variant="body2">{order.fullName}</Typography>
                        <CopyButton text={order.fullName} title="Copy Name" />
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography variant="body2">{order.contactNumber}</Typography>
                        <CopyButton text={order.contactNumber} title="Copy Contact Number" />
                      </Stack>
                    </TableCell>
                    <TableCell>{order.paymentMode || "N/A"}</TableCell>
                    <TableCell>
                      <Chip
                        label={order.orderCycle || "Unknown"}
                        color={statusColors[order.orderCycle] || "default"}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={agentNames.includes(order.fullName) ? "Agent" : "Non-Agent"}
                        color={agentNames.includes(order.fullName) ? "primary" : "secondary"}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Update Cycle">
                        <IconButton
                          onClick={() => openCycleModal(order)}
                          size="small"
                          sx={{ color: "#8bc34a", mr: 1 }}
                          disabled={busy}
                        >
                          <Edit />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="View Details">
                        <IconButton
                          onClick={() => openDetailModal(order)}
                          size="small"
                          disabled={busy}
                          sx={{ color: isViewed ? "#7cb342" : "inherit" }}
                        >
                          <Visibility />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              !busy && (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    <Box sx={{ py: 4, px: 2 }}>
                      <Typography variant="h6" sx={{ color: "text.secondary" }}>
                        {fetchError
                          ? "Couldn't load orders — use Retry above."
                          : hasActiveFilters
                            ? "No orders match your current filters"
                            : "No orders found"}
                      </Typography>
                      {!fetchError && hasActiveFilters && (
                        <Button sx={{ mt: 1 }} onClick={clearFilters}>Clear Filters</Button>
                      )}
                      {!fetchError && !hasActiveFilters && lastFetchMeta?.from && lastFetchMeta?.to && (
                        <Typography variant="body2" sx={{ mt: 1, color: "text.secondary" }}>
                          Searched between {lastFetchMeta.from} and {lastFetchMeta.to}.
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              )
            )}
          </TableBody>
        </Table>

        {busy && orders.length > 0 && (
          <Box
            sx={{
              position: "absolute", inset: 0,
              backgroundColor: "rgba(255, 255, 255, 0.5)",
              zIndex: 2, pointerEvents: "none",
            }}
          />
        )}
      </TableContainer>

      {/* Loader with chunk progress so a slow API visibly moves */}
      {busy && (
        <Box
          sx={{
            position: "fixed", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: (theme) => theme.zIndex.modal - 1,
            pointerEvents: "none",
          }}
        >
          <Box
            sx={{
              px: 3, py: 2.5, borderRadius: 3,
              backgroundColor: "rgba(255, 255, 255, 0.92)",
              boxShadow: 6, display: "inline-flex",
              flexDirection: "column", alignItems: "center", gap: 1,
            }}
          >
            <CircularProgress size={44} />
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {ordersProgress
                ? `Loading orders…`
                : "Loading orders…"}
            </Typography>
          </Box>
        </Box>
      )}

      {filteredOrders.length > 0 && (
        <Stack spacing={2} alignItems="center" sx={{ mt: 2 }}>
          <Pagination
            count={maxPage}
            page={Math.min(page, maxPage)}
            onChange={handlePageChange}
            color="primary"
            disabled={busy}
          />
        </Stack>
      )}

      {isDetailModalOpen && (
        <OrderDetailsModal
          order={selectedOrder}
          orderId={selectedOrder?._id || selectedOrder?.orderCode || null}
          orderCode={selectedOrder?.orderCode || null}
          onClose={closeDetailModal}
        />
      )}

      {isCycleModalOpen && (
        <CycleUpdateModal
          open={isCycleModalOpen}
          onClose={closeCycleModal}
          orderId={selectedOrderId}
          currentCycle={selectedOrderCycle}
          onUpdated={handleCycleUpdated}
        />
      )}
    </div>
  );
};

export default Orders;