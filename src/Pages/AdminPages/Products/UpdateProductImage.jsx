import { useState, useEffect } from "react";
import { Modal, Upload, Button, Form, notification} from "antd";
import { UploadOutlined, SwapOutlined, PictureOutlined } from "@ant-design/icons";
import { useDispatch } from "react-redux";
import { updateProductImage } from "../../../Redux/Slice/productSlice";

const backendBaseURL = "https://cms.frankotrading.com";

const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  const fileName = String(imagePath).split("\\").pop().split("/").pop();
  return `${backendBaseURL}/Media/Products_Images/${fileName}`;
};

const UpdateProductImage = ({ visible, open, onClose, productID, product }) => {
  const [imageFile, setImageFile] = useState(null);
  const [newPreviewUrl, setNewPreviewUrl] = useState(null);
  const [currentImageUrl, setCurrentImageUrl] = useState(null);
  const [currentImageError, setCurrentImageError] = useState(false);
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();

  // Derive the current product image URL whenever the modal opens or product changes
  useEffect(() => {
    if (open || visible) {
      const url = getImageUrl(product?.productImage);
      setCurrentImageUrl(url);
      setCurrentImageError(false);
      // Reset new-image state when modal re-opens
      setImageFile(null);
      setNewPreviewUrl(null);
    }
  }, [open, visible, product]);

  // Clean up object URL on unmount or when file changes
  useEffect(() => {
    return () => {
      if (newPreviewUrl) URL.revokeObjectURL(newPreviewUrl);
    };
  }, [newPreviewUrl]);

  const handleFileChange = ({ fileList }) => {
    if (fileList.length > 0) {
      const selectedFile = fileList[0].originFileObj;
      setImageFile(selectedFile);
      if (newPreviewUrl) URL.revokeObjectURL(newPreviewUrl);
      setNewPreviewUrl(URL.createObjectURL(selectedFile));
    } else {
      setImageFile(null);
      if (newPreviewUrl) URL.revokeObjectURL(newPreviewUrl);
      setNewPreviewUrl(null);
    }
  };

  const handleSubmit = async () => {
    if (!productID || !imageFile) {
      notification.error({
        message: "No image selected",
        description: "Please choose an image file before updating.",
      });
      return;
    }

    setLoading(true);
    try {
      await dispatch(updateProductImage({ productID, imageFile })).unwrap();
      notification.success({
        message: "Image Updated",
        description: "Product image has been updated successfully.",
      });
      onClose(true); // pass true so parent can refresh
    } catch (error) {
      console.error("Image update error:", error);
      notification.error({
        message: "Update Failed",
        description: error?.message || "Failed to update product image.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (newPreviewUrl) URL.revokeObjectURL(newPreviewUrl);
    setImageFile(null);
    setNewPreviewUrl(null);
    onClose();
  };

  const isOpen = open || visible;
  const hasNewImage = !!newPreviewUrl;

  return (
    <Modal
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <PictureOutlined style={{ color: "#52c41a" }} />
          <span>Update Product Image</span>
        </div>
      }
      open={isOpen}
      onCancel={handleCancel}
      footer={null}
      width={520}
      centered
      destroyOnClose
    >
      <Form layout="vertical" onFinish={handleSubmit}>

        {/* ── Image Preview Area ── */}
        <div style={{ marginBottom: 20 }}>

          {/* Show side-by-side only when a new image has been chosen */}
          {hasNewImage ? (
            <div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto 1fr",
                  gap: 12,
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                {/* Current image */}
                <div>
                  <p
                    style={{
                      textAlign: "center",
                      fontSize: 12,
                      color: "#8c8c8c",
                      margin: "0 0 6px",
                      fontWeight: 500,
                    }}
                  >
                    Current
                  </p>
                  <div
                    style={{
                      border: "1px solid #f0f0f0",
                      borderRadius: 8,
                      overflow: "hidden",
                      background: "#fafafa",
                      aspectRatio: "4/3",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {currentImageUrl && !currentImageError ? (
                      <img
                        src={currentImageUrl}
                        alt="Current"
                        onError={() => setCurrentImageError(true)}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <div style={{ textAlign: "center", color: "#bfbfbf", padding: 12 }}>
                        <PictureOutlined style={{ fontSize: 28 }} />
                        <p style={{ margin: "6px 0 0", fontSize: 11 }}>No image</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Arrow */}
                <SwapOutlined style={{ color: "#52c41a", fontSize: 20 }} />

                {/* New image */}
                <div>
                  <p
                    style={{
                      textAlign: "center",
                      fontSize: 12,
                      color: "#52c41a",
                      margin: "0 0 6px",
                      fontWeight: 500,
                    }}
                  >
                    New
                  </p>
                  <div
                    style={{
                      border: "2px solid #52c41a",
                      borderRadius: 8,
                      overflow: "hidden",
                      aspectRatio: "4/3",
                    }}
                  >
                    <img
                      src={newPreviewUrl}
                      alt="New"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* No new image selected — show current image full-width */
            <div>
              <p
                style={{
                  fontSize: 13,
                  color: "#595959",
                  marginBottom: 8,
                  fontWeight: 500,
                }}
              >
                Current Image
              </p>
              <div
                style={{
                  border: "1px solid #f0f0f0",
                  borderRadius: 8,
                  overflow: "hidden",
                  background: "#fafafa",
                  width: "100%",
                  maxHeight: 220,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {currentImageUrl && !currentImageError ? (
                  <img
                    src={currentImageUrl}
                    alt={product?.productName || "Product"}
                    onError={() => setCurrentImageError(true)}
                    style={{
                      width: "100%",
                      maxHeight: 220,
                      objectFit: "contain",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      padding: "40px 20px",
                      textAlign: "center",
                      color: "#bfbfbf",
                    }}
                  >
                    <PictureOutlined style={{ fontSize: 40 }} />
                    <p style={{ margin: "8px 0 0", fontSize: 13 }}>
                      No current image
                    </p>
                  </div>
                )}
              </div>

              {product?.productName && (
                <p
                  style={{
                    marginTop: 6,
                    fontSize: 12,
                    color: "#8c8c8c",
                    textAlign: "center",
                  }}
                >
                  {product.productName}
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Upload Control ── */}
        <Form.Item label="Select New Image" style={{ marginBottom: 16 }}>
          <Upload
            beforeUpload={() => false}
            onChange={handleFileChange}
            maxCount={1}
            accept="image/*"
            showUploadList={false}
          >
            <Button icon={<UploadOutlined />} style={{ width: "100%" }}>
              {imageFile ? "Change Selected Image" : "Choose Image File"}
            </Button>
          </Upload>
          {imageFile && (
            <p style={{ marginTop: 6, fontSize: 12, color: "#52c41a" }}>
              ✓ {imageFile.name}
            </p>
          )}
        </Form.Item>

        {/* ── Submit ── */}
        <Button
          className="w-full"
          htmlType="submit"
          loading={loading}
          disabled={!imageFile}
          style={{
            width: "100%",
            backgroundColor: imageFile ? "#52c41a" : undefined,
            borderColor: imageFile ? "#52c41a" : undefined,
            color: imageFile ? "#fff" : undefined,
            fontWeight: 500,
            height: 40,
          }}
        >
          {loading ? "Updating..." : "Update Image"}
        </Button>
      </Form>
    </Modal>
  );
};

export default UpdateProductImage;