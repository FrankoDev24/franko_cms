import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Select,
  MenuItem,
  FormHelperText,
  CircularProgress,
  InputLabel,
  FormControl,
  Typography,
  Box,
  Divider,
} from "@mui/material";
import { useDispatch } from "react-redux";
import {
  updateOrderTransition,
  updateOrder,
} from "../../../Redux/Slice/orderSlice";

const CYCLE_OPTIONS = [
  "Processing",
  "Confirmed",
  "Pending",
  "Unreachable",
  "Out of Stock",
  "Wrong Number",
  "Cancelled",
  "Order Placement",
  "Not Answered",
  "Delivery",
  "Completed",
  "Multiple Orders",
  "Testing"
];

const CycleUpdateModal = ({ open, onClose, orderId, currentCycle, onUpdated }) => {
  const dispatch = useDispatch();
  const [cycleName, setCycleName] = useState(currentCycle || "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setCycleName(currentCycle || "");
  }, [currentCycle]);

  const handleUpdate = async () => {
    if (!cycleName || !orderId) return;

    setLoading(true);

    const optimisticOrder = { _id: orderId, CycleName: cycleName };
    dispatch(updateOrder(optimisticOrder));

    try {
      const resultAction = await dispatch(
        updateOrderTransition({ CycleName: cycleName, OrderId: orderId })
      );

      if (updateOrderTransition.fulfilled.match(resultAction)) {
        const updatedOrder = resultAction.payload;
        dispatch(updateOrder(updatedOrder));
        if (onUpdated) onUpdated(updatedOrder);
        onClose();
      } else {
        console.error("Failed to update order:", resultAction.error);
      }
    } catch (error) {
      console.error("Update failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        elevation: 3,
        sx: { borderRadius: 3, overflow: "hidden" },
      }}
    >
      <Box sx={{ backgroundColor: "#f5f5f5", py: 2, px: 3 }}>
        <DialogTitle sx={{ fontWeight: 600, p: 0, fontSize: "1.25rem" }}>
          🛒 Update Order Status
        </DialogTitle>
        <Typography variant="body2" color="text.secondary" mt={0.5}>
          Select the appropriate order status below
        </Typography>
      </Box>

      <Divider />

      <DialogContent sx={{ px: 3, pt: 3 }}>
        <FormControl
          fullWidth
          disabled={loading}
          error={!cycleName}
          variant="outlined"
        >
          <InputLabel id="cycle-label">Select status</InputLabel>
          <Select
            labelId="cycle-label"
            value={cycleName}
            onChange={(e) => setCycleName(e.target.value)}
            label="Select Cycle"
            MenuProps={{
              PaperProps: {
                sx: { maxHeight: 300 },
              },
            }}
          >
            <MenuItem value="">
              <em>Choose a cycle...</em>
            </MenuItem>
            {CYCLE_OPTIONS.map((cycle) => (
              <MenuItem key={cycle} value={cycle}>
                {cycle}
              </MenuItem>
            ))}
          </Select>
          {!cycleName && (
            <FormHelperText>Please select a cycle before updating.</FormHelperText>
          )}
        </FormControl>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, pt: 2 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          color="inherit"
          disabled={loading}
          sx={{ textTransform: "none", borderRadius: 2 }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleUpdate}
          variant="contained"
          disabled={!cycleName || loading}
          sx={{
            textTransform: "none",
            backgroundColor: "#4caf50",
            color: "#fff",
            borderRadius: 2,
            "&:hover": {
              backgroundColor: "#43a047",
            },
            px: 3,
          }}
          startIcon={
            loading ? <CircularProgress size={18} color="inherit" /> : null
          }
        >
          {loading ? "Updating..." : "Update"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CycleUpdateModal;
