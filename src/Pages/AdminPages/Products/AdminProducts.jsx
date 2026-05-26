import { useEffect, useState, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchAllProducts } from "../../../Redux/Slice/productSlice";
import { fetchBrands } from "../../../Redux/Slice/brandSlice";
import { fetchShowrooms } from "../../../Redux/Slice/showRoomSlice";
import { fetchBranchProducts } from "../../../Redux/Slice/branchProductSlice";
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
  Badge,
  Empty,
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
  CheckCircleOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import * as XLSX from "xlsx";
import AddProduct from "./AddProduct";
import UpdateProduct from "./EditProduct";
import UpdateProductImage from "./UpdateProductImage";

const { Option } = Select;

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
  const {
    data: branchProducts = [],
    loading: branchLoading,
  } = useSelector((state) => state.branchProducts || {});

  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isUpdateModalVisible, setIsUpdateModalVisible] = useState(false);
  const [isImagePreviewVisible, setIsImagePreviewVisible] = useState(false);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [isDescriptionModalVisible, setIsDescriptionModalVisible] =
    useState(false);
  const [isUpdateImageModalVisible, setIsUpdateImageModalVisible] =
    useState(false);

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedProductForImage, setSelectedProductForImage] = useState(null);
  const [fullImageUrl, setFullImageUrl] = useState("");
  const [descriptionText, setDescriptionText] = useState("");

  const [searchText, setSearchText] = useState("");
  const [filterBrand, setFilterBrand] = useState(undefined);
  const [filterShowroom, setFilterShowroom] = useState(undefined);
  const [filterStock, setFilterStock] = useState("all");

  const [refreshLoading, setRefreshLoading] = useState(false);

  const backendBaseURL = "https://cms.frankotrading.com";
  const isLoading =
    productsLoading ||
    brandsLoading ||
    showroomsLoading ||
    branchLoading ||
    refreshLoading;

  const normalizeName = useCallback((value) => {
    return String(value ?? "")
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase();
  }, []);

  const getImageUrl = useCallback(
    (imagePath) => {
      if (!imagePath) return "";
      const fileName = String(imagePath).split("\\").pop().split("/").pop();
      return `${backendBaseURL}/Media/Products_Images/${fileName}`;
    },
    [backendBaseURL]
  );

  const fetchInitialData = useCallback(async () => {
    try {
      await Promise.all([
        dispatch(fetchAllProducts()),
        dispatch(fetchBrands()),
        dispatch(fetchShowrooms()),
        dispatch(fetchBranchProducts()),
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
        dispatch(fetchBranchProducts()).unwrap(),
      ]);
      message.success("Data refreshed successfully");
    } catch (error) {
      message.error("Failed to refresh data");
    } finally {
      setRefreshLoading(false);
    }
  }, [dispatch]);

  const branchProductsByCode = useMemo(() => {
    const map = new Map();

    for (const item of branchProducts || []) {
      if (item?.productCode) {
        map.set(String(item.productCode).trim(), item);
      }
    }

    return map;
  }, [branchProducts]);

  const branchCodeByProductName = useMemo(() => {
    const map = new Map();

    for (const item of branchProducts || []) {
      const key = normalizeName(item?.productName);
      if (!key) continue;
      map.set(key, item?.productCode ?? null);
    }

    return map;
  }, [branchProducts, normalizeName]);

  const productsWithBranchCode = useMemo(() => {
    return (products || []).map((product) => {
      const manualProductId2 =
        product.ProductId2 ||
        product.productId2 ||
        product.productCode ||
        product.ProductCode ||
        product.product_Id2 ||
        product.product_Code ||
        null;

      const key = normalizeName(product?.productName);
      const matchedCode = key ? branchCodeByProductName.get(key) : null;
      const finalCode = manualProductId2 || matchedCode || null;
      const branchDetails = finalCode
        ? branchProductsByCode.get(String(finalCode).trim())
        : null;

      let codeSource = null;
      if (manualProductId2) codeSource = "manual";
      else if (matchedCode) codeSource = "matched";

      return {
        ...product,
        manualProductId2,
        branchProductCode: matchedCode,
        productId2Display: finalCode,
        branchProductDetails: branchDetails,
        codeSource,
        isValidBranchCode: !!branchDetails,
      };
    });
  }, [products, normalizeName, branchCodeByProductName, branchProductsByCode]);

  const { filteredProducts, productStats } = useMemo(() => {
    const q = searchText.trim().toLowerCase();

    const filtered = (productsWithBranchCode || []).filter((product) => {
      const searchMatch =
        !q ||
        [
          product.productName,
          product.showRoomName,
          product.brandName,
          product.description,
          product.productId2Display,
          product.manualProductId2,
          product.branchProductCode,
          product.productID,
        ].some((field) =>
          String(field ?? "").toLowerCase().includes(q)
        );

      const brandMatch = !filterBrand || product.brandName === filterBrand;
      const showroomMatch =
        !filterShowroom || product.showRoomName === filterShowroom;

      let stockMatch = true;
      if (filterStock === "in_stock") stockMatch = product.status == 1;
      if (filterStock === "out_of_stock") stockMatch = product.status == 0;

      return searchMatch && brandMatch && showroomMatch && stockMatch;
    });

    const sorted = [...filtered].sort(
      (a, b) => new Date(b.dateCreated || 0) - new Date(a.dateCreated || 0)
    );

    const stats = {
      total: productsWithBranchCode.length,
      filtered: filtered.length,
      inStock: productsWithBranchCode.filter((p) => p.status == 1).length,
      outOfStock: productsWithBranchCode.filter((p) => p.status == 0).length,
      withCode: productsWithBranchCode.filter((p) => !!p.productId2Display)
        .length,
      validCode: productsWithBranchCode.filter((p) => p.isValidBranchCode)
        .length,
    };

    return { filteredProducts: sorted, productStats: stats };
  }, [
    productsWithBranchCode,
    searchText,
    filterBrand,
    filterShowroom,
    filterStock,
  ]);

  const handleModalClose = useCallback(
    async (setter, shouldRefresh = false) => {
      setter(false);
      if (shouldRefresh) {
        try {
          await dispatch(fetchAllProducts()).unwrap();
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

  const handleViewProductDetails = useCallback((product) => {
    setSelectedProduct(product);
    setIsDetailModalVisible(true);
  }, []);

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
    [getImageUrl]
  );

  const exportToExcel = useCallback(() => {
    try {
      const exportData = filteredProducts.map((product, index) => ({
        "S/N": index + 1,
        "Product Name": product.productName || "",
        "Product ID": product.productID || "",
        "Product Code": product.productId2Display || "",
        "Code Source":
          product.codeSource === "manual"
            ? "Manual Entry"
            : product.codeSource === "matched"
            ? "Name Match"
            : "",
        "Valid Branch Code": product.isValidBranchCode ? "Yes" : "No",
        "Branch Stock":
          product.branchProductDetails?.quantity ||
          product.branchProductDetails?.stockQuantity ||
          "-",
        Description: product.description || "",
        "Price (₵)": parseFloat(product.price || 0).toFixed(2),
        "Old Price (₵)": product.oldPrice
          ? parseFloat(product.oldPrice).toFixed(2)
          : "",
        Brand: product.brandName || "",
        Category: product.categoryName || "",
        Showroom: product.showRoomName || "",
        Status: product.status == 1 ? "In Stock" : "Out of Stock",
        "Date Created": product.dateCreated
          ? new Date(product.dateCreated).toLocaleDateString()
          : "",
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      ws["!cols"] = [
        { wch: 5 },
        { wch: 30 },
        { wch: 12 },
        { wch: 20 },
        { wch: 15 },
        { wch: 15 },
        { wch: 12 },
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
  }, [filteredProducts]);

  const columns = useMemo(
    () => [
      {
        title: "Image",
        dataIndex: "productImage",
        key: "productImage",
        width: 80,
        fixed: "left",
        render: (imagePath, record) => {
          const imageUrl = getImageUrl(imagePath);

          return (
            <Avatar
              src={imageUrl}
              size={50}
              shape="square"
              style={{ cursor: "pointer", border: "1px solid #f0f0f0" }}
              onClick={() => handlePreviewImage(record.productImage)}
            />
          );
        },
      },
      {
        title: "Product Details",
        key: "productDetails",
        width: 220,
        render: (_, record) => {
          const hasCode = !!record.productId2Display;
          const isValid = record.isValidBranchCode;

          return (
            <div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>
                {record.productName}
              </div>

              <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>
                ID: {record.productID}
              </div>

              <div style={{ fontSize: 12 }}>
                <Space size="small">
                  <span style={{ color: "#666" }}>Product Code:</span>
                  {hasCode ? (
                    <Tooltip
                      title={
                        <div>
                          <div>Code: {record.productId2Display}</div>
                          <div>
                            Source:{" "}
                            {record.codeSource === "manual"
                              ? "Manual Entry"
                              : record.codeSource === "matched"
                              ? "Name Match"
                              : "Unknown"}
                          </div>
                        </div>
                      }
                    >
                      <Tag
                        color={isValid ? "green" : "orange"}
                        style={{
                          fontFamily: "monospace",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          cursor: "pointer",
                        }}
                      >
                        {record.productId2Display}
                        {isValid ? (
                          <CheckCircleOutlined />
                        ) : (
                          <WarningOutlined />
                        )}
                      </Tag>
                    </Tooltip>
                  ) : (
                    <Tag>Not Set</Tag>
                  )}
                </Space>
              </div>

              <div style={{ fontSize: 12, color: "#999", marginTop: 4 }}>
                {record.dateCreated
                  ? new Date(record.dateCreated).toLocaleDateString()
                  : "-"}
              </div>
            </div>
          );
        },
      },
      {
        title: "Price",
        dataIndex: "price",
        key: "price",
        width: 120,
        render: (price, record) => (
          <div>
            <div style={{ fontWeight: 600, color: "#ff4d4f" }}>
              ₵
              {parseFloat(price || 0).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            {record.oldPrice > 0 && (
              <div
                style={{
                  fontSize: 12,
                  color: "#999",
                  textDecoration: "line-through",
                }}
              >
                ₵
                {parseFloat(record.oldPrice).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            )}
          </div>
        ),
      },
      {
        title: "Brand & Category",
        key: "brandCategory",
        width: 160,
        render: (_, record) => (
          <div>
            <Tag color="red" style={{ marginBottom: 4 }}>
              {record.brandName || "-"}
            </Tag>
            <br />
            <Tag color="orange">{record.categoryName || "-"}</Tag>
          </div>
        ),
      },
      {
        title: "Showroom",
        dataIndex: "showRoomName",
        key: "showRoomName",
        width: 150,
        render: (value) => (
          <Tag color={value === "Products out of stock" ? "red" : "green"}>
            {value || "-"}
          </Tag>
        ),
      },
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        width: 110,
        render: (status) => (
          <Tag color={status == 1 ? "success" : "error"}>
            {status == 1 ? "In Stock" : "Out of Stock"}
          </Tag>
        ),
      },
      {
        title: "Actions",
        key: "actions",
        width: 130,
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
      getImageUrl,
      handlePreviewImage,
      handleUpdateProduct,
      handleUpdateProductImage,
      handleViewProductDetails,
    ]
  );

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
          Manage your product inventory, pricing, and availability
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
              title="Out of Stock"
              value={productStats.outOfStock}
              valueStyle={{ color: "#cf1322" }}
              prefix={<ShopOutlined style={{ color: "#cf1322" }} />}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Valid Branch Codes"
              value={productStats.validCode}
              prefix={<CheckCircleOutlined style={{ color: "#52c41a" }} />}
            />
          </Card>
        </Col>
      </Row>

      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={8}>
            <Input
              placeholder="Search products, brands, showrooms, product code..."
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
              {brands.map((brand) => (
                <Option key={brand.brandID} value={brand.brandName}>
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
              {showrooms.map((showroom) => (
                <Option key={showroom.showRoomID} value={showroom.showRoomName}>
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

          <Col xs={24} md={4}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAddProduct}
              style={{ backgroundColor: "#52c41a", borderColor: "#52c41a" }}
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
          rowKey={(record) => record.productID}
          loading={isLoading}
          scroll={{ x: 1400 }}
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
        open={isAddModalVisible}
        onClose={() => handleModalClose(setIsAddModalVisible, true)}
        brands={brands}
        showrooms={showrooms}
      />

      <UpdateProduct
        visible={isUpdateModalVisible}
        open={isUpdateModalVisible}
        onClose={() => handleModalClose(setIsUpdateModalVisible, true)}
        product={selectedProduct || {}}
        brands={brands}
        showrooms={showrooms}
      />

      <UpdateProductImage
        visible={isUpdateImageModalVisible}
        open={isUpdateImageModalVisible}
        onClose={() => handleModalClose(setIsUpdateImageModalVisible, true)}
        product={selectedProductForImage}
        productID={selectedProductForImage?.productID}
      />

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
        onCancel={() => setIsDetailModalVisible(false)}
        footer={null}
        centered
        width={700}
        title="Product Details"
      >
        {selectedProduct && (
          <div>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <img
                src={getImageUrl(selectedProduct.productImage)}
                alt={selectedProduct.productName}
                style={{
                  width: "100%",
                  maxHeight: 300,
                  objectFit: "cover",
                  borderRadius: 8,
                }}
              />
            </div>

            {(() => {
              const code = selectedProduct.productId2Display || "-";
              const isManual = selectedProduct.codeSource === "manual";
              const isValid = selectedProduct.isValidBranchCode;
              const branchDetails = selectedProduct.branchProductDetails;

              return (
                <div>
                  <h2
                    style={{
                      fontSize: 24,
                      fontWeight: 600,
                      marginBottom: 16,
                    }}
                  >
                    {selectedProduct.productName}
                  </h2>

                  {branchDetails && (
                    <Card
                      size="small"
                      style={{
                        marginBottom: 16,
                        backgroundColor: "#f6ffed",
                        border: "1px solid #b7eb8f",
                      }}
                    >
                      <Row gutter={[16, 8]}>
                        <Col span={24}>
                          <strong>🔗 Linked Branch Product</strong>
                        </Col>
                        <Col span={12}>
                          <strong>Branch Name:</strong>{" "}
                          {branchDetails.productName || "-"}
                        </Col>
                        <Col span={12}>
                          <strong>Branch Stock:</strong>{" "}
                          <Tag
                            color={
                              branchDetails.quantity > 0 ||
                              branchDetails.stockQuantity > 0
                                ? "green"
                                : "red"
                            }
                          >
                            {branchDetails.quantity ||
                              branchDetails.stockQuantity ||
                              0}
                          </Tag>
                        </Col>
                        {branchDetails.price && (
                          <Col span={12}>
                            <strong>Branch Price:</strong> ₵
                            {parseFloat(branchDetails.price).toFixed(2)}
                          </Col>
                        )}
                      </Row>
                    </Card>
                  )}

                  {isManual && !isValid && code !== "-" && (
                    <Card
                      size="small"
                      style={{
                        marginBottom: 16,
                        backgroundColor: "#fff7e6",
                        border: "1px solid #ffd591",
                      }}
                    >
                      <Space>
                        <WarningOutlined style={{ color: "#fa8c16" }} />
                        <span>
                          Manual product code "{code}" not found in branch
                          products
                        </span>
                      </Space>
                    </Card>
                  )}

                  <Row gutter={[16, 12]}>
                    <Col span={12}>
                      <strong>Product ID:</strong> {selectedProduct.productID}
                    </Col>
                    <Col span={12}>
                      <strong>Product Code:</strong>{" "}
                      <Tag
                        color={isValid ? "green" : code !== "-" ? "blue" : "default"}
                        style={{ fontFamily: "monospace" }}
                      >
                        {code}
                      </Tag>
                      {isManual && (
                        <Badge
                          count="Manual"
                          style={{
                            backgroundColor: "#1890ff",
                            fontSize: 10,
                            marginLeft: 8,
                          }}
                        />
                      )}
                    </Col>
                    <Col span={12}>
                      <strong>Category:</strong> {selectedProduct.categoryName}
                    </Col>
                    <Col span={12}>
                      <strong>Brand:</strong> {selectedProduct.brandName}
                    </Col>
                    <Col span={12}>
                      <strong>Showroom:</strong> {selectedProduct.showRoomName}
                    </Col>
                    <Col span={12}>
                      <strong>Date Created:</strong>{" "}
                      {selectedProduct.dateCreated
                        ? new Date(selectedProduct.dateCreated).toLocaleDateString()
                        : "-"}
                    </Col>
                    <Col span={12}>
                      <strong>Status:</strong>
                      <Tag
                        color={selectedProduct.status == 1 ? "success" : "error"}
                        style={{ marginLeft: 8 }}
                      >
                        {selectedProduct.status == 1
                          ? "In Stock"
                          : "Out of Stock"}
                      </Tag>
                    </Col>
                  </Row>

                  <div style={{ marginTop: 16 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        marginBottom: 16,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 20,
                          fontWeight: 600,
                          color: "#ff4d4f",
                          marginRight: 16,
                        }}
                      >
                        ₵
                        {parseFloat(selectedProduct.price || 0).toLocaleString(
                          "en-US",
                          { minimumFractionDigits: 2 }
                        )}
                      </span>

                      {selectedProduct.oldPrice > 0 && (
                        <span
                          style={{
                            fontSize: 16,
                            textDecoration: "line-through",
                            color: "#999",
                          }}
                        >
                          ₵
                          {parseFloat(selectedProduct.oldPrice).toLocaleString(
                            "en-US",
                            { minimumFractionDigits: 2 }
                          )}
                        </span>
                      )}
                    </div>
                  </div>

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
                        handleDescriptionClick(selectedProduct.description)
                      }
                    >
                      {selectedProduct.description}
                    </p>
                  </div>
                </div>
              );
            })()}
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

export default AdminProducts;