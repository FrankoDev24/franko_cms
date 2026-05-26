import { useEffect, useState, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchAllProducts } from "../../../Redux/Slice/productSlice";
import { fetchBrands } from "../../../Redux/Slice/brandSlice";
import { fetchShowrooms } from "../../../Redux/Slice/showRoomSlice";
import {  Button, Table, message, Input, Modal, Tooltip, Tag, Card, Space,
  Select,
  Row,
  Col,
  Statistic,
  Avatar
} from "antd";
import { 
  EyeOutlined, 
  ReloadOutlined, 
  DownloadOutlined,
  SearchOutlined,
  ShopOutlined,
  TagsOutlined,} from "@ant-design/icons";
import * as XLSX from 'xlsx';

const { Option } = Select;

const DigiProducts = () => {
  const dispatch = useDispatch();
  const { products, loading: productsLoading } = useSelector((state) => state.products);
  const { brands, loading: brandsLoading } = useSelector((state) => state.brands);
  const { showrooms, loading: showroomsLoading } = useSelector((state) => state.showrooms);
  
  // Modal states
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isUpdateModalVisible, setIsUpdateModalVisible] = useState(false);
  const [isImageModalVisible, setIsImageModalVisible] = useState(false);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [isDescriptionModalVisible, setIsDescriptionModalVisible] = useState(false);
  const [isUpdateImageModalVisible, setIsUpdateImageModalVisible] = useState(false);
  
  // Data states
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedProductIdForImage, setSelectedProductIdForImage] = useState(null);
  const [fullImageUrl, setFullImageUrl] = useState("");
  const [descriptionText, setDescriptionText] = useState("");
  
  // Filter states
  const [searchText, setSearchText] = useState("");
  const [filterBrand, setFilterBrand] = useState("");
  const [filterShowroom, setFilterShowroom] = useState("");
  const [filterStock, setFilterStock] = useState("all"); // 'all', 'in_stock', 'out_of_stock'
  
  // Loading state for manual refresh
  const [refreshLoading, setRefreshLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  const backendBaseURL = import.meta.env.VITE_API_BASE_URL;

  // Check if any data is loading
  const isLoading = productsLoading || brandsLoading || showroomsLoading || refreshLoading;

  // Fetch data only once on mount
const fetchInitialData = useCallback(() => {
  if (!products?.length) dispatch(fetchAllProducts());
  if (!brands?.length) dispatch(fetchBrands());
  if (!showrooms?.length) dispatch(fetchShowrooms());

  setDataLoaded(true);
}, [dispatch, products?.length, brands?.length, showrooms?.length]);


useEffect(() => {
  if (!dataLoaded) {
    fetchInitialData();
  }
}, [fetchInitialData, dataLoaded]);

  // Manual refresh function
  const handleRefresh = useCallback(async () => {
    setRefreshLoading(true);
    try {
      await Promise.all([
        dispatch(fetchAllProducts()).unwrap(),
        dispatch(fetchBrands()).unwrap(),
        dispatch(fetchShowrooms()).unwrap()
      ]);
      message.success("Data refreshed successfully!");
    } catch (err) {
      console.error(err);
      message.error("Failed to refresh data.");
    } finally {
      setRefreshLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Memoized filtered and sorted products
  const { filteredProducts, productStats } = useMemo(() => {
    const filtered = (products || []).filter((product) => {
      // Search filter
      const searchMatch = !searchText || [
        product.productName,
        product.showRoomName,
        product.brandName,
        product.description
      ].some(field => 
        field?.toLowerCase().includes(searchText.toLowerCase())
      );

      // Brand filter
      const brandMatch = !filterBrand || product.brandName === filterBrand;
      
      // Showroom filter
      const showroomMatch = !filterShowroom || product.showRoomName === filterShowroom;
      
      // Stock filter
      let stockMatch = true;
      if (filterStock === 'in_stock') {
        stockMatch = product.status == 1;
      } else if (filterStock === 'out_of_stock') {
        stockMatch = product.status == 0;
      }

      return searchMatch && brandMatch && showroomMatch && stockMatch;
    });

    // Sort by date created (newest first)
    const sorted = [...filtered].sort(
      (a, b) => new Date(b.dateCreated) - new Date(a.dateCreated)
    );

    // Calculate statistics
    const stats = {
      total: products?.length || 0,
      filtered: filtered.length,
      inStock: (products || []).filter(p => p.status == 1).length,
      outOfStock: (products || []).filter(p => p.status == 0).length,
      totalValue: (products || []).reduce((sum, p) => sum + parseFloat(p.price || 0), 0)
    };

    return { filteredProducts: sorted, productStats: stats };
  }, [products, searchText, filterBrand, filterShowroom, filterStock]);

  // Modal handlers with optimized re-fetching
  const handleModalClose = useCallback((modalSetter, shouldRefresh = false) => {
    modalSetter(false);
    if (shouldRefresh) {
      // Only refresh products, not all data
      dispatch(fetchAllProducts());
    }
  }, [dispatch]);



  const handleViewProductDetails = (product) => {
    setSelectedProduct(product);
    setIsDetailModalVisible(true);
  };



  const exportToExcel = () => {
    try {
      const exportData = filteredProducts.map((product, index) => ({
        'S/N': index + 1,
        'Product Name': product.productName || '',
        'Description': product.description || '',
        'Price (₵)': parseFloat(product.price || 0).toFixed(2),
        'Old Price (₵)': product.oldPrice ? parseFloat(product.oldPrice).toFixed(2) : '',
        'Brand': product.brandName || '',
        'Category': product.categoryName || '',
        'Showroom': product.showRoomName || '',
        'Availability': product.status == 1 ? 'In Stock' : 'Out of Stock',
        'Product ID': product.productID || '',
        'Date Created': product.dateCreated ? new Date(product.dateCreated).toLocaleDateString() : ''
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      const colWidths = [
        { wch: 5 }, { wch: 25 }, { wch: 40 }, { wch: 12 }, { wch: 12 },
        { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 15 }
      ];
      ws['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, 'Products');

      const currentDate = new Date().toISOString().split('T')[0];
      const filename = `products_export_${currentDate}.xlsx`;

      XLSX.writeFile(wb, filename);
      message.success(`Products exported successfully as ${filename}`);
    } catch (error) {
      console.error('Export error:', error);
      message.error('Failed to export products to Excel');
    }
  };

  const columns = [
    {
      title: "Image",
      dataIndex: "productImage",
      key: "productImage",
      width: 80,
      render: (imagePath) => {
        const imageUrl = `${backendBaseURL}/Media/Products_Images/${imagePath?.split("\\").pop()}`;
        return (
          <Avatar
            src={imageUrl}
            size={50}
            shape="square"
            style={{ cursor: "pointer", border: "1px solid #f0f0f0" }}
            onClick={() => {
              setFullImageUrl(imageUrl);
              setIsImageModalVisible(true);
            }}
          />
        );
      },
    },
    {
      title: "Product Details",
      key: "productDetails",
      width: 300,
      dataIndex: "productName",
  
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>
            {record.productName}
          </div>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: 2 }}>
            ID: {record.productID}
          </div>
          <div style={{ fontSize: '12px', color: '#999' }}>
            {new Date(record.dateCreated).toLocaleDateString()}
          </div>
        </div>
      ),
    },
   
    {
      title: "Price",
      dataIndex: "price",
      key: "price",

      render: (price, record) => (
        <div>
          <div style={{ fontWeight: 600, color: '#ff4d4f' }}>
            ₵{parseFloat(price).toLocaleString(undefined, { 
              minimumFractionDigits: 2, 
              maximumFractionDigits: 2 
            })}
          </div>
          {record.oldPrice > 0 && (
            <div style={{ 
              fontSize: '12px', 
              textDecoration: 'line-through', 
              color: '#999' 
            }}>
              ₵{parseFloat(record.oldPrice).toLocaleString(undefined, { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 2 
              })}
            </div>
          )}
        </div>
      ),
    },
   {
  title: "Brand & Category",
  key: "brandCategory",
  render: (_, record) => {
    const isOutOfStock = record.name === "Products out of stock";
    return (
      <div>
        <Tag color={isOutOfStock ? "red" : "red"} style={{ marginBottom: 4 }}>
          {record.brandName}
        </Tag>
        <br />
        <Tag color={isOutOfStock ? "red" : "orange"}>
          {record.categoryName}
        </Tag>
      </div>
    );
  },
},
{
  title: "Showroom",
  dataIndex: 'showRoomName',
  key: 'showRoomName',
  render: (_, record) => {
    const isOutOfStock = record.showRoomName === "Products out of stock";
    return (
      <Tag color={isOutOfStock ? "red" : "green"} style={{ marginBottom: 4 }}>
        {record.showRoomName}
      </Tag>
    );
  },
},

   
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
 
      render: (status) => (
        <Tag color={status == 1 ? "success" : "error"}>
          {status == 1 ? 'In Stock' : 'Out of Stock'}
        </Tag>
      ),
    },
    {
      title: "Actions",
      key: "actions",
   
  
      render: (_, record) => (
        <Space size="small">
       
          <Tooltip title="View Details">
            <Button
              type="text"
              icon={<EyeOutlined />} 
              onClick={() => handleViewProductDetails(record)}
            />
          </Tooltip>
        </Space>
      ),
    }
  ];

  return (
    <div style={{ minHeight: '100vh' }}  className="min-h-screen overflow-y-auto px-4 py-6 bg-white">
    {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ 
          fontSize: '20px', 
          fontWeight: 700, 
          color: '#262626',
          margin: 0,
          marginBottom: '3px'
        }}>
          Products Management
        </h1>
        <p style={{ color: '#8c8c8c', margin: 0 }}>
          Manage your product inventory, pricing, and availability
        </p>
      </div>

      {/* Statistics Cards */}
      <Row gutter={16} style={{ marginBottom: '20px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Products"
              value={productStats.total}
              prefix={<TagsOutlined style={{ color: '#1890ff' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="In Stock"
              value={productStats.inStock}
              valueStyle={{ color: '#3f8600' }}
              prefix={<ShopOutlined style={{ color: '#3f8600' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Out of Stock"
              value={productStats.outOfStock}
              valueStyle={{ color: '#cf1322' }}
              prefix={<ShopOutlined style={{ color: '#cf1322' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Value"
              value={productStats.totalValue}
              precision={2}
              prefix="₵"
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters and Controls */}
      <Card style={{ marginBottom: '24px' }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={8}>
            <Input.Search
              placeholder="Search products, brands, showrooms..."
   
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: '100%' }}
            />
          </Col>
          
          <Col xs={24} sm={12} md={4}>
            <Select
              placeholder="Filter by Brand"
           
              style={{ width: '100%' }}
              value={filterBrand}
              onChange={setFilterBrand}
            >
              {brands?.map(brand => (
                <Option key={brand.brandID} value={brand.brandName}>
                  {brand.brandName}
                </Option>
              ))}
            </Select>
          </Col>

          <Col xs={24} sm={12} md={4}>
            <Select
              placeholder="Filter by Showroom"
             
              style={{ width: '100%' }}
              value={filterShowroom}
              onChange={setFilterShowroom}
            >
              {showrooms?.map(showroom => (
                <Option key={showroom.showRoomID} value={showroom.showRoomName}>
                  {showroom.showRoomName}
                </Option>
              ))}
            </Select>
          </Col>

          <Col xs={24} sm={12} md={4}>
            <Select
              placeholder="Stock Status"
              style={{ width: '100%' }}
              value={filterStock}
              onChange={setFilterStock}
            >
              <Option value="all">All Products</Option>
              <Option value="in_stock">In Stock Only</Option>
              <Option value="out_of_stock">Out of Stock Only</Option>
            </Select>
          </Col>

          <Col xs={24} md={4}>
            <Space>
             
            </Space>
          </Col>
        </Row>

        <Row gutter={16} style={{ marginTop: '16px' }}>
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
                disabled={filteredProducts.length === 0}
                type="dashed"
              >
                Export Excel
              </Button>
            </Space>
          </Col>
          
          <Col style={{ marginLeft: 'auto' }}>
            <span style={{ color: '#8c8c8c' }}>
              Showing {productStats.filtered} of {productStats.total} products
            </span>
          </Col>
        </Row>
      </Card>

      {/* Products Table */}
      <Card>
        <Table
          dataSource={filteredProducts}
          columns={columns}
          rowKey="productID"
          loading={isLoading}
          scroll={{ x: 'max-content' }}

          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} of ${total} products`,
            pageSizeOptions: ['10', '15', '25', '50'],
          }}
          size="small"
        />
      </Card>

     
      
      {/* Full Image Modal */}
      <Modal
        visible={isImageModalVisible}
        onCancel={() => setIsImageModalVisible(false)}
        footer={null}
        title="Product Image"
        width={600}
        centered
      >
        <img
          src={fullImageUrl}
          alt="Full Product"
          style={{ width: "100%", height: "auto", borderRadius: '8px' }}
        />
      </Modal>

      {/* Product Details Modal */}
      <Modal
        visible={isDetailModalVisible}
        onCancel={() => setIsDetailModalVisible(false)}
        footer={null}
        centered
        width={600}
        title="Product Detail"
      >
        {selectedProduct && (
          <div>
            <div style={{ textAlign: "center", marginBottom: '20px' }}>
              <img
                src={`${backendBaseURL}/Media/Products_Images/${selectedProduct.productImage?.split("\\").pop()}`}
                alt={selectedProduct.productName}
                style={{ 
                  width: "100%", 
                  maxHeight: "300px", 
                  objectFit: "cover",
                  borderRadius: '8px'
                }}
              />
            </div>

            <div>
              <h2 style={{ fontSize: "24px", fontWeight: 600, marginBottom: '16px' }}>
                {selectedProduct.productName}
              </h2>
              
              <Row gutter={[16, 12]}>
                <Col span={12}>
                  <strong>Product ID:</strong> {selectedProduct.productID}
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
                  <strong>Date Created:</strong> {new Date(selectedProduct.dateCreated).toLocaleDateString()}
                </Col>
                <Col span={12}>
                  <strong>Status:</strong> 
                  <Tag color={selectedProduct.status == 1 ? "success" : "error"} style={{ marginLeft: 8 }}>
                    {selectedProduct.status == 1 ? 'In Stock' : 'Out of Stock'}
                  </Tag>
                </Col>
              </Row>

              <div style={{ marginTop: '16px' }}>
                <div style={{ display: "flex", alignItems: "center", marginBottom: '16px' }}>
                  <span style={{ fontSize: "20px", fontWeight: 600, color: "#ff4d4f", marginRight: 16 }}>
                    ₵{parseFloat(selectedProduct.price).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                  {selectedProduct.oldPrice > 0 && (
                    <span style={{ fontSize: "16px", textDecoration: "line-through", color: "#999" }}>
                      ₵{parseFloat(selectedProduct.oldPrice).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <strong>Description:</strong>
                <p style={{ marginTop: '8px', lineHeight: '1.6', color: '#666' }}>
                  {selectedProduct.description}
                </p>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Full Description Modal */}
      <Modal
        visible={isDescriptionModalVisible}
        onCancel={() => setIsDescriptionModalVisible(false)}
        footer={null}
        title="Product Description"
        width={700}
      >
        <div style={{ maxHeight: "400px", overflowY: "auto" }}>
          <p style={{ whiteSpace: "pre-wrap", lineHeight: "1.6" }}>
            {descriptionText}
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default DigiProducts;