import { useState } from 'react';
import {
  User,
  Store,
  ShoppingCart,
  Grid3X3,
  Tag,
  Award,
  LogOut,
  Menu,
  X,
  Users,
  Image,
  ChevronLeft,


} from 'lucide-react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { logoutUser } from '../../Redux/Slice/userSlice';

const DevLayout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [isLogoutModalVisible, setIsLogoutModalVisible] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();

  const currentPath = location.pathname;
  const user = (localStorage.getItem('user') || '{}');
  const userName = user ? user.fullName : 'dev';
  const userPosition = user ? user.position : '';

  const isMobile = window.innerWidth < 768;

  const toggleCollapsed = () => {
    if (isMobile) {
      setDrawerVisible(true);
    } else {
      setCollapsed(!collapsed);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    dispatch(logoutUser());
    setIsLogoutModalVisible(false);
    navigate('/admin/login');
  };

  const showLogoutModal = () => setIsLogoutModalVisible(true);
  const handleCancel = () => setIsLogoutModalVisible(false);

  const closeDrawer = () => setDrawerVisible(false);

  const menuItems = [
    { key: '/dev/dashboard', icon: Store, label: 'Dashboard', link: '/dev/dashboard' },
    { key: '/dev/orders', icon: ShoppingCart, label: 'Orders', link: '/dev/orders' },

    { key: '/dev/categories', icon: Tag, label: 'Categories', link: '/dev/categories' },
    { key: '/dev/products', icon: Grid3X3, label: 'Products', link: '/dev/products' },
    { key: '/dev/brands', icon: Award, label: 'Brands', link: '/dev/brands' },
    { key: '/dev/showroom', icon: Store, label: 'Showroom', link: '/dev/showroom' },
    { key: '/dev/banner', icon: Image, label: 'Banner', link: '/dev/banner' },
    { key: '/dev/branch-products', icon: Users, label: 'Branch Products', link: '/dev/branch-products' },
    { key: '/dev/users', icon: User, label: 'Users', link: '/dev/users' },
    { key: '/dev/customers', icon: Users, label: 'Customers', link: '/dev/customers' },

    { key: 'logout', icon: LogOut, label: 'Logout', action: showLogoutModal },
  ];

  const MenuItem = ({ item, onClick }) => {
    const IconComponent = item.icon;
    const isActive = currentPath === item.key;
    
    return (
      <div
        className={`flex items-center px-4 py-3 cursor-pointer transition-all duration-200 ${
          isActive 
            ? 'bg-red-600 text-white border-r-4 border-red-400' 
            : 'text-gray-300 hover:bg-red-700 hover:text-white'
        }`}
        onClick={onClick}
      >
        <IconComponent size={20} className="mr-3" />
        {(!collapsed || isMobile) && <span className="text-sm font-medium">{item.label}</span>}
      </div>
    );
  };

  const renderSidebarMenu = () => (
    <div className="flex flex-col h-full">
      {menuItems.map(item => (
        <MenuItem 
          key={item.key} 
          item={item} 
          onClick={() => {
            if (item.action) {
              item.action();
            }
            closeDrawer();
          }}
        />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <div
          className={`bg-red-800 text-white fixed h-full z-20 transition-all duration-300 ${
            collapsed ? 'w-20' : 'w-56'
          }`}
        >
          <div className="h-16 flex items-center justify-center border-b border-red-700">
            <h1 className="text-xl font-bold tracking-wide">
              {collapsed ? 'D' : 'Developer Panel'}
            </h1>
          </div>
          <nav className="mt-4">
            {menuItems.map(item => {
              const IconComponent = item.icon;
              const isActive = currentPath === item.key;
              
              return (
                <Link
                  key={item.key}
                  to={item.link || '#'}
                  onClick={item.action}
                  className={`flex items-center px-4 py-3 cursor-pointer transition-all duration-200 ${
                    isActive 
                      ? 'bg-red-600 text-white border-r-4 border-red-400' 
                      : 'text-gray-300 hover:bg-red-700 hover:text-white'
                  }`}
                >
                  <IconComponent size={20} className="mr-3" />
                  {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
                </Link>
              );
            })}
          </nav>
        </div>
      )}

      {/* Mobile Drawer */}
      {isMobile && drawerVisible && (
        <div className="fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={closeDrawer}></div>
          <div className="relative bg-red-800 text-white w-64 h-full">
            <div className="h-16 flex items-center justify-between px-4 border-b border-red-700">
              <h1 className="text-xl font-bold">dev Panel</h1>
              <button onClick={closeDrawer} className="text-white hover:text-gray-300">
                <X size={24} />
              </button>
            </div>
            <nav className="mt-4">
              {menuItems.map(item => {
                const IconComponent = item.icon;
                const isActive = currentPath === item.key;
                
                return (
                  <Link
                    key={item.key}
                    to={item.link || '#'}
                    onClick={() => {
                      if (item.action) item.action();
                      closeDrawer();
                    }}
                    className={`flex items-center px-4 py-3 cursor-pointer transition-all duration-200 ${
                      isActive 
                        ? 'bg-red-600 text-white border-r-4 border-red-400' 
                        : 'text-gray-300 hover:bg-red-700 hover:text-white'
                    }`}
                  >
                    <IconComponent size={20} className="mr-3" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${!isMobile ? (collapsed ? 'ml-20' : 'ml-56') : 'ml-0'}`}>
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 h-16 flex items-center justify-between px-6 fixed w-full z-10"
                style={{ width: `calc(100% - ${!isMobile ? (collapsed ? 80 : 224) : 0}px)` }}>
          <div className="flex items-center">
            <button
              onClick={toggleCollapsed}
              className="p-2 rounded-md hover:bg-gray-100 transition-colors"
            >
              {collapsed || isMobile ? <Menu size={20} /> : <ChevronLeft size={20} />}
            </button>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center space-x-2 hover:bg-gray-100 p-2 rounded-md transition-colors"
              >
                <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                  <User size={18} className="text-white" />
                </div>
                <span className="font-medium">Hello, {userName}</span>
              </button>
              
              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-2 z-20">
                  <Link
                    to="/dev/profile"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setUserDropdownOpen(false)}
                  >
                    Profile
                  </Link>
                  <div className="px-4 py-2 text-sm text-gray-500">
                    Position: {userPosition || 'N/A'}
                  </div>
                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      showLogoutModal();
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 mt-16 bg-gray-50">
          <div className="bg-white rounded-lg shadow-sm p-6 min-h-96">
            {children}
          </div>
        </main>
      </div>

      {/* Logout Modal */}
      {isLogoutModalVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black bg-opacity-50"></div>
          <div className="relative bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <LogOut size={32} className="text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Confirm Logout</h3>
              <p className="text-gray-600 mb-6">Are you sure you want to log out?</p>
              <div className="flex space-x-4">
                <button
                  onClick={handleLogout}
                  className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors font-medium"
                >
                  Yes, Logout
                </button>
                <button
                  onClick={handleCancel}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DevLayout;