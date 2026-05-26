import React from 'react';
import { Typography, Row, Col, Image, Divider } from 'antd';
import logo from "../../../assets/frankoIcon.png";

const { Title, Text } = Typography;

const formatPrice = (amount) => {
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

const PrintableInvoice = React.forwardRef(({ orderId, salesOrder, deliveryAddress }, ref) => {
  const backendBaseURL = 'https://cms.frankotrading.com/';
  const customer = salesOrder[0];
  const totalAmount = salesOrder.reduce((acc, order) => acc + order.total, 0);
  const subAmount = totalAmount;
  const discount = "0";
  const shippingFee = "0"; // Example shipping fee
  const address = deliveryAddress?.[0] || {};

  const invoiceDate = new Date();
  const orderDate = new Date(customer?.orderDate || Date.now());

  return (
    <div
      ref={ref}
      style={{
        width: '800px',
        margin: '0 auto',
        backgroundColor: '#fff',
        padding: '20px',
        fontSize: '16px',
        lineHeight: '1.6'
       
      }}
    >
      {/* Header Section */}
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <Image
          src={logo}
          alt="Franko Trading Limited"
          style={{ width: '120px', marginBottom: '10px' }}
          preview={false}
        />
        <Title level={2} style={{ color: '#333', fontWeight: 'bold', margin: 0 }}>
          Franko Trading Limited
        </Title>
        <Text> Opposite Roxy Cinema, Kwame Nkrumah Avenue, Accra,Ghana | Contact: +233 246 422 338</Text>
        <br />
        <Text>Email: online@frankotrading.com | Website: www.frankotrading.com</Text>
        <Divider />
      </div>
      <h2 style={{textAlign:"center", fontWeight:"bold"}}>INVOICE</h2>
      {/* Invoice Details and Shipping Address */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '20px',
          marginBottom: '20px',
        }}
      >
        {/* Invoice Details */}
        <div style={{ flex: 1, backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '8px' }}>
          <Text strong style={{ fontSize: '18px' }}>Invoice Details</Text>
          <br />
          <Text>Order No: {orderId}</Text>
          <br />
          <Text>Order Date: {orderDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</Text>
<br />
<Text>Invoice Print Date: {invoiceDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</Text>

        </div>

        {/* Shipping Address */}
        <div style={{ flex: 1, backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '8px' }}>
          <Text strong style={{ fontSize: '18px' }}>Shipping Address</Text>
          <br />
          <Text>Recipient Name: {address.recipientName}</Text>
          <br />
          <Text>Contact Number: {address.recipientContactNumber}</Text>
          <br />
          <Text>Delivery Address: {address.address}</Text>
          <br />
          <Text>Order Note: {address.orderNote}</Text>
        </div>
      </div>

      <Divider />

      {/* Order Items */}
      <Title level={4} style={{ marginBottom: '20px', textAlign: 'left' }}>Order Items</Title>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px', fontSize: '16px' }}>
        <thead>
          <tr style={{ backgroundColor: '#f0f0f0', textAlign: 'left' }}>
            <th style={{ padding: '10px', border: '1px solid #ddd' }}>S.NO</th>
            <th style={{ padding: '10px', border: '1px solid #ddd' }}>Product Image</th>
            <th style={{ padding: '10px', border: '1px solid #ddd' }}>Product Name</th>
            <th style={{ padding: '10px', border: '1px solid #ddd' }}>Quantity</th>
            <th style={{ padding: '10px', border: '1px solid #ddd' }}>Unit Price</th>
            <th style={{ padding: '10px', border: '1px solid #ddd' }}>Total Price</th>
          </tr>
        </thead>
        <tbody>
          {salesOrder.map((order, index) => (
            <tr key={index} style={{ borderBottom: '1px solid #ddd' }}>
              <td style={{ padding: '10px', border: '1px solid #ddd' }}>{index + 1}</td>
              <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                <Image
                  src={`${backendBaseURL}/Media/Products_Images/${order?.imagePath?.split('\\').pop()}`}
                  alt="Product"
                  style={{ width: '50px', height: '50px', objectFit: 'cover' }}
                  preview={false}
                />
              </td>
              <td style={{ padding: '10px', border: '1px solid #ddd' }}>{order.productName}</td>
              <td style={{ padding: '10px', border: '1px solid #ddd' }}>{order.quantity}</td>
              <td style={{ padding: '10px', border: '1px solid #ddd' }}>₵{formatPrice(order.price)}.00</td>
              <td style={{ padding: '10px', border: '1px solid #ddd' }}>₵{formatPrice(order.total)}.00</td>
            </tr>
          ))}
        </tbody>
      </table>

      <Divider />

      {/* Total Section */}
      <Row justify="end">
        <Col span={8}>
          <div style={{ textAlign: 'right', fontSize: '16px' }}>
            <Text>Subtotal: ₵{formatPrice(subAmount)}.00</Text>
            <br />
            <Text>Discount: ₵{formatPrice(discount)}.00</Text>
            <br />
            <Text>Shipping Fee: {shippingFee > 0 ? `₵${formatPrice(shippingFee)}.00` : 'Delivery Charges applicable'}</Text>
            <br />
            <Text strong style={{ fontSize: '18px' }}>Total Amount: ₵{formatPrice(totalAmount)}.00</Text>
          </div>
        </Col>
      </Row>
    </div>
  );
});

export default PrintableInvoice;
