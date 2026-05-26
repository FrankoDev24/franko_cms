import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProducts } from '../../../Redux/Slice/productSlice';
import { fetchBrands } from '../../../Redux/Slice/brandSlice';
import { fetchCategories } from '../../../Redux/Slice/categorySlice';
import { fetchShowrooms } from '../../../Redux/Slice/showRoomSlice';
import { ShoppingCartOutlined, AppstoreAddOutlined, ClusterOutlined, HomeOutlined, ArrowUpOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';

function ContentDashboard() {
  const dispatch = useDispatch();
  const { products, loading: productsLoading } = useSelector((state) => state.products);
  const { brands, loading: brandsLoading } = useSelector((state) => state.brands);
  const { categories, loading: categoriesLoading } = useSelector((state) => state.categories);
  const { showrooms, loading: showroomsLoading } = useSelector((state) => state.showrooms);

  useEffect(() => {
    dispatch(fetchProducts());
    dispatch(fetchBrands());
    dispatch(fetchCategories());
    dispatch(fetchShowrooms());
  }, [dispatch]);

  const StatCard = ({ title, value, icon: Icon, color, bgColor, hoverColor, tooltip, loading }) => (
    <Tooltip title={tooltip} placement="top">
      <div className={`relative overflow-hidden rounded-xl ${bgColor} border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 cursor-pointer group`}>
        {/* Animated background gradient */}
        <div className={`absolute inset-0 bg-gradient-to-br ${hoverColor} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
        
        {/* Content */}
        <div className="relative p-6">
          <div className="flex items-center justify-between mb-4">
            <div className={`p-3 rounded-lg ${color} bg-opacity-20 group-hover:bg-opacity-30 transition-all duration-300`}>
              <Icon className={`text-2xl ${color} group-hover:scale-110 transition-transform duration-300`} />
            </div>
            <ArrowUpOutlined className={`text-sm ${color} opacity-50 group-hover:opacity-100 transition-opacity duration-300`} />
          </div>
          
          <div className="space-y-1">
            <h3 className="text-sm font-medium text-gray-600 group-hover:text-gray-700 transition-colors duration-300">
              {title}
            </h3>
            <div className="flex items-baseline space-x-2">
              {loading ? (
                <div className="animate-pulse">
                  <div className="h-8 w-16 bg-gray-200 rounded"></div>
                </div>
              ) : (
                <p className={`text-3xl font-bold ${color} group-hover:scale-110 transition-transform duration-300`}>
                  {value.toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </div>
        
        {/* Subtle animation line */}
        <div className={`absolute bottom-0 left-0 h-1 ${color} bg-current transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left`}></div>
      </div>
    </Tooltip>
  );

  const stats = [
    {
      title: 'Total Products',
      value: products?.length || 0,
      icon: ShoppingCartOutlined,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      hoverColor: 'from-blue-100 to-blue-200',
      tooltip: 'Total number of products available in inventory',
      loading: productsLoading
    },
    {
      title: 'Active Brands',
      value: brands?.length || 0,
      icon: AppstoreAddOutlined,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      hoverColor: 'from-emerald-100 to-emerald-200',
      tooltip: 'Total number of brands registered in the system',
      loading: brandsLoading
    },
    {
      title: 'Categories',
      value: categories?.length || 0,
      icon: ClusterOutlined,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      hoverColor: 'from-amber-100 to-amber-200',
      tooltip: 'Total number of product categories available',
      loading: categoriesLoading
    },
    {
      title: 'Showrooms',
      value: showrooms?.length || 0,
      icon: HomeOutlined,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      hoverColor: 'from-red-100 to-red-200',
      tooltip: 'Total number of showrooms in the network',
      loading: showroomsLoading
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Header Section */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-8 text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Content Dashboard
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Monitor and manage your inventory, brands, categories, and showrooms all in one place
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <StatCard key={index} {...stat} />
          ))}
        </div>

        {/* Quick Actions Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button className="flex items-center justify-center space-x-2 p-3 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors duration-200">
              <ShoppingCartOutlined />
              <span>Add Product</span>
            </button>
            <button className="flex items-center justify-center space-x-2 p-3 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors duration-200">
              <AppstoreAddOutlined />
              <span>Manage Brands</span>
            </button>
            <button className="flex items-center justify-center space-x-2 p-3 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-colors duration-200">
              <ClusterOutlined />
              <span>Edit Categories</span>
            </button>
            <button className="flex items-center justify-center space-x-2 p-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors duration-200">
              <HomeOutlined />
              <span>View Showrooms</span>
            </button>
          </div>
        </div>

        {/* Recent Activity Section */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">System Status</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <span className="text-green-800">All systems operational</span>
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <span className="text-blue-800">Last data sync: Just now</span>
              <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ContentDashboard;