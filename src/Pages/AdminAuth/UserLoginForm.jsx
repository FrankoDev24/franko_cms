// src/pages/UserLoginForm.jsx
import { useState } from "react";
import { Form, Input, Button, message, Alert } from "antd";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import { loginUser } from "../../Redux/Slice/userSlice";
import logo from "../../assets/frankoIcon.png";

const UserLoginForm = () => {
  const [form] = Form.useForm();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading } = useSelector((state) => state.user);
  const [contact, setContact] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState(null);

  const onFinish = async () => {
    setLoginError(null);

    try {
      const userData = await dispatch(loginUser({ contact, password })).unwrap();

      message.success("Login successful!");

      const position = userData?.position;

      switch (position) {
        case "Supervisor":
          navigate("/admin/dashboard");
          break;
        case "Webcontentmanager":
          navigate("/content/dashboard");
          break;
        case "Fulfillment":
          navigate("/fulfillment/dashboard");
          break;
        case "Developer":
          navigate("/dev/dashboard");
          break;
        case "Social":
          navigate("/digi/orders");
          break;
        default:
          navigate("/");
      }
    } catch (error) {
      const errorMessage =
        error?.message || (typeof error === "string" ? error : null) || "Login failed. Please try again.";
      setLoginError(errorMessage);
      message.error(`Login failed: ${errorMessage}`);

      form.setFieldsValue({ password: "" });
      setPassword("");
    }
  };

  const onFinishFailed = (errorInfo) => {
    message.error("Please fill in all required fields!");
    console.error("Form validation failed:", errorInfo);
  };

  const handleContactChange = (e) => {
    const value = e.target.value;
    const formatted = value.replace(/\D/g, "");
    setContact(formatted);
    form.setFieldsValue({ contact: formatted });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100 px-4 py-8">
      <div className="max-w-md w-full bg-white shadow-2xl rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-green-200 to-green-300 px-8 py-6">
          <div className="text-center">
            <img src={logo} alt="Franko Trading Logo" className="mx-auto h-16 w-24 mb-3" />
            <h2 className="text-2xl font-bold text-white mb-1">Welcome Back</h2>
            <p className="text-green-100 text-sm">Sign in to your account</p>
          </div>
        </div>

        <div className="px-8 py-6">
          {loginError && (
            <Alert
              message="Login Failed"
              description={loginError}
              type="error"
              closable
              onClose={() => setLoginError(null)}
              className="mb-4"
              showIcon
            />
          )}

          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            onFinishFailed={onFinishFailed}
            className="space-y-4"
          >
            <Form.Item
              label={<span className="text-gray-700 font-medium">Contact Number</span>}
              name="contact"
              rules={[
                { required: true, message: "Please input your contact number!" },
                {
                  pattern: /^[0-9]{10,15}$/,
                  message: "Please enter a valid contact number (10-15 digits)",
                },
              ]}
            >
              <Input
                value={contact}
                onChange={handleContactChange}
                placeholder="Enter your contact number"
                prefix={<UserOutlined className="text-gray-400" />}
                size="large"
                className="rounded-lg"
                maxLength={15}
              />
            </Form.Item>

            <Form.Item
              label={<span className="text-gray-700 font-medium">Password</span>}
              name="password"
              rules={[
                { required: true, message: "Please input your password!" },
                { min: 4, message: "Password must be at least 4 characters" },
              ]}
            >
              <Input.Password
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                prefix={<LockOutlined className="text-gray-400" />}
                size="large"
                className="rounded-lg"
              />
            </Form.Item>

            <Form.Item className="mb-0">
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                disabled={loading}
                className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 border-none h-12 rounded-lg font-semibold text-base shadow-md hover:shadow-lg transition-all duration-300"
                size="large"
              >
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </Form.Item>
          </Form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">or</span>
            </div>
          </div>

          <div className="text-center">
            <p className="text-gray-600 text-sm">
              Don't have an account?{" "}
              <Link
                to="/admin/process"
                className="text-green-600 hover:text-green-700 font-semibold transition-colors"
              >
                Sign Up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserLoginForm;
