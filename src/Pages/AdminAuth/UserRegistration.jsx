// UserRegistration.jsx
import React, { useState } from 'react';
import { Form, Input, Button, message, Alert, Select } from 'antd';
import { useDispatch } from 'react-redux';
import { v4 as uuidv4 } from 'uuid';
import { 
  UserOutlined, 
  MailOutlined, 
  LockOutlined, 
  HomeOutlined, 
  PhoneOutlined,
   
} from '@ant-design/icons';
import { createUser } from '../../Redux/Slice/userSlice';
import { useNavigate, Link } from 'react-router-dom';
import Franko from "../../assets/frankoIcon.png";
import withAccessCode from '../../Component/withAccessCode';

const { Option } = Select;

// Available positions
const POSITIONS = [
  'Supervisor',
  'Webcontentmanager',
  'Fulfillment',
  'Developer',
  'Social',
  'Sales',
  'Marketing',
  'Support'
];

const UserRegistration = () => {
  const [form] = Form.useForm();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [registrationError, setRegistrationError] = useState(null);

  const onFinish = async (values) => {
    setLoading(true);
    setRegistrationError(null);

    // Client-side password match validation
    if (values.password !== values.confirmPassword) {
      message.error('Passwords do not match!');
      setLoading(false);
      return;
    }

    const newUser = {
      uuserid: uuidv4(),
      fullName: values.fullName.trim(),
      email: values.email.trim().toLowerCase(),
      password: values.password,
      address: values.address.trim(),
      contact: values.contact.replace(/\D/g, ''), // Remove non-digits
      position: values.position,
    };

    try {
      await dispatch(createUser(newUser)).unwrap();
      
      message.success('Registration successful! Redirecting to login...');
      form.resetFields();
      
      // Redirect after short delay
      setTimeout(() => {
        navigate('/admin/login');
      }, 1500);
    } catch (error) {
      const errorMessage = error?.message || error || 'Registration failed. Please try again.';
      setRegistrationError(errorMessage);
      message.error(`Registration failed: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const onFinishFailed = (errorInfo) => {
    console.error('Form validation failed:', errorInfo);
    message.error('Please fill in all required fields correctly!');
  };

  const handleContactChange = (e) => {
    // Format contact number (digits only)
    const formatted = e.target.value.replace(/\D/g, '');
    form.setFieldsValue({ contact: formatted });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100 px-4 py-8">
      <div className="max-w-2xl w-full bg-white shadow-2xl rounded-2xl overflow-hidden">
        {/* Header Section */}
         <div className="bg-gradient-to-r from-green-200 to-green-300 px-8 py-6">
          <div className="text-center">
            <img src={Franko} alt="Franko Trading Logo" className="mx-auto h-16 w-24 mb-3" />
            <h2 className="text-2xl font-bold text-white mb-1">Create Account</h2>

          </div>
        </div>

        {/* Form Section */}
        <div className="px-8 py-6">
          {/* Error Alert */}
          {registrationError && (
            <Alert
              message="Registration Failed"
              description={registrationError}
              type="error"
              closable
              onClose={() => setRegistrationError(null)}
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
            {/* Two Column Layout for Desktop */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Full Name */}
              <Form.Item
                label={<span className="text-gray-700 font-medium">Full Name</span>}
                name="fullName"
                rules={[
                  { required: true, message: 'Please input your full name!' },
                  { min: 3, message: 'Name must be at least 3 characters' },
                  { 
                    pattern: /^[a-zA-Z\s]+$/, 
                    message: 'Name can only contain letters and spaces' 
                  }
                ]}
              >
                <Input
                  placeholder="Enter your full name"
                  prefix={<UserOutlined className="text-gray-400" />}
                  size="large"
                  className="rounded-lg"
                />
              </Form.Item>

              {/* Email */}
              <Form.Item
                label={<span className="text-gray-700 font-medium">Email</span>}
                name="email"
                rules={[
                  { required: true, message: 'Please input your email!' },
                  { type: 'email', message: 'Please enter a valid email!' }
                ]}
              >
                <Input
                  placeholder="Enter your email"
                  prefix={<MailOutlined className="text-gray-400" />}
                  size="large"
                  className="rounded-lg"
                />
              </Form.Item>
            </div>

            {/* Password Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Password */}
              <Form.Item
                label={<span className="text-gray-700 font-medium">Password</span>}
                name="password"
                rules={[
                  { required: true, message: 'Please input your password!' },
                  { min: 6, message: 'Password must be at least 6 characters' }
                ]}
              >
                <Input.Password
                  placeholder="Create a password"
                  prefix={<LockOutlined className="text-gray-400" />}
                  size="large"
                  className="rounded-lg"
                />
              </Form.Item>

              {/* Confirm Password */}
              <Form.Item
                label={<span className="text-gray-700 font-medium">Confirm Password</span>}
                name="confirmPassword"
                dependencies={['password']}
                rules={[
                  { required: true, message: 'Please confirm your password!' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('password') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('Passwords do not match!'));
                    },
                  }),
                ]}
              >
                <Input.Password
                  placeholder="Re-enter your password"
                  prefix={<LockOutlined className="text-gray-400" />}
                  size="large"
                  className="rounded-lg"
                />
              </Form.Item>
            </div>

            {/* Contact and Address */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Contact Number */}
              <Form.Item
                label={<span className="text-gray-700 font-medium">Contact Number</span>}
                name="contact"
                rules={[
                  { required: true, message: 'Please input your contact number!' },
                  { 
                    pattern: /^[0-9]{10,15}$/, 
                    message: 'Please enter a valid contact number (10-15 digits)' 
                  }
                ]}
              >
                <Input
                  placeholder="Enter your contact number"
                  prefix={<PhoneOutlined className="text-gray-400" />}
                  size="large"
                  className="rounded-lg"
                  maxLength={15}
                  onChange={handleContactChange}
                />
              </Form.Item>

              {/* Position */}
              <Form.Item
                label={<span className="text-gray-700 font-medium">Position</span>}
                name="position"
                rules={[{ required: true, message: 'Please select your position!' }]}
              >
                <Select
                  placeholder="Select your position"
                  size="large"
                  className="w-full"
                 
                >
                  {POSITIONS.map(position => (
                    <Option key={position} value={position}>
                      {position}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </div>

            {/* Address (Full Width) */}
            <Form.Item
              label={<span className="text-gray-700 font-medium">Address</span>}
              name="address"
              rules={[
                { required: true, message: 'Please input your address!' },
                { min: 10, message: 'Address must be at least 10 characters' }
              ]}
            >
              <Input.TextArea
                placeholder="Enter your full address"
                rows={3}
                className="rounded-lg"
              />
            </Form.Item>

            {/* Submit Button */}
            <Form.Item className="mb-0">
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                disabled={loading}
                className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 border-none h-12 rounded-lg font-semibold text-base shadow-md hover:shadow-lg transition-all duration-300"
                size="large"
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </Form.Item>
          </Form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">or</span>
            </div>
          </div>

          {/* Login Link */}
          <div className="text-center">
            <p className="text-gray-600 text-sm">
              Already have an account?{' '}
              <Link 
                to="/admin/login" 
                className="text-green-600 hover:text-green-700 font-semibold transition-colors"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-8 py-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            By registering, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
};

// HOC handles all access code logic automatically
export default withAccessCode(UserRegistration);