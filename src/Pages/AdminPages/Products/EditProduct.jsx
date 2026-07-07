import { useEffect, useState, useMemo, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  updateProduct,
  fetchAllProducts,
  fetchProductsWithoutVariants,
  fetchCTP002ProductVariants,
  createProductVariantAndMerge,
} from "../../../Redux/Slice/productSlice";
import { fetchBrands } from "../../../Redux/Slice/brandSlice";
import { fetchShowrooms } from "../../../Redux/Slice/showRoomSlice";
import { fetchCategories } from "../../../Redux/Slice/categorySlice";
import {
  Modal,
  Form,
  Input,
  Select,
  Button,
  message,
  Row,
  Col,
  Typography,
  Divider,
  Space,
  Card,
  Tag,
  Empty,
  List,
  Avatar,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  BranchesOutlined,
} from "@ant-design/icons";
import PropTypes from "prop-types";
import { v4 as uuidv4 } from "uuid";

const { Option } = Select;
const { Title } = Typography;

const backendBaseURL = "https://cms.frankotrading.com";

const toNumber = (value, fallback = 0) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
};

const toRequiredString = (value, fallback = "") => {
  const stringValue = String(value ?? "").trim();
  return stringValue || fallback;
};

const getFirstValue = (...values) => {
  return values.find(
    (value) =>
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
  );
};

const getProductId = (product) => {
  return product?.Productid || product?.productID || product?.ProductID || "";
};

const getProductName = (product) =>
  product?.productName || product?.ProductName || "";

const getProductImage = (product) =>
  product?.productImage || product?.ProductImage || "";

const getImageUrl = (imagePath) => {
  if (!imagePath) return "";
  const fileName = String(imagePath).split("\\").pop().split("/").pop();
  return `${backendBaseURL}/Media/Products_Images/${fileName}`;
};

const UpdateProduct = ({ visible, onClose, product }) => {
  const dispatch = useDispatch();
  const [form] = Form.useForm();

  const [loading, setLoading] = useState(false);

  // Search states
  const [brandSearchValue, setBrandSearchValue] = useState("");
  const [showroomSearchValue, setShowroomSearchValue] = useState("");
  const [categorySearchValue, setCategorySearchValue] = useState("");
  const [variantSearchValue, setVariantSearchValue] = useState("");

  // Variants (matches AddProduct.jsx structure)
  const [variants, setVariants] = useState([]);
  const [selectedVariantId, setSelectedVariantId] = useState(null);
  const [variantSubmitting, setVariantSubmitting] = useState(false);

  // Redux selectors
  const brands = useSelector((state) => state.brands?.brands || []);
  const showrooms = useSelector((state) => state.showrooms?.showrooms || []);
  const categories = useSelector((state) => state.categories?.categories || []);
  const productsWithoutVariants = useSelector(
    (state) => state.products?.productsWithoutVariants || []
  );
  const ctp002ProductVariants = useSelector(
    (state) => state.products?.ctp002ProductVariants || {}
  );

  const brandsLoading = useSelector((state) => state.brands?.loading);
  const showroomsLoading = useSelector((state) => state.showrooms?.loading);
  const categoriesLoading = useSelector((state) => state.categories?.loading);

  // The current product's parent CTP002 id
  const ctP002ProductId = useMemo(() => {
    if (!product) return "";
    return (
      product.productId2 ||
      product.ProductId2 ||
      product.productID2 ||
      getProductId(product) // fallback to product id when backend stores parent on the product itself
    );
  }, [product]);

  // Existing variants fetched for this product
  const currentVariants = useMemo(() => {
    if (!ctP002ProductId) return [];
    return ctp002ProductVariants[ctP002ProductId] || [];
  }, [ctp002ProductVariants, ctP002ProductId]);

  /* ---------- Initial data load ---------- */

  useEffect(() => {
    if (visible) {
      dispatch(fetchBrands());
      dispatch(fetchShowrooms());
      dispatch(fetchCategories());
      dispatch(fetchProductsWithoutVariants());
    }
  }, [dispatch, visible]);

  // When product changes, fetch its existing variants
  useEffect(() => {
    if (!visible || !ctP002ProductId) return;
    dispatch(fetchCTP002ProductVariants(ctP002ProductId));
  }, [dispatch, visible, ctP002ProductId]);

  /* ---------- Filtered dropdown lists ---------- */

  const filteredBrands = useMemo(() => {
    const list = Array.isArray(brands) ? brands : [];
    if (!brandSearchValue) return list;
    return list.filter((brand) =>
      String(brand.brandName || "")
        .toLowerCase()
        .includes(brandSearchValue.toLowerCase())
    );
  }, [brands, brandSearchValue]);

  const filteredShowrooms = useMemo(() => {
    const list = Array.isArray(showrooms) ? showrooms : [];
    if (!showroomSearchValue) return list;
    return list.filter((showroom) =>
      String(showroom.showRoomName || "")
        .toLowerCase()
        .includes(showroomSearchValue.toLowerCase())
    );
  }, [showrooms, showroomSearchValue]);

  const filteredCategories = useMemo(() => {
    const list = Array.isArray(categories) ? categories : [];
    if (!categorySearchValue) return list;
    return list.filter((category) =>
      String(category.categoryName || "")
        .toLowerCase()
        .includes(categorySearchValue.toLowerCase())
    );
  }, [categories, categorySearchValue]);

  // Variants candidate list — products that don't already have variants
  // AND that aren't already attached to this product
  const availableForVariant = useMemo(() => {
    const list = Array.isArray(productsWithoutVariants)
      ? productsWithoutVariants
      : [];
    const existingIds = new Set(
      currentVariants.map(
        (v) => v.ctP001ProductId || v.CTP001ProductId || v.ctp001ProductId
      )
    );
    const pickedIds = new Set(variants.map((v) => v.ctP001ProductId));

    return list.filter((p) => {
      const id = getProductId(p);
      return !existingIds.has(id) && !pickedIds.has(id);
    });
  }, [productsWithoutVariants, currentVariants, variants]);

  const filteredVariantCandidates = useMemo(() => {
    if (!variantSearchValue) return availableForVariant;
    const q = variantSearchValue.toLowerCase();
    return availableForVariant.filter((p) =>
      String(getProductName(p) || "").toLowerCase().includes(q)
    );
  }, [availableForVariant, variantSearchValue]);

  /* ---------- Form population ---------- */

  useEffect(() => {
    if (!visible || !product || Object.keys(product).length === 0) return;

    const formValues = {
      Productid: getProductId(product),
      productName: product.productName ?? product.ProductName ?? "",
      description: product.description ?? product.Description ?? "",
      price: product.price ?? product.Price ?? 0,
      oldPrice: product.oldPrice ?? product.OldPrice ?? 0,
      productDiscount:
        product.productDiscount ??
        product.ProductDiscount ??
        product.product_Dicount ??
        0,
      brandId: product.brandId ?? product.BrandId ?? product.brandID,
      showRoomId:
        product.showRoomId ?? product.ShowRoomId ?? product.showRoomID,
      categoryId:
        product.categoryId ?? product.CategoryId ?? product.categoryID,
      status: String(product.status ?? product.Status ?? "0"),
      tag: product.tag ?? product.Tag ?? "",
      productColor:
        product.productColor ?? product.Color ?? product.color ?? "",
      quantity: product.quantity ?? product.Quantity ?? 0,
      productId2: product.productId2 ?? product.ProductId2 ?? "",
      productId3: product.productId3 ?? product.ProductId3 ?? "",
    };

    form.setFieldsValue(formValues);
  }, [visible, product, form]);

  /* ---------- Variant handlers (mirrors AddProduct) ---------- */

  const handleAddVariant = () => {
    if (!selectedVariantId) {
      message.warning("Please select a product to add as a variant.");
      return;
    }

    const candidate = availableForVariant.find(
      (p) => getProductId(p) === selectedVariantId
    );
    if (!candidate) {
      message.error("Selected product is not available for variant merge.");
      return;
    }

    if (variants.some((v) => v.ctP001ProductId === selectedVariantId)) {
      message.info("That product is already added as a variant.");
      return;
    }

    setVariants((prev) => [
      ...prev,
      {
        localId: uuidv4(),
        ctP001ProductId: selectedVariantId,
        name: getProductName(candidate) || "Unnamed variant",
        color: "",
        size: "",
        imageUrl: "",
      },
    ]);

    setSelectedVariantId(null);
    setVariantSearchValue("");
  };

  const handleVariantFieldChange = (localId, field, value) => {
    setVariants((prev) =>
      prev.map((v) => (v.localId === localId ? { ...v, [field]: value } : v))
    );
  };

  const handleRemoveVariant = (localId) => {
    setVariants((prev) => prev.filter((v) => v.localId !== localId));
  };

  const resetVariantState = () => {
    setVariants([]);
    setSelectedVariantId(null);
    setVariantSearchValue("");
  };

  /* ---------- Reset & close ---------- */

  const handleReset = () => {
    form.resetFields();
    setBrandSearchValue("");
    setShowroomSearchValue("");
    setCategorySearchValue("");
    resetVariantState();
  };

  const handleModalClose = () => {
    handleReset();
    onClose();
  };

  /* ---------- Submit product update ---------- */

  const onFinish = async (values) => {
    const productId = values.Productid;

    if (!productId) {
      message.error("Product ID is missing!");
      return;
    }

    // Validate staged variants
    const cleanVariants = variants.map((v) => ({
      ctP001ProductId: toRequiredString(v.ctP001ProductId),
      name: toRequiredString(v.name),
      color: toRequiredString(v.color),
      size: toRequiredString(v.size),
      imageUrl: toRequiredString(v.imageUrl),
    }));

    if (cleanVariants.length > 0) {
      const invalid = cleanVariants.find(
        (v) => !v.ctP001ProductId || !v.name || !v.color 
      );
      if (invalid) {
        message.error(
          "Each variant requires a product, name, and colour"
        );
        return;
      }
    }

    const productId2 = getFirstValue(
      values.productId2,
      product?.productId2,
      product?.ProductId2,
      uuidv4()
    );

    const productId3 = getFirstValue(
      values.productId3,
      product?.productId3,
      product?.ProductId3,
      uuidv4()
    );

    const payload = {
      Productid: productId,
      productName: toRequiredString(values.productName),
      description: toRequiredString(values.description),
      price: toNumber(values.price),
      oldPrice: toNumber(values.oldPrice),
      brandId: toRequiredString(values.brandId),
      showRoomId: toRequiredString(values.showRoomId),
      status: String(values.status ?? "0"),
      tag: toRequiredString(values.tag),
      productColor: toRequiredString(values.productColor),
      productId2: toRequiredString(productId2, uuidv4()),
      productId3: toRequiredString(productId3, uuidv4()),
      productDiscount: toNumber(values.productDiscount),
      categoryId: values.categoryId,
      quantity: toNumber(values.quantity),
    };

    try {
      setLoading(true);

      // 1) Update the parent product
      await dispatch(updateProduct(payload)).unwrap();

      // 2) Merge new variants (uses ctP002ProductId from the parent)
      if (cleanVariants.length > 0) {
        try {
          await dispatch(
            createProductVariantAndMerge({
              ctP002ProductId: ctP002ProductId || productId,
              variants: cleanVariants,
            })
          ).unwrap();
        } catch (variantErr) {
          console.error("Variant merge failed:", variantErr);
          message.warning(
            "Product updated, but variant merge failed. Try again from the variant section."
          );
        }
      }

      // 3) Refresh data
      await Promise.all([
        dispatch(fetchAllProducts()).unwrap(),
        dispatch(fetchProductsWithoutVariants()).unwrap(),
        dispatch(fetchCTP002ProductVariants(ctP002ProductId || productId)),
      ]);

      message.success(
        cleanVariants.length > 0
          ? `Product updated and ${cleanVariants.length} variant${
              cleanVariants.length > 1 ? "s" : ""
            } added!`
          : "Product updated successfully!"
      );

      handleReset();
      onClose();
    } catch (err) {
      console.error("Error updating product:", err);

      if (typeof err === "string") {
        message.error(err);
      } else if (err?.errors) {
        const errorMessages = Object.entries(err.errors)
          .map(([field, messages]) => `${field}: ${messages.join(", ")}`)
          .join("\n");
        message.error(`Validation failed: ${errorMessages}`);
      } else if (err?.title) {
        message.error(`Failed: ${err.title}`);
      } else {
        message.error("Failed to update product.");
      }
    } finally {
      setLoading(false);
    }
  };

  /* ---------- Render ---------- */

  return (
    <Modal
      title={<Title level={4}>Update Product</Title>}
      open={visible}
      onCancel={handleModalClose}
      footer={null}
      width={900}
      centered
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item name="Productid" style={{ display: "none" }}>
          <Input type="hidden" />
        </Form.Item>

        <Form.Item name="productId2" style={{ display: "none" }}>
          <Input type="hidden" />
        </Form.Item>

        {/* ---- Basic Info ---- */}
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Product Name"
              name="productName"
              rules={[
                { required: true, message: "Please input the product name!" },
                {
                  min: 3,
                  message: "Product name must be at least 3 characters.",
                },
              ]}
            >
              <Input placeholder="Enter product name" size="large" />
            </Form.Item>
          </Col>

          <Col span={6}>
            <Form.Item
              label="Price (₵)"
              name="price"
              rules={[
                { required: true, message: "Please input the price!" },
                {
                  pattern: /^\d+(\.\d{1,2})?$/,
                  message: "Please enter a valid price.",
                },
              ]}
            >
              <Input
                type="number"
                prefix="₵"
                placeholder="0.00"
                min="0"
                step="0.01"
                size="large"
              />
            </Form.Item>
          </Col>

          <Col span={6}>
            <Form.Item
              label="Old Price (₵)"
              name="oldPrice"
              rules={[
                {
                  pattern: /^\d+(\.\d{1,2})?$/,
                  message: "Please enter a valid price.",
                },
              ]}
            >
              <Input
                type="number"
                prefix="₵"
                placeholder="0.00"
                min="0"
                step="0.01"
                size="large"
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={6}>
            <Form.Item
              label="Discount (₵)"
              name="productDiscount"
              rules={[
                {
                  pattern: /^\d+(\.\d{1,2})?$/,
                  message: "Enter a valid discount.",
                },
              ]}
            >
              <Input
                type="number"
                prefix="₵"
                placeholder="0.00"
                min="0"
                step="0.01"
                size="large"
              />
            </Form.Item>
          </Col>

          <Col span={6}>
            <Form.Item
              label="Quantity"
              name="quantity"
              rules={[
                { required: true, message: "Please enter the quantity!" },
                {
                  pattern: /^\d+$/,
                  message: "Please enter a valid number.",
                },
              ]}
            >
              <Input
                type="number"
                placeholder="Enter quantity"
                min="0"
                size="large"
              />
            </Form.Item>
          </Col>

          <Col span={6}>
            <Form.Item
              label="Color"
              name="productColor"
              rules={[{ required: true, message: "Please input a color!" }]}
            >
              <Input placeholder="Enter product color" size="large" />
            </Form.Item>
          </Col>

          <Col span={6}>
            <Form.Item
              label="Tag"
              name="tag"
              rules={[{ required: true, message: "Please input a tag!" }]}
            >
              <Input placeholder="e.g., Featured, New" size="large" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              label="MPN"
              name="productId3"
              tooltip="Manufacturer Part Number. Auto-generated if empty."
            >
              <Input placeholder="Enter MPN" size="large" />
            </Form.Item>
          </Col>

          <Col span={8}>
            <Form.Item
              label="Status"
              name="status"
              rules={[{ required: true, message: "Please select a status!" }]}
            >
              <Select placeholder="Select status" size="large">
                <Option value="1">In Stock</Option>
                <Option value="0">Out of Stock</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Divider />

        {/* ---- Description ---- */}
        <Form.Item
          label="Description"
          name="description"
          rules={[
            { required: true, message: "Please input the description!" },
            {
              min: 10,
              message: "Description must be at least 10 characters.",
            },
          ]}
        >
          <Input.TextArea
            placeholder="Enter product description"
            autoSize={{ minRows: 4, maxRows: 6 }}
            maxLength={1000}
            showCount
          />
        </Form.Item>

        {/* ---- Brand / Showroom / Category ---- */}
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              label="Brand"
              name="brandId"
              rules={[{ required: true, message: "Please select a brand!" }]}
            >
              <Select
                placeholder="Select or search brand"
                showSearch
                filterOption={false}
                onSearch={setBrandSearchValue}
                loading={brandsLoading}
                notFoundContent={brandsLoading ? "Loading..." : "No brands found"}
                size="large"
              >
                {filteredBrands.map((brand) => {
                  const id = brand.brandId ?? brand.brandID;
                  return (
                    <Option key={id} value={id}>
                      {brand.brandName}
                    </Option>
                  );
                })}
              </Select>
            </Form.Item>
          </Col>

          <Col span={8}>
            <Form.Item
              label="Showroom"
              name="showRoomId"
              rules={[
                { required: true, message: "Please select a showroom!" },
              ]}
            >
              <Select
                placeholder="Select or search showroom"
                showSearch
                filterOption={false}
                onSearch={setShowroomSearchValue}
                loading={showroomsLoading}
                notFoundContent={
                  showroomsLoading ? "Loading..." : "No showrooms found"
                }
                size="large"
              >
                {filteredShowrooms.map((showroom) => {
                  const id = showroom.showRoomId ?? showroom.showRoomID;
                  return (
                    <Option key={id} value={id}>
                      {showroom.showRoomName}
                    </Option>
                  );
                })}
              </Select>
            </Form.Item>
          </Col>

          <Col span={8}>
            <Form.Item
              label="Category"
              name="categoryId"
              rules={[
                { required: true, message: "Please select a category!" },
              ]}
            >
              <Select
                placeholder="Select or search category"
                showSearch
                filterOption={false}
                onSearch={setCategorySearchValue}
                loading={categoriesLoading}
                notFoundContent={
                  categoriesLoading ? "Loading..." : "No categories found"
                }
                size="large"
              >
                {filteredCategories.map((category) => {
                  const id = category.categoryId ?? category.categoryID;
                  return (
                    <Option key={id} value={id}>
                      {category.categoryName}
                    </Option>
                  );
                })}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        {/* ---------- EXISTING VARIANTS (READ-ONLY) ---------- */}
        {currentVariants.length > 0 && (
          <>
            <Divider orientation="left">
              <Space>
                <BranchesOutlined />
                <span>Current Variants</span>
                <Tag color="purple">{currentVariants.length} attached</Tag>
              </Space>
            </Divider>

            <List
              size="small"
              style={{ marginBottom: 16 }}
              bordered
              dataSource={currentVariants}
              renderItem={(v) => {
                const vName = v.name || v.Name || "Unnamed";
                const vColor = v.color || v.Color;
                const vSize = v.size || v.Size  || "Unnamed";
                const vImage = v.imageUrl || v.ImageUrl;
                const vId =
                  v.ctP001ProductId ||
                  v.CTP001ProductId ||
                  v.ctp001ProductId;
                return (
                  <List.Item>
                    <List.Item.Meta
                      avatar={
                        <Avatar shape="square" size={45} src={vImage}>
                          {vName[0]}
                        </Avatar>
                      }
                      title={
                        <Space>
                          <strong>{vName}</strong>
                          {vColor && <Tag color="blue">{vColor}</Tag>}
                          {vSize && <Tag color="cyan">{vSize}</Tag>}
                        </Space>
                      }
                      description={
                        <span style={{ fontSize: 12, color: "#666" }}>
                          CTP001 ID: {vId}
                        </span>
                      }
                    />
                  </List.Item>
                );
              }}
            />
          </>
        )}

        {/* ---------- VARIANTS SECTION (mirrors AddProduct) ---------- */}
        <Divider orientation="left">
          <Space>
            <BranchesOutlined />
            <span>Add New Variants (Optional)</span>
            <Tag color="blue">{variants.length} staged</Tag>
          </Space>
        </Divider>

        <Card
          size="small"
          style={{ background: "#fafafa", marginBottom: 16 }}
        >
          <Row gutter={8} align="middle">
            <Col flex="auto">
              <Select
                style={{ width: "100%" }}
                placeholder="Search & select a product to add as variant"
                showSearch
                filterOption={false}
                onSearch={setVariantSearchValue}
                value={selectedVariantId}
                onChange={setSelectedVariantId}
                size="large"
                notFoundContent="No products without variants found"
              >
                {filteredVariantCandidates.map((p) => {
                  const id = getProductId(p);
                  const name = getProductName(p) || "Unnamed";
                  return (
                    <Option key={id} value={id}>
                      {name} <span style={{ color: "#999" }}>(ID: {id})</span>
                    </Option>
                  );
                })}
              </Select>
            </Col>
            <Col>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAddVariant}
                size="large"
                loading={variantSubmitting}
              >
                Add Variant
              </Button>
            </Col>
          </Row>
        </Card>

        {variants.length > 0 ? (
          <div style={{ marginBottom: 16 }}>
            {variants.map((variant, index) => (
              <Card
                key={variant.localId}
                size="small"
                style={{ marginBottom: 8 }}
                title={
                  <Space>
                    <Tag color="purple">Variant {index + 1}</Tag>
                    <span style={{ fontWeight: 500 }}>{variant.name}</span>
                  </Space>
                }
                extra={
                  <Button
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() => handleRemoveVariant(variant.localId)}
                  >
                    Remove
                  </Button>
                }
              >
                <Row gutter={8}>
                  <Col span={6}>
                    <label style={{ fontSize: 12, color: "#666" }}>
                      Color *
                    </label>
                    <Input
                      placeholder="e.g., Red"
                      value={variant.color}
                      onChange={(e) =>
                        handleVariantFieldChange(
                          variant.localId,
                          "color",
                          e.target.value
                        )
                      }
                    />
                  </Col>
                  <Col span={6}>
                    <label style={{ fontSize: 12, color: "#666" }}>
                      Size (optional)
                    </label>
                    <Input
                      placeholder="e.g., XL"
                      value={variant.size}
                      onChange={(e) =>
                        handleVariantFieldChange(
                          variant.localId,
                          "size",
                          e.target.value
                        )
                      }
                    />
                  </Col>
                  <Col span={12}>
                    <label style={{ fontSize: 12, color: "#666" }}>
                      Image URL (optional)
                    </label>
                    <Input
                      placeholder="https://..."
                      value={variant.imageUrl}
                      onChange={(e) =>
                        handleVariantFieldChange(
                          variant.localId,
                          "imageUrl",
                          e.target.value
                        )
                      }
                    />
                  </Col>
                </Row>
              </Card>
            ))}
          </div>
        ) : (
          <Empty
            description="No new variants staged. Pick products above to add variants."
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            style={{ marginBottom: 16 }}
          />
        )}

        {/* ---- Submit ---- */}
        <Form.Item>
          <Space style={{ width: "100%", justifyContent: "flex-end" }}>
            <Button size="large" onClick={handleModalClose} disabled={loading}>
              Cancel
            </Button>

            <Button
              htmlType="submit"
              type="primary"
              loading={loading}
              size="large"
              style={{ backgroundColor: "#52c41a", borderColor: "#52c41a" }}
            >
              {variants.length > 0
                ? `Update Product + ${variants.length} Variant${
                    variants.length > 1 ? "s" : ""
                  }`
                : "Update Product"}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

UpdateProduct.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  product: PropTypes.object,
};

UpdateProduct.defaultProps = {
  product: {},
};

export default UpdateProduct;