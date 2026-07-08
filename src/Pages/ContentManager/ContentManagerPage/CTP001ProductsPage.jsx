import { useState, useEffect, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Table,
  Card,
  Button,
  Input,
  InputNumber,
  Space,
  Tag,
  Avatar,
  Modal,
  Row,
  Col,
  Statistic,
  Empty,
  Alert,
  Tooltip,
  message,
  Typography,
  List,
  Spin,
  Form,
} from "antd";
import {
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined,
  DatabaseOutlined,
  SwapOutlined,
  LinkOutlined,
  CheckCircleTwoTone,
} from "@ant-design/icons";
import {
  getCTP001Products,
  getMergedProducts,
  selectCTP001Products,
  selectCTP001Pagination,
  selectCTP001ProductsLoading,
  selectMergedProductMap,
  selectCTP001ProductsError,
  clearSpecificError,
  selectMergedProducts,
  selectMergedProductsLoading,
} from "../../../Redux/Slice/ctp001Slice";
import {
  fetchAllProducts,
  createProductVariantAndMerge,
  fetchAllCTP002ProductVariants,
} from "../../../Redux/Slice/productSlice";

const { Text, Title } = Typography;

const BACKEND_BASE_URL = "https://cms.frankotrading.com";

const wrapStyle = { wordBreak: "break-word", whiteSpace: "normal" };

const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  const fileName = String(imagePath).split("\\").pop().split("/").pop();
  return fileName
    ? `${BACKEND_BASE_URL}/Media/Products_Images/${fileName}`
    : null;
};

const getRowKey = (record, index) =>
  record?.productID || record?.Productid || record?.productId || `row-${index}`;

const formatPrice = (price) => {
  const n = parseFloat(price || 0);
  return Number.isFinite(n)
    ? n.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : "0.00";
};

const normalize = (v) => (v == null ? "" : String(v).trim());

const getCTP001Id = (p) => {
  if (!p) return "";
  return normalize(
    p.productID ?? p.Productid ?? p.productId ?? p.ProductId ??
    p.ProductID ?? p.id ?? p.Id ?? p.ID ?? p.ctP001ProductId ??
    p.CTP001ProductId ?? p.ctp001ProductId ?? ""
  );
};

const getCTP002Id = (p) => {
  if (!p) return "";
  return normalize(
    p.Productid ?? p.productID ?? p.ProductID ?? p.productId ??
    p.ProductId ?? p.id ?? p.Id ?? p.ID ?? p.ctP002ProductId ??
    p.CTP002ProductId ?? p.ctp002ProductId ?? ""
  );
};

const getCTP001Name = (p) =>
  p?.productName || p?.ProductName || p?.product_name || p?.name || "";

const getCTP001Image = (p) =>
  p?.productImage || p?.ProductImage || p?.image || "";

const getCTP001Color = (p) =>
  p?.Color || p?.color || p?.productColor || "";

const getCTP001Price = (p) => {
  const n = Number(
    p?.sellingPrice1 ?? p?.SellingPrice1 ?? p?.price ?? p?.Price ?? 0
  );
  return Number.isFinite(n) ? n : 0;
};

const getCTP002Name = (p) => p?.productName || p?.ProductName || "";

const getCTP002Image = (p) =>
  p?.productImage || p?.ProductImage || p?.image || "";

const getCTP002Price = (p) => {
  const n = Number(p?.price ?? p?.Price ?? 0);
  return Number.isFinite(n) ? n : 0;
};

const CTP001ProductsPage = () => {
  const dispatch = useDispatch();

  /* ─── Redux selectors ─────────────────────────────── */
  const ctp001Products = useSelector(selectCTP001Products);
  const ctp001Pagination = useSelector(selectCTP001Pagination);
  const isFetchingCTP001 = useSelector(selectCTP001ProductsLoading);
  const fetchError = useSelector(selectCTP001ProductsError);

  const mergedProductMap = useSelector(selectMergedProductMap);
  const mergedProducts = useSelector(selectMergedProducts);
  const mergedLoading = useSelector(selectMergedProductsLoading);

  const websiteProducts = useSelector(
    (state) => state.products?.products || []
  );
  const ctp002ProductVariants = useSelector(
    (state) => state.products?.ctp002ProductVariants || {}
  );

  /* ─── Local state ──────────────────────────────────── */
  const [searchText, setSearchText] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [mergeModalVisible, setMergeModalVisible] = useState(false);
  const [mergedModalVisible, setMergedModalVisible] = useState(false);

  const [mergeTargetProduct, setMergeTargetProduct] = useState(null);
  const [selectedWebsiteCandidate, setSelectedWebsiteCandidate] =
    useState(null);
  const [websiteSearchText, setWebsiteSearchText] = useState("");

  const [isMerging, setIsMerging] = useState(false);
  const [isLoadingWebsite, setIsLoadingWebsite] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Variant details (with price)
  const [variantName, setVariantName] = useState("");
  const [variantColor, setVariantColor] = useState("");
  const [variantSize, setVariantSize] = useState("");
  const [variantImageUrl, setVariantImageUrl] = useState("");
  const [variantPrice, setVariantPrice] = useState(0);

  /* ─── Combined linked map ──────────────────────────── */
  const combinedLinkedMap = useMemo(() => {
    const map = {};

    if (mergedProductMap && typeof mergedProductMap === "object") {
      Object.entries(mergedProductMap).forEach(([k, v]) => {
        if (k && v) map[normalize(k)] = normalize(v);
      });
    }

    if (ctp002ProductVariants && typeof ctp002ProductVariants === "object") {
      try {
        Object.entries(ctp002ProductVariants).forEach(
          ([parentId, variants]) => {
            if (!Array.isArray(variants)) return;
            variants.forEach((v) => {
              if (!v || typeof v !== "object") return;
              const ctp001Id = normalize(
                v.ctP001ProductId ??
                  v.CTP001ProductId ??
                  v.ctp001ProductId ??
                  ""
              );
              if (ctp001Id && !map[ctp001Id]) {
                map[ctp001Id] = normalize(parentId);
              }
            });
          }
        );
      } catch {
        /* defensive */
      }
    }

    return map;
  }, [mergedProductMap, ctp002ProductVariants]);

  const getLinkedId = useCallback(
    (ctp001Id) => {
      if (!ctp001Id) return null;
      const key = normalize(ctp001Id);
      return combinedLinkedMap[key] || null;
    },
    [combinedLinkedMap]
  );

  /* ─── Initial data load ────────────────────────────── */
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    dispatch(getCTP001Products({ pageNumber: 1, recordPerPage: 2000 }));
    dispatch(getMergedProducts());
    dispatch(fetchAllCTP002ProductVariants());

    setIsLoadingWebsite(true);
    dispatch(fetchAllProducts()).finally(() => setIsLoadingWebsite(false));
  }, [dispatch]);

  /* ─── Refresh ──────────────────────────────────────── */
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    Promise.allSettled([
      dispatch(
        getCTP001Products({
          pageNumber: ctp001Pagination.pageNumber,
          recordPerPage: ctp001Pagination.recordPerPage,
        })
      ),
      dispatch(getMergedProducts()),
      dispatch(fetchAllCTP002ProductVariants()),
      dispatch(fetchAllProducts()),
    ])
      .then(() => message.success("Refreshed!"))
      .catch(() => message.error("Some data failed to refresh"))
      .finally(() => setIsRefreshing(false));
  }, [
    dispatch,
    ctp001Pagination.pageNumber,
    ctp001Pagination.recordPerPage,
  ]);

  const handleViewMergedProducts = useCallback(() => {
    setMergedModalVisible(true);
    dispatch(getMergedProducts());
  }, [dispatch]);

  const handleViewDetails = useCallback((product) => {
    setSelectedProduct(product);
    setDetailModalVisible(true);
  }, []);

  /* ─── Open link modal — pre-fills price from source product ── */
  const handleOpenMergeModal = useCallback((product) => {
    const sourcePrice = getCTP001Price(product);

    setMergeTargetProduct(product);
    setSelectedWebsiteCandidate(null);
    setWebsiteSearchText("");
    setVariantName(getCTP001Name(product));
    setVariantColor(getCTP001Color(product));
    setVariantSize("");
    setVariantImageUrl(getImageUrl(getCTP001Image(product)) || "");
    setVariantPrice(sourcePrice); // ✅ pre-fill price
    setMergeModalVisible(true);
  }, []);

  const handleCloseMergeModal = useCallback(() => {
    setMergeModalVisible(false);
    setMergeTargetProduct(null);
    setSelectedWebsiteCandidate(null);
    setWebsiteSearchText("");
    setVariantName("");
    setVariantColor("");
    setVariantSize("");
    setVariantImageUrl("");
    setVariantPrice(0);
  }, []);

  const handleCloseDetailModal = useCallback(() => {
    setDetailModalVisible(false);
    setSelectedProduct(null);
  }, []);

  const handleTableChange = useCallback(
    (pag) => {
      dispatch(
        getCTP001Products({
          pageNumber: pag.current,
          recordPerPage: pag.pageSize,
        })
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [dispatch]
  );

  /* ─── Confirm link — includes price in payload ─────── */
const handleConfirmLink = async () => {
  if (!mergeTargetProduct || !selectedWebsiteCandidate) {
    message.warning("Please select a Website Product to link with.");
    return;
  }
  if (!variantName.trim() || !variantColor.trim()) {
    message.error("Variant Name and Color are required.");
    return;
  }
  if (variantPrice == null || Number(variantPrice) < 0) {
    message.error("Variant Price must be 0 or greater.");
    return;
  }
  if (isMerging) return;

  setIsMerging(true);
  const hideLoading = message.loading("Linking products...", 0);

  try {
    const ctP001ProductId = getCTP001Id(mergeTargetProduct);
    const ctP002ProductId = getCTP002Id(selectedWebsiteCandidate);

    const variantPayload = {
      ctP002ProductId,
      variants: [
        {
          ctP001ProductId,
          name: variantName.trim(),
          color: variantColor.trim(),
          size: variantSize.trim(),
          imageUrl: variantImageUrl.trim(),
          price: Number(variantPrice),
          createdAt: new Date().toISOString(),
        },
      ],
    };

    const resultAction = await dispatch(
      createProductVariantAndMerge(variantPayload)
    );

    hideLoading();

    if (createProductVariantAndMerge.fulfilled.match(resultAction)) {
      const msg =
        resultAction.payload?.raw?.responseMessage ||
        "Products linked successfully!";
      message.success(msg);

      // ✅ CLOSE THE MODAL FIRST — don't wait for the refresh calls
      handleCloseMergeModal();

      // ✅ Refresh data in the background (fire-and-forget)
      //     Each dispatch returns a promise, but we don't await it
      //     so the modal can close immediately.
      dispatch(getMergedProducts()).catch(() => null);
      dispatch(fetchAllProducts()).catch(() => null);
      // ❌ REMOVED: dispatch(fetchAllCTP002ProductVariants())
      //     This one was the slow call (returns thousands of variants).
      //     It's only needed for the admin UpdateProduct page, not here.
    } else {
      const errorMsg =
        resultAction.payload?.raw?.responseMessage ||
        resultAction.payload ||
        resultAction.error?.message ||
        "Failed to link products";
      message.error(
        typeof errorMsg === "string" ? errorMsg : "Failed to link products"
      );
    }
  } catch (err) {
    hideLoading();
    message.error(err?.message || "Failed to link products");
  } finally {
    setIsMerging(false);
  }
};

  /* ─── Filtered products ────────────────────────────── */
  const filteredProducts = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return ctp001Products || [];
    return (ctp001Products || []).filter((product) =>
      [
        product?.productName,
        product?.ProductName,
        product?.productID,
        product?.Productid,
        product?.productId,
        product?.description,
        product?.brandName,
        product?.categoryName,
        product?.showRoomName,
        product?.bCode,
      ].some((field) => String(field ?? "").toLowerCase().includes(q))
    );
  }, [ctp001Products, searchText]);

  const displayedCandidates = useMemo(() => {
    if (!websiteProducts.length || !mergeTargetProduct) return [];

    const mapped = websiteProducts.map((product) => ({
      product,
      productId: getCTP002Id(product),
      productName: getCTP002Name(product),
      productPrice: getCTP002Price(product),
    }));

    const result = websiteSearchText
      ? mapped.filter(
          (item) =>
            item.productName
              .toLowerCase()
              .includes(websiteSearchText.toLowerCase()) ||
            String(item.productId).includes(websiteSearchText)
        )
      : mapped;

    return result.slice(0, 200);
  }, [websiteProducts, websiteSearchText, mergeTargetProduct]);

  const stats = useMemo(
    () => ({
      total: ctp001Pagination.total || (ctp001Products || []).length,
      displayed: filteredProducts.length,
      mergedCount: Object.keys(combinedLinkedMap).length,
    }),
    [ctp001Products, filteredProducts, ctp001Pagination, combinedLinkedMap]
  );

  /* ─── Table columns ────────────────────────────────── */
  const columns = useMemo(
    () => [
      {
        title: "Product Details",
        key: "details",
        render: (_, record) => {
          const id = getCTP001Id(record);
          const websiteId = getLinkedId(id);
          return (
            <div style={wrapStyle}>
              <div style={{ fontWeight: 600, marginBottom: 2 }}>
                {getCTP001Name(record) || "-"}
                {websiteId && (
                  <CheckCircleTwoTone
                    twoToneColor="#52c41a"
                    style={{ marginLeft: 6, fontSize: 14 }}
                  />
                )}
              </div>
              <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>
                ID: {id || "-"}
                {websiteId && (
                  <Tag
                    color="success"
                    style={{ marginLeft: 6, fontSize: 10 }}
                  >
                    Linked → {websiteId}
                  </Tag>
                )}
              </div>
              {record?.brandName && (
                <Tag color="blue" style={{ fontSize: 11, marginRight: 4 }}>
                  {record.brandName}
                </Tag>
              )}
              {record?.categoryName && (
                <Tag color="orange" style={{ fontSize: 11 }}>
                  {record.categoryName}
                </Tag>
              )}
            </div>
          );
        },
      },
      {
        title: "Price",
        key: "sellingPrice1",
        width: 130,
        responsive: ["sm"],
        render: (_, record) => {
          const price =
            record?.sellingPrice1 || record?.price || 0;
          const oldPrice = record?.oldPrice;
          return (
            <div>
              <div
                style={{
                  fontWeight: 600,
                  color: "#ff4d4f",
                  fontSize: 15,
                }}
              >
                ₵{formatPrice(price)}
              </div>
              {oldPrice > 0 && (
                <div
                  style={{
                    fontSize: 12,
                    color: "#999",
                    textDecoration: "line-through",
                  }}
                >
                  ₵{formatPrice(oldPrice)}
                </div>
              )}
            </div>
          );
        },
      },
      {
        title: "Link Status",
        key: "mergeStatus",
        width: 130,
        responsive: ["md"],
        render: (_, record) => {
          const id = getCTP001Id(record);
          const websiteId = getLinkedId(id);
          return websiteId ? (
            <Tag color="success" icon={<LinkOutlined />}>
              Linked
            </Tag>
          ) : (
            <Tag color="default">Not Linked</Tag>
          );
        },
      },
      {
        title: "Actions",
        key: "actions",
        width: 110,
        align: "center",
        render: (_, record) => {
          const id = getCTP001Id(record);
          const isLinked = Boolean(getLinkedId(id));
          return (
            <Space size="small" wrap>
              <Tooltip title="View Details">
                <Button
                  type="text"
                  icon={<EyeOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewDetails(record);
                  }}
                />
              </Tooltip>
              <Tooltip title={isLinked ? "Re-link" : "Link to Website Product"}>
                <Button
                  type="text"
                  icon={<SwapOutlined />}
                  style={{ color: "#722ed1" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenMergeModal(record);
                  }}
                />
              </Tooltip>
            </Space>
          );
        },
      },
    ],
    [getLinkedId, handleViewDetails, handleOpenMergeModal]
  );

  /* ─── Detail modal content ─────────────────────────── */
  const detailContent = useMemo(() => {
    if (!selectedProduct) return null;
    const imageUrl = getImageUrl(getCTP001Image(selectedProduct));
    const price =
      selectedProduct?.sellingPrice1 || selectedProduct?.price || 0;
    const id = getCTP001Id(selectedProduct);
    const websiteId = getLinkedId(id);

    return (
      <div>
        {imageUrl && (
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <img
              src={imageUrl}
              alt={getCTP001Name(selectedProduct)}
              style={{
                width: "100%",
                maxHeight: 250,
                objectFit: "cover",
                borderRadius: 8,
              }}
            />
          </div>
        )}
        <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 16 }}>
          {getCTP001Name(selectedProduct) || "Product"}
        </h2>
        <Row gutter={[16, 12]}>
          <Col xs={24} sm={12}>
            <strong>Sales Mate ID:</strong>{" "}
            <span style={{ fontFamily: "monospace" }}>{id || "-"}</span>
          </Col>
          <Col xs={24} sm={12}>
            <strong>B-Code:</strong>{" "}
            <Tag color="purple">{selectedProduct?.bCode || "Not Set"}</Tag>
          </Col>
          {websiteId && (
            <Col span={24}>
              <Alert
                type="success"
                showIcon
                icon={<LinkOutlined />}
                message={`Linked to Website ID: ${websiteId}`}
              />
            </Col>
          )}
        </Row>
        <div style={{ marginTop: 16 }}>
          <div
            style={{ fontSize: 28, fontWeight: 700, color: "#ff4d4f" }}
          >
            ₵{formatPrice(price)}
          </div>
        </div>
        {selectedProduct?.description && (
          <div style={{ marginTop: 16 }}>
            <strong>Description:</strong>
            <p style={{ marginTop: 8, lineHeight: 1.6, color: "#666" }}>
              {selectedProduct.description}
            </p>
          </div>
        )}
      </div>
    );
  }, [selectedProduct, getLinkedId]);

  const isLoadingTable = isFetchingCTP001 || isRefreshing;

  /* ─── Render ───────────────────────────────────────── */
  return (
    <div
      style={{
        minHeight: "100vh",
        padding: 24,
        backgroundColor: "#fff",
        boxSizing: "border-box",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, marginBottom: 4 }}>
          Sales Mate Products
        </h1>
        <p style={{ color: "#8c8c8c", margin: 0 }}>
          Manage inventory and link to Website Products.
        </p>
      </div>

      {fetchError && (
        <Alert
          message={fetchError}
          type="error"
          showIcon
          closable
          style={{ marginBottom: 16 }}
          onClose={() => dispatch(clearSpecificError("ctp001Products"))}
        />
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={8}>
          <Card size="small" hoverable>
            <Statistic
              title="Total"
              value={stats.total}
              prefix={<DatabaseOutlined style={{ color: "#1890ff" }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small" hoverable>
            <Statistic
              title="Displayed"
              value={stats.displayed}
              prefix={<SearchOutlined style={{ color: "#722ed1" }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small" hoverable>
            <Statistic
              title="Linked"
              value={stats.mergedCount}
              valueStyle={{ color: "#52c41a" }}
              prefix={<LinkOutlined style={{ color: "#52c41a" }} />}
            />
          </Card>
        </Col>
      </Row>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 12]} align="middle" justify="space-between">
          <Col xs={24} md={10}>
            <Input
              placeholder="Search..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} md={14}>
            <Space wrap style={{ width: "100%", justifyContent: "flex-end" }}>
              <Button
                icon={<ReloadOutlined />}
                onClick={handleRefresh}
                loading={isRefreshing}
              >
                Refresh
              </Button>
              <Button
                icon={<LinkOutlined />}
                onClick={handleViewMergedProducts}
                loading={mergedLoading}
              >
                View Linked
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card>
        <Table
          dataSource={filteredProducts}
          columns={columns}
          rowKey={getRowKey}
          loading={isLoadingTable}
          tableLayout="fixed"
          locale={{
            emptyText: isLoadingTable ? (
              <Spin size="large" />
            ) : (
              <Empty description="No products found" />
            ),
          }}
          pagination={{
            current: ctp001Pagination.pageNumber,
            pageSize: ctp001Pagination.recordPerPage || 2000,
            total: ctp001Pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            pageSizeOptions: ["2000", "3000", "4000"],
            showTotal: (total, range) =>
              `${range[0]}–${range[1]} of ${total}`,
          }}
          onChange={handleTableChange}
          size="small"
          bordered
        />
      </Card>

      {/* Detail modal */}
      <Modal
        open={detailModalVisible}
        onCancel={handleCloseDetailModal}
        footer={<Button onClick={handleCloseDetailModal}>Close</Button>}
        width={700}
        centered
        title="Product Details"
        destroyOnClose
      >
        {detailContent}
      </Modal>

      {/* Merged products modal */}
      <Modal
        open={mergedModalVisible}
        onCancel={() => setMergedModalVisible(false)}
        footer={null}
        width={900}
        centered
        destroyOnClose
        title={
          <Space>
            <LinkOutlined style={{ color: "#52c41a" }} />
            <span>Linked Products</span>
          </Space>
        }
      >
        <Table
          dataSource={mergedProducts}
          loading={mergedLoading}
          rowKey={(record, index) =>
            `${getCTP001Id(record) || "x"}-${getCTP002Id(record) || "y"}-${index}`
          }
          tableLayout="fixed"
          locale={{
            emptyText: mergedLoading ? (
              <Spin />
            ) : (
              <Empty description="No linked products" />
            ),
          }}
          columns={[
            {
              title: "Sales Mate Product",
              key: "ctP001ProductName",
              render: (_, record) => (
                <Text strong style={wrapStyle}>
                  {record?.ctP001ProductName ||
                    record?.CTP001ProductName ||
                    "-"}
                </Text>
              ),
            },
            {
              title: "Sales Mate ID",
              key: "ctP001ProductId",
              render: (_, record) => (
                <Tag color="blue">{getCTP001Id(record) || "-"}</Tag>
              ),
            },
            {
              title: "Website Product",
              key: "ctP002ProductName",
              render: (_, record) => (
                <Text strong style={wrapStyle}>
                  {record?.ctP002ProductName ||
                    record?.CTP002ProductName ||
                    "-"}
                </Text>
              ),
            },
            {
              title: "Website ID",
              key: "ctP002ProductId",
              render: (_, record) => (
                <Tag color="purple">{getCTP002Id(record) || "-"}</Tag>
              ),
            },
          ]}
          size="small"
          bordered
        />
      </Modal>

      {/* ═══════ LINK MODAL (with PRICE) ═══════ */}
      <Modal
        open={mergeModalVisible}
        onCancel={handleCloseMergeModal}
        title={
          <Space>
            <SwapOutlined style={{ color: "#722ed1" }} />
            <span>Link Sales Mate → Website Product</span>
          </Space>
        }
        width={800}
        centered
        destroyOnClose={false}
        maskClosable={false}
        footer={null}
      >
        {/* Source product card with price */}
        {mergeTargetProduct && (
          <Card
            size="small"
            style={{ marginBottom: 16, backgroundColor: "#fafafa" }}
            title={
              <Space>
                <Avatar
                  src={getImageUrl(getCTP001Image(mergeTargetProduct))}
                  size={50}
                  shape="square"
                />
                <div>
                  <Title level={5} style={{ margin: 0 }}>
                    {getCTP001Name(mergeTargetProduct)}
                  </Title>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Sales Mate ID: {getCTP001Id(mergeTargetProduct)}
                  </Text>
                </div>
              </Space>
            }
          >
            <Row gutter={[12, 8]}>
              <Col xs={24} sm={12}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Salesmate Price
                </Text>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 600,
                    color: "#722ed1",
                  }}
                >
                  ₵{formatPrice(getCTP001Price(mergeTargetProduct))}
                </div>
              </Col>
            
            </Row>
          </Card>
        )}

        {/* Website product picker */}
        <div
          style={{
            marginBottom: 8,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <Text strong>Select Website Product (CTP002):</Text>
          <Input
            placeholder="Search name or ID..."
            size="small"
            prefix={<SearchOutlined />}
            value={websiteSearchText}
            onChange={(e) => setWebsiteSearchText(e.target.value)}
            style={{ width: 250 }}
            allowClear
          />
        </div>

        <List
          loading={isLoadingWebsite}
          bordered
          style={{ marginBottom: 16, maxHeight: 220, overflowY: "auto" }}
          locale={{
            emptyText: (
              <Empty
                description={
                  websiteProducts.length ? "No matches." : "Loading..."
                }
              />
            ),
          }}
          dataSource={displayedCandidates}
          renderItem={(item) => {
            const isSelected =
              selectedWebsiteCandidate &&
              getCTP002Id(selectedWebsiteCandidate) === item.productId;
            return (
              <List.Item
                onClick={() => setSelectedWebsiteCandidate(item.product)}
                style={{
                  cursor: "pointer",
                  backgroundColor: isSelected ? "#f6ffed" : "transparent",
                  borderLeft: isSelected
                    ? "3px solid #52c41a"
                    : "3px solid transparent",
                  padding: "10px 12px",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <Avatar
                    src={getImageUrl(getCTP002Image(item.product))}
                    size={45}
                    shape="square"
                  />
                  <div style={{ flex: "1 1 240px", minWidth: 0 }}>
                    <div style={{ fontWeight: 600, ...wrapStyle }}>
                      {item.productName}
                    </div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      ID: {item.productId}
                    </Text>
                    <br />
                    <Text type="secondary">
                      ₵{formatPrice(item.productPrice)}
                    </Text>
                  </div>
                  <div style={{ width: 24, textAlign: "center" }}>
                    {isSelected && (
                      <CheckCircleTwoTone
                        twoToneColor="#52c41a"
                        style={{ fontSize: 18 }}
                      />
                    )}
                  </div>
                </div>
              </List.Item>
            );
          }}
        />

        {/* Selected pair summary with prices */}
        {selectedWebsiteCandidate && mergeTargetProduct && (
          <Alert
            style={{ marginBottom: 16 }}
            type="success"
            showIcon
            icon={<LinkOutlined />}
            message="Selected pair"
            description={
              <div>
                <div>
                  <strong>Selected Website Product:</strong>{" "}
                  {getCTP002Name(selectedWebsiteCandidate)} (ID:{" "}
                  {getCTP002Id(selectedWebsiteCandidate)}) — ₵
                  {formatPrice(getCTP002Price(selectedWebsiteCandidate))}
                </div>
                <div>
                  <strong>Salesmate Product:</strong>{" "}
                  {getCTP001Name(mergeTargetProduct)} (ID:{" "}
                  {getCTP001Id(mergeTargetProduct)}) — ₵
                  {formatPrice(getCTP001Price(mergeTargetProduct))}
                </div>
              </div>
            }
          />
        )}

        {/* Variant details form — WITH PRICE */}
        <Card
          size="small"
          title="Variant Details (sent to backend)"
          style={{ marginBottom: 16 }}
        >
          <Form layout="vertical">
            <Row gutter={8}>
              <Col span={12}>
                <Form.Item
                  label="Name *"
                  required
                  style={{ marginBottom: 8 }}
                >
                  <Input
                    placeholder="Variant name"
                    value={variantName}
                    onChange={(e) => setVariantName(e.target.value)}
                  />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  label="Color *"
                  required
                  style={{ marginBottom: 8 }}
                >
                  <Input
                    placeholder="e.g., Red"
                    value={variantColor}
                    onChange={(e) => setVariantColor(e.target.value)}
                  />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  label="Size"
                  style={{ marginBottom: 8 }}
                >
                  <Input
                    placeholder="e.g., XL"
                    value={variantSize}
                    onChange={(e) => setVariantSize(e.target.value)}
                  />
                </Form.Item>
              </Col>
            </Row>

            
          </Form>
        </Card>

        {/* Footer buttons */}
        <div
          style={{
            marginTop: 4,
            paddingTop: 16,
            borderTop: "1px solid #f0f0f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <div>
            {selectedWebsiteCandidate && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                Will create link with variant price{" "}
                <strong style={{ color: "#52c41a" }}>
                  ₵{formatPrice(variantPrice)}
                </strong>
              </Text>
            )}
          </div>
          <Space>
            <Button onClick={handleCloseMergeModal}>Cancel</Button>
            <Button
              type="primary"
              icon={<LinkOutlined />}
              loading={isMerging}
              disabled={!selectedWebsiteCandidate || isMerging}
              style={{
                backgroundColor:
                  selectedWebsiteCandidate && !isMerging
                    ? "#52c41a"
                    : undefined,
                borderColor:
                  selectedWebsiteCandidate && !isMerging
                    ? "#52c41a"
                    : undefined,
              }}
              onClick={handleConfirmLink}
            >
              Confirm Link (₵{formatPrice(variantPrice)})
            </Button>
          </Space>
        </div>
      </Modal>
    </div>
  );
};

export default CTP001ProductsPage;