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
import { fetchOrdersByDate, fetchSalesOrderById } from "../../../Redux/Slice/orderSlice";
import OrderDetailsModal from "./OrderDetailsModal";
import CycleUpdateModal from "./CycleUpdateModal";

// Extracted to a stable component so React doesn't remount it every render
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

// Module-level constant: a new array literal on every render used to sit in the
// filteredOrders useMemo deps and invalidate every memo on every render.
const agentNames = [
  "Peggy Andoh", "sarah koffie", "Florence Gbeve", "Regina Baah", "Hannah Jethro",
  "Sadam Ansamah", "Judith Tsegah", "Dorcas Kumaku", "Roseline Boateng", "Abigail Agyemang"
];

// The slice's `loading` is falsy when idle and an object ({ orders,
// salesOrder, ... }) when active (legacy-compatible union). Normalize both
// shapes so the UI can never get stuck on a truthy object or a missing flag.
const readFlag = (value, key) =>
  typeof value === "boolean" ? value : Boolean(value?.[key]);

// True when a SalesOrderGet response carries no details (null/empty array/
// empty object) — used to fall back to the alternate identifier.
const isEmptyDetails = (payload) => {
  if (payload == null || payload === "") return true;
  if (Array.isArray(payload)) return payload.length === 0;
  if (typeof payload === "object") {
    const inner = payload.data ?? payload.result ?? payload;
    if (Array.isArray(inner)) return inner.length === 0;
    return typeof inner === "object" && Object.keys(inner).length === 0;
  }
  return false;
};

const Orders = () => {
  const dispatch = useDispatch();
  const {
    orders: rawOrders = [],
    loading: loadingState,
    error: errorState,
    lastFetchMeta,
  } = useSelector((state) => state.orders);

  // Defensive: never assume the slice hands us an array (payload shape bugs,
  // localStorage writers, etc. should not crash the page).
  const orders = useMemo(
    () => (Array.isArray(rawOrders) ? rawOrders : []),
    [rawOrders]
  );

  const listLoading = readFlag(loadingState, "orders");
  const detailsLoading = readFlag(loadingState, "salesOrder");
  const fetchError = errorState?.orders ?? null;
  // Loader is shown for BOTH list fetches and order-details fetches:
  // "View Details" shows the centered loader over the blurred orders until
  // the details arrive (see DIAGNOSIS.md §4).
  const busy = listLoading || detailsLoading;

  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [searchText, setSearchText] = useState("");
  const [filterSource, setFilterSource] = useState("all");
  const [filterPaymentMode, setFilterPaymentMode] = useState("all");
  const [filterAgentType, setFilterAgentType] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [selectedCheckboxes, setSelectedCheckboxes] = useState({});
  const [selectAll, setSelectAll] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [selectedOrderCycle, setSelectedOrderCycle] = useState(null);
  const [isCycleModalOpen, setIsCycleModalOpen] = useState(false);
  const [page, setPage] = useState(1);

  // The range the user is currently viewing. Refetches (cycle update, retry)
  // must reuse THIS range — refetching "current month" after a cycle update
  // replaced the list with a (often empty) different window (DIAGNOSIS.md §3.5).
  const activeRangeRef = useRef({ from: "", to: "" });

  const ITEMS_PER_PAGE = 10;

  const fetchOrdersForRange = useCallback((from, to) => {
    activeRangeRef.current = { from, to };
    dispatch(fetchOrdersByDate({ from, to }));
  }, [dispatch]);

  const fetchCurrentMonthOrders = useCallback(() => {
    const now = dayjs();
    const from = now.startOf("month").format("YYYY-MM-DD");
    const to = now.add(1, "day").format("YYYY-MM-DD");
    fetchOrdersForRange(from, to);
  }, [fetchOrdersForRange]);

  const refetchActiveRange = useCallback(() => {
    const { from, to } = activeRangeRef.current;
    if (from && to) {
      dispatch(fetchOrdersByDate({ from, to }));
    } else {
      fetchCurrentMonthOrders();
    }
  }, [dispatch, fetchCurrentMonthOrders]);

  useEffect(() => {
    fetchCurrentMonthOrders();
  }, [fetchCurrentMonthOrders]);

  const groupedOrders = useMemo(() => {
    const acc = {};
    orders.forEach((order, idx) => {
      // Group by orderCode, but never depend on it existing (missing codes used
      // to collapse into one "undefined" group / crash `startsWith`).
      const key = order?.orderCode || order?._id || `row-${idx}`;
      if (!acc[key]) {
        acc[key] = { ...order, orders: [order] };
      } else {
        acc[key].orders.push(order);
      }
    });
    return Object.values(acc);
  }, [orders]);

  const uniquePaymentModes = useMemo(() => {
    const modes = new Set();
    groupedOrders.forEach(order => {
      if (order.paymentMode) modes.add(order.paymentMode);
    });
    return Array.from(modes).sort();
  }, [groupedOrders]);

  // Filters shared by the list and the status chips (everything EXCEPT status,
  // so the chips keep showing counts for the other statuses).
  const baseFilteredOrders = useMemo(() => {
    return groupedOrders.filter(order => {
      const matchesSearch = !searchText ||
        order.fullName?.toLowerCase().includes(searchText.toLowerCase()) ||
        order.orderCycle?.toLowerCase().includes(searchText.toLowerCase()) ||
        order.orderCode?.toLowerCase().includes(searchText.toLowerCase());

      const matchesSource = filterSource === "all" ||
        (filterSource === "website" && !!order.orderCode?.startsWith("ORD")) ||
        (filterSource === "app" && !order.orderCode?.startsWith("ORD"));

      const matchesPaymentMode = filterPaymentMode === "all" ||
        order.paymentMode === filterPaymentMode;

      const matchesAgentType = filterAgentType === "all" ||
        (filterAgentType === "agents" && agentNames.includes(order.fullName)) ||
        (filterAgentType === "non-agents" && !agentNames.includes(order.fullName));

      return matchesSearch && matchesSource && matchesPaymentMode && matchesAgentType;
    });
  }, [groupedOrders, searchText, filterSource, filterPaymentMode, filterAgentType]);

  const filteredOrders = useMemo(() => {
    return baseFilteredOrders
      .filter(order => !selectedStatus || order.orderCycle === selectedStatus)
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
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    return filteredOrders.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredOrders, page]);

  // If the current page no longer exists (new fetch / filters shrank the list),
  // clamp it — otherwise the table slices to [] and shows a bogus
  // "No orders found" while orders are on another page (DIAGNOSIS.md §3.3).
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

  const handleCheckboxClick = useCallback((orderCode) => {
    setSelectedCheckboxes(prev => ({ ...prev, [orderCode]: !prev[orderCode] }));
  }, []);

  const handleSelectAll = useCallback(() => {
    const newChecked = !selectAll;
    setSelectAll(newChecked);
    const updated = {};
    paginatedOrders.forEach(order => { updated[order.orderCode] = newChecked; });
    setSelectedCheckboxes(updated);
  }, [selectAll, paginatedOrders]);

  const exportToExcel = useCallback(() => {
    if (!filteredOrders.length) { alert("No orders to export"); return; }
    const formatted = filteredOrders.map(order => ({
      "Order Code": order.orderCode, "Order Date": order.orderDate,
      "Full Name": order.fullName, "Contact Number": order.contactNumber,
      "Payment Mode": order.paymentMode || "N/A", "Status": order.orderCycle,
      "Agent Type": agentNames.includes(order.fullName) ? "Agent" : "Non-Agent"
    }));
    const worksheet = XLSX.utils.json_to_sheet(formatted);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Orders");
    XLSX.writeFile(workbook, "Orders.xlsx");
  }, [filteredOrders]);

  const openDetailModal = useCallback(async (order) => {
    // SalesOrderGet may be keyed by `_id` OR `orderCode` — try each candidate
    // and keep the one that actually returns details (then pass THAT id to the
    // modal, in case the modal fetches by `orderId` itself).
    const candidateIds = [...new Set([order._id, order.orderCode].filter(Boolean))];
    const ids = candidateIds.length ? candidateIds : [order._id || order.orderCode];

    let loadedId = ids[0];
    for (const id of ids) {
      loadedId = id;
      const result = await dispatch(fetchSalesOrderById(id));
      if (result?.error) {
        console.error("Error fetching order details:", result.error);
        continue; // try the alternate identifier
      }
      if (!isEmptyDetails(result?.payload)) break; // got real details
    }

    setSelectedOrderId(loadedId);
    setIsDetailModalOpen(true);
    handleCheckboxClick(order.orderCode);
  }, [dispatch, handleCheckboxClick]);

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
    // Refetch the range being VIEWED (not always "current month").
    refetchActiveRange();
    closeCycleModal();
  }, [refetchActiveRange, closeCycleModal]);

  const handlePageChange = useCallback((_, value) => setPage(value), []);

  const handleStatusClick = useCallback((status) => {
    setSelectedStatus(prev => prev === status ? null : status);
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

  useEffect(() => { setPage(1); }, [searchText, filterSource, filterPaymentMode, filterAgentType, selectedStatus]);

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

      {/* Date Range and Export Controls */}
      <Box sx={{ mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              type="date"
              label="Start Date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              type="date"
              label="End Date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
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

      {/* Search */}
      <TextField
        fullWidth
        variant="outlined"
        placeholder="Search by name, status, or order code"
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        sx={{ mb: 2 }}
      />

      {/* Filters */}
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
              {uniquePaymentModes.map(mode => (<MenuItem key={mode} value={mode}>{mode}</MenuItem>))}
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
              <strong>Total Orders:</strong> <span style={{ color: "#7cb342", fontWeight: 600 }}>{filteredOrders.length}</span>
            </Typography>
          </Grid>
        </Grid>
      </Box>

      {/* Status Filter Chips */}
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

      {/* Orders Table */}
      <TableContainer component={Paper} sx={{ position: 'relative', minHeight: 400 }}>
        {/* Orders stay rendered (blurred) behind the loader — see DIAGNOSIS.md §4 */}
        <Table
          sx={{
            filter: busy ? 'blur(2px)' : 'none',
            opacity: busy ? 0.7 : 1,
            transition: 'filter 0.25s ease, opacity 0.25s ease',
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell>
                <Checkbox checked={selectAll} onChange={handleSelectAll} disabled={busy} />
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
              paginatedOrders.map(order => (
                <TableRow key={order.orderCode || order._id} hover>
                  <TableCell>
                    <Checkbox
                      checked={selectedCheckboxes[order.orderCode] || false}
                      onChange={() => handleCheckboxClick(order.orderCode)}
                      disabled={busy}
                    />
                  </TableCell>

                  <TableCell>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography variant="body2">{order.orderCode}</Typography>
                      <CopyButton text={order.orderCode} title="Copy Order Code" />
                    </Stack>
                  </TableCell>

                  <TableCell>{new Date(order.orderDate).toLocaleString()}</TableCell>

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
                    <Chip label={order.orderCycle} color={statusColors[order.orderCycle] || "default"} size="small" />
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
                      >
                        <Visibility />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              !busy && (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    {fetchError ? (
                      /* Failed request → error + Retry, NOT "No orders found" */
                      <Box sx={{ py: 4, px: 2 }}>
                        <Alert
                          severity="error"
                          sx={{ mb: 2, maxWidth: 520, mx: "auto" }}
                          action={
                            <Button color="inherit" size="small" onClick={refetchActiveRange}>
                              Retry
                            </Button>
                          }
                        >
                          Failed to load orders{errorText ? `: ${errorText}` : ""}
                        </Alert>
                      </Box>
                    ) : (
                      /* Genuinely empty → say which window was searched */
                      <Box sx={{ py: 4, px: 2 }}>
                        <Typography variant="h6" sx={{ color: 'text.secondary' }}>
                          {hasActiveFilters ? "No orders match your current filters" : "No orders found"}
                        </Typography>
                        {hasActiveFilters ? (
                          <Button sx={{ mt: 1 }} onClick={clearFilters}>
                            Clear Filters
                          </Button>
                        ) : (
                          lastFetchMeta?.from && lastFetchMeta?.to && (
                            <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                              Searched between {lastFetchMeta.from} and {lastFetchMeta.to}.
                            </Typography>
                          )
                        )}
                      </Box>
                    )}
                  </TableCell>
                </TableRow>
              )
            )}
          </TableBody>
        </Table>

        {/* Soft white veil over the table (current visual design) while loading */}
        {busy && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(255, 255, 255, 0.5)',
              zIndex: 2,
              pointerEvents: 'none',
            }}
          />
        )}
      </TableContainer>

      {/* Loader — visibly in the middle of the screen, orders blurred behind */}
      {busy && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: (theme) => theme.zIndex.modal - 1,
            pointerEvents: 'none',
          }}
        >
          <Box
            sx={{
              p: 2.5,
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.92)',
              boxShadow: 6,
              display: 'inline-flex',
            }}
          >
            <CircularProgress size={44} />
          </Box>
        </Box>
      )}

      {/* Pagination */}
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

      {/* Modals */}
      {isDetailModalOpen && (
        <OrderDetailsModal orderId={selectedOrderId} onClose={() => setIsDetailModalOpen(false)} />
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
