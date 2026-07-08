import { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { updateProduct } from "../../../Redux/Slice/productSlice";
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
  Space
} from "antd";
import PropTypes from "prop-types";

const { Option } = Select;
const { Text, Title } = Typography;

// Generate 8-digit code
const generate8DigitCode = () => {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
};

const UpdateProduct = ({ visible, onClose, product }) => {
  const dispatch = useDispatch();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [charCount, setCharCount] = useState(0);

  // Search states for dropdowns
  const [brandSearchValue, setBrandSearchValue] = useState('');
  const [showroomSearchValue, setShowroomSearchValue] = useState('');
  const [categorySearchValue, setCategorySearchValue] = useState('');

  // Redux selectors
  const brands = useSelector((state) => state.brands.brands);
  const showrooms = useSelector((state) => state.showrooms.showrooms);
  const categories = useSelector((state) => state.categories.categories);
  const brandsLoading = useSelector((state) => state.brands.loading);
  const showroomsLoading = useSelector((state) => state.showrooms.loading);
  const categoriesLoading = useSelector((state) => state.categories.loading);

  // Fetch data on component mount
  useEffect(() => {
    if (visible) {
      dispatch(fetchBrands());
      dispatch(fetchShowrooms());
      dispatch(fetchCategories());
    }
  }, [dispatch, visible]);

  // Memoized filtered options for better performance
  const filteredBrands = useMemo(() => {
    if (!brandSearchValue) return brands;
    return brands.filter(brand =>
      brand.brandName.toLowerCase().includes(brandSearchValue.toLowerCase())
    );
  }, [brands, brandSearchValue]);

  const filteredShowrooms = useMemo(() => {
    if (!showroomSearchValue) return showrooms;
    return showrooms.filter(showroom =>
      showroom.showRoomName.toLowerCase().includes(showroomSearchValue.toLowerCase())
    );
  }, [showrooms, showroomSearchValue]);

  const filteredCategories = useMemo(() => {
    if (!categorySearchValue) return categories;
    return categories.filter(category =>
      category.categoryName.toLowerCase().includes(categorySearchValue.toLowerCase())
    );
  }, [categories, categorySearchValue]);

  // Populate form when product data is available
  useEffect(() => {
    if (product && Object.keys(product).length > 0) {
      const formValues = {
        Productid: product.productID || product.Productid,
        ProductName: product.productName,
        price: product.price,
        oldPrice: product.oldPrice || 0,
        ProductDiscount: product.ProductDiscount ?? product.productDiscount ?? 0,
        Description: product.description,
        BrandId: product.brandId,
        ShowRoomId: product.showRoomId,
        CategoryId: product.categoryId,
        status: product.status?.toString(),
        tag: product.tag || "",
        productColor: product.productColor || "",
        ProductId2: product.ProductId2 || product.productId2 || "",  // ✅ Capital P and I
        productId3: product.productId3 || "",
        quantity: product.quantity || 0,
      };

      form.setFieldsValue(formValues);
      setCharCount(product.description?.length || 0);
    }
  }, [product, form]);

  const handleReset = () => {
    form.resetFields();
    setCharCount(0);
    setBrandSearchValue('');
    setShowroomSearchValue('');
    setCategorySearchValue('');
  };

  const onFinish = async (values) => {
    const payload = {
      Productid: values.Productid,
      productName: values.ProductName,
      description: values.Description,
      price: parseFloat(values.price),
      oldPrice: values.oldPrice ? parseFloat(values.oldPrice) : 0,
      ProductDiscount: values.ProductDiscount ? parseFloat(values.ProductDiscount) : 0,
      brandId: values.BrandId,
      showRoomId: values.ShowRoomId,
      categoryId: values.CategoryId,
      status: values.status === "1" ? "1" : "0",
      tag: values.tag,
      productColor: values.productColor,
      ProductId2: values.ProductId2 || generate8DigitCode(),  // ✅ Capital P and I
      productId3: values.productId3 || generate8DigitCode(),
      quantity: parseInt(values.quantity) || 0,
    };

    if (!payload.Productid) {
      message.error("Product ID is missing!");
      return;
    }

    console.log("📦 Submitting payload:", payload);

    try {
      setLoading(true);
      await dispatch(updateProduct(payload)).unwrap();
      message.success("Product updated successfully!");
      handleReset();
      onClose();
    } catch (err) {
      console.error("❌ Error updating product:", err);
      
      // Display detailed error message
      if (err?.errors) {
        const errorMessages = Object.entries(err.errors)
          .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
          .join('\n');
        message.error(`Validation failed:\n${errorMessages}`);
      } else if (err?.title) {
        message.error(`Failed: ${err.title}`);
      } else {
        message.error("Failed to update product.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    handleReset();
    onClose();
  };

  return (
    <Modal
      title={<Title level={4}>Update Product</Title>}
      open={visible}
      onCancel={handleModalClose}
      footer={null}
      width={800}
      centered
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{ Productid: product?.productID || product?.Productid }}
      >
        {/* Hidden Product ID */}
        <Form.Item name="Productid" style={{ display: "none" }}>
          <Input type="hidden" />
        </Form.Item>

        {/* Product Name, Price, Old Price */}
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Product Name"
              name="ProductName"
              rules={[
                { required: true, message: "Please input the product name!" },
                { min: 3, message: "Product name must be at least 3 characters." }
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
                { pattern: /^\d+(\.\d{1,2})?$/, message: "Please enter a valid price." }
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
                { pattern: /^\d+(\.\d{1,2})?$/, message: "Please enter a valid price." }
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

        {/* Discount, Quantity, Color, Tag */}
        <Row gutter={16}>
          <Col span={6}>
            <Form.Item
              label="Discount (₵)"
              name="ProductDiscount"
              rules={[
                { pattern: /^\d+(\.\d{1,2})?$/, message: "Please enter a valid discount." }
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
                { pattern: /^\d+$/, message: "Please enter a valid number." }
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

        {/* Product Code (ProductId2), MPN, Status */}
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item 
              label="Product Code (ProductId2)" 
              name="ProductId2"  
              rules={[{ required: true, message: 'Product code is required!' }]}
              tooltip="This is the unique product code (ProductId2)"
            >
              <Input placeholder="Enter Product Code" size="large" />
            </Form.Item>
          </Col>

          <Col span={8}>
            <Form.Item 
              label="MPN (Product ID 3)" 
              name="productId3"
              tooltip="Manufacturer Part Number (auto-generated if empty)"
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

        {/* Description */}
        <Form.Item
          label="Description"
          name="Description"
          rules={[
            { required: true, message: "Please input the description!" },
            { min: 10, message: "Description must be at least 10 characters." }
          ]}
        >
          <Input.TextArea
            placeholder="Enter product description (max 1000 characters)"
            autoSize={{ minRows: 4, maxRows: 6 }}
            maxLength={1000}
            onChange={(e) => setCharCount(e.target.value.length)}
            showCount
          />
        </Form.Item>
 

        {/* Brand, Showroom, Category */}
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              label="Brand"
              name="BrandId"
              rules={[{ required: true, message: "Please select a brand!" }]}
            >
              <Select
                placeholder="Select or search brand"
                showSearch
                filterOption={false}
                onSearch={setBrandSearchValue}
                loading={brandsLoading}
                notFoundContent={brandsLoading ? 'Loading...' : 'No brands found'}
                size="large"
              >
                {filteredBrands.map((brand) => (
                  <Option key={brand.brandId} value={brand.brandId}>
                    {brand.brandName}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>

          <Col span={8}>
            <Form.Item
              label="Showroom"
              name="ShowRoomId"
              rules={[{ required: true, message: "Please select a showroom!" }]}
            >
              <Select
                placeholder="Select or search showroom"
                showSearch
                filterOption={false}
                onSearch={setShowroomSearchValue}
                loading={showroomsLoading}
                notFoundContent={showroomsLoading ? 'Loading...' : 'No showrooms found'}
                size="large"
              >
                {filteredShowrooms.map((showroom) => (
                  <Option key={showroom.showRoomID} value={showroom.showRoomID}>
                    {showroom.showRoomName}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>

          <Col span={8}>
            <Form.Item
              label="Category"
              name="CategoryId"
              rules={[{ required: true, message: "Please select a category!" }]}
            >
              <Select
                placeholder="Select or search category"
                showSearch
                filterOption={false}
                onSearch={setCategorySearchValue}
                loading={categoriesLoading}
                notFoundContent={categoriesLoading ? 'Loading...' : 'No categories found'}
                size="large"
              >
                {filteredCategories.map((category) => (
                  <Option key={category.categoryId} value={category.categoryId}>
                    {category.categoryName}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Divider />

        {/* Form Actions */}
        <Form.Item>
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button
              size="large"
              onClick={handleModalClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              htmlType="submit"
              type="primary"
              loading={loading}
              size="large"
              style={{ 
                backgroundColor: '#52c41a',
                borderColor: '#52c41a'
              }}
            >
              Update Product
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
  product: PropTypes.object.isRequired,
};

export default UpdateProduct;