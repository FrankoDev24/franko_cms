import { useEffect, useState, useCallback, useMemo, Component } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchAllProducts,
  fetchAllCTP002ProductVariants,
  fetchCTP002ProductVariants,
  fetchMultipleCTP002ProductVariants, // ✅ correct name
  fetchProductsWithoutVariants,
  createProductVariantAndMerge,
  // ✅ NEW: product images / by-id endpoints
  fetchProductById,
  fetchProductImages,
  addProductImages,
  deleteProductImage,
  clearCurrentProduct,
} from "../../../Redux/Slice/productSlice";
import { fetchBrands } from "../../../Redux/Slice/brandSlice";
import { fetchShowrooms } from "../../../Redux/Slice/showRoomSlice";
import {
  Button,
  Table,
  message,
  Input,
  Modal,
  Tooltip,
  Tag,
  Card,
  Space,
  Select,
  Row,
  Col,
  Statistic,
  Avatar,
  Empty,
  Tabs,
  List,
  Spin,
  Divider,
  Upload,
  Popconfirm,
  Typography,
} from "antd";
import {
  EyeOutlined,
  EditOutlined,
  PlusOutlined,
  UploadOutlined,
  ReloadOutlined,
  DownloadOutlined,
  SearchOutlined,
  ShopOutlined,
  TagsOutlined,
  BranchesOutlined,
  PictureOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import * as XLSX from "xlsx";
import AddProduct from "./AddProduct";
import UpdateProduct from "./EditProduct";
import UpdateProductImage from "./UpdateProductImage";

const { Option } = Select;
const { Text } = Typography;

const backendBaseURL = "https://cms.frankotrading.com";

const getProductId = (product) =>
  product?.productID || product?.Productid || product?.ProductID;

const getProductName = (product) =>
  product?.productName || product?.ProductName || "";

const getProductImage = (product) =>
  product?.productImage || product?.ProductImage || "";

const getDescription = (product) =>
  product?.description || product?.Description || "";

const getPrice = (product) => product?.price ?? product?.Price ?? 0;
const getOldPrice = (product) => product?.oldPrice ?? product?.OldPrice ?? 0;
const getBrandName = (product) =>
  product?.brandName || product?.BrandName || "";
const getCategoryName = (product) =>
  product?.categoryName || product?.CategoryName || "";
const getShowroomName = (product) =>
  product?.showRoomName || product?.ShowRoomName || "";
const getStatus = (product) => product?.status ?? product?.Status;
const getDateCreated = (product) =>
  product?.dateCreated || product?.DateCreated || "";

// Accept the actual CTP002 id from a product — falls back to the product's own id
// because some backends store the parent id on the variant-side, not on the product.
const getProductId2 = (product) => {
  if (!product) return "";
  return (
    product.productId2 ||
    product.ProductId2 ||
    product.productID2 ||
    product.ProductID2 ||
    product.ctP002ProductId ||
    product.CTP002ProductId ||
    getProductId(product) ||
    ""
  );
};

const getVariantParentId = (variant) =>
  variant?.ctP002ProductId ||
  variant?.CTP002ProductId ||
  variant?.ctp002ProductId ||
  variant?._parentId ||
  variant?.parentId ||
  variant?.ParentId ||
  "";

// Module-level so the ProductImagesPanel sub-component can use it too.
const getImageUrl = (imagePath) => {
  if (!imagePath) return "";
  const fileName = String(imagePath).split("\\").pop().split("/").pop();
  return `${backendBaseURL}/Media/Products_Images/${fileName}`;
};

// Resolve the {Code} used by Product-Get-by-Product_ID / GetProductImages /
// AddProductImages / DeleteProductImage. It is the PRODUCT ID; if your API
// keys by the ProductId2 business code instead, swap the order here (one-line
// change — see CHANGES.md).
const resolveProductCode = (product) => getProductId(product) || getProductId2(product);

const AdminProducts = () => {
  const dispatch = useDispatch();

  const { products = [], loading: productsLoading } = useSelector(
    (state) => state.products || {}
  );

  const { brands = [], loading: brandsLoading } = useSelector(
    (state) => state.brands || {}
  );

  const { showrooms = [], loading: showroomsLoading } = useSelector(
    (state) => state.showrooms || {}
  );

  // Variant state
  const ctp002ProductVariants = useSelector(
    (state) => state.products?.ctp002ProductVariants || {}
  );
  const allCTP002ProductVariants = useSelector(
    (state) => state.products?.allCTP002ProductVariants || []
  );
  const productsWithoutVariants = useSelector(
    (state) => state.products?.productsWithoutVariants || []
  );
  const variantLoading = useSelector(
    (state) => state.products?.loading
  );

  // ✅ NEW: fresh-by-id record (Product-Get-by-Product_ID/{Code})
  const currentProduct = useSelector(
    (state) => state.products?.currentProduct || null
  );

  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isUpdateModalVisible, setIsUpdateModalVisible] = useState(false);
  const [isImagePreviewVisible, setIsImagePreviewVisible] = useState(false);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [isDescriptionModalVisible, setIsDescriptionModalVisible] =
    useState(false);
  const [isUpdateImageModalVisible, setIsUpdateImageModalVisible] =
    useState(false);

  const [isVariantModalVisible, setIsVariantModalVisible] = useState(false);
  const [selectedProductForVariants, setSelectedProductForVariants] =
    useState(null);

  // ✅ NEW: product images (gallery) manager modal
  const [isImagesModalVisible, setIsImagesModalVisible] = useState(false);
  const [selectedProductForImages, setSelectedProductForImages] = useState(null);

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedProductForImage, setSelectedProductForImage] = useState(null);
  const [fullImageUrl, setFullImageUrl] = useState("");
  const [descriptionText, setDescriptionText] = useState("");

  const [searchText, setSearchText] = useState("");
  const [filterBrand, setFilterBrand] = useState(undefined);
  const [filterShowroom, setFilterShowroom] = useState(undefined);
  const [filterStock, setFilterStock] = useState("all");
  const [filterVariant, setFilterVariant] = useState("all");
  const [refreshLoading, setRefreshLoading] = useState(false);

  const isLoading =
    productsLoading || brandsLoading || showroomsLoading || refreshLoading;

  /* ---------- Map of ctp002 parentId -> variants[] ---------- *
   * Builds a robust map using BOTH sources so a single bad response
   * doesn't blank out the variants column.
   */
  const variantsByParentId = useMemo(() => {
    const map = { ...ctp002ProductVariants };

    (Array.isArray(allCTP002ProductVariants) ? allCTP002ProductVariants : []).forEach(
      (variant) => {
        const parentId = getVariantParentId(variant);
        if (!parentId) return;
        if (!map[parentId]) map[parentId] = [];
        // Avoid duplicates by ctP001ProductId
        const exists = map[parentId].some(
          (v) =>
            (v.ctP001ProductId || v.CTP001ProductId || v.ctp001ProductId) ===
            (variant.ctP001ProductId ||
              variant.CTP001ProductId ||
              variant.ctp001ProductId)
        );
        if (!exists) map[parentId].push(variant);
      }
    );

    return map;
  }, [ctp002ProductVariants, allCTP002ProductVariants]);

  const variantCountByProductId2 = useMemo(() => {
    const counts = {};
    Object.entries(variantsByParentId).forEach(([parentId, list]) => {
      counts[parentId] = (Array.isArray(list) ? list.length : 0);
    });
    return counts;
  }, [variantsByParentId]);

  const fetchInitialData = useCallback(async () => {
    try {
      await Promise.all([
        dispatch(fetchAllProducts()).unwrap(),
        dispatch(fetchBrands()).unwrap(),
        dispatch(fetchShowrooms()).unwrap(),
        dispatch(fetchAllCTP002ProductVariants()).unwrap(),
        dispatch(fetchProductsWithoutVariants()).unwrap(),
      ]);
    } catch (error) {
      message.error("Failed to load product data");
    }
  }, [dispatch]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const handleRefresh = useCallback(async () => {
    setRefreshLoading(true);
    try {
      await Promise.all([
        dispatch(fetchAllProducts()).unwrap(),
        dispatch(fetchBrands()).unwrap(),
        dispatch(fetchShowrooms()).unwrap(),
        dispatch(fetchAllCTP002ProductVariants()).unwrap(),
        dispatch(fetchProductsWithoutVariants()).unwrap(),
      ]);
      message.success("Data refreshed successfully");
    } catch (error) {
      message.error("Failed to refresh data");
    } finally {
      setRefreshLoading(false);
    }
  }, [dispatch]);

  const productsWithoutVariantIds = useMemo(() => {
    const set = new Set();
    (Array.isArray(productsWithoutVariants) ? productsWithoutVariants : []).forEach(
      (p) => {
        const id = getProductId(p);
        if (id) set.add(id);
      }
    );
    return set;
  }, [productsWithoutVariants]);

  const { filteredProducts, productStats } = useMemo(() => {
    const sourceProducts = Array.isArray(products) ? products : [];
    const q = searchText.trim().toLowerCase();

    const filtered = sourceProducts.filter((product) => {
      const searchMatch =
        !q ||
        [
          getProductName(product),
          getShowroomName(product),
          getBrandName(product),
          getCategoryName(product),
          getDescription(product),
          getProductId(product),
          getProductId2(product),
        ].some((field) => String(field ?? "").toLowerCase().includes(q));

      const brandMatch = !filterBrand || getBrandName(product) === filterBrand;
      const showroomMatch =
        !filterShowroom || getShowroomName(product) === filterShowroom;

      let stockMatch = true;
      if (filterStock === "in_stock") stockMatch = getStatus(product) == 1;
      if (filterStock === "out_of_stock") stockMatch = getStatus(product) == 0;

      let variantMatch = true;
      const productId2 = getProductId2(product);
      if (filterVariant === "has_variants") {
        variantMatch = (variantCountByProductId2[productId2] || 0) > 0;
      } else if (filterVariant === "no_variants") {
        variantMatch = (variantCountByProductId2[productId2] || 0) === 0;
      } else if (filterVariant === "available_for_variant") {
        variantMatch = productsWithoutVariantIds.has(getProductId(product));
      }

      return (
        searchMatch && brandMatch && showroomMatch && stockMatch && variantMatch
      );
    });

  // NEW — active first, then by date within each group
const sorted = [...filtered].sort((a, b) => {
  const isActiveA = getStatus(a) == 1 ? 0 : 1;
  const isActiveB = getStatus(b) == 1 ? 0 : 1;

  // Primary sort: active products first
  if (isActiveA !== isActiveB) {
    return isActiveA - isActiveB;
  }

  // Secondary sort: newest first within same status group
  return new Date(getDateCreated(b) || 0) - new Date(getDateCreated(a) || 0);
});

    const stats = {
      total: sourceProducts.length,
      filtered: filtered.length,
      inStock: sourceProducts.filter((p) => getStatus(p) == 1).length,
      outOfStock: sourceProducts.filter((p) => getStatus(p) == 0).length,
      withVariants: Object.values(variantCountByProductId2).filter(
        (c) => c > 0
      ).length,
      withoutVariants: productsWithoutVariantIds.size,
    };

    return { filteredProducts: sorted, productStats: stats };
  }, [
    products,
    searchText,
    filterBrand,
    filterShowroom,
    filterStock,
    filterVariant,
    variantCountByProductId2,
    productsWithoutVariantIds,
  ]);

  const handleModalClose = useCallback(
    async (setter, shouldRefresh = false) => {
      setter(false);
      if (shouldRefresh) {
        try {
          await Promise.all([
            dispatch(fetchAllProducts()).unwrap(),
            dispatch(fetchAllCTP002ProductVariants()).unwrap(),
            dispatch(fetchProductsWithoutVariants()).unwrap(),
          ]);
        } catch {
          message.error("Failed to refresh products");
        }
      }
    },
    [dispatch]
  );

  const handleAddProduct = useCallback(() => {
    setSelectedProduct(null);
    setIsAddModalVisible(true);
  }, []);

  const handleUpdateProduct = useCallback((product) => {
    setSelectedProduct(product);
    setIsUpdateModalVisible(true);
  }, []);

  const handleUpdateProductImage = useCallback((product) => {
    if (!product) {
      message.warning("No product selected");
      return;
    }
    setSelectedProductForImage(product);
    setIsUpdateImageModalVisible(true);
  }, []);

  /* ✅ View Details — fetch the FRESH record via
     Product-Get-by-Product_ID/{Code} plus its gallery via
     GetProductImages/{Code}; the row data stays as fallback. */
  const handleViewProductDetails = useCallback((product) => {
    if (!product) return;
    setSelectedProduct(product);
    setIsDetailModalVisible(true);
    const code = resolveProductCode(product);
    if (code) {
      dispatch(fetchProductById(code));
      dispatch(fetchProductImages(code));
    }
  }, [dispatch]);

  const closeDetailModal = useCallback(() => {
    setIsDetailModalVisible(false);
    dispatch(clearCurrentProduct());
  }, [dispatch]);

  /* ✅ Manage Images — the gallery manager (Get/Add/DeleteProductImage) */
  const handleManageImages = useCallback((product) => {
    if (!product) {
      message.warning("No product selected");
      return;
    }
    setSelectedProductForImages(product);
    setIsImagesModalVisible(true);
  }, []);

  /* Prefer the freshly fetched record when it matches the selected row. */
  const detailProduct = useMemo(() => {
    if (!selectedProduct) return null;
    const selId = String(getProductId(selectedProduct) || "");
    const curId = String(getProductId(currentProduct) || "");
    return currentProduct && curId && curId === selId
      ? currentProduct
      : selectedProduct;
  }, [selectedProduct, currentProduct]);

  const handleManageVariants = useCallback(
    async (product) => {
      if (!product) {
        message.warning("No product selected");
        return;
      }
      const productId2 = getProductId2(product);
      setSelectedProductForVariants(product);
      setIsVariantModalVisible(true);

      // Try fetching the dedicated variants list
      try {
        await dispatch(fetchCTP002ProductVariants(productId2)).unwrap();
      } catch (err) {
        console.warn("Failed to fetch variants for this product:", err);
      }
    },
    [dispatch]
  );

 const handleAddVariantToExisting = useCallback(
  async (ctP001ProductId, name, color, size, imageUrl) => {
    if (!selectedProductForVariants) return;

    const ctP002ProductId = getProductId2(selectedProductForVariants);
    if (!ctP002ProductId) {
      message.error("Parent product has no CTP002 id.");
      return;
    }

    const payload = {
      ctP002ProductId,
      variants: [
        {
          ctP001ProductId,
          name: name || "",
          color: color || "",
          size: size || "",
          imageUrl: imageUrl || "",
          createdAt: new Date().toISOString(), // ← ADD THIS
        },
      ],
    };



      try {
        await dispatch(createProductVariantAndMerge(payload)).unwrap();
        message.success("Variant added!");

        // Refresh the per-product variants list and global lists
        await Promise.all([
          dispatch(fetchCTP002ProductVariants(ctP002ProductId)).unwrap(),
          dispatch(fetchAllCTP002ProductVariants()).unwrap(),
          dispatch(fetchProductsWithoutVariants()).unwrap(),
          dispatch(fetchAllProducts()).unwrap(),
        ]);
      } catch (err) {
        console.error(err);
        message.error(
          typeof err === "string" ? err : "Failed to add variant"
        );
      }
    },
    [dispatch, selectedProductForVariants]
  );

  const handleBulkFetchVariants = useCallback(
    async (ids) => {
      if (!ids || !ids.length) {
        message.warning("No product IDs provided");
        return;
      }
      try {
        await dispatch(fetchMultipleCTP002ProductVariants(ids)).unwrap();
        message.success(`Fetched variants for ${ids.length} products`);
      } catch (err) {
        message.error("Failed to fetch multiple variants");
      }
    },
    [dispatch]
  );

  const handleDescriptionClick = useCallback((description) => {
    setDescriptionText(description || "");
    setIsDescriptionModalVisible(true);
  }, []);

  const handlePreviewImage = useCallback(
    (imagePath) => {
      const imageUrl = getImageUrl(imagePath);
      if (!imageUrl) {
        message.warning("No image found for this product");
        return;
      }
      setFullImageUrl(imageUrl);
      setIsImagePreviewVisible(true);
    },
    []
  );

  const exportToExcel = useCallback(() => {
    try {
      const exportData = filteredProducts.map((product, index) => {
        const productId2 = getProductId2(product);
        const variantCount = variantCountByProductId2[productId2] || 0;
        return {
          "S/N": index + 1,
          "Product Name": getProductName(product),
          "Product ID": getProductId(product) || "",
          "Parent ID (CTP002)": productId2 || "",
          "Variants": variantCount,
          Description: getDescription(product),
          "Price (₵)": parseFloat(getPrice(product) || 0).toFixed(2),
          "Old Price (₵)": getOldPrice(product)
            ? parseFloat(getOldPrice(product)).toFixed(2)
            : "",
          Brand: getBrandName(product),
          Category: getCategoryName(product),
          Showroom: getShowroomName(product),
          Status: getStatus(product) == 1 ? "In Stock" : "Out of Stock",
          "Date Created": getDateCreated(product)
            ? new Date(getDateCreated(product)).toLocaleDateString()
            : "",
        };
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);
      ws["!cols"] = [
        { wch: 5 },
        { wch: 30 },
        { wch: 16 },
        { wch: 18 },
        { wch: 10 },
        { wch: 40 },
        { wch: 12 },
        { wch: 12 },
        { wch: 15 },
        { wch: 15 },
        { wch: 18 },
        { wch: 14 },
        { wch: 14 },
      ];
      XLSX.utils.book_append_sheet(wb, ws, "Products");
      const currentDate = new Date().toISOString().split("T")[0];
      XLSX.writeFile(wb, `products_export_${currentDate}.xlsx`);
      message.success("Products exported successfully");
    } catch (error) {
      message.error("Failed to export products");
    }
  }, [filteredProducts, variantCountByProductId2]);

  const columns = useMemo(
    () => [
      {
        title: "Image",
        dataIndex: "productImage",
        key: "productImage",
        width: 80,
        fixed: "left",
        render: (_, record) => {
          const imagePath = getProductImage(record);
          const imageUrl = getImageUrl(imagePath);
          return (
            <Avatar
              src={imageUrl}
              size={50}
              shape="square"
              style={{ cursor: "pointer", border: "1px solid #f0f0f0" }}
              onClick={() => handlePreviewImage(imagePath)}
            />
          );
        },
      },
      {
        title: "Product Details",
        key: "productDetails",
        width: 240,
        render: (_, record) => (
          <div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>
              {getProductName(record) || "-"}
            </div>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>
              ID: {getProductId(record) || "-"}
            </div>
            <div style={{ fontSize: 12, color: "#999", marginTop: 4 }}>
              {getDateCreated(record)
                ? new Date(getDateCreated(record)).toLocaleDateString()
                : "-"}
            </div>
          </div>
        ),
      },
      
      {
        title: "Price",
        key: "price",
        width: 120,
        render: (_, record) => {
          const price = getPrice(record);
          const oldPrice = getOldPrice(record);
          return (
            <div>
              <div style={{ fontWeight: 600, color: "#ff4d4f" }}>
                ₵
                {parseFloat(price || 0).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              {Number(oldPrice) > 0 && (
                <div
                  style={{
                    fontSize: 12,
                    color: "#999",
                    textDecoration: "line-through",
                  }}
                >
                  ₵
                  {parseFloat(oldPrice).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
              )}
            </div>
          );
        },
      },
      {
        title: "Brand & Category",
        key: "brandCategory",
        width: 160,
        render: (_, record) => (
          <div>
            <Tag color="red" style={{ marginBottom: 4 }}>
              {getBrandName(record) || "-"}
            </Tag>
            <br />
            <Tag color="orange">{getCategoryName(record) || "-"}</Tag>
          </div>
        ),
      },
      {
        title: "Showroom",
        key: "showRoomName",
        width: 150,
        render: (_, record) => {
          const showroomName = getShowroomName(record);
          return (
            <Tag
              color={showroomName === "Products out of stock" ? "red" : "green"}
            >
              {showroomName || "-"}
            </Tag>
          );
        },
      },
      {
        title: "Status",
        key: "status",
        width: 110,
        render: (_, record) => {
          const status = getStatus(record);
          return (
            <Tag color={status == 1 ? "success" : "error"}>
              {status == 1 ? "In Stock" : "Out of Stock"}
            </Tag>
          );
        },
      },
      {
        title: "Actions",
        key: "actions",
        width: 210,
        fixed: "right",
        render: (_, record) => (
          <Space size="small">
            <Tooltip title="Edit Product">
              <Button
                type="text"
                icon={<EditOutlined />}
                onClick={() => handleUpdateProduct(record)}
              />
            </Tooltip>
            <Tooltip title="Update Image">
              <Button
                type="text"
                icon={<UploadOutlined />}
                onClick={() => handleUpdateProductImage(record)}
              />
            </Tooltip>
            {/* ✅ NEW: gallery manager (Get/Add/DeleteProductImage) */}
            <Tooltip title="Manage Images">
              <Button
                type="text"
                icon={<PictureOutlined />}
                onClick={() => handleManageImages(record)}
              />
            </Tooltip>
           
            <Tooltip title="View Details">
              <Button
                type="text"
                icon={<EyeOutlined />}
                onClick={() => handleViewProductDetails(record)}
              />
            </Tooltip>
          </Space>
        ),
      },
    ],
    [
      handlePreviewImage,
      handleUpdateProduct,
      handleUpdateProductImage,
      handleManageImages,
      handleViewProductDetails,
    ]
  );

  /* ----- Variant modal data ----- *
   * IMPORTANT: we look up by every possible parent-id candidate
   * (the product's own id, its productId2, etc.) so a slight
   * backend mismatch still shows the variants.
   */
  const currentVariantsList = useMemo(() => {
    if (!selectedProductForVariants) return [];
    const candidates = [
      getProductId2(selectedProductForVariants),
      getProductId(selectedProductForVariants),
    ].filter(Boolean);

    for (const key of candidates) {
      if (variantsByParentId[key]?.length) {
        return variantsByParentId[key];
      }
    }

    // Fallback: scan the flat list for any variant whose parentId matches
    return (Array.isArray(allCTP002ProductVariants) ? allCTP002ProductVariants : []).filter(
      (v) => candidates.includes(getVariantParentId(v))
    );
  }, [selectedProductForVariants, variantsByParentId, allCTP002ProductVariants]);

  const availableVariantCandidates = useMemo(() => {
    const addedIds = new Set(
      currentVariantsList.map(
        (v) =>
          v.ctP001ProductId || v.CTP001ProductId || v.ctp001ProductId
      )
    );
    return (
      Array.isArray(productsWithoutVariants) ? productsWithoutVariants : []
    ).filter((p) => !addedIds.has(getProductId(p)));
  }, [productsWithoutVariants, currentVariantsList]);

  return (
    <div
      style={{ minHeight: "100vh" }}
      className="min-h-screen overflow-y-auto px-4 py-6 bg-white"
    >
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: "#262626",
            margin: 0,
            marginBottom: 4,
          }}
        >
          Products Management
        </h1>
        <p style={{ color: "#8c8c8c", margin: 0 }}>
          Manage your product inventory, pricing, availability, and variants
        </p>
      </div>

      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Products"
              value={productStats.total}
              prefix={<TagsOutlined style={{ color: "#1890ff" }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="In Stock"
              value={productStats.inStock}
              valueStyle={{ color: "#3f8600" }}
              prefix={<ShopOutlined style={{ color: "#3f8600" }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="With Variants"
              value={productStats.withVariants}
              valueStyle={{ color: "#722ed1" }}
              prefix={<BranchesOutlined style={{ color: "#722ed1" }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Available for Variant"
              value={productStats.withoutVariants}
              valueStyle={{ color: "#fa8c16" }}
              prefix={<BranchesOutlined style={{ color: "#fa8c16" }} />}
            />
          </Card>
        </Col>
      </Row>

      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <Input
              placeholder="Search products, brands, categories, showrooms..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>

          <Col xs={24} sm={12} md={4}>
            <Select
              placeholder="Filter by Brand"
              style={{ width: "100%" }}
              value={filterBrand}
              onChange={setFilterBrand}
              allowClear
            >
              {(Array.isArray(brands) ? brands : []).map((brand) => (
                <Option
                  key={brand.brandId || brand.brandID || brand.brandName}
                  value={brand.brandName}
                >
                  {brand.brandName}
                </Option>
              ))}
            </Select>
          </Col>

          <Col xs={24} sm={12} md={4}>
            <Select
              placeholder="Filter by Showroom"
              style={{ width: "100%" }}
              value={filterShowroom}
              onChange={setFilterShowroom}
              allowClear
            >
              {(Array.isArray(showrooms) ? showrooms : []).map((showroom) => (
                <Option
                  key={
                    showroom.showRoomId ||
                    showroom.showRoomID ||
                    showroom.showRoomName
                  }
                  value={showroom.showRoomName}
                >
                  {showroom.showRoomName}
                </Option>
              ))}
            </Select>
          </Col>

          <Col xs={24} sm={12} md={4}>
            <Select
              placeholder="Stock Status"
              style={{ width: "100%" }}
              value={filterStock}
              onChange={setFilterStock}
            >
              <Option value="all">All Products</Option>
              <Option value="in_stock">In Stock Only</Option>
              <Option value="out_of_stock">Out of Stock Only</Option>
            </Select>
          </Col>

          <Col xs={24} sm={12} md={3}>
            <Select
              placeholder="Variants"
              style={{ width: "100%" }}
              value={filterVariant}
              onChange={setFilterVariant}
            >
              <Option value="all">All Variants</Option>
              <Option value="has_variants">Has Variants</Option>
              <Option value="no_variants">No Variants</Option>
              <Option value="available_for_variant">Available to Merge</Option>
            </Select>
          </Col>

          <Col xs={24} md={3}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAddProduct}
              style={{ backgroundColor: "#52c41a", borderColor: "#52c41a" }}
              block
            >
              Add Product
            </Button>
          </Col>
        </Row>

        <Row gutter={16} style={{ marginTop: 16 }}>
          <Col>
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={handleRefresh}
                loading={refreshLoading}
              >
                Refresh
              </Button>
              <Button
                icon={<DownloadOutlined />}
                onClick={exportToExcel}
                disabled={!filteredProducts.length}
                type="dashed"
              >
                Export Excel
              </Button>
            </Space>
          </Col>
          <Col style={{ marginLeft: "auto" }}>
            <span style={{ color: "#8c8c8c" }}>
              Showing {productStats.filtered} of {productStats.total} products
            </span>
          </Col>
        </Row>
      </Card>

      <Card>
        <Table
          dataSource={filteredProducts}
          columns={columns}
          rowKey={(record) => getProductId(record)}
          loading={isLoading}
          scroll={{ x: 1300 }}
          locale={{ emptyText: <Empty description="No products found" /> }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            pageSizeOptions: ["10", "15", "25", "50"],
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} products`,
          }}
          size="small"
        />
      </Card>

      <AddProduct
        visible={isAddModalVisible}
        onClose={() => handleModalClose(setIsAddModalVisible, true)}
      />

      <UpdateProduct
        visible={isUpdateModalVisible}
        onClose={() => handleModalClose(setIsUpdateModalVisible, true)}
        product={selectedProduct || {}}
      />

      <UpdateProductImage
        visible={isUpdateImageModalVisible}
        onClose={() => handleModalClose(setIsUpdateImageModalVisible, true)}
        product={selectedProductForImage}
        productID={getProductId(selectedProductForImage)}
      />

      {/* ---------- VARIANT MANAGEMENT MODAL ---------- */}
      <Modal
        open={isVariantModalVisible}
        onCancel={() => setIsVariantModalVisible(false)}
        footer={null}
        centered
        width={800}
        title={
          selectedProductForVariants ? (
            <Space>
              <BranchesOutlined />
              <span>
                Variants for: {getProductName(selectedProductForVariants)}
              </span>
            </Space>
          ) : (
            "Variants"
          )
        }
      >
        {selectedProductForVariants && (
          <Tabs
            defaultActiveKey="existing"
            items={[
              {
                key: "existing",
                label: `Existing Variants (${currentVariantsList.length})`,
                children: (
                  <Spin spinning={variantLoading}>
                    {currentVariantsList.length === 0 ? (
                      <Empty description="No variants yet for this product" />
                    ) : (
                      <List
                        itemLayout="horizontal"
                        dataSource={currentVariantsList}
                        renderItem={(item) => {
                          const img =
                            item.imageUrl ||
                            item.ImageUrl ||
                            getImageUrl(
                              item.imageName || item.ImageName || ""
                            );
                          return (
                            <List.Item>
                              <List.Item.Meta
                                avatar={
                                  <Avatar
                                    shape="square"
                                    size={64}
                                    src={img}
                                  >
                                    <BranchesOutlined />
                                  </Avatar>
                                }
                                title={
                                  <Space>
                                    <strong>
                                      {item.name || item.Name}
                                    </strong>
                                    <Tag color="blue">
                                      {item.color || item.Color}
                                    </Tag>
                                    <Tag color="cyan">
                                      {item.size || item.Size}
                                    </Tag>
                                  </Space>
                                }
                                description={
                                  <span
                                    style={{ fontSize: 12, color: "#666" }}
                                  >
                                    CTP001 ID:{" "}
                                    {item.ctP001ProductId ||
                                      item.CTP001ProductId ||
                                      item.ctp001ProductId}
                                  </span>
                                }
                              />
                            </List.Item>
                          );
                        }}
                      />
                    )}
                  </Spin>
                ),
              },
              {
                key: "add",
                label: "Add Existing Product as Variant",
                children: (
                  <AddVariantForm
                    candidates={availableVariantCandidates}
                    onAdd={handleAddVariantToExisting}
                    loading={variantLoading}
                  />
                ),
              },
              {
                key: "bulk",
                label: "Bulk Fetch",
                children: (
                  <BulkFetchForm
                    onFetch={handleBulkFetchVariants}
                    loading={variantLoading}
                  />
                ),
              },
            ]}
          />
        )}
      </Modal>

      {/* ✅ PRODUCT IMAGES (GALLERY) MODAL — Get/Add/DeleteProductImage */}
      <Modal
        open={isImagesModalVisible}
        onCancel={() => setIsImagesModalVisible(false)}
        footer={null}
        centered
        width={720}
        title={
          selectedProductForImages ? (
            <Space>
              <PictureOutlined style={{ color: "#52c41a" }} />
              <span>
                Images for: {getProductName(selectedProductForImages)}
              </span>
            </Space>
          ) : (
            "Product Images"
          )
        }
      >
        {selectedProductForImages && (
          <ProductImagesPanel product={selectedProductForImages} />
        )}
      </Modal>

      <Modal
        open={isImagePreviewVisible}
        onCancel={() => setIsImagePreviewVisible(false)}
        footer={null}
        title="Product Image"
        width={600}
        centered
      >
        <img
          src={fullImageUrl}
          alt="Full Product"
          style={{ width: "100%", height: "auto", borderRadius: 8 }}
        />
      </Modal>

      <Modal
        open={isDetailModalVisible}
        onCancel={closeDetailModal}
        footer={null}
        centered
        width={700}
        title="Product Details"
      >
        {detailProduct && (
          <div>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <img
                src={getImageUrl(getProductImage(detailProduct))}
                alt={getProductName(detailProduct)}
                style={{
                  width: "100%",
                  maxHeight: 300,
                  objectFit: "cover",
                  borderRadius: 8,
                }}
              />
            </div>

            <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 16 }}>
              {getProductName(detailProduct)}
            </h2>

            <Row gutter={[16, 12]}>
              <Col span={12}>
                <strong>Product ID:</strong>{" "}
                {getProductId(detailProduct) || "-"}
              </Col>
              <Col span={12}>
                <strong>Parent ID (CTP002):</strong>{" "}
                {getProductId2(detailProduct) || "-"}
              </Col>
              <Col span={12}>
                <strong>Category:</strong>{" "}
                {getCategoryName(detailProduct) || "-"}
              </Col>
              <Col span={12}>
                <strong>Brand:</strong> {getBrandName(detailProduct) || "-"}
              </Col>
              <Col span={12}>
                <strong>Showroom:</strong>{" "}
                {getShowroomName(detailProduct) || "-"}
              </Col>
              <Col span={12}>
                <strong>Date Created:</strong>{" "}
                {getDateCreated(detailProduct)
                  ? new Date(getDateCreated(detailProduct)).toLocaleDateString()
                  : "-"}
              </Col>
              <Col span={12}>
                <strong>Status:</strong>
                <Tag
                  color={getStatus(detailProduct) == 1 ? "success" : "error"}
                  style={{ marginLeft: 8 }}
                >
                  {getStatus(detailProduct) == 1
                    ? "In Stock"
                    : "Out of Stock"}
                </Tag>
              </Col>
              <Col span={12}>
                <strong>Variants:</strong>{" "}
                <Tag color="purple">
                  {variantCountByProductId2[
                    getProductId2(detailProduct)
                  ] || 0}
                </Tag>
              </Col>
            </Row>

            <Divider />

            <div>
              <strong>Description:</strong>
              <p
                style={{
                  marginTop: 8,
                  lineHeight: 1.6,
                  color: "#666",
                  cursor: "pointer",
                }}
                onClick={() =>
                  handleDescriptionClick(getDescription(detailProduct))
                }
              >
                {getDescription(detailProduct) || "No description"}
              </p>
            </div>

            <Divider />

            {/* ✅ NEW: full image gallery with add/delete */}
            <div>
              <strong>Product Images:</strong>
              <ProductImagesPanel product={detailProduct} />
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={isDescriptionModalVisible}
        onCancel={() => setIsDescriptionModalVisible(false)}
        footer={null}
        title="Product Description"
        width={700}
      >
        <div style={{ maxHeight: 400, overflowY: "auto" }}>
          <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
            {descriptionText}
          </p>
        </div>
      </Modal>
    </div>
  );
};

/* ---------- Product Images (gallery) panel ----------
 * GET    /Product/GetProductImages/{Code}    → list
 * POST   /Product/AddProductImages/{Code}    → upload (batch)
 * POST   /Product/DeleteProductImage/{Code}  → delete (confirm)
 * Used by both the "Manage Images" modal and the Details modal.
 */
const ProductImagesPanel = ({ product }) => {
  const dispatch = useDispatch();
  const code = resolveProductCode(product);

  const images = useSelector(
    (state) => (code ? state.products?.productImagesByCode?.[code] : null) || []
  );
  const imagesLoading = useSelector(
    (state) => state.products?.imagesLoading || false
  );
  const imagesError = useSelector(
    (state) => state.products?.imagesError || null
  );

  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (code) {
      dispatch(fetchProductImages(code));
    }
  }, [dispatch, code]);

  const handleAddFiles = useCallback(
    async (files) => {
      if (!code || !files?.length) return;
      const valid = files.filter(
        (f) => f.type?.startsWith("image/") && f.size / 1024 / 1024 < 5
      );
      const rejected = files.length - valid.length;
      if (rejected > 0) {
        message.warning(`${rejected} file(s) skipped (not an image or over 5MB).`);
      }
      if (!valid.length) return;

      setUploading(true);
      try {
        await dispatch(addProductImages({ code, imageFiles: valid })).unwrap();
        message.success(`${valid.length} image(s) added`);
        await dispatch(fetchProductImages(code));
      } catch (err) {
        console.error("Add images error:", err);
        message.error(typeof err === "string" ? err : "Failed to add images");
      } finally {
        setUploading(false);
      }
    },
    [dispatch, code]
  );

  // antd fires beforeUpload once per file with the full batch in fileList;
  // upload the batch when the last file of the selection arrives.
  const handleBeforeUpload = useCallback(
    (file, fileList) => {
      if (fileList.indexOf(file) === fileList.length - 1) {
        handleAddFiles(fileList);
      }
      return false;
    },
    [handleAddFiles]
  );

  const handleDelete = useCallback(
    async (image) => {
      if (!code) return;
      try {
        await dispatch(
          deleteProductImage({
            code,
            imageName: image?.imageName || null,
            imageId: image?.id || null,
          })
        ).unwrap();
        message.success("Image deleted");
      } catch (err) {
        console.error("Delete image error:", err);
        message.error(typeof err === "string" ? err : "Failed to delete image");
      }
    },
    [dispatch, code]
  );

  const mainImage = getImageUrl(getProductImage(product));

  return (
    <Spin spinning={imagesLoading || uploading}>
      <Space direction="vertical" style={{ width: "100%" }} size="middle">
        {/* Primary image (managed by the "Update Image" action) */}
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Primary image
          </Text>
          <div
            style={{
              marginTop: 6,
              width: 120,
              height: 120,
              border: "1px solid #f0f0f0",
              borderRadius: 8,
              overflow: "hidden",
              background: "#fafafa",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {mainImage ? (
              <img
                src={mainImage}
                alt="Primary"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <PictureOutlined style={{ fontSize: 28, color: "#bfbfbf" }} />
            )}
          </div>
        </div>

        <Divider style={{ margin: "8px 0" }} />

        {/* Gallery images */}
        <div>
          <Space style={{ marginBottom: 10 }}>
            <Text strong>Gallery images</Text>
            <Tag color="blue">{images.length}</Tag>
            <Upload
              multiple
              accept="image/*"
              showUploadList={false}
              beforeUpload={handleBeforeUpload}
            >
              <Button
                size="small"
                type="primary"
                icon={<UploadOutlined />}
                loading={uploading}
              >
                Add Images
              </Button>
            </Upload>
          </Space>

          {imagesError ? (
            <Empty
              description={
                <span style={{ color: "#ff4d4f" }}>
                  Failed to load images:{" "}
                  {typeof imagesError === "string" ? imagesError : "error"}
                </span>
              }
            />
          ) : images.length === 0 ? (
            <Empty description="No gallery images for this product" />
          ) : (
            <Row gutter={[10, 10]}>
              {images.map((image) => {
                const src = image.imageUrl || getImageUrl(image.imageName);
                return (
                  <Col key={image.key}>
                    <div
                      style={{
                        position: "relative",
                        width: 110,
                        height: 110,
                        border: "1px solid #f0f0f0",
                        borderRadius: 8,
                        overflow: "hidden",
                        background: "#fafafa",
                      }}
                    >
                      {src ? (
                        <img
                          src={src}
                          alt={image.imageName || "product image"}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            height: "100%",
                            color: "#bfbfbf",
                          }}
                        >
                          <PictureOutlined />
                        </div>
                      )}
                      <Popconfirm
                        title="Delete this image?"
                        description={image.imageName || undefined}
                        okText="Delete"
                        okButtonProps={{ danger: true }}
                        cancelText="Cancel"
                        onConfirm={() => handleDelete(image)}
                      >
                        <Button
                          size="small"
                          danger
                          type="text"
                          icon={<DeleteOutlined />}
                          style={{
                            position: "absolute",
                            top: 4,
                            right: 4,
                            background: "rgba(255, 255, 255, 0.9)",
                          }}
                        />
                      </Popconfirm>
                    </div>
                    <Text
                      style={{
                        display: "block",
                        width: 110,
                        fontSize: 11,
                        color: "#8c8c8c",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                      title={image.imageName}
                    >
                      {image.imageName || image.id}
                    </Text>
                  </Col>
                );
              })}
            </Row>
          )}
        </div>
      </Space>
    </Spin>
  );
};

/* ---------- Sub Components ---------- */

const AddVariantForm = ({ candidates, onAdd, loading }) => {
  const [selected, setSelected] = useState(null);
  const [color, setColor] = useState("");
  const [size, setSize] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const handleSubmit = () => {
    if (!selected) {
      message.error("Please select a product to add as a variant.");
      return;
    }
    if (!color.trim() || !size.trim()) {
      message.error("Color and size are required.");
      return;
    }
    const product = candidates.find((p) => getProductId(p) === selected);
    onAdd(
      selected,
      product?.productName || product?.ProductName || "",
      color,
      size,
      imageUrl
    );
    setSelected(null);
    setColor("");
    setSize("");
    setImageUrl("");
  };

  return (
    <div>
      <p style={{ color: "#666", marginBottom: 16 }}>
        Select a product that doesn't yet have variants to merge it as a
        variant of this parent product.
      </p>
      <Select
        style={{ width: "100%", marginBottom: 12 }}
        placeholder="Search & select a product"
        showSearch
        value={selected}
        onChange={setSelected}
        optionFilterProp="children"
        notFoundContent="No products available"
      >
        {candidates.map((p) => {
          const id = getProductId(p);
          const name = getProductName(p);
          return (
            <Option key={id} value={id}>
              {name} (ID: {id})
            </Option>
          );
        })}
      </Select>

      <Row gutter={8} style={{ marginBottom: 12 }}>
        <Col span={12}>
          <Input
            placeholder="Color (e.g., Red)"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
        </Col>
        <Col span={12}>
          <Input
            placeholder="Size (e.g., XL)"
            value={size}
            onChange={(e) => setSize(e.target.value)}
          />
        </Col>
      </Row>

      <Input
        placeholder="Image URL (optional)"
        value={imageUrl}
        onChange={(e) => setImageUrl(e.target.value)}
        style={{ marginBottom: 12 }}
      />

      <Button
        type="primary"
        icon={<PlusOutlined />}
        onClick={handleSubmit}
        loading={loading}
        block
      >
        Add Variant
      </Button>
    </div>
  );
};

const BulkFetchForm = ({ onFetch, loading }) => {
  const [value, setValue] = useState("");
  const handleFetch = () => {
    const ids = value
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    onFetch(ids);
  };
  return (
    <div>
      <p style={{ color: "#666", marginBottom: 12 }}>
        Enter CTP002 product IDs (one per line, or comma-separated) to fetch
        their variants in bulk.
      </p>
      <Input.TextArea
        rows={6}
        placeholder="product-id-1&#10;product-id-2&#10;product-id-3"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        style={{ marginBottom: 12 }}
      />
      <Button type="primary" onClick={handleFetch} loading={loading} block>
        Fetch Variants
      </Button>
    </div>
  );
};

/* ---------- Error boundary ----------
 * Wraps the whole Products page: if anything inside throws during render,
 * users see a readable error + Reload instead of a blank white page.
 */
class ProductErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Products page crashed:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 48, textAlign: "center" }}>
          <h2 style={{ color: "#ff4d4f", marginBottom: 8 }}>
            Something went wrong on the Products page.
          </h2>
          <p style={{ color: "#8c8c8c", marginBottom: 16 }}>
            {String(this.state.error?.message || this.state.error)}
          </p>
          <Space>
            <Button type="primary" onClick={() => window.location.reload()}>
              Reload Page
            </Button>
            <Button
              onClick={() => this.setState({ error: null })}
            >
              Try Again
            </Button>
          </Space>
        </div>
      );
    }
    return this.props.children;
  }
}

const AdminProductsPage = () => (
  <ProductErrorBoundary>
    <AdminProducts />
  </ProductErrorBoundary>
);

export default AdminProductsPage;
