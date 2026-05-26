import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchCustomers } from "../../Redux/Slice/customerSlice";
import { Table, Spin, Alert, Input, Button } from "antd";
import jsPDF from "jspdf";
import "jspdf-autotable";

const { Search } = Input;

const Customers = () => {
  const dispatch = useDispatch();
  const { customerList, loading, error } = useSelector((state) => state.customer);
  const [filteredData, setFilteredData] = useState([]);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    dispatch(fetchCustomers()); // Fetch customers on component mount
  }, [dispatch]);

  useEffect(() => {
    if (customerList) {
      const sortedCustomers = [...customerList].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
      setFilteredData(sortedCustomers);
    }
  }, [customerList]);

const handleSearch = (value) => {
  setSearchText(value);
  const lowercasedValue = value.toLowerCase().trim();

  const filtered = customerList.filter((customer) =>
    customer.firstName.toLowerCase().includes(lowercasedValue) ||
    customer.address.toLowerCase().includes(lowercasedValue) ||
    customer.contactNumber.toLowerCase().includes(lowercasedValue) ||
    customer.accountType.toLowerCase().includes(lowercasedValue) ||
    customer.customerAccountNumber.toString().toLowerCase().includes(lowercasedValue) // ← handles string/number mismatch
  );

  setFilteredData(filtered);
};

  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.text("Customer List", 14, 20);
  
    // Map table data to include only the last 6 digits of account numbers
    const tableData = filteredData.map((customer, index) => [
      index + 1,
      customer.customerAccountNumber.slice(-6), // Last 6 digits
      customer.firstName,
      customer.lastName,
      customer.contactNumber,
      customer.email,
      customer.address,
      customer.accountType,
    ]);
  
    // Generate PDF with custom header styles
    doc.autoTable({
      head: [
        [
          "S/N",
          "Account Number",
          "First Name",
          "Last Name",
          "Contact Number",
          "Email",
          "Address",
          "Account Type",
        ],
      ],
      body: tableData,
      startY: 30,
      theme: "grid",
      headStyles: { fillColor: [0, 128, 0] }, // Green header
    });
  
    doc.save("customers.pdf");
  };
  

  const columns = [
    {
      title: "Account Number",
      dataIndex: "customerAccountNumber",
      key: "customerAccountNumber",
    },
    {
      title: "First Name",
      dataIndex: "firstName",
      key: "firstName",
    },
    {
      title: "Last Name",
      dataIndex: "lastName",
      key: "lastName",
    },
    {
      title: "Contact Number",
      dataIndex: "contactNumber",
      key: "contactNumber",
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
    },
    // {
    //   title: "Password",
    //   dataIndex: "password",
    //   key: "password",
    // },
   
    {
      title: "Address",
      dataIndex: "address",
      key: "address",
    },
    {
      title: "Account Type",
      dataIndex: "accountType",
      key: "accountType",
    },
  ];

  if (loading) {
    return <Spin size="large" className="spinner" />;
  }

  if (error) {
    return <Alert message="Error" description={error} type="error" showIcon />;
  }

  return (
    <div style={{ padding: "20px" }}>
      <h1 className="text-2xl font-bold mb-4 text-red-500">Customers</h1>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
        <Search
          placeholder="Search by first name, address, contact number, or account type"
          allowClear
          enterButton="Search"
          size="large"
          onSearch={handleSearch}
          onChange={(e) => handleSearch(e.target.value)}
          value={searchText}
          style={{ maxWidth: "500px" }}
        />
        <Button type="primary" onClick={downloadPDF} className="bg-green-600 text-white rounded-md">
          Download PDF
        </Button>
      </div>
      <Table
        columns={columns}
        dataSource={filteredData}
        rowKey={(record) => record.customerAccountNumber}
        bordered
        pagination={{ pageSize: 10 }}
      />
    </div>
  );
};

export default Customers;
