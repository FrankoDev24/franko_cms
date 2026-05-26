import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Checkbox, Button, TextField, Tooltip, IconButton,
  Select, MenuItem, Chip, CircularProgress, Pagination, Stack, Typography,
  Box, Grid
} from "@mui/material";
import { Visibility } from "@mui/icons-material";
import dayjs from "dayjs";
import * as XLSX from "xlsx";
import { useDispatch, useSelector } from "react-redux";
import { fetchOrdersByDate, fetchSalesOrderById } from "../../../Redux/Slice/orderSlice";
import OrderDetailsModal from "../../AdminPages/Orders/OrderDetailsModal";



const DigiOrders = () => {
  const dispatch = useDispatch();
  const { orders = [], loading } = useSelector((state) => state.orders);

  // Agent names for filtering
  const agentNames = [
    "Dorothy Boadu", "Peggy Andoh", "sarah koffie", "Fredous Zakari",
    "Florence Gbeve", "Regina Baah", "Gideon Obiri", "Hannah Jethro", "Mavis Attipoe", "Sadam Ansamah","Perpetual Ayimedu"
  ];

  // State management
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
  const [cachedOrderDetails, setCachedOrderDetails] = useState({});
  const [page, setPage] = useState(1);

  const ITEMS_PER_PAGE = 10;

  const fetchCurrentMonthOrders = useCallback(() => {
    const now = dayjs();
    const from = now.startOf("month").format("YYYY-MM-DD");
    const to = now.add(1, "day").format("YYYY-MM-DD");
    dispatch(fetchOrdersByDate({ from, to }));
  }, [dispatch]);

  useEffect(() => {
    fetchCurrentMonthOrders();
  }, [fetchCurrentMonthOrders]);

  // Memoized grouped orders for better performance
  const groupedOrders = useMemo(() => {
    return Object.values(orders.reduce((acc, order) => {
      if (!acc[order.orderCode]) {
        acc[order.orderCode] = { ...order, orders: [order] };
      } else {
        acc[order.orderCode].orders.push(order);
      }
      return acc;
    }, {}));
  }, [orders]);

  // Memoized unique payment modes
  const uniquePaymentModes = useMemo(() => {
    const modes = new Set();
    groupedOrders.forEach(order => {
      if (order.paymentMode) {
        modes.add(order.paymentMode);
      }
    });
    return Array.from(modes).sort();
  }, [groupedOrders]);

  // Optimized filtering with memoization
  const filteredOrders = useMemo(() => {
    return groupedOrders.filter(order => {
      // Search filter
      const matchesSearch = !searchText || 
        order.fullName?.toLowerCase().includes(searchText.toLowerCase()) ||
        order.orderCycle?.toLowerCase().includes(searchText.toLowerCase()) ||
        order.orderCode?.toLowerCase().includes(searchText.toLowerCase());

      // Source filter
      const matchesSource = filterSource === "all" ||
        (filterSource === "website" && order.orderCode.startsWith("ORD")) ||
        (filterSource === "app" && !order.orderCode.startsWith("ORD"));

      // Payment mode filter
      const matchesPaymentMode = filterPaymentMode === "all" || 
        order.paymentMode === filterPaymentMode;

      // Agent filter
      const matchesAgentType = filterAgentType === "all" ||
        (filterAgentType === "agents" && agentNames.includes(order.fullName)) ||
        (filterAgentType === "non-agents" && !agentNames.includes(order.fullName));

      // Status filter
      const matchesStatus = !selectedStatus || order.orderCycle === selectedStatus;

      return matchesSearch && matchesSource && matchesPaymentMode && matchesAgentType && matchesStatus;
    }).sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));
  }, [groupedOrders, searchText, filterSource, filterPaymentMode, filterAgentType, selectedStatus, agentNames]);

  // Memoized status counts
  const statusCounts = useMemo(() => {
    return filteredOrders.reduce((acc, order) => {
      const status = order.orderCycle || "Unknown";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
  }, [filteredOrders]);

  // Memoized paginated orders
  const paginatedOrders = useMemo(() => {
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    return filteredOrders.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredOrders, page]);

  const statusColors = {
    "Order Placement": "warning",
    Processing: "primary",
    Confirmed: "success",
    Pending: "warning",
    Unreachable: "error",
    "Out of Stock": "error",
    "Wrong Number": "secondary",
    Cancelled: "error",
    "Not Answered": "info",
    Delivery: "success",
    Completed: "success",
    "Multiple Orders": "info",
  };

  const handleFetchOrders = useCallback(() => {
    if (dateRange.start && dateRange.end) {
      dispatch(fetchOrdersByDate({
        from: dayjs(dateRange.start).format("YYYY-MM-DD"),
        to: dayjs(dateRange.end).add(1, "day").format("YYYY-MM-DD"),
      }));
    } else {
      alert("Please select both start and end date.");
    }
  }, [dateRange, dispatch]);

  const handleCheckboxClick = useCallback((orderCode) => {
    setSelectedCheckboxes(prev => ({
      ...prev,
      [orderCode]: !prev[orderCode],
    }));
  }, []);

  const handleSelectAll = useCallback(() => {
    const newChecked = !selectAll;
    setSelectAll(newChecked);
    const updated = {};
    paginatedOrders.forEach(order => {
      updated[order.orderCode] = newChecked;
    });
    setSelectedCheckboxes(updated);
  }, [selectAll, paginatedOrders]);

  const exportToExcel = useCallback(() => {
    if (!filteredOrders.length) {
      alert("No orders to export");
      return;
    }
    const formatted = filteredOrders.map(order => ({
      "Order Code": order.orderCode,
      "Order Date": order.orderDate,
      "Full Name": order.fullName,
      "Contact Number": order.contactNumber,
      "Payment Mode": order.paymentMode || "N/A",
      "Status": order.orderCycle,
      "Agent Type": agentNames.includes(order.fullName) ? "Agent" : "Non-Agent"
    }));
    const worksheet = XLSX.utils.json_to_sheet(formatted);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Orders");
    XLSX.writeFile(workbook, "Orders.xlsx");
  }, [filteredOrders, agentNames]);

  const openDetailModal = useCallback(async (order) => {
    const orderId = order._id || order.orderCode;
    
    if (!cachedOrderDetails[orderId]) {
      try {
        const orderDetails = await dispatch(fetchSalesOrderById(orderId));
        setCachedOrderDetails(prev => ({ ...prev, [orderId]: orderDetails }));
      } catch (error) {
        console.error("Error fetching order details:", error);
      }
    }
    
    setSelectedOrderId(orderId);
    setIsDetailModalOpen(true);
    handleCheckboxClick(order.orderCode);
  }, [cachedOrderDetails, dispatch, handleCheckboxClick]);

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
    fetchCurrentMonthOrders();
    closeCycleModal();
  }, [fetchCurrentMonthOrders, closeCycleModal]);

  const handlePageChange = useCallback((_, value) => {
    setPage(value);
  }, []);

  const handleStatusClick = useCallback((status) => {
    setSelectedStatus(prev => prev === status ? null : status);
    setPage(1); // Reset to first page when filtering
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [searchText, filterSource, filterPaymentMode, filterAgentType, selectedStatus]);

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
            <Button 
              variant="contained" 
              color="success" 
              fullWidth
              onClick={handleFetchOrders}
              disabled={loading}
            >
              Fetch Orders
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button 
              variant="outlined" 
              fullWidth
              onClick={exportToExcel}
              disabled={loading || !filteredOrders.length}
            >
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
            <Select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
              fullWidth
              size="small"
            >
              <MenuItem value="all">All Orders</MenuItem>
              <MenuItem value="website">Website Orders</MenuItem>
              <MenuItem value="app">App Orders</MenuItem>
            </Select>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Filter by Payment Mode</Typography>
            <Select
              value={filterPaymentMode}
              onChange={(e) => setFilterPaymentMode(e.target.value)}
              fullWidth
              size="small"
            >
              <MenuItem value="all">All Payment Modes</MenuItem>
              {uniquePaymentModes.map(mode => (
                <MenuItem key={mode} value={mode}>{mode}</MenuItem>
              ))}
            </Select>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Filter by Agent Type</Typography>
            <Select
              value={filterAgentType}
              onChange={(e) => setFilterAgentType(e.target.value)}
              fullWidth
              size="small"
            >
              <MenuItem value="all">All Users</MenuItem>
              <MenuItem value="agents">Agents Only</MenuItem>
              <MenuItem value="non-agents">Non-Agents Only</MenuItem>
            </Select>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="subtitle1" sx={{ mt: 4 }}>
              <strong>Total Orders:</strong>{" "}
              <span style={{ color: "#7cb342", fontWeight: 600 }}>
                {filteredOrders.length}
              </span>
            </Typography>
          </Grid>
        </Grid>
      </Box>

      {/* Status Filter Chips */}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
        {/* All Status Chip */}
        <Chip
          label={`All Status (${filteredOrders.length})`}
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
        {loading && (
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 2,
            }}
          >
            <CircularProgress />
          </Box>
        )}
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <Checkbox 
                  checked={selectAll} 
                  onChange={handleSelectAll}
                  disabled={loading}
                />
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
          <TableBody
            sx={{
              opacity: loading ? 0.3 : 1,
              pointerEvents: loading ? 'none' : 'auto',
            }}
          >
            {paginatedOrders.length > 0 ? (
              paginatedOrders.map(order => (
                <TableRow key={order.orderCode}>
                  <TableCell>
                    <Checkbox
                      checked={selectedCheckboxes[order.orderCode] || false}
                      onChange={() => handleCheckboxClick(order.orderCode)}
                    />
                  </TableCell>
                  <TableCell>{order.orderCode}</TableCell>
                  <TableCell>{new Date(order.orderDate).toLocaleString()}</TableCell>
                  <TableCell>{order.fullName}</TableCell>
                  <TableCell>{order.contactNumber}</TableCell>
                  <TableCell>{order.paymentMode || "N/A"}</TableCell>
                  <TableCell>
                    <Chip
                      label={order.orderCycle}
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
                   
                    <Tooltip title="View Details">
                      <IconButton 
                        onClick={() => openDetailModal(order)}
                        size="small"
                      >
                        <Visibility />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  <Typography variant="h6" sx={{ py: 4, color: 'text.secondary' }}>
                    No orders found
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <Stack spacing={2} alignItems="center" sx={{ mt: 2 }}>
        <Pagination
          count={Math.ceil(filteredOrders.length / ITEMS_PER_PAGE)}
          page={page}
          onChange={handlePageChange}
          color="primary"
          disabled={loading}
        />
      </Stack>

      {/* Modals */}
      {isDetailModalOpen && (
        <OrderDetailsModal
          orderId={selectedOrderId}
          onClose={() => setIsDetailModalOpen(false)}
        />
      )}

     
    </div>
  );
};

export default DigiOrders;