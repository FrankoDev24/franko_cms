import { useState, useEffect, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Table,
  Card,
  Button,
  Input,
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
  Progress,
  Typography,
  List,
  Spin,
  Popconfirm,
  Badge,
} from "antd";
import {
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined,
  DatabaseOutlined,
  SwapOutlined,
  LinkOutlined,
  CheckCircleTwoTone,
  DisconnectOutlined,
  EditOutlined,
} from "@ant-design/icons";
import {
  getCTP001Products,
  mergeSingleCTP001WithCTP002,
  updateMergedProduct,
  unmergeCTP001Product,
  clearSimilarCandidates,
  removeManualMerge,
  selectCTP001Products,
  selectCTP001Pagination,
  selectCTP001ProductsLoading,
  selectSingleMergeLoading,
  selectUpdateMergeLoading,
  selectUnmergeLoading,
  selectMergedProductMap,
  selectMergedProducts,
  selectCTP001ProductsError,
  selectMergeActionError,
  selectSingleMergeError,
  selectUpdateMergeError,
  selectUnmergeError,
  clearSpecificError,
  getSimilarity,
  getMergedProducts,
  selectMergedProductsLoading,
  MERGE_OPERATION,
} from "../../../Redux/Slice/ctp001Slice";
import { fetchAllProducts } from "../../../Redux/Slice/productSlice";

const { Text, Title } = Typography;

const BACKEND_BASE_URL = "https://cms.frankotrading.com";

const wrapStyle = { wordBreak: "break-word", whiteSpace: "normal" };

const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  const fileName = String(imagePath).split("\\").pop().split("/").pop();
  if (!fileName) return null;
  return `${BACKEND_BASE_URL}/Media/Products_Images/${fileName}`;
};

const getRowKey = (record, index) =>
  record?.productID || record?.Productid || record?.productId || `row-${index}`;

const formatPrice = (price) =>
  parseFloat(price || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const getProductId = (product) =>
  product?.productID ||
  product?.Productid ||
  product?.productId ||
  product?.ProductId ||
  product?.id ||
  "";

const getProductName = (product) => product?.productName || product?.ProductName || "";
const getProductPrice = (product) => Number(product?.sellingPrice1 || product?.price || 0);

/* ══════════════════════════════════════════
   MODE: which operation the merge modal is doing
══════════════════════════════════════════ */
const MODAL_MODE = {
  MERGE: "merge",   // brand new link
  UPDATE: "update", // change existing link
};

const CTP001ProductsPage = () => {
  const dispatch = useDispatch();

  /* ── Selectors ── */
  const products = useSelector(selectCTP001Products);
  const pagination = useSelector(selectCTP001Pagination);
  const mergedProductMap = useSelector(selectMergedProductMap);
  const mergedProducts = useSelector(selectMergedProducts);
  const mergedLoading = useSelector(selectMergedProductsLoading);

  const isFetching = useSelector(selectCTP001ProductsLoading);
  const isSingleMerging = useSelector(selectSingleMergeLoading);
  const isUpdating = useSelector(selectUpdateMergeLoading);
  const isUnmerging = useSelector(selectUnmergeLoading);

  const fetchError = useSelector(selectCTP001ProductsError);
  const mergeError = useSelector(selectMergeActionError);
  const singleMergeError = useSelector(selectSingleMergeError);
  const updateMergeError = useSelector(selectUpdateMergeError);
  const unmergeError = useSelector(selectUnmergeError);

  const websiteProducts = useSelector((state) => state.products?.products || []);
  const websiteLoading = useSelector((state) => state.products?.loading);

  /* ── Local state ── */
  const [searchText, setSearchText] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [mergeModalVisible, setMergeModalVisible] = useState(false);
  const [mergedModalVisible, setMergedModalVisible] = useState(false);

  // Modal mode: "merge" or "update"
  const [modalMode, setModalMode] = useState(MODAL_MODE.MERGE);
  const [mergeTargetProduct, setMergeTargetProduct] = useState(null);
  const [selectedWebsiteCandidate, setSelectedWebsiteCandidate] = useState(null);
  const [websiteSearchText, setWebsiteSearchText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [websiteProductsRequested, setWebsiteProductsRequested] = useState(false);

  /* ── Bootstrap ── */
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    dispatch(getCTP001Products({ pageNumber: 1, recordPerPage: 2000 }));
    dispatch(getMergedProducts());
  }, [dispatch]);

  useEffect(() => {
    if (!websiteProductsRequested && !websiteProducts.length && !websiteLoading) {
      setWebsiteProductsRequested(true);
      dispatch(fetchAllProducts());
    }
  }, [dispatch, websiteProductsRequested, websiteProducts.length, websiteLoading]);

  /* ── Handlers ── */
  const handleRefresh = useCallback(() => {
    dispatch(
      getCTP001Products({
        pageNumber: pagination.pageNumber,
        recordPerPage: pagination.recordPerPage,
      })
    )
      .unwrap()
      .then(() => message.success("Refreshed!"))
      .catch((err) => message.error(typeof err === "string" ? err : "Failed to refresh"));

    dispatch(getMergedProducts());
  }, [dispatch, pagination.pageNumber, pagination.recordPerPage]);

  const handleViewMergedProducts = useCallback(() => {
    setMergedModalVisible(true);
    dispatch(getMergedProducts());
  }, [dispatch]);

  const handleViewDetails = useCallback((product) => {
    setSelectedProduct(product);
    setDetailModalVisible(true);
  }, []);

  // Opens the merge modal. mode = MODAL_MODE.MERGE | MODAL_MODE.UPDATE
  const openMergeModal = useCallback(
    (product, mode = MODAL_MODE.MERGE) => {
      const openModal = () => {
        setMergeTargetProduct(product);
        setModalMode(mode);
        setSelectedWebsiteCandidate(null);
        setWebsiteSearchText("");
        setMergeModalVisible(true);
      };

      if (!websiteProducts.length && !websiteLoading) {
        dispatch(fetchAllProducts())
          .unwrap()
          .then(openModal)
          .catch(() => {
            openModal();
            message.error("Failed to load Website Products.");
          });
      } else {
        openModal();
      }
    },
    [dispatch, websiteProducts.length, websiteLoading]
  );

  const handleOpenMergeModal = useCallback(
    (product) => openMergeModal(product, MODAL_MODE.MERGE),
    [openMergeModal]
  );

  const handleOpenUpdateModal = useCallback(
    (product) => openMergeModal(product, MODAL_MODE.UPDATE),
    [openMergeModal]
  );

  /* ── Confirm link / update ── */
  const handleConfirmMerge = async () => {
    if (!mergeTargetProduct || !selectedWebsiteCandidate) {
      message.warning("Please select a Website Product to link with.");
      return;
    }

    if (isSubmitting || isSingleMerging || isUpdating) return;

    const targetName = getProductName(mergeTargetProduct);
    const candidateName = getProductName(selectedWebsiteCandidate);
    const sim = getSimilarity(targetName, candidateName);

    setIsSubmitting(true);
    const isUpdate = modalMode === MODAL_MODE.UPDATE;
    const hideLoading = message.loading(
      isUpdate ? "Updating link..." : "Linking products...",
      0
    );

    try {
      const thunk = isUpdate
        ? updateMergedProduct({
            ctp001Product: mergeTargetProduct,
            newCtp002Product: selectedWebsiteCandidate,
          })
        : mergeSingleCTP001WithCTP002({
            ctp001Product: mergeTargetProduct,
            ctp002Product: selectedWebsiteCandidate,
          });

      const resultAction = await dispatch(thunk);
      hideLoading();

      const succeeded = isUpdate
        ? updateMergedProduct.fulfilled.match(resultAction)
        : mergeSingleCTP001WithCTP002.fulfilled.match(resultAction);

      if (succeeded) {
        const similarityNote =
          sim < 0.5 ? ` (Similarity: ${Math.round(sim * 100)}%)` : "";
        message.success(
          (resultAction.payload?.message ||
            (isUpdate ? "Link updated!" : "Products linked successfully!")) +
            similarityNote
        );

        dispatch(getMergedProducts());
        closeMergeModal();
      } else {
        const errorMsg =
          resultAction.payload ||
          resultAction.error?.message ||
          (isUpdate ? "Failed to update link" : "Failed to link products");
        message.error(typeof errorMsg === "string" ? errorMsg : "Operation failed");
      }
    } catch (err) {
      hideLoading();
      message.error(typeof err === "string" ? err : err?.message || "Operation failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ── Unmerge ── */
  const handleUnmerge = useCallback(
    async (record) => {
      // Find the linked ctp002 product from the map / mergedProducts list
      const ctp1Id = getProductId(record);
      const ctp2Id = mergedProductMap[ctp1Id] || "";

      // Build minimal product objects for the thunk
      const ctp001Obj = { ...record };
      const ctp002Obj = { productID: ctp2Id };

      const hideLoading = message.loading("Removing link...", 0);
      try {
        const resultAction = await dispatch(
          unmergeCTP001Product({
            ctp001Product: ctp001Obj,
            ctp002Product: ctp002Obj,
          })
        );
        hideLoading();

        if (unmergeCTP001Product.fulfilled.match(resultAction)) {
          message.success(resultAction.payload?.message || "Link removed.");
          dispatch(getMergedProducts());
        } else {
          // Optimistic fallback: remove from local state
          dispatch(removeManualMerge(ctp1Id));
          message.warning(
            resultAction.payload || "Link removed locally (server may have failed)."
          );
        }
      } catch (err) {
        hideLoading();
        // Fallback to local remove
        dispatch(removeManualMerge(ctp1Id));
        message.warning("Link removed locally.");
      }
    },
    [dispatch, mergedProductMap]
  );

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

  const closeMergeModal = useCallback(() => {
    setMergeModalVisible(false);
    setMergeTargetProduct(null);
    setSelectedWebsiteCandidate(null);
    setWebsiteSearchText("");
    setModalMode(MODAL_MODE.MERGE);
    dispatch(clearSimilarCandidates());
  }, [dispatch]);

  const closeDetailModal = useCallback(() => {
    setDetailModalVisible(false);
    setSelectedProduct(null);
  }, []);

  /* ── Derived data ── */
  const filteredProducts = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return products || [];
    return (products || []).filter((product) =>
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
  }, [products, searchText]);

  const displayedCandidates = useMemo(() => {
    if (!websiteProducts.length || !mergeTargetProduct) return [];
    const targetName = getProductName(mergeTargetProduct);
    const mapped = websiteProducts.map((product) => ({
      product,
      productId: getProductId(product),
      productName: getProductName(product),
      similarity: getSimilarity(targetName, getProductName(product)),
    }));

    if (websiteSearchText) {
      const q = websiteSearchText.toLowerCase();
      return mapped
        .filter(
          (item) =>
            item.productName.toLowerCase().includes(q) ||
            String(item.productId).includes(q)
        )
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 200);
    }
    return mapped.sort((a, b) => b.similarity - a.similarity).slice(0, 200);
  }, [websiteProducts, websiteSearchText, mergeTargetProduct]);

  const stats = useMemo(
    () => ({
      total: pagination.total || (products || []).length,
      displayed: filteredProducts.length,
      mergedCount: mergedProducts?.length || Object.keys(mergedProductMap || {}).length,
    }),
    [products, filteredProducts, pagination, mergedProducts, mergedProductMap]
  );

  /* ── Loading flag for the link/update button ── */
  const isBusy = isSubmitting || isSingleMerging || isUpdating;

  /* ── Table columns ── */
  const columns = useMemo(
    () => [
      {
        title: "Product Details",
        key: "details",
        render: (_, record) => {
          const id = getProductId(record);
          const isMerged = Boolean(mergedProductMap[id]);
          return (
            <div style={wrapStyle}>
              <div style={{ fontWeight: 600, marginBottom: 2 }}>
                {getProductName(record) || "-"}
                {isMerged && (
                  <CheckCircleTwoTone
                    twoToneColor="#52c41a"
                    style={{ marginLeft: 6, fontSize: 14 }}
                  />
                )}
              </div>
              <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>
                ID: {id || "-"}
                {isMerged && (
                  <Tag color="success" style={{ marginLeft: 6, fontSize: 10 }}>
                    Linked → {mergedProductMap[id]}
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
          const price = record?.sellingPrice1 || record?.price || 0;
          const oldPrice = record?.oldPrice;
          return (
            <div>
              <div style={{ fontWeight: 600, color: "#ff4d4f", fontSize: 15 }}>
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
          const id = getProductId(record);
          const websiteId = mergedProductMap[id];
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
        width: 150,
        align: "center",
        render: (_, record) => {
          const id = getProductId(record);
          const isMerged = Boolean(mergedProductMap[id]);

          return (
            <Space size="small" wrap>
              {/* View Details */}
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

              {/* Link (only shown when not merged) */}
              {!isMerged && (
                <Tooltip title="Link to Website Product">
                  <Button
                    type="text"
                    icon={<LinkOutlined />}
                    style={{ color: "#52c41a" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenMergeModal(record);
                    }}
                  />
                </Tooltip>
              )}

              {/* Update link (only shown when merged) */}
              {isMerged && (
                <Tooltip title="Change linked product">
                  <Button
                    type="text"
                    icon={<EditOutlined />}
                    style={{ color: "#722ed1" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenUpdateModal(record);
                    }}
                  />
                </Tooltip>
              )}

              {/* Unmerge (only shown when merged) */}
              {isMerged && (
                <Tooltip title="Remove link">
                  <Popconfirm
                    title="Remove link?"
                    description="This will unlink the Sales Mate product from the Website product."
                    onConfirm={(e) => {
                      e?.stopPropagation?.();
                      handleUnmerge(record);
                    }}
                    onCancel={(e) => e?.stopPropagation?.()}
                    okText="Remove"
                    okButtonProps={{ danger: true }}
                    cancelText="Cancel"
                  >
                    <Button
                      type="text"
                      icon={<DisconnectOutlined />}
                      danger
                      loading={isUnmerging}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </Popconfirm>
                </Tooltip>
              )}
            </Space>
          );
        },
      },
    ],
    [
      mergedProductMap,
      handleViewDetails,
      handleOpenMergeModal,
      handleOpenUpdateModal,
      handleUnmerge,
      isUnmerging,
    ]
  );

  /* ── Detail modal content ── */
  const detailContent = useMemo(() => {
    if (!selectedProduct) return null;
    const imageUrl = getImageUrl(selectedProduct?.productImage || selectedProduct?.image);
    const price = selectedProduct?.sellingPrice1 || selectedProduct?.price || 0;
    const id = getProductId(selectedProduct);
    const websiteId = mergedProductMap[id];

    return (
      <div>
        {imageUrl && (
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <img
              src={imageUrl}
              alt={getProductName(selectedProduct)}
              style={{ width: "100%", maxHeight: 250, objectFit: "cover", borderRadius: 8 }}
            />
          </div>
        )}
        <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 16 }}>
          {getProductName(selectedProduct) || "Product"}
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
          <div style={{ fontSize: 28, fontWeight: 700, color: "#ff4d4f" }}>
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
  }, [selectedProduct, mergedProductMap]);

  /* ── Render ── */
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
          Manage inventory and link, update, or unlink Website Products.
        </p>
      </div>

      {/* Error banners */}
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
      {mergeError && (
        <Alert
          message={mergeError}
          type="warning"
          showIcon
          closable
          style={{ marginBottom: 16 }}
          onClose={() => dispatch(clearSpecificError("mergeAction"))}
        />
      )}
      {unmergeError && (
        <Alert
          message={unmergeError}
          type="error"
          showIcon
          closable
          style={{ marginBottom: 16 }}
          onClose={() => dispatch(clearSpecificError("unmergeMerge"))}
        />
      )}

      {/* Stats */}
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

      {/* Search + Actions bar */}
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
                loading={isFetching}
              >
                Refresh
              </Button>
              <Badge count={stats.mergedCount} size="small" offset={[-4, 0]}>
                <Button
                  icon={<LinkOutlined />}
                  onClick={handleViewMergedProducts}
                  loading={mergedLoading}
                >
                  View Linked
                </Button>
              </Badge>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Main table */}
      <Card>
        <Table
          dataSource={filteredProducts}
          columns={columns}
          rowKey={getRowKey}
          loading={isFetching}
          tableLayout="fixed"
          locale={{
            emptyText: isFetching ? (
              <Spin size="large" />
            ) : (
              <Empty description="No products found" />
            ),
          }}
          pagination={{
            current: pagination.pageNumber,
            pageSize: pagination.recordPerPage || 2000,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            pageSizeOptions: ["50", "100", "500", "1000", "2000"],
            showTotal: (total, range) => `${range[0]}–${range[1]} of ${total}`,
          }}
          onChange={handleTableChange}
          size="small"
          bordered
        />
      </Card>

      {/* ─── Detail Modal ─── */}
      <Modal
        open={detailModalVisible}
        onCancel={closeDetailModal}
        footer={<Button onClick={closeDetailModal}>Close</Button>}
        width={700}
        centered
        title="Product Details"
        destroyOnClose
      >
        {detailContent}
      </Modal>

      {/* ─── Linked Products Modal ─── */}
      <Modal
        open={mergedModalVisible}
        onCancel={() => setMergedModalVisible(false)}
        footer={null}
        width={960}
        centered
        destroyOnClose
        title={
          <Space>
            <LinkOutlined style={{ color: "#52c41a" }} />
            <span>Linked Products ({mergedProducts?.length || 0})</span>
          </Space>
        }
      >
        <Table
          dataSource={mergedProducts}
          loading={mergedLoading}
          rowKey={(record, index) =>
            `${record.ctP001ProductId}-${record.ctP002ProductId}-${index}`
          }
          tableLayout="fixed"
          locale={{
            emptyText: mergedLoading ? <Spin /> : <Empty description="No linked products" />,
          }}
          columns={[
            {
              title: "Sales Mate Product",
              dataIndex: "ctP001ProductName",
              render: (text) => (
                <Text strong style={wrapStyle}>
                  {text || "-"}
                </Text>
              ),
            },
            {
              title: "Sales Mate ID",
              dataIndex: "ctP001ProductId",
              width: 140,
              render: (text) => <Tag color="blue">{text}</Tag>,
            },
            {
              title: "Website Product",
              dataIndex: "ctP002ProductName",
              render: (text) => (
                <Text strong style={wrapStyle}>
                  {text || "-"}
                </Text>
              ),
            },
            {
              title: "Website ID",
              dataIndex: "ctP002ProductId",
              width: 140,
              render: (text) => <Tag color="purple">{text}</Tag>,
            },
          ]}
          size="small"
          bordered
        />
      </Modal>

      {/* ─── Merge / Update Modal ─── */}
      <Modal
        open={mergeModalVisible}
        onCancel={closeMergeModal}
        title={
          <Space>
            {modalMode === MODAL_MODE.UPDATE ? (
              <EditOutlined style={{ color: "#722ed1" }} />
            ) : (
              <SwapOutlined style={{ color: "#722ed1" }} />
            )}
            <span>
              {modalMode === MODAL_MODE.UPDATE
                ? "Update Link — Sales Mate → Website Product"
                : "Link Sales Mate to Website Product"}
            </span>
          </Space>
        }
        width={820}
        centered
        destroyOnClose={false}
        maskClosable={false}
        footer={null}
      >
        {/* Error inside modal */}
        {(singleMergeError || updateMergeError) && (
          <Alert
            message={modalMode === MODAL_MODE.UPDATE ? "Update Error" : "Link Error"}
            description={singleMergeError || updateMergeError}
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {/* Source product card */}
        {mergeTargetProduct && (
          <Card size="small" style={{ marginBottom: 16, backgroundColor: "#fafafa" }}>
            <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
              <Avatar
                src={getImageUrl(
                  mergeTargetProduct.productImage || mergeTargetProduct.image
                )}
                size={60}
                shape="square"
              />
              <div style={{ flex: "1 1 240px" }}>
                <Title level={5} style={{ margin: 0 }}>
                  {getProductName(mergeTargetProduct)}
                </Title>
                <Text type="secondary">
                  Sales Mate ID: {getProductId(mergeTargetProduct)}
                </Text>
                <br />
                <Text type="secondary">
                  Price: ₵{formatPrice(getProductPrice(mergeTargetProduct))}
                </Text>

                {/* Show current link if updating */}
                {modalMode === MODAL_MODE.UPDATE &&
                  mergedProductMap[getProductId(mergeTargetProduct)] && (
                    <div style={{ marginTop: 4 }}>
                      <Tag color="processing" icon={<LinkOutlined />}>
                        Currently linked to:{" "}
                        {mergedProductMap[getProductId(mergeTargetProduct)]}
                      </Tag>
                    </div>
                  )}
              </div>
            </div>
          </Card>
        )}

        {/* Website product search */}
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
          <Text strong>
            {modalMode === MODAL_MODE.UPDATE
              ? "Select new Website Product:"
              : "Available Website Products:"}
          </Text>
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
          loading={websiteLoading}
          bordered
          pagination={
            displayedCandidates.length > 8
              ? { pageSize: 8, size: "small", showSizeChanger: false }
              : false
          }
          locale={{
            emptyText: (
              <Empty
                description={websiteProducts.length ? "No matches." : "Loading..."}
              />
            ),
          }}
          dataSource={displayedCandidates}
          renderItem={(item) => {
            const isSelected =
              selectedWebsiteCandidate &&
              getProductId(selectedWebsiteCandidate) === item.productId;

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
                  transition: "all 0.2s",
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
                    src={getImageUrl(item.product?.productImage || item.product?.image)}
                    size={45}
                    shape="square"
                  />
                  <div style={{ flex: "1 1 240px", minWidth: 0 }}>
                    <div style={{ fontWeight: 600, ...wrapStyle }}>{item.productName}</div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      ID: {item.productId}
                    </Text>
                    <br />
                    <Text type="secondary">₵{formatPrice(getProductPrice(item.product))}</Text>
                  </div>
                  <div style={{ flex: "0 1 150px" }}>
                    <Progress
                      percent={Math.round(item.similarity * 100)}
                      size="small"
                      status={item.similarity === 1 ? "success" : "active"}
                      format={(percent) => `${percent}%`}
                    />
                  </div>
                  <div style={{ width: 24, textAlign: "center" }}>
                    {isSelected && (
                      <CheckCircleTwoTone twoToneColor="#52c41a" style={{ fontSize: 18 }} />
                    )}
                  </div>
                </div>
              </List.Item>
            );
          }}
        />

        {/* Selected candidate info */}
        {selectedWebsiteCandidate && mergeTargetProduct && (
          <Alert
            style={{ marginTop: 16 }}
            type="info"
            showIcon
            icon={<LinkOutlined />}
            message={
              modalMode === MODAL_MODE.UPDATE
                ? "New selection for update"
                : "Selected for linking"
            }
            description={
              <span>
                <strong>{getProductName(selectedWebsiteCandidate)}</strong>{" "}
                ID: {getProductId(selectedWebsiteCandidate)} — Similarity:{" "}
                {Math.round(
                  getSimilarity(
                    getProductName(mergeTargetProduct),
                    getProductName(selectedWebsiteCandidate)
                  ) * 100
                )}
                %
              </span>
            }
          />
        )}

        {/* Footer actions */}
        <div
          style={{
            marginTop: 20,
            paddingTop: 16,
            borderTop: "1px solid #f0f0f0",
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <Button onClick={closeMergeModal} disabled={isBusy}>
            Cancel
          </Button>
          <Button
            type="primary"
            icon={modalMode === MODAL_MODE.UPDATE ? <EditOutlined /> : <LinkOutlined />}
            loading={isBusy}
            disabled={!selectedWebsiteCandidate || isBusy}
            style={{
              backgroundColor:
                selectedWebsiteCandidate && !isBusy
                  ? modalMode === MODAL_MODE.UPDATE
                    ? "#722ed1"
                    : "#52c41a"
                  : undefined,
              borderColor:
                selectedWebsiteCandidate && !isBusy
                  ? modalMode === MODAL_MODE.UPDATE
                    ? "#722ed1"
                    : "#52c41a"
                  : undefined,
            }}
            onClick={handleConfirmMerge}
          >
            {modalMode === MODAL_MODE.UPDATE ? "Confirm Update" : "Confirm Link"}
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default CTP001ProductsPage;