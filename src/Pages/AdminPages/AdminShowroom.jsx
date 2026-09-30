import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchBrands } from "../../Redux/Slice/brandSlice";
import {
  fetchShowrooms,
  addShowroom,
  updateShowroom,
} from "../../Redux/Slice/showRoomSlice";
import {
  Button,
  Select,
  Typography,
  message,
  Spin,
  Modal,
  Form,
  Input,
  Pagination,
  Table,
  Card,
  Space,
  Tag,
  Tooltip,
  Row,
  Col,
} from "antd";
import { v4 as uuidv4 } from "uuid";
import { DatePicker } from "antd";
import dayjs from "dayjs";

import { 
  EditOutlined, 
  PlusOutlined, 
  EyeOutlined,
  CalendarOutlined,
  BgColorsOutlined,
  ShopOutlined,
  HomeOutlined,
  ReloadOutlined,
  ClockCircleOutlined
} from "@ant-design/icons";

const { Title, Text } = Typography;

// ---------------------------------------------------------------------------
// Auto color helpers — "auto display any color code"
// ---------------------------------------------------------------------------
const hslToHex = (h, s, l) => {
  const sat = s / 100;
  const lig = l / 100;
  const a = sat * Math.min(lig, 1 - lig);
  const k = (n) => (n + h / 30) % 12;
  const f = (n) => {
    const c = lig - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return Math.round(255 * c).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
};

// Pleasant random hex color (well-saturated, readable as a header background).
const generateRandomColor = () => {
  const h = Math.floor(Math.random() * 360);
  const s = 60 + Math.floor(Math.random() * 30); // 60–89%
  const l = 35 + Math.floor(Math.random() * 25); // 35–59%
  return hslToHex(h, s, l);
};

const isHexColor = (value) => /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value || "");

// Native <input type="color"> requires a lowercase #rrggbb value.
const toPickerValue = (value) => {
  if (!isHexColor(value)) return "#000000";
  if (value.length === 4) {
    const [, r, g, b] = value;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return value.toLowerCase();
};

const AdminShowroom = () => {
  const dispatch = useDispatch();
  const { brands, loading: loadingBrands } = useSelector((state) => state.brands);
  const { showrooms, loading: loadingShowrooms } = useSelector((state) => state.showrooms);

  const [form] = Form.useForm();
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentShowroom, setCurrentShowroom] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const showroomsPerPage = 8;

  // Live "today's date & time" clock shown on the page header.
  const [now, setNow] = useState(dayjs());
  useEffect(() => {
    const timer = setInterval(() => setNow(dayjs()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Live form values for the auto-updating preview strip inside the modal.
  const watchedColor = Form.useWatch("headerColorCode", form);
  const watchedEnd = Form.useWatch("elaspedTime", form);
  const watchedName = Form.useWatch("showRoomName", form);

  useEffect(() => {
    dispatch(fetchBrands());
    dispatch(fetchShowrooms());
  }, [dispatch]);

  // ---------------------------------------------------------------------------
  // AUTO-FILL on Create: today's date & time for "Sales End Date & Time"
  // and an automatically generated header color code.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (modalVisible && !isEditing) {
      form.resetFields();
      form.setFieldsValue({
        elaspedTime: dayjs(),                 // today's date and time
        headerColorCode: generateRandomColor(), // any color code, auto-displayed
      });
    }
  }, [modalVisible, isEditing, form]);

  // Keep the page number valid when the list shrinks after a refresh.
  const totalPages = Math.max(1, Math.ceil((showrooms?.length || 0) / showroomsPerPage));
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const onFinish = (values) => {
    const showRoomID = currentShowroom ? currentShowroom.showRoomID : uuidv4();

    const showroomData = {
      Showroomid: showRoomID,
      ...values,
      elaspedTime: values.elaspedTime
        ? dayjs(values.elaspedTime).toISOString()
        : new Date().toISOString(),
    };

    if (isEditing) {
      dispatch(updateShowroom({ showRoomID, ...showroomData }))
        .unwrap()
        .then(() => {
          message.success({
            content: "Showroom updated successfully!",
            style: { marginTop: '10vh' },
          });
          resetForm();
        })
        .catch((error) => {
          message.error({
            content: "Failed to update showroom: " + error.message,
            style: { marginTop: '10vh' },
          });
        });
    } else {
      dispatch(addShowroom(showroomData))
        .unwrap()
        .then(() => {
          message.success({
            content: "Showroom added successfully!",
            style: { marginTop: '10vh' },
          });
          resetForm();
        })
        .catch((error) => {
          message.error({
            content: "Failed to add showroom: " + error.message,
            style: { marginTop: '10vh' },
          });
        });
    }
  };

  const handleEditShowroom = (showroom) => {
    setCurrentShowroom(showroom);
    form.setFieldsValue({
      showRoomID: showroom.showRoomID,
      showRoomName: showroom.showRoomName,
      brandId: showroom.brandId,
      showAtHomePage: showroom.showAtHomePage,
      orderIndex: showroom.orderIndex,
      // Keep the existing values; auto-fill only when missing.
      headerColorCode: showroom.headerColorCode || generateRandomColor(),
      elaspedTime:
        showroom.elaspedTime && dayjs(showroom.elaspedTime).isValid()
          ? dayjs(showroom.elaspedTime)
          : dayjs(),
    });
    setIsEditing(true);
    setModalVisible(true);
  };

  const resetForm = () => {
    form.resetFields();
    setModalVisible(false);
    setIsEditing(false);
    setCurrentShowroom(null);
    dispatch(fetchShowrooms());
  };

  const showroomsList = Array.isArray(showrooms) ? showrooms : [];
  const brandsList = Array.isArray(brands) ? brands : [];

  const showroomsWithBrandNames = showroomsList.map((showroom) => {
    const brand = brandsList.find((b) => b.brandId === showroom.brandId);
    return {
      ...showroom,
      brandName: brand ? brand.brandName : "Unknown",
    };
  });

  const indexOfLastShowroom = currentPage * showroomsPerPage;
  const indexOfFirstShowroom = indexOfLastShowroom - showroomsPerPage;
  const currentShowrooms = showroomsWithBrandNames.slice(
    indexOfFirstShowroom,
    indexOfLastShowroom
  );

  const columns = [
    {
      title: (
        <Space>
          <ShopOutlined className="text-blue-600" />
          <span className="font-semibold">Showroom</span>
        </Space>
      ),
      dataIndex: "showRoomName",
      key: "showRoomName",
      render: (text) => (
        <Text strong className="text-gray-800">{text}</Text>
      ),
    },
    {
      title: (
        <Space>
          <BgColorsOutlined className="text-green-600" />
          <span className="font-semibold">Brand</span>
        </Space>
      ),
      dataIndex: "brandName",
      key: "brandName",
      render: (text) => (
        <Tag color="red" className="px-3 py-1 rounded-full font-medium">
          {text}
        </Tag>
      ),
    },
    {
      title: (
        <Space>
          <HomeOutlined className="text-green-600" />
          <span className="font-semibold">Homepage</span>
        </Space>
      ),
      dataIndex: "showAtHomePage",
      key: "showAtHomePage",
      render: (value) => (
        <Tag 
          color={value === 1 ? "success" : "default"} 
          className="px-3 py-1 rounded-full font-medium"
        >
          <Space>
            <EyeOutlined />
            {value === 1 ? "Visible" : "Hidden"}
          </Space>
        </Tag>
      ),
    },
    {
      title: (
        <Space>
          <span className="font-semibold">Order</span>
        </Space>
      ),
      dataIndex: "orderIndex",
      key: "orderIndex",
      render: (value) => (
        <div className="text-center">
          <span className="bg-gray-100 px-3 py-1 rounded-full font-medium text-gray-700">
            #{value}
          </span>
        </div>
      ),
    },
    {
      title: (
        <Space>
          <BgColorsOutlined className="text-orange-600" />
          <span className="font-semibold">Color</span>
        </Space>
      ),
      dataIndex: "headerColorCode",
      key: "headerColorCode",
      render: (color) => (
        <Space>
          <div 
            className="w-6 h-6 rounded-full border-2 border-gray-300 shadow-sm"
            style={{ backgroundColor: color }}
          />
          <Text code className="text-gray-600">{color}</Text>
        </Space>
      ),
    },
    {
      title: (
        <Space>
          <CalendarOutlined className="text-red-600" />
          <span className="font-semibold">Sales End</span>
        </Space>
      ),
      dataIndex: "elaspedTime",
      key: "elaspedTime",
      render: (date) => (
        <div className="text-sm">
          {dayjs(date).isValid() ? (
            <div>
              <div className="font-medium text-gray-800">
                {dayjs(date).format("MMM DD, YYYY")}
              </div>
              <div className="text-gray-500">
                {dayjs(date).format("HH:mm:ss")}
              </div>
            </div>
          ) : (
            <Text type="secondary">N/A</Text>
          )}
        </div>
      ),
    },
    {
      title: (
        <span className="font-semibold">Actions</span>
      ),
      key: "actions",
      width: 120,
      render: (_, showroom) => (
        <Tooltip title="Edit Showroom">
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={() => handleEditShowroom(showroom)}
            className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 border-0 shadow-md hover:shadow-lg transition-all duration-200"
            shape="round"
          >
            Edit
          </Button>
        </Tooltip>
      ),
    },
  ];

  if (loadingBrands || loadingShowrooms) {
    return (
      <div className="min-h-screen  flex items-center justify-center">
        <Card className="text-center p-8 shadow-lg border-0">
          <Spin size="large" />
          <div className="mt-4">
            <Text className="text-gray-600">Loading showrooms...</Text>
          </div>
        </Card>
      </div>
    );
  }

  const colorPreview = isHexColor(watchedColor) ? watchedColor : "#9CA3AF";
  const endPreview = watchedEnd && dayjs(watchedEnd).isValid() ? dayjs(watchedEnd) : null;

  return (
    <div className="min-h-screen p-2">
      <div className=" mx-auto">
        {/* Header Section */}
        <Card className=" ">
          <Row align="middle" justify="space-between">
            <Col>
              <Space size="large">
                <div className="p-3 bg-green-200 bg-opacity-20 rounded-md">
                  <ShopOutlined className="text-xl text-green-500" />
                </div>
                <div>
                  <Title level={4} className="!text-gray-800 !mb-0">
                    Showroom Management
                  </Title>
                  <Text className="text-red-600">
                    Manage showrooms and brand displays
                  </Text>
                </div>
              </Space>
            </Col>
            <Col>
              <Space size="middle" align="center">
                {/* Auto-displayed today's date & time (live clock) */}
                <div className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-center">
                  <div className="flex items-center gap-2 text-gray-600">
                    <ClockCircleOutlined className="text-green-600" />
                    <Text className="!text-gray-700 font-semibold">
                      {now.format("ddd, MMM DD, YYYY")}
                    </Text>
                    <Text className="!text-green-600 font-bold tabular-nums">
                      {now.format("HH:mm:ss")}
                    </Text>
                  </div>
                  <Text type="secondary" className="!text-xs">
                    Today’s date &amp; time
                  </Text>
                </div>

                <Button
                  type="primary"
                  size="large"
                  icon={<PlusOutlined />}
                  onClick={() => {
                    setModalVisible(true);
                    setIsEditing(false);
                  }}
                  className="bg-white text-red-600 border-0 hover:bg-gray-100 shadow-md hover:shadow-lg transition-all duration-200 font-semibold"
                  shape="round"
                >
                  Add New Showroom
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* Stats Cards */}
        <Row gutter={[16, 16]} className="mb-6">
          <Col xs={24} sm={12} md={6}>
            <Card className="text-center border-0 shadow-md hover:shadow-lg transition-shadow duration-200">
              <div className="p-2">
                <div className="text-2xl font-bold text-green-600">
                  {showroomsWithBrandNames.length}
                </div>
                <Text className="text-gray-600">Total Showrooms</Text>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card className="text-center border-0 shadow-md hover:shadow-lg transition-shadow duration-200">
              <div className="p-2">
                <div className="text-2xl font-bold text-green-600">
                  {showroomsWithBrandNames.filter(s => s.showAtHomePage === 1).length}
                </div>
                <Text className="text-gray-600">On Homepage</Text>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card className="text-center border-0 shadow-md hover:shadow-lg transition-shadow duration-200">
              <div className="p-2">
                <div className="text-2xl font-bold text-green-600">
                  {brandsList.length}
                </div>
                <Text className="text-gray-600">Total Brands</Text>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card className="text-center border-0 shadow-md hover:shadow-lg transition-shadow duration-200">
              <div className="p-2">
                <div className="text-2xl font-bold text-green-600">
                  {Math.ceil(showroomsWithBrandNames.length / showroomsPerPage)}
                </div>
                <Text className="text-gray-600">Total Pages</Text>
              </div>
            </Card>
          </Col>
        </Row>

        {/* Main Table */}
        <Card className="border-0 shadow-lg">
          <Table
            columns={columns}
            dataSource={currentShowrooms}
            rowKey="showRoomID"
            pagination={false}
            className="custom-table"
            rowClassName="hover:bg-blue-50 transition-colors duration-200"
            scroll={{ x: 800 }}
          />
          
          {showroomsWithBrandNames.length > showroomsPerPage && (
            <div className="mt-6 text-center">
              <Pagination
                current={currentPage}
                onChange={(page) => setCurrentPage(page)}
                pageSize={showroomsPerPage}
                total={showroomsWithBrandNames.length}
                showSizeChanger={false}
                showTotal={(total, range) => 
                  `Showing ${range[0]}-${range[1]} of ${total} showrooms`
                }
                className="custom-pagination"
              />
            </div>
          )}
        </Card>

        {/* Modal */}
        <Modal
          title={
            <Space className="text-lg">
              <ShopOutlined className={isEditing ? "text-red-600" : "text-green-600"} />
              {isEditing ? "Update Showroom" : "Create New Showroom"}
            </Space>
          }
          open={modalVisible}
          onCancel={resetForm}
          footer={null}
          width={500}
          className="custom-modal"
        >
          <Form form={form} layout="vertical" onFinish={onFinish} className="mt-4">
            <Form.Item label="Showroom ID" name="showRoomID" hidden>
              <Input disabled />
            </Form.Item>

            <Form.Item
              label={
                <Space>
                  <ShopOutlined className="text-green-600" />
                  <span>Showroom Name</span>
                </Space>
              }
              name="showRoomName"
              rules={[{ required: true, message: "Please input the showroom name!" }]}
            >
              <Input 
                placeholder="Enter showroom name" 
                className="rounded-lg"
                size="large"
              />
            </Form.Item>

            <Form.Item
              label={
                <Space>
                  <BgColorsOutlined className="text-green-600" />
                  <span>Brand</span>
                </Space>
              }
              name="brandId"
              rules={[{ required: true, message: "Please select a brand!" }]}
            >
              <Select 
                placeholder="Select a brand" 
                className="rounded-lg"
                size="large"
                showSearch
                filterOption={(input, option) =>
                  option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                }
              >
                {brandsList.map((brand) => (
                  <Select.Option key={brand.brandId} value={brand.brandId}>
                    {brand.brandName}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item 
                  label={
                    <Space>
                      <HomeOutlined className="text-green-600" />
                      <span>Show on Homepage</span>
                    </Space>
                  } 
                  name="showAtHomePage"
                >
                  <Select 
                    placeholder="Select visibility" 
                    className="rounded-lg"
                    size="large"
                  >
                    <Select.Option value={1}>
                      <Space>
                        <EyeOutlined className="text-green-600" />
                        Yes
                      </Space>
                    </Select.Option>
                    <Select.Option value={0}>
                      <Space>
                        <EyeOutlined className="text-gray-400" />
                        No
                      </Space>
                    </Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Order Index"
                  name="orderIndex"
                  rules={[{ required: true, message: "Please input the order index!" }]}
                >
                  <Input 
                    type="number" 
                    placeholder="Enter order index" 
                    className="rounded-lg"
                    size="large"
                  />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              label={
                <Space>
                  <BgColorsOutlined className="text-green-600" />
                  <span>Header Color Code</span>
                  <Text type="secondary" className="!text-xs">
                    (auto-generated — regenerate or pick any color)
                  </Text>
                </Space>
              }
              name="headerColorCode"
              rules={[{ required: true, message: "Please input the header color code!" }]}
            >
              <Input
                placeholder="Enter header color code (e.g., #FF5733)"
                className="rounded-lg"
                size="large"
                style={{ fontFamily: "monospace" }}
                addonBefore={
                  // Auto-displayed color swatch for the current code
                  <span
                    className="inline-block w-5 h-5 rounded-full border"
                    style={{
                      backgroundColor: isHexColor(watchedColor) ? watchedColor : "#9CA3AF",
                      borderColor: "rgba(0,0,0,0.15)",
                    }}
                  />
                }
                addonAfter={
                  <Space size={4}>
                    <Tooltip title="Generate another color">
                      <Button
                        htmlType="button"
                        size="small"
                        type="text"
                        icon={<ReloadOutlined />}
                        onClick={() =>
                          form.setFieldsValue({ headerColorCode: generateRandomColor() })
                        }
                      />
                    </Tooltip>
                    <Tooltip title="Pick a color">
                      <input
                        type="color"
                        value={toPickerValue(watchedColor)}
                        onChange={(e) =>
                          form.setFieldsValue({
                            headerColorCode: e.target.value.toUpperCase(),
                          })
                        }
                        style={{
                          width: 28,
                          height: 24,
                          padding: 0,
                          border: "none",
                          background: "none",
                          cursor: "pointer",
                        }}
                      />
                    </Tooltip>
                  </Space>
                }
              />
            </Form.Item>

            <Form.Item
              label={
                <Space>
                  <CalendarOutlined className="text-red-600" />
                  <span>Sales End Date &amp; Time</span>
                  <Text type="secondary" className="!text-xs">
                    (auto-filled with today’s date &amp; time)
                  </Text>
                </Space>
              }
              name="elaspedTime"
              rules={[{ required: true, message: "Please select the elapsed time!" }]}
            >
              <DatePicker
                showTime
                format="YYYY-MM-DD HH:mm:ss"
                className="w-full rounded-lg"
                size="large"
                placeholder="Select date & time (defaults to now)"
              />
            </Form.Item>

            {/* Live preview — auto-displays the selected color and end date/time */}
            <div className="mb-4 rounded-lg border border-gray-200 overflow-hidden">
              <div
                className="px-4 py-2 font-semibold text-white truncate"
                style={{ backgroundColor: colorPreview }}
              >
                {watchedName || "Showroom Header"} 
              </div>
              <div className="px-4 py-2 flex items-center justify-between bg-gray-50">
                <Space size={8}>
                  <span
                    className="inline-block w-4 h-4 rounded-full border"
                    style={{
                      backgroundColor: colorPreview,
                      borderColor: "rgba(0,0,0,0.15)",
                    }}
                  />
                  <Text code className="text-gray-600">
                    {watchedColor || "—"}
                  </Text>
                </Space>
                <Space size={6}>
                  <CalendarOutlined className="text-red-600" />
                  <Text className="text-gray-600">
                    Sale ends:{" "}
                    {endPreview ? endPreview.format("MMM DD, YYYY HH:mm:ss") : "—"}
                  </Text>
                </Space>
              </div>
            </div>

            <Form.Item className="mb-0 mt-6">
              <Button 
                type="primary" 
                htmlType="submit" 
                size="large"
                className={`w-full font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 ${
                  isEditing 
                    ? "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 border-0" 
                    : "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 border-0"
                }`}
              >
                {isEditing ? "Update Showroom" : "Create Showroom"}
              </Button>
            </Form.Item>
          </Form>
        </Modal>
      </div>

      <style jsx>{`
        .custom-table .ant-table-thead > tr > th {
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          border-bottom: 2px solid #e2e8f0;
          font-weight: 600;
        }
        
        .custom-table .ant-table-tbody > tr:hover > td {
          background-color: #eff6ff !important;
        }
        
        .custom-pagination .ant-pagination-item-active {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          border-color: #3b82f6;
        }
        
        .custom-pagination .ant-pagination-item-active a {
          color: white;
        }
        
        .custom-modal .ant-modal-header {
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          border-bottom: 1px solid #e2e8f0;
        }
      `}</style>
    </div>
  );
};

export default AdminShowroom;
