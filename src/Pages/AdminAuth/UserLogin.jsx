import { useState, useEffect, useRef } from "react";
import { Form, Input, Button, message, Alert, Modal, Progress, Typography } from "antd";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import {
  UserOutlined,
  LockOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  LoadingOutlined,
} from "@ant-design/icons";
import {
  loginUser,
  getUserById,
  setUser,
  updateUserPassword,
  clearError,
} from "../../Redux/Slice/userSlice";
import logo from "../../assets/frankoIcon.png";
import withAccessCode from "../../Component/withAccessCode";

const { Text } = Typography;

/* ==================== STYLES ==================== */

const STYLES = `
  .fl-root * { box-sizing: border-box; }

  .fl-root {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background:
      radial-gradient(circle at top left, rgba(34,197,94,0.12), transparent 28%),
      radial-gradient(circle at bottom right, rgba(21,128,61,0.10), transparent 30%),
      linear-gradient(135deg, #f6fff8 0%, #eefbf1 45%, #f8fafc 100%);
    padding: 24px;
  }

  .fl-card {
    width: 100%;
    max-width: 460px;
    background: rgba(255,255,255,0.92);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(22,163,74,0.08);
    border-radius: 24px;
    overflow: hidden;
    box-shadow:
      0 10px 30px rgba(15,23,42,0.08),
      0 20px 60px rgba(15,23,42,0.10);
  }

  .fl-header {
    background: linear-gradient(135deg, #166534 0%, #16a34a 55%, #22c55e 100%);
    padding: 32px 28px 26px;
    position: relative;
    overflow: hidden;
  }

  .fl-header::before {
    content: "";
    position: absolute;
    width: 180px;
    height: 180px;
    border-radius: 50%;
    background: rgba(255,255,255,0.08);
    top: -50px;
    right: -40px;
  }

  .fl-header::after {
    content: "";
    position: absolute;
    width: 130px;
    height: 130px;
    border-radius: 50%;
    background: rgba(255,255,255,0.06);
    bottom: -40px;
    left: -30px;
  }

  .fl-header-inner {
    position: relative;
    z-index: 1;
    text-align: center;
  }

  .fl-logo-wrap {
    width: 72px;
    height: 72px;
    margin: 0 auto 14px;
    border-radius: 18px;
    background: rgba(255,255,255,0.16);
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(255,255,255,0.18);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.18);
  }

  .fl-logo-wrap img {
    width: 46px;
    height: 46px;
    object-fit: contain;
  }

  .fl-header h1 {
    margin: 0;
    color: #fff;
    font-size: 28px;
    font-weight: 700;
    letter-spacing: -0.02em;
  }

  .fl-header p {
    margin: 8px 0 0;
    color: rgba(255,255,255,0.88);
    font-size: 14px;
  }

  .fl-body {
    padding: 28px;
  }

  .fl-subtitle {
    margin-bottom: 20px;
    text-align: center;
  }

  .fl-subtitle h3 {
    margin: 0 0 6px;
    color: #111827;
    font-size: 20px;
    font-weight: 700;
  }

  .fl-subtitle p {
    margin: 0;
    color: #6b7280;
    font-size: 14px;
  }

  .fl-root .ant-form-item-label > label {
    font-weight: 600;
    color: #374151;
  }

  .fl-root .ant-input-affix-wrapper,
  .fl-root .ant-input {
    border-radius: 14px !important;
  }

  .fl-root .ant-input-affix-wrapper {
    min-height: 48px;
    border: 1px solid #d1d5db;
    transition: all 0.2s ease;
  }

  .fl-root .ant-input-affix-wrapper:hover {
    border-color: #22c55e;
  }

  .fl-root .ant-input-affix-wrapper-focused {
    border-color: #16a34a !important;
    box-shadow: 0 0 0 4px rgba(34,197,94,0.12) !important;
  }

  .fl-submit {
    height: 50px !important;
    border-radius: 14px !important;
    font-weight: 700 !important;
    font-size: 15px !important;
    background: linear-gradient(135deg, #16a34a 0%, #15803d 100%) !important;
    border: none !important;
    box-shadow: 0 8px 18px rgba(22,163,74,0.22) !important;
  }

  .fl-submit:hover {
    background: linear-gradient(135deg, #15803d 0%, #166534 100%) !important;
  }

  .fl-link-row {
    text-align: center;
    margin-top: 18px;
    color: #6b7280;
    font-size: 14px;
  }

  .fl-link-row a {
    color: #16a34a;
    font-weight: 600;
  }

  .fl-redirect {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-bottom: 14px;
    color: #9a6700;
    font-size: 14px;
  }

  .fl-strength-wrap {
    margin: -4px 0 14px;
    padding: 14px;
    border: 1px solid #e5e7eb;
    border-radius: 14px;
    background: #fafafa;
  }

  .fl-strength-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  .fl-rules {
    display: grid;
    gap: 6px;
    margin-top: 10px;
  }

  .fl-rule {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
  }

  .fl-rule.ok {
    color: #15803d;
  }

  .fl-rule.no {
    color: #9ca3af;
  }

  .fl-modal-success {
    text-align: center;
    padding: 18px 10px;
  }

  .fl-modal-success h3 {
    margin: 8px 0 6px;
    font-size: 22px;
    color: #111827;
  }

  .fl-modal-success p {
    margin: 0;
    color: #6b7280;
  }

  @media (max-width: 520px) {
    .fl-card {
      border-radius: 20px;
    }

    .fl-header {
      padding: 28px 22px 22px;
    }

    .fl-body {
      padding: 22px;
    }

    .fl-header h1 {
      font-size: 24px;
    }
  }
`;

if (typeof document !== "undefined" && !document.getElementById("franko-login-styles")) {
  const style = document.createElement("style");
  style.id = "franko-login-styles";
  style.innerHTML = STYLES;
  document.head.appendChild(style);
}

/* ==================== PASSWORD HELPERS ==================== */

const PASSWORD_RULES = [
  { id: "length", label: "At least 8 characters", test: (p) => p.length >= 8 },
  { id: "upper", label: "One uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { id: "lower", label: "One lowercase letter", test: (p) => /[a-z]/.test(p) },
  { id: "number", label: "One number", test: (p) => /\d/.test(p) },
  { id: "symbol", label: "One special character", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

const getPasswordStrength = (password = "") => {
  const passed = PASSWORD_RULES.filter((r) => r.test(password)).length;
  const percentage = (passed / PASSWORD_RULES.length) * 100;

  if (passed <= 1) return { label: "Very weak", color: "#ef4444", percentage };
  if (passed === 2) return { label: "Weak", color: "#f97316", percentage };
  if (passed === 3) return { label: "Fair", color: "#eab308", percentage };
  if (passed === 4) return { label: "Strong", color: "#22c55e", percentage };
  return { label: "Very strong", color: "#16a34a", percentage };
};

const isStrongPassword = (p = "") => PASSWORD_RULES.every((r) => r.test(p));

/* ==================== ROLE ROUTES ==================== */

const getRouteForPosition = (position = "") => {
  const normalized = String(position).trim().toLowerCase();

  const routes = {
    supervisor: "/admin/dashboard",
    admin: "/admin/dashboard",
    webcontentmanager: "/content/dashboard",
    fulfillment: "/fulfillment/dashboard",
    developer: "/dev/dashboard",
    social: "/digi/orders",
  };

  return routes[normalized] || "/admin/dashboard";
};

/* ==================== FORCE PASSWORD MODAL ==================== */

const ForceChangePasswordModal = ({ visible, user, onSuccess, onCancel }) => {
  const dispatch = useDispatch();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const newPasswordValue = Form.useWatch("newPassword", form) || "";
  const passwordStrength = newPasswordValue ? getPasswordStrength(newPasswordValue) : null;

  const handleSubmit = async (values) => {
    const { oldPassword, newPassword } = values;

    if (!isStrongPassword(newPassword)) {
      message.error("New password does not meet strength requirements");
      return;
    }

    if (oldPassword === newPassword) {
      message.error("New password must be different from the current one");
      return;
    }

    if (!user) {
      message.error("Missing user info. Please log in again.");
      return;
    }

    setLoading(true);

    try {
      await dispatch(
        updateUserPassword({
          contactNumber: user.contactNumber || user.contact,
          oldPassword,
          newPassword,
        })
      ).unwrap();

      const updated = await dispatch(
        getUserById({
          contactNumber: user.contactNumber || user.contact,
          accessToken: user.accessToken,
        })
      ).unwrap();

      const completeUser = {
        ...updated,
        accessToken: user.accessToken,
        refreshToken: user.refreshToken,
        loginStatus: true,
      };

      dispatch(setUser(completeUser));
      setDone(true);
      message.success("Password updated successfully");

      setTimeout(() => onSuccess(completeUser), 1200);
    } catch (error) {
      message.error(error?.message || "Password update failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={visible}
      footer={null}
      closable={false}
      maskClosable={false}
      width={500}
      destroyOnClose
      centered
    >
      {done ? (
        <div className="fl-modal-success">
          <CheckCircleOutlined style={{ fontSize: 54, color: "#16a34a" }} />
          <h3>Password updated</h3>
          <p>Redirecting you to your dashboard...</p>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Password Reset Required</h2>
            <p style={{ margin: "6px 0 0", color: "#6b7280" }}>
              You need to update your password before continuing.
            </p>
          </div>

          <Alert
            message="Security update required"
            description="Choose a strong password to continue using your account."
            type="warning"
            showIcon
            style={{ marginBottom: 18, borderRadius: 12 }}
          />

          <Form form={form} layout="vertical" onFinish={handleSubmit}>
            <Form.Item
              label="Current Password"
              name="oldPassword"
              rules={[{ required: true, message: "Enter your current password" }]}
            >
              <Input.Password prefix={<LockOutlined />} size="large" placeholder="Enter current password" />
            </Form.Item>

            <Form.Item
              label="New Password"
              name="newPassword"
              rules={[
                { required: true, message: "Enter a new password" },
                {
                  validator: (_, value) =>
                    !value || isStrongPassword(value)
                      ? Promise.resolve()
                      : Promise.reject(new Error("Password does not meet requirements")),
                },
              ]}
            >
              <Input.Password prefix={<LockOutlined />} size="large" placeholder="Create a new password" />
            </Form.Item>

            {passwordStrength && (
              <div className="fl-strength-wrap">
                <div className="fl-strength-row">
                  <Text type="secondary">Password strength</Text>
                  <Text style={{ color: passwordStrength.color, fontWeight: 700 }}>
                    {passwordStrength.label}
                  </Text>
                </div>

                <Progress
                  percent={passwordStrength.percentage}
                  strokeColor={passwordStrength.color}
                  trailColor="#e5e7eb"
                  showInfo={false}
                  size="small"
                />

                <div className="fl-rules">
                  {PASSWORD_RULES.map((rule) => {
                    const passed = rule.test(newPasswordValue);
                    return (
                      <div key={rule.id} className={`fl-rule ${passed ? "ok" : "no"}`}>
                        <CheckCircleOutlined />
                        <span>{rule.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <Form.Item
              label="Confirm New Password"
              name="confirmPassword"
              dependencies={["newPassword"]}
              rules={[
                { required: true, message: "Confirm your new password" },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue("newPassword") === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error("Passwords do not match"));
                  },
                }),
              ]}
            >
              <Input.Password prefix={<LockOutlined />} size="large" placeholder="Confirm new password" />
            </Form.Item>

            <div style={{ display: "flex", gap: 12 }}>
              <Button
                onClick={onCancel}
                size="large"
                style={{ flex: 1, borderRadius: 12 }}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                size="large"
                style={{
                  flex: 1,
                  borderRadius: 12,
                  background: "#16a34a",
                  borderColor: "#16a34a",
                  fontWeight: 700,
                }}
              >
                Update Password
              </Button>
            </div>
          </Form>
        </>
      )}
    </Modal>
  );
};

/* ==================== LOGIN COMPONENT ==================== */

const UserLogin = () => {
  const [form] = Form.useForm();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, currentUser } = useSelector((state) => state.user);

  const [loginError, setLoginError] = useState(null);
  const [forcePasswordChange, setForcePasswordChange] = useState(false);
  const [pendingUser, setPendingUser] = useState(null);
  const [redirecting, setRedirecting] = useState(false);

  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
      dispatch(clearError());
    };
  }, [dispatch]);

  useEffect(() => {
    if (currentUser?.position) {
      const route = getRouteForPosition(currentUser.position);
      navigate(route, { replace: true });
    }
  }, [currentUser, navigate]);

  const normalizePhone = (value = "") => value.replace(/\D/g, "");

  const navigateToRole = (position) => {
    const route = getRouteForPosition(position);
    navigate(route, { replace: true });
  };

  const onFinish = async (values) => {
    setLoginError(null);

    const normalizedContact = normalizePhone(values.contact);

    if (!normalizedContact) {
      setLoginError("Contact number is required");
      return;
    }

    if (normalizedContact.length !== 10) {
      setLoginError("Contact number must be exactly 10 digits");
      return;
    }

    try {
      const result = await dispatch(
        loginUser({
          contact: normalizedContact,
          password: values.password,
        })
      ).unwrap();

      if (!isMounted.current) return;

      if (result?.requiresPasswordChange) {
        setPendingUser(result);
        setForcePasswordChange(true);
        return;
      }

      if (!result) {
        setLoginError("Login failed. Invalid server response.");
        return;
      }

      dispatch(setUser(result));
      message.success("Welcome back");
      navigateToRole(result.position);
    } catch (error) {
      if (!isMounted.current) return;

      const isAccountNotFound = error?.isAccountNotFound === true;

      if (isAccountNotFound) {
        setRedirecting(true);
        setLoginError("No account found with this number. Redirecting to registration...");
        setTimeout(() => {
          if (isMounted.current) {
            navigate("/admin/process", {
              state: { prefilledContact: normalizedContact },
            });
          }
        }, 2000);
        return;
      }

      setLoginError(error?.message || "Login failed. Please try again.");
      form.setFieldsValue({ password: "" });
    }
  };

  const handlePasswordChangeSuccess = (updatedUser) => {
    setForcePasswordChange(false);
    setPendingUser(null);
    message.success("Password updated! Signing you in...");
    navigateToRole(updatedUser.position);
  };

  const handlePasswordChangeCancel = () => {
    setForcePasswordChange(false);
    setPendingUser(null);
    setLoginError("Password change cancelled. Please log in again.");
    form.resetFields();
  };

  return (
    <div className="fl-root">
      {forcePasswordChange && pendingUser && (
        <ForceChangePasswordModal
          visible={forcePasswordChange}
          user={pendingUser}
          onSuccess={handlePasswordChangeSuccess}
          onCancel={handlePasswordChangeCancel}
        />
      )}

      <div className="fl-card">
        <div className="fl-header">
          <div className="fl-header-inner">
            <div className="fl-logo-wrap">
              <img src={logo} alt="Franko Trading" />
            </div>
            <h1>Welcome back</h1>
            <p>Franko Trading Admin Portal</p>
          </div>
        </div>

        <div className="fl-body">
          <div className="fl-subtitle">
            <h3>Sign in to continue</h3>
          
          </div>

          {loginError && (
            <Alert
              message={redirecting ? "Account Not Found" : "Sign-in Failed"}
              description={loginError}
              type={redirecting ? "warning" : "error"}
              closable={!redirecting}
              onClose={() => setLoginError(null)}
              showIcon
              style={{ marginBottom: 16, borderRadius: 12 }}
              icon={redirecting ? <ExclamationCircleOutlined /> : undefined}
            />
          )}

          {redirecting && (
            <div className="fl-redirect">
              <LoadingOutlined spin />
              <span>Redirecting to registration...</span>
            </div>
          )}

          <Form form={form} layout="vertical" onFinish={onFinish} disabled={redirecting}>
            <Form.Item
              label="Contact Number"
              name="contact"
              rules={[
                { required: true, message: "Contact number is required" },
                { pattern: /^[0-9]{10}$/, message: "Must be a valid 10-digit number" },
              ]}
            >
              <Input
                placeholder="0XXXXXXXXX"
                prefix={<UserOutlined style={{ color: "#9ca3af" }} />}
                size="large"
                maxLength={10}
                inputMode="numeric"
              />
            </Form.Item>

            <Form.Item
              label="Password"
              name="password"
              rules={[
                { required: true, message: "Password is required" },
                { min: 4, message: "Minimum 4 characters" },
              ]}
            >
              <Input.Password
                placeholder="Enter your password"
                prefix={<LockOutlined style={{ color: "#9ca3af" }} />}
                size="large"
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
              <Button
                htmlType="submit"
                type="primary"
                block
                size="large"
                loading={loading}
                className="fl-submit"
              >
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </Form.Item>
          </Form>

          <div className="fl-link-row">
            Don&apos;t have an account? <Link to="/admin/process">Sign Up</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default withAccessCode(UserLogin);