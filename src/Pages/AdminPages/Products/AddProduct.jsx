import {
  Modal,
  Form,
  Input,
  Select,
  Button,
  message,
  Upload,
  Row,
  Col,
  Divider,
  Typography,
  Space,
  InputNumber,
  Card,
  Tag,
} from "antd";
import {
  UploadOutlined,
  PlusOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import PropTypes from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import { useState, useEffect, useMemo } from "react";
import { v4 as uuidv4 } from "uuid";

import {
  addProduct,
  fetchAllProducts,
  fetchProductsWithoutVariants,
} from "../../../Redux/Slice/productSlice";
import { fetchBrands } from "../../../Redux/Slice/brandSlice";
import { fetchShowrooms } from "../../../Redux/Slice/showRoomSlice";
import { fetchCategories } from "../../../Redux/Slice/categorySlice";

const { Option } = Select;
const { Title } = Typography;

const toNumber = (value, fallback = 0) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
};

const toRequiredString = (value, fallback = "") => {
  const stringValue = String(value ?? "").trim();
  return stringValue || fallback;
};

const AddProduct = ({ visible, onClose }) => {
  const dispatch = useDispatch();
  const [form] = Form.useForm();

  const [submitting, setSubmitting] = useState(false);
  const [productImageFile, setProductImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // Local state for variants
  const [variants, setVariants] = useState([]);
  const [selectedVariantId, setSelectedVariantId] = useState(null);

  const [brandSearchValue, setBrandSearchValue] = useState("");
  const [showroomSearchValue, setShowroomSearchValue] = useState("");
  const [categorySearchValue, setCategorySearchValue] = useState("");
  const [variantSearchValue, setVariantSearchValue] = useState("");

  const brands = useSelector((state) => state.brands?.brands || []);
  const showrooms = useSelector((state) => state.showrooms?.showrooms || []);
  const categories = useSelector((state) => state.categories?.categories || []);

  // Products that don't have variants yet (CTP001 candidates)
  const productsWithoutVariants = useSelector(
    (state) => state.products?.productsWithoutVariants || []
  );

  const brandsLoading = useSelector((state) => state.brands?.loading);
  const showroomsLoading = useSelector((state) => state.showrooms?.loading);
  const categoriesLoading = useSelector((state) => state.categories?.loading);

  useEffect(() => {
    if (visible) {
      dispatch(fetchBrands());
      dispatch(fetchShowrooms());
      dispatch(fetchCategories());
      dispatch(fetchProductsWithoutVariants());
    }
  }, [dispatch, visible]);

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

  const filteredVariantCandidates = useMemo(() => {
    const list = Array.isArray(productsWithoutVariants) ? productsWithoutVariants : [];
    if (!variantSearchValue) return list;
    const q = variantSearchValue.toLowerCase();
    return list.filter((p) =>
      String(p.productName || p.ProductName || "")
        .toLowerCase()
        .includes(q)
    );
  }, [productsWithoutVariants, variantSearchValue]);

  const handleReset = () => {
    form.resetFields();
    setProductImageFile(null);
    setImagePreview(null);
    setBrandSearchValue("");
    setShowroomSearchValue("");
    setCategorySearchValue("");
    setVariantSearchValue("");
    setVariants([]);
    setSelectedVariantId(null);
  };

  const handleModalClose = () => {
    handleReset();
    onClose();
  };

  const handleAddVariant = () => {
    if (!selectedVariantId) {
      message.warning("Please select a product to add as a variant.");
      return;
    }

    const candidate = productsWithoutVariants.find((p) => {
      const id = p.productID || p.Productid || p.ProductID;
      return id === selectedVariantId;
    });

    if (!candidate) {
      message.error("Selected product not found.");
      return;
    }

    // Prevent duplicates
    if (variants.some((v) => v.ctP001ProductId === selectedVariantId)) {
      message.info("That product is already added as a variant.");
      return;
    }

    setVariants((prev) => [
      ...prev,
      {
        localId: uuidv4(),
        ctP001ProductId: selectedVariantId,
        name:
          candidate.productName || candidate.ProductName || "Unnamed variant",
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

  const onFinish = async (values) => {
    if (!productImageFile) {
      message.error("Please upload a product image.");
      return;
    }

    // Validate variants
    const cleanVariants = variants.map((v) => ({
      ctP001ProductId: toRequiredString(v.ctP001ProductId),
      name: toRequiredString(v.name),
      color: toRequiredString(v.color),
      size: toRequiredString(v.size),
      imageUrl: toRequiredString(v.imageUrl),
    }));

    // If there are variants, name/color/size are required
    if (cleanVariants.length > 0) {
      const invalid = cleanVariants.find(
        (v) => !v.ctP001ProductId || !v.name || !v.color || !v.size
      );
      if (invalid) {
        message.error(
          "Each variant requires a product, name, color, and size."
        );
        return;
      }
    }

    // This is the CTP002 product id (parent)
    const ctP002ProductId = uuidv4();
    const productId3 = values.productId3?.trim() || uuidv4();

    const apiValues = {
      productName: toRequiredString(values.productName),
      description: toRequiredString(values.description),
      price: toNumber(values.price),
      oldPrice: toNumber(values.oldPrice),
      brandId: toRequiredString(values.brandId),
      showRoomId: toRequiredString(values.showRoomId),
      status: String(values.status ?? "0"),
      tag: toRequiredString(values.tag),
      Color: toRequiredString(values.Color),
      productId2: ctP002ProductId,
      productId3,
      productDiscount: toNumber(values.productDiscount),
      categoryId: values.categoryId,
      quantity: toNumber(values.quantity),
      ProductID: uuidv4(),
      DateCreated: new Date().toISOString(),
      Userid: "user-uuid",
    };

    const formData = new FormData();
    Object.entries(apiValues).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value);
      }
    });
    formData.append("ProductImage", productImageFile);

    try {
      setSubmitting(true);

      // 1) Create the parent product
      await dispatch(addProduct(formData)).unwrap();

      // 2) If variants exist, create them via the merge endpoint
      if (cleanVariants.length > 0) {
        const variantPayload = {
          ctP002ProductId,
          variants: cleanVariants,
        };

        await dispatch(createProductVariantAndMerge(variantPayload)).unwrap();
      }

      // 3) Refresh lists
      await dispatch(fetchAllProducts()).unwrap();
      await dispatch(fetchProductsWithoutVariants()).unwrap();

      message.success(
        cleanVariants.length > 0
          ? `Product added with ${cleanVariants.length} variant${
              cleanVariants.length > 1 ? "s" : ""
            }!`
          : "Product added successfully!"
      );

      handleReset();
      onClose();
    } catch (err) {
      console.error("Failed to add product:", err);
      if (typeof err === "string") {
        message.error(err);
      } else if (err?.title) {
        message.error(err.title);
      } else if (err?.errors) {
        const msgs = Object.values(err.errors).flat();
        message.error(msgs.join(", "));
      } else {
        message.error("Failed to add product.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const uploadProps = {
    beforeUpload: (file) => {
      const isImage = file.type.startsWith("image/");
      if (!isImage) {
        message.error("You can only upload image files!");
        return false;
      }
      const isLt5M = file.size / 1024 / 1024 < 5;
      if (!isLt5M) {
        message.error("Image must be smaller than 5MB!");
        return false;
      }
      setProductImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      return false;
    },
    showUploadList: false,
    accept: "image/*",
  };

  return (
    <Modal
      title={<Title level={4}>Add New Product</Title>}
      open={visible}
      onCancel={handleModalClose}
      footer={null}
      width={900}
      centered
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{
          status: "1",
          oldPrice: 0,
          productDiscount: 0,
          quantity: 0,
        }}
      >
        <Row gutter={[16, 16]}>
          <Col span={16}>
            <Form.Item
              name="productName"
              label="Product Name"
              rules={[
                { required: true, message: "Please enter the product name." },
                { min: 3, message: "Product name must be at least 3 characters." },
              ]}
            >
              <Input placeholder="e.g., Samsung TV 55 inch" size="large" />
            </Form.Item>
          </Col>

          <Col span={4}>
            <Form.Item
              name="price"
              label="Price (₵)"
              rules={[
                { required: true, message: "Please enter the price." },
                {
                  pattern: /^\d+(\.\d{1,2})?$/,
                  message: "Please enter a valid price.",
                },
              ]}
            >
              <InputNumber
                prefix="₵"
                placeholder="0.00"
                min={0}
                step="0.01"
                size="large"
                style={{ width: "100%" }}
              />
            </Form.Item>
          </Col>

          <Col span={4}>
            <Form.Item
              name="oldPrice"
              label="Old Price (₵)"
              rules={[
                {
                  pattern: /^\d+(\.\d{1,2})?$/,
                  message: "Please enter a valid price.",
                },
              ]}
            >
              <InputNumber
                prefix="₵"
                placeholder="0.00"
                min={0}
                step="0.01"
                size="large"
                style={{ width: "100%" }}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={6}>
            <Form.Item
              name="productDiscount"
              label="Discount (₵)"
              rules={[
                {
                  pattern: /^\d+(\.\d{1,2})?$/,
                  message: "Enter a valid discount.",
                },
              ]}
            >
              <InputNumber
                prefix="₵"
                placeholder="0.00"
                min={0}
                step="0.01"
                size="large"
                style={{ width: "100%" }}
              />
            </Form.Item>
          </Col>

          <Col span={6}>
            <Form.Item
              name="quantity"
              label="Quantity"
              rules={[
                { required: true, message: "Please enter the quantity." },
                { pattern: /^\d+$/, message: "Please enter a valid number." },
              ]}
            >
              <InputNumber
                placeholder="Enter quantity"
                min={0}
                size="large"
                style={{ width: "100%" }}
              />
            </Form.Item>
          </Col>

          <Col span={6}>
            <Form.Item
              name="Color"
              label="Color"
              rules={[{ required: true, message: "Please enter the color." }]}
            >
              <Input placeholder="e.g., Red, Blue" size="large" />
            </Form.Item>
          </Col>

          <Col span={6}>
            <Form.Item
              name="tag"
              label="Tag"
              rules={[{ required: true, message: "Please enter a tag." }]}
            >
              <Input placeholder="e.g., Trending" size="large" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              name="status"
              label="Status"
              rules={[{ required: true, message: "Please select the status." }]}
            >
              <Select placeholder="Select stock status" size="large">
                <Option value="1">In Stock</Option>
                <Option value="0">Out of Stock</Option>
              </Select>
            </Form.Item>
          </Col>

          <Col span={8}>
            <Form.Item
              name="productId3"
              label="MPN"
              tooltip="Manufacturer Part Number. Auto-generated if empty."
            >
              <Input placeholder="Enter MPN" size="large" />
            </Form.Item>
          </Col>
        </Row>

        <Divider />

        <Form.Item
          name="description"
          label="Description"
          rules={[
            { required: true, message: "Please input the description!" },
            { min: 10, message: "Description must be at least 10 characters." },
          ]}
        >
          <Input.TextArea
            placeholder="Enter product description"
            autoSize={{ minRows: 3, maxRows: 5 }}
            maxLength={1000}
            showCount
          />
        </Form.Item>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              name="brandId"
              label="Brand"
              rules={[{ required: true, message: "Please select a brand." }]}
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
              name="showRoomId"
              label="Showroom"
              rules={[{ required: true, message: "Please select a showroom." }]}
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
                {filteredShowrooms.map((room) => {
                  const id = room.showRoomId ?? room.showRoomID;
                  return (
                    <Option key={id} value={id}>
                      {room.showRoomName}
                    </Option>
                  );
                })}
              </Select>
            </Form.Item>
          </Col>

          <Col span={8}>
            <Form.Item
              name="categoryId"
              label="Category"
              rules={[{ required: true, message: "Please select a category." }]}
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

        <Form.Item label="Product Image" name="productImage">
          <Upload {...uploadProps}>
            <Button icon={<UploadOutlined />}>Upload Image</Button>
          </Upload>

          {imagePreview && (
            <div
              style={{
                marginTop: 10,
                border: "1px solid #e5e5e5",
                padding: 10,
                borderRadius: 8,
              }}
            >
              <img
                src={imagePreview}
                alt="Product Preview"
                style={{
                  width: "100%",
                  maxHeight: 250,
                  objectFit: "cover",
                  borderRadius: 8,
                }}
              />
            </div>
          )}
        </Form.Item>

        {/* ---------- VARIANTS SECTION ---------- */}
        <Divider orientation="left">
          <Space>
            <span>Product Variants (Optional)</span>
            <Tag color="blue">{variants.length} added</Tag>
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
                  const id = p.productID || p.Productid || p.ProductID;
                  const name = p.productName || p.ProductName || "Unnamed";
                  return (
                    <Option key={id} value={id}>
                      {name}{" "}
                      <span style={{ color: "#999" }}>(ID: {id})</span>
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
              >
                Add Variant
              </Button>
            </Col>
          </Row>
        </Card>

        {variants.length > 0 && (
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
                      Size *
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
        )}

        <Form.Item>
          <Space style={{ width: "100%", justifyContent: "flex-end" }}>
            <Button size="large" onClick={handleModalClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              size="large"
              style={{ backgroundColor: "#52c41a", borderColor: "#52c41a" }}
            >
              Add Product {variants.length > 0 ? `+ ${variants.length} Variants` : ""}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

AddProduct.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default AddProduct;