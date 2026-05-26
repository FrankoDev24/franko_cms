import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Table,
  Form,
  Input,
  Button,
  Upload,
  message,
  Modal,
  Select,
  Image,
} from "antd";
import { UploadOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import {
  postAdvertisment,
  getAdvertisment,
  putAdvertisment,
} from "../../Redux/Slice/advertismentSlice";

const { Option } = Select;
const adOptions = [
  "Home Page",
  "Banner",
  "Phone Page",
  "Laptop Page",
  "Tablet Page",
];

const backendBaseURL = "https://cms.frankotrading.com";

const AdvertisementPage = () => {
  const dispatch = useDispatch();
  const { advertisments, loading } = useSelector((state) => state.advertisment);

  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [selectedAd, setSelectedAd] = useState(null);
  const [selectedAdsName, setSelectedAdsName] = useState("Banner");
  const [previewLogo, setPreviewLogo] = useState(null);
  const [isImageModalVisible, setIsImageModalVisible] = useState(false);

  // =========================
  // FETCH ADS
  // =========================
  useEffect(() => {
    dispatch(getAdvertisment(selectedAdsName))
      .unwrap()
      .catch(() => message.error("Failed to fetch advertisements"));
  }, [selectedAdsName, dispatch]);

  // =========================
  // ADD ADVERTISEMENT
  // =========================
  const handlePost = async (values) => {
    try {
      const formData = new FormData();
      formData.append("AdsName", values.AdsName);
      formData.append("IndexOrder", values.IndexOrder);
      formData.append("AdsNote", values.AdsNote || "");

      if (values.FileName && values.FileName.length > 0) {
        formData.append("FileName", values.FileName[0].originFileObj);
      } else {
        message.error("Please upload an image");
        return;
      }

      await dispatch(postAdvertisment(formData)).unwrap();
      message.success("Advertisement added successfully");
      form.resetFields();
      setAddModalVisible(false);
      dispatch(getAdvertisment(values.AdsName));
    } catch (error) {
      message.error(error || "Failed to add advertisement");
    }
  };

  // =========================
  // OPEN EDIT MODAL
  // =========================
  const handleEditClick = (record) => {
    console.log("Edit Record:", record);
    setSelectedAd(record);
    editForm.setFieldsValue({
      AdsName: record.adsName,
      IndexOrder: record.indexOrder,
      AdsNote: record.adsNote,
    });
    setEditModalVisible(true);
  };

  // =========================
  // ✅ FIXED: UPDATE ADVERTISEMENT
  // =========================
  const handleEdit = async (values) => {
    try {
      if (!selectedAd?.fileId) {
        message.error("File ID missing");
        return;
      }

      // ✅ FIX: values.FileName is the array directly
      let uploadedFile = null;
      if (values.FileName && values.FileName.length > 0) {
        uploadedFile = values.FileName[0].originFileObj;
      }

      if (!uploadedFile) {
        message.warning("Please select a new image to upload");
        return;
      }

      await dispatch(
        putAdvertisment({
          Fileid: selectedAd.fileId,
          AdsName: values.AdsName,
          IndexOrder: values.IndexOrder,
          AdsNote: values.AdsNote,
          FileName: uploadedFile,
        })
      ).unwrap();

      message.success("Advertisement updated successfully");
      setEditModalVisible(false);
      setSelectedAd(null);
      dispatch(getAdvertisment(selectedAdsName));
    } catch (error) {
      console.error("Update error:", error);
      message.error(error || "Failed to update advertisement");
    }
  };

  // =========================
  // IMAGE PREVIEW
  // =========================
  const handleImageClick = (imageUrl) => {
    setPreviewLogo(imageUrl);
    setIsImageModalVisible(true);
  };

  // =========================
  // TABLE COLUMNS
  // =========================
  const columns = [
    { title: "File ID", dataIndex: "fileId", key: "fileId" },
    { title: "Ads Name", dataIndex: "adsName", key: "adsName" },
    { title: "Ads Note", dataIndex: "adsNote", key: "adsNote" },
    {
      title: "Image",
      dataIndex: "fileName",
      key: "fileName",
      render: (fileName) => {
        if (!fileName) return <span>No Image</span>;
        const cleanFileName = fileName.split("\\").pop();
        const imageUrl = `${backendBaseURL}/Media/Ads/${cleanFileName}`;
        return (
          <img
            src={imageUrl}
            alt="Ad"
            style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 8, cursor: "pointer" }}
            onClick={() => handleImageClick(imageUrl)}
          />
        );
      },
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Button
          type="primary"
          icon={<EditOutlined />}
          onClick={() => handleEditClick(record)}
        >
          Edit
        </Button>
      ),
    },
  ];

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Manage Advertisements</h2>

      {/* TOP BAR */}
      <div className="mb-4 flex gap-4">
        <Select value={selectedAdsName} onChange={setSelectedAdsName} style={{ width: 250 }}>
          {adOptions.map((option) => (
            <Option key={option} value={option}>{option}</Option>
          ))}
        </Select>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddModalVisible(true)}>
          Add Advertisement
        </Button>
      </div>

      {/* TABLE */}
      <Table
        dataSource={advertisments || []}
        columns={columns}
        rowKey="fileId"
        loading={loading}
        bordered
      />

      {/* ADD MODAL */}
      <Modal
        title="Add Advertisement"
        open={addModalVisible}
        footer={null}
        onCancel={() => setAddModalVisible(false)}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handlePost}>
          <Form.Item name="AdsName" label="Advertisement Name" rules={[{ required: true }]}>
            <Select>
              {adOptions.map((option) => (
                <Option key={option} value={option}>{option}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="IndexOrder" label="Index Order" rules={[{ required: true }]}>
            <Input type="number" />
          </Form.Item>
          <Form.Item name="AdsNote" label="Advertisement Note">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item
            name="FileName"
            label="Upload Image"
            valuePropName="fileList"
            getValueFromEvent={(e) => e?.fileList || e}
            rules={[{ required: true, message: "Image required" }]}
          >
            <Upload beforeUpload={() => false} maxCount={1} listType="text">
              <Button icon={<UploadOutlined />}>Upload Image</Button>
            </Upload>
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} icon={<PlusOutlined />} block>
            Add Advertisement
          </Button>
        </Form>
      </Modal>

      {/* ✅ EDIT MODAL — FIXED */}
      <Modal
        title="Edit Advertisement"
        open={editModalVisible}
        footer={null}
        onCancel={() => {
          setEditModalVisible(false);
          setSelectedAd(null);
          editForm.resetFields();
        }}
        destroyOnClose
        maskClosable={false}
      >
        <Form form={editForm} layout="vertical" onFinish={handleEdit}>
          <Form.Item name="AdsName" label="Advertisement Name" rules={[{ required: true }]}>
            <Select>
              {adOptions.map((option) => (
                <Option key={option} value={option}>{option}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="IndexOrder" label="Index Order" rules={[{ required: true }]}>
            <Input type="number" />
          </Form.Item>
          <Form.Item name="AdsNote" label="Advertisement Note">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item
            name="FileName"
            label="Upload New Image"
            valuePropName="fileList"
            getValueFromEvent={(e) => e?.fileList || e}
            rules={[{ required: true, message: "New image required" }]}
          >
            <Upload beforeUpload={() => false} maxCount={1} listType="text">
              <Button icon={<UploadOutlined />}>Select New Image</Button>
            </Upload>
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block>
            Update Advertisement
          </Button>
        </Form>
      </Modal>

      {/* IMAGE PREVIEW */}
      <Modal
        open={isImageModalVisible}
        footer={null}
        onCancel={() => setIsImageModalVisible(false)}
      >
        <Image src={previewLogo} alt="Preview" style={{ width: "100%", borderRadius: 8 }} />
      </Modal>
    </div>
  );
};

export default AdvertisementPage;