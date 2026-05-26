import { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchBrands,
  addBrand,
  updateBrand,} from "../../Redux/Slice/brandSlice";
import { fetchCategories } from "../../Redux/Slice/categorySlice";
import {Select, Form, Input,Button,Table,Upload,  Modal,  message,  Row, Col, Card, Badge, Tooltip, Space,
  Typography,
  Divider,
  Empty,
  Tag,
  Avatar} from "antd";
import {Plus, Edit3, Search, Filter,
  Eye, Store,Grid3X3,
  List,Image as ImageIcon,
} from "lucide-react";
import { debounce } from "lodash";
import { v4 as uuidv4 } from "uuid";

const { Title, Text } = Typography;
const { Dragger } = Upload;

const backendBaseURL = "https://cms.frankotrading.com/";

const Adminbrands = () => {
  const dispatch = useDispatch();
  const { brands, loading, totalRecords } = useSelector((state) => state.brands);
  const { categories, loading: categoryLoading } = useSelector(
    (state) => state.categories
  );

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [form] = Form.useForm();
  const [currentBrand, setCurrentBrand] = useState(null);
  const [previewLogo, setPreviewLogo] = useState(null);
  const [previewImageUrl, setPreviewImageUrl] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState("table"); // 'table' or 'grid'

  useEffect(() => {
    dispatch(fetchBrands({ page: currentPage, limit: 10 }));
    dispatch(fetchCategories());
  }, [dispatch, currentPage]);

  useEffect(() => {
    if (currentBrand) {
      form.setFieldsValue({
        BrandName: currentBrand.brandName,
        CategoryId: currentBrand.categoryId?.toString(),
      });
      if (currentBrand.logoUrl) {
        setPreviewLogo(currentBrand.logoUrl);
      }
    }
  }, [currentBrand, form]);

  const showModal = (brand = null) => {
    setCurrentBrand(brand);
    if (brand) {
      form.setFieldsValue({
        BrandName: brand.brandName,
        CategoryId: brand.categoryId ? brand.categoryId.toString() : "",
      });
      setPreviewLogo(brand.logoUrl);
    } else {
      form.resetFields();
      setPreviewLogo(null);
    }
    setIsModalVisible(true);
  };

  const handleSubmit = async (values) => {
    setSubmitLoading(true);
    try {
      const formData = new FormData();
      formData.append("BrandName", values.BrandName);
      formData.append("CategoryId", values.CategoryId);

      if (values.LogoName?.file) {
        formData.append("LogoName", values.LogoName.file);
      } else if (currentBrand?.logoUrl) {
        formData.append("LogoName", currentBrand.logoName);
      }

      if (currentBrand) {
        await dispatch(
          updateBrand({ id: currentBrand.brandId, formData })
        ).unwrap();
        message.success("🎉 Brand updated successfully!");
        dispatch(fetchBrands({ page: currentPage, limit: 10 }));
      } else {
        formData.append("BrandId", uuidv4());
        await dispatch(addBrand(formData)).unwrap();
        message.success("🎉 Brand added successfully!");
      }

      setIsModalVisible(false);
      form.resetFields();
      setPreviewLogo(null);
      setCurrentBrand(null);
    } catch (error) {
      console.error("Error saving brand:", error);
      message.error(error?.message || "❌ Failed to save brand. Please try again.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleFileChange = ({ file }) => {
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setPreviewLogo(e.target.result);
      reader.readAsDataURL(file);
    } else {
      setPreviewLogo(null);
    }
  };

  const handleSearchChange = debounce((e) => {
    setSearchText(e.target.value.toLowerCase());
  }, 300);

  const filteredBrands = useMemo(() => {
    return brands.filter((brand) => {
      const brandNameMatch =
        brand.brandName?.toLowerCase().includes(searchText) || false;
      const categoryMatch = categories.some(
        (category) =>
          category.categoryName?.toLowerCase().includes(searchText) &&
          category.categoryId === brand.categoryId
      );
      const categoryFilter = selectedCategory
        ? brand.categoryId?.toString() === selectedCategory
        : true;
      return (brandNameMatch || categoryMatch) && categoryFilter;
    });
  }, [brands, categories, searchText, selectedCategory]);

  const showImagePreview = (imageUrl) => {
    setPreviewImageUrl(imageUrl);
    setIsPreviewVisible(true);
  };

  const columns = [
    {
      title: "Brand",
      dataIndex: "brandName",
      key: "brandName",
      render: (text, record) => (
        <Space>
          <Avatar
            size={40}
            src={
              record.logoName
                ? `${backendBaseURL}/Media/Brand_Logo/${record.logoName
                    .split("\\")
                    .pop()}`
                : undefined
            }
            icon={<Tag />}
            style={{
              backgroundColor: record.logoName ? undefined : '#dc2626',
            }}
          />
          <div>
            <Text strong className="text-gray-800">
              {text}
            </Text>
            <br />
            <Text type="secondary" className="text-xs">
              ID: {record.brandId?.slice(0, 8)}...
            </Text>
          </div>
        </Space>
      ),
    },
{
  title: "Category",
  dataIndex: "categoryId",
  key: "categoryId",
  render: (categoryId) => {
    const category = categories.find((cat) => cat.categoryId === categoryId);
    return category ? (
      <Tag color="green">{category.categoryName}</Tag>
    ) : (
      <Tag color="red">Products out of stock</Tag>
    );
  },
}, 
    {
      title: "Logo",
      dataIndex: "logoName",
      key: "logoName",
      render: (imagePath, record) => {
        if (!imagePath) {
          return (
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <Tag className="text-gray-400" size={20} />
            </div>
          );
        }
        const imageUrl = `${backendBaseURL}/Media/Brand_Logo/${imagePath
          .split("\\")
          .pop()}`;
        return (
          <Tooltip title="Click to preview">
            <img
              src={imageUrl}
              alt="Brand Logo"
              className="w-12 h-12 object-cover rounded-lg cursor-pointer hover:shadow-lg transition-all duration-200 border border-gray-200"
              onClick={() => showImagePreview(imageUrl)}
            />
          </Tooltip>
        );
      },
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Tooltip title="Edit Brand">
            <Button
        
              size="small"
              icon={<Edit3 size={16} />}
              onClick={() => showModal(record)}
              className="bg-green-600 hover:bg-green-700 border-green-600 text-white rounded-lg"
            >
              Edit
            </Button>
          </Tooltip>
        </Space>
      ),
    },
  ];

  // Grid view component
  const GridView = () => (
    <Row gutter={[16, 16]}>
      {filteredBrands.map((brand) => {
        const category = categories.find((cat) => cat.categoryId === brand.categoryId);
        const imageUrl = brand.logoName
          ? `${backendBaseURL}/Media/Brand_Logo/${brand.logoName.split("\\").pop()}`
          : null;

        return (
          <Col xs={24} sm={12} md={8} lg={6} key={brand.brandId}>
            <Card
              hoverable
              className="h-full shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-200"
              cover={
                <div className="h-32 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={brand.brandName}
                      className="max-h-24 max-w-24 object-contain cursor-pointer"
                      onClick={() => showImagePreview(imageUrl)}
                    />
                  ) : (
                    <Tag className="text-4xl text-gray-300" size={48} />
                  )}
                </div>
              }
              actions={[
                <Tooltip title="Edit Brand" key="edit">
                  <Edit3
                    size={18}
                    onClick={() => showModal(brand)}
                    className="text-green-600 hover:text-green-700 cursor-pointer"
                  />
                </Tooltip>,
                <Tooltip title="Preview Logo" key="preview">
                  <Eye
                    size={18}
                    onClick={() => imageUrl && showImagePreview(imageUrl)}
                    className={imageUrl ? "text-red-600 hover:text-red-700 cursor-pointer" : "text-gray-300"}
                  />
                </Tooltip>,
              ]}
            >
              <Card.Meta
                title={
                  <Text strong className="text-gray-800">
                    {brand.brandName}
                  </Text>
                }
                description={
                  <Space direction="vertical" size={4}>
                    <Badge
                      color="green"
                      text={category ? category.categoryName : "Uncategorized"}
                    />
                    <Text type="secondary" className="text-xs">
                      ID: {brand.brandId?.slice(0, 8)}...
                    </Text>
                  </Space>
                }
              />
            </Card>
          </Col>
        );
      })}
    </Row>
  );

  return (
    <div className="min-h-screen">
      <div className="bg-white shadow-sm border-b">
        <div className=" mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Store className="text-2xl text-green-600" size={24} />
              </div>
              <div>
                <Title level={5} className="!mb-0 !text-gray-900">
                  Brand Management
                </Title>
                <Text type="secondary">
                  Manage your ecommerce brands and categories
                </Text>
              </div>
            </div>
            <div className="mt-4 sm:mt-0">
              <Button
          
                size="large"
                icon={<Plus size={20} />}
                onClick={() => showModal()}
                className="bg-green-600 hover:bg-green-700 text-white border-green-600 rounded-md shadow-sm"
              >
                Add New Brand
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className=" mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters and Search */}
        <Card className="mb-6 shadow-sm border border-gray-200">
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} sm={12} md={8}>
              <Input
                size="large"
                placeholder="Search brands or categories..."
                prefix={<Search className="text-gray-400" size={18} />}
                onChange={handleSearchChange}
                className="rounded-lg"
                allowClear
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Select
                size="large"
                placeholder="Filter by category"
                value={selectedCategory}
                onChange={setSelectedCategory}
                className="w-full"
           
                suffixIcon={<Filter size={16} />}
              >
                {categories.map((cat) => (
                  <Select.Option key={cat.categoryId} value={cat.categoryId.toString()}>
                    {cat.categoryName}
                  </Select.Option>
                ))}
              </Select>
            </Col>
            <Col xs={24} sm={24} md={10} className="flex justify-end">
              <Space>
                <Text type="secondary">
                  {filteredBrands.length} of {brands.length} brands
                </Text>
                <Button.Group>
                  <Button
                    type={viewMode === "table" ? "primary" : "default"}
                    onClick={() => setViewMode("table")}
                    icon={<List size={16} />}
                    className={viewMode === "table" ? "bg-green-600 border-green-600" : ""}
                  >
                    List
                  </Button>
                  <Button
                    type={viewMode === "grid" ? "primary" : "default"}
                    onClick={() => setViewMode("grid")}
                    icon={<Grid3X3 size={16} />}
                    className={viewMode === "grid" ? "bg-green-600 border-green-600" : ""}
                  >
                    Grid
                  </Button>
                </Button.Group>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* Content */}
        <Card className="shadow-sm border border-gray-200">
          {filteredBrands.length === 0 ? (
            <Empty
              description="No brands found"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <Button
                type="primary"
                icon={<Plus size={18} />}
                onClick={() => showModal()}
                className="bg-green-600 hover:bg-green-700 border-green-600"
              >
                Add Your First Brand
              </Button>
            </Empty>
          ) : viewMode === "table" ? (
            <Table
              columns={columns}
              dataSource={filteredBrands}
              rowKey="brandId"
              loading={loading || categoryLoading}
              pagination={{
                current: currentPage,
                pageSize: 10,
                total: totalRecords,
                onChange: (page) => setCurrentPage(page),
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) =>
                  `${range[0]}-${range[1]} of ${total} brands`,
              }}
              className="rounded-lg"
              scroll={{ x: 800 }}
            />
          ) : (
            <GridView />
          )}
        </Card>
      </div>

      {/* Add/Edit Modal */}
      <Modal
        title={
          <div className="flex items-center space-x-2">
            <div className="p-1 bg-green-100 rounded">
              {currentBrand ? <Edit3 className="text-green-600" size={16} /> : <Plus className="text-green-600" size={16} />}
            </div>
            <span>{currentBrand ? "Edit Brand" : "Add New Brand"}</span>
          </div>
        }
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
          setPreviewLogo(null);
          setCurrentBrand(null);
        }}
        footer={null}
        width={600}
        centered
        className="rounded-lg"
      >
        <Divider />
        <Form form={form} onFinish={handleSubmit} layout="vertical" size="large">
          <Form.Item
            label="Brand Name"
            name="BrandName"
            rules={[
              { required: true, message: "Please enter brand name" },
              { min: 2, message: "Brand name must be at least 2 characters" },
            ]}
          >
            <Input
              placeholder="Enter brand name"
              className="rounded-lg"
              prefix={<Tag className="text-gray-400" size={16} />}
            />
          </Form.Item>

          <Form.Item
            label="Category"
            name="CategoryId"
            rules={[{ required: true, message: "Please select a category" }]}
          >
            <Select
              placeholder="Select category"
              loading={categoryLoading}
              className="rounded-lg"
              suffixIcon={<Filter size={16} />}
            >
              {categories.map((cat) => (
                <Select.Option key={cat.categoryId} value={cat.categoryId}>
                  {cat.categoryName}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label="Brand Logo" name="LogoName">
            <Dragger
              name="logo"
              showUploadList={false}
              beforeUpload={() => false}
              onChange={handleFileChange}
              className="rounded-lg border-dashed border-2 border-gray-300 hover:border-green-400"
            >
              {previewLogo ? (
                <div className="py-4">
                  <img
                    src={previewLogo}
                    alt="Preview"
                    className="w-24 h-24 object-cover mx-auto rounded-lg border border-gray-200"
                  />
                  <p className="ant-upload-text mt-2">Click or drag to replace</p>
                </div>
              ) : (
                <div className="py-8">
                  <p className="ant-upload-drag-icon">
                    <Upload className="text-4xl text-green-600 mx-auto" size={48} />
                  </p>
                  <p className="ant-upload-text">Click or drag file to upload</p>
                  <p className="ant-upload-hint">
                    Support for PNG, JPG, JPEG files only
                  </p>
                </div>
              )}
            </Dragger>
          </Form.Item>

          <Divider />

          <Row gutter={16}>
            <Col span={12}>
              <Button
                size="large"
                onClick={() => {
                  setIsModalVisible(false);
                  form.resetFields();
                  setPreviewLogo(null);
                  setCurrentBrand(null);
                }}
                className="w-full rounded-lg"
              >
                Cancel
              </Button>
            </Col>
            <Col span={12}>
              <Button
              
                size="large"
                htmlType="submit"
                loading={submitLoading}
                className="w-full bg-green-600 hover:bg-green-700 border-green-600 rounded-lg"
              >
                {currentBrand ? "Update Brand" : "Add Brand"}
              </Button>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Image Preview Modal */}
      <Modal
        title="Logo Preview"
        open={isPreviewVisible}
        onCancel={() => setIsPreviewVisible(false)}
        footer={null}
        centered
        width={500}
      >
        <div className="text-center py-4">
          <img
            src={previewImageUrl}
            alt="Logo Preview"
            className="max-w-full max-h-96 object-contain mx-auto rounded-lg"
          />
        </div>
      </Modal>
    </div>
  );
};

export default Adminbrands;