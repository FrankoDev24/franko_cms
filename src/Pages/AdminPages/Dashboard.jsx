import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Card, Row, Col, Spin, Typography, Table, Avatar, Progress, DatePicker, Tag, Button, Statistic } from 'antd';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 

  Bar, 
  PieChart, 
  Pie, 
  Cell,
  ComposedChart,

} from 'recharts';
import { fetchOrdersByDate } from '../../Redux/Slice/orderSlice';
import { fetchAllProducts } from '../../Redux/Slice/productSlice';
import { fetchBrands } from '../../Redux/Slice/brandSlice';
import { fetchCustomers } from '../../Redux/Slice/customerSlice';
import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isBetween from 'dayjs/plugin/isBetween';
import { 
  ShoppingCartOutlined, 
 
  CrownOutlined,
  CalendarOutlined,

  ExclamationCircleOutlined,
  SyncOutlined,
  ReloadOutlined,
  FireOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  SwapOutlined,
  UserOutlined,
  EyeOutlined,
CheckCircleOutlined,
ClockCircleOutlined,
  PhoneOutlined,
  WarningOutlined,
  RiseOutlined,

  CheckOutlined

} from '@ant-design/icons';

// Initialize dayjs plugins
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);
dayjs.extend(isBetween);

const { Title, Text } = Typography;
const { MonthPicker } = DatePicker;

const Dashboard = () => {
  const dispatch = useDispatch();
  const { products } = useSelector((state) => state.products);
  const { brands } = useSelector((state) => state.brands);
  const { orders = [] } = useSelector((state) => state.orders);
  const { customerList } = useSelector((state) => state.customer);

  const loading = !(products && brands && orders && customerList);
  const error = !loading && (!products || !brands || !orders || !customerList);

  const [selectedMonth, setSelectedMonth] = useState(dayjs());
  const [selectedComparisonMonth, setSelectedComparisonMonth] = useState(dayjs().subtract(1, 'month'));
  const [monthlyComparison, setMonthlyComparison] = useState({
    current: null,
    comparison: null,
    growth: null
  });
  const [weeklyData, setWeeklyData] = useState([]);
  const [topCustomers, setTopCustomers] = useState([]);
  const [orderCycleStats, setOrderCycleStats] = useState([]);
  const [realTimeStats, setRealTimeStats] = useState({});
  const [lastUpdated, setLastUpdated] = useState(dayjs());

const COLORS = {
  'Completed': '#10B981',        // Emerald-500
  'Pending': '#F59E0B',          // Amber-500
  'Processing': '#3B82F6',       // Blue-500
  'Cancelled': '#EF4444',        // Red-500
  'Delivery': '#006838',        // Cyan-500
  'Wrong Number': '#8B5CF6',     // Violet-500
  'Not Answered': '#6B7280',     // Gray-500
  'Out of Stock': '#D97706',     // Amber-600
  'Multiple Orders': '#9333EA',  // Purple-600
  'Order Placement': '#F43F5E',  // Rose-500
  'Confirmed': '#FBBF24',        // Yellow-400
  'Shipped': '#3B82F6'           // Blue-500 (same as Processing for consistency)
};

const CYCLE_ICONS = {
  'Completed': <CheckCircleOutlined style={{ color: COLORS['Completed'] }} />,
  'Pending': <ClockCircleOutlined style={{ color: COLORS['Pending'] }} />,
  'Processing': <SyncOutlined spin style={{ color: COLORS['Processing'] }} />,
  'Cancelled': <ExclamationCircleOutlined style={{ color: COLORS['Cancelled'] }} />,
  'Delivery': <CheckCircleOutlined style={{ color: COLORS['Delivery'] }} />,
  'Shipped': <RiseOutlined style={{ color: COLORS['Shipped'] }} />,
  'Wrong Number': <PhoneOutlined style={{ color: COLORS['Wrong Number'] }} />,
  'Not Answered': <WarningOutlined style={{ color: COLORS['Not Answered'] }} />,
  'Out of Stock': <ExclamationCircleOutlined style={{ color: COLORS['Out of Stock'] }} />,
  'Multiple Orders': <ShoppingCartOutlined style={{ color: COLORS['Multiple Orders'] }} />,
  'Order Placement': <ShoppingCartOutlined style={{ color: COLORS['Order Placement'] }} />,
  'Confirmed': <CheckOutlined style={{ color: COLORS['Confirmed'] }} />
};

  // Auto-refresh every 30 seconds for real-time data
  useEffect(() => {
    const interval = setInterval(() => {
      const startDate = '2020-01-01';
      const endDate = dayjs().add(1, 'day').format('YYYY-MM-DD');
      dispatch(fetchOrdersByDate({ from: startDate, to: endDate }));
      setLastUpdated(dayjs());
    }, 30000);

    return () => clearInterval(interval);
  }, [dispatch]);

  useEffect(() => {
    const startDate = '2020-01-01';
    const endDate = dayjs().add(1, 'day').format('YYYY-MM-DD');
    dispatch(fetchOrdersByDate({ from: startDate, to: endDate }));
    dispatch(fetchAllProducts());
    dispatch(fetchBrands());
    dispatch(fetchCustomers());
    setLastUpdated(dayjs());
  }, [dispatch]);

  useEffect(() => {
    if (orders && orders.length > 0) {
      calculateMonthlyComparison();
      calculateWeeklyData();
      calculateTopCustomers();
      calculateOrderCycleStats();
      calculateRealTimeStats();
    }
  }, [orders, selectedMonth, selectedComparisonMonth]);

  const calculateMonthlyComparison = () => {
    // Filter orders for current month
    const currentMonthOrders = orders.filter(order => {
      const orderDate = dayjs(order.orderDate);
      return orderDate.isSame(selectedMonth, 'month') && orderDate.isSame(selectedMonth, 'year');
    });
    
    // Filter orders for comparison month
    const comparisonMonthOrders = orders.filter(order => {
      const orderDate = dayjs(order.orderDate);
      return orderDate.isSame(selectedComparisonMonth, 'month') && orderDate.isSame(selectedComparisonMonth, 'year');
    });

    const currentMonthStats = analyzeOrders(currentMonthOrders);
    const comparisonMonthStats = analyzeOrders(comparisonMonthOrders);

    // Calculate additional metrics
    const currentMonthCycles = getOrderCycleBreakdown(currentMonthOrders);
    const comparisonMonthCycles = getOrderCycleBreakdown(comparisonMonthOrders);

    // Calculate completion rates
    const currentCompletionRate = calculateCompletionRate(currentMonthOrders);
    const comparisonCompletionRate = calculateCompletionRate(comparisonMonthOrders);

    // Calculate average orders per day
    const currentDaysInMonth = selectedMonth.daysInMonth();
    const comparisonDaysInMonth = selectedComparisonMonth.daysInMonth();
    const currentAvgOrdersPerDay = currentMonthStats.totalOrders / currentDaysInMonth;
    const comparisonAvgOrdersPerDay = comparisonMonthStats.totalOrders / comparisonDaysInMonth;

    setMonthlyComparison({
      current: {
        ...currentMonthStats,
        month: selectedMonth.format('MMMM YYYY'),
        orderCycles: currentMonthCycles,
        completionRate: currentCompletionRate,
        avgOrdersPerDay: currentAvgOrdersPerDay,
        daysInMonth: currentDaysInMonth
      },
      comparison: {
        ...comparisonMonthStats,
        month: selectedComparisonMonth.format('MMMM YYYY'),
        orderCycles: comparisonMonthCycles,
        completionRate: comparisonCompletionRate,
        avgOrdersPerDay: comparisonAvgOrdersPerDay,
        daysInMonth: comparisonDaysInMonth
      },
      growth: {
        orders: calculateGrowthPercentage(currentMonthStats.totalOrders, comparisonMonthStats.totalOrders),
        customers: calculateGrowthPercentage(currentMonthStats.uniqueCustomers, comparisonMonthStats.uniqueCustomers),
        avgOrdersPerDay: calculateGrowthPercentage(currentAvgOrdersPerDay, comparisonAvgOrdersPerDay),
        completionRate: calculateGrowthPercentage(currentCompletionRate, comparisonCompletionRate),
        pendingOrders: calculateGrowthPercentage(
          currentMonthCycles.find(c => c.status === 'Pending')?.count || 0,
          comparisonMonthCycles.find(c => c.status === 'Pending')?.count || 0
        ),
        completedOrders: calculateGrowthPercentage(
          currentMonthCycles.find(c => c.status === 'Completed')?.count || 0,
          comparisonMonthCycles.find(c => c.status === 'Completed')?.count || 0
        )
      }
    });
  };

  const calculateWeeklyData = () => {
    const startOfMonth = selectedMonth.startOf('month');
    const endOfMonth = selectedMonth.endOf('month');
    const weeks = [];
    
    let currentWeek = startOfMonth.startOf('week');
    let weekNumber = 1;

    while (currentWeek.isSameOrBefore(endOfMonth, 'day')) {
      const weekEnd = currentWeek.endOf('week');
      const weekOrders = orders.filter(order => {
        const orderDate = dayjs(order.orderDate);
        return orderDate.isBetween(currentWeek, weekEnd, null, '[]') && 
               orderDate.isSame(selectedMonth, 'month');
      });

      const weekStats = analyzeOrders(weekOrders);
      const weekCycles = getOrderCycleBreakdown(weekOrders);
      
      weeks.push({
        week: `Week ${weekNumber}`,
        weekRange: `${currentWeek.format('MMM DD')} - ${weekEnd.format('MMM DD')}`,
        ...weekStats,
        orderCycleBreakdown: weekCycles,
        completionRate: calculateCompletionRate(weekOrders)
      });

      currentWeek = currentWeek.add(1, 'week');
      weekNumber++;
    }

    setWeeklyData(weeks);
  };

  const calculateTopCustomers = () => {
    const monthOrders = orders.filter(order => {
      const orderDate = dayjs(order.orderDate);
      return orderDate.isSame(selectedMonth, 'month') && orderDate.isSame(selectedMonth, 'year');
    });

    const customerStats = {};
    
    monthOrders.forEach(order => {
      const customerId = order.customerId;
      const customerName = order.fullName || 'Unknown Customer';
      
      if (!customerStats[customerId]) {
        customerStats[customerId] = {
          id: customerId,
          name: customerName,
          phone: order.contactNumber || 'N/A',
          totalOrders: 0,
          lastOrder: null,
          orderCycles: {},
          avgOrdersPerWeek: 0,
          firstOrder: null
        };
      }
      
      customerStats[customerId].totalOrders += 1;
      
      const orderDate = dayjs(order.orderDate);
      if (!customerStats[customerId].lastOrder || orderDate.isAfter(customerStats[customerId].lastOrder)) {
        customerStats[customerId].lastOrder = orderDate;
      }
      
      if (!customerStats[customerId].firstOrder || orderDate.isBefore(customerStats[customerId].firstOrder)) {
        customerStats[customerId].firstOrder = orderDate;
      }

      const cycle = order.orderCycle || 'Unknown';
      customerStats[customerId].orderCycles[cycle] = (customerStats[customerId].orderCycles[cycle] || 0) + 1;
    });

    const topCustomersList = Object.values(customerStats)
      .map(customer => {
        const weeksInMonth = selectedMonth.daysInMonth() / 7;
        return {
          ...customer,
          avgOrdersPerWeek: customer.totalOrders / weeksInMonth,
          lastOrderFormatted: customer.lastOrder ? customer.lastOrder.format('MMM DD, YYYY') : 'N/A',
          avatar: customer.name.charAt(0).toUpperCase(),
          completionRate: customer.totalOrders > 0 ? ((customer.orderCycles['Completed'] || 0) / customer.totalOrders * 100).toFixed(1) : 0,
          orderFrequency: customer.firstOrder && customer.lastOrder ? 
            customer.lastOrder.diff(customer.firstOrder, 'day') / customer.totalOrders : 0
        };
      })
      .sort((a, b) => b.totalOrders - a.totalOrders)
      .slice(0, 10)
      .map((customer, index) => ({ ...customer, rank: index + 1 }));

    setTopCustomers(topCustomersList);
  };

  const calculateOrderCycleStats = () => {
    const monthOrders = orders.filter(order => {
      const orderDate = dayjs(order.orderDate);
      return orderDate.isSame(selectedMonth, 'month') && orderDate.isSame(selectedMonth, 'year');
    });

    const cycleStats = getOrderCycleBreakdown(monthOrders);
    const totalOrders = monthOrders.length;

    const statsWithPercentage = cycleStats.map(stat => ({
      ...stat,
      percentage: totalOrders > 0 ? ((stat.count / totalOrders) * 100).toFixed(1) : 0,
      color: COLORS[stat.status] || '#6B7280'
    }));

    setOrderCycleStats(statsWithPercentage);
  };

  const calculateRealTimeStats = () => {
    const today = dayjs();
    const todayOrders = orders.filter(order =>
      dayjs(order.orderDate).isSame(today, 'day')
    );

    const thisWeek = orders.filter(order =>
      dayjs(order.orderDate).isSame(today, 'week')
    );

    const thisMonth = orders.filter(order =>
      dayjs(order.orderDate).isSame(today, 'month')
    );

    const lastHour = orders.filter(order =>
      dayjs(order.orderDate).isAfter(dayjs().subtract(1, 'hour'))
    );

    setRealTimeStats({
      today: analyzeOrders(todayOrders),
      thisWeek: analyzeOrders(thisWeek),
      thisMonth: analyzeOrders(thisMonth),
      lastHour: lastHour.length
    });
  };

  const analyzeOrders = (orderList) => {
    const totalOrders = orderList.length;
    const uniqueCustomers = new Set(orderList.map(order => order.customerId)).size;
    
    // Calculate different order status counts
    const statusCounts = {
      completed: orderList.filter(order => order.orderCycle === 'Completed').length,
      pending: orderList.filter(order => order.orderCycle === 'Pending').length,
      processing: orderList.filter(order => order.orderCycle === 'Processing').length,
      cancelled: orderList.filter(order => order.orderCycle === 'Cancelled').length
    };
    
    return {
      totalOrders,
      uniqueCustomers,
      statusCounts
    };
  };

  const getOrderCycleBreakdown = (orderList) => {
    const breakdown = {};
    orderList.forEach(order => {
      const status = order.orderCycle || 'Unknown';
      breakdown[status] = (breakdown[status] || 0) + 1;
    });

    return Object.entries(breakdown).map(([status, count]) => ({
      status,
      count,
      name: status
    }));
  };

  const calculateCompletionRate = (orderList) => {
    if (orderList.length === 0) return 0;
    const completedOrders = orderList.filter(order => order.orderCycle === 'Completed').length;
    return ((completedOrders / orderList.length) * 100).toFixed(1);
  };

  const calculateGrowthPercentage = (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return (((current - previous) / previous) * 100).toFixed(1);
  };

  const GrowthIndicator = ({ value, suffix = '%' }) => {
    const growth = parseFloat(value);
    const isPositive = growth >= 0;
    
    return (
      <div className={`flex items-center ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? <ArrowUpOutlined className="mr-1" /> : <ArrowDownOutlined className="mr-1" />}
        <span className="font-medium">{Math.abs(growth)}{suffix}</span>
      </div>
    );
  };

  const topCustomersColumns = [
    {
      title: 'Rank',
      dataIndex: 'rank',
      key: 'rank',
      width: 70,
      render: (rank) => (
        <div className="flex items-center justify-center">
          {rank <= 3 ? (
            <CrownOutlined 
              style={{ 
                color: rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : '#CD7F32', 
                fontSize: '20px' 
              }} 
            />
          ) : (
            <span className="font-bold text-gray-500 text-lg">#{rank}</span>
          )}
        </div>
      ),
    },
    {
      title: 'Customer',
      dataIndex: 'name',
      key: 'name',
      render: (name, record) => (
        <div className="flex items-center space-x-3">
          <Avatar 
            size={40}
            style={{ 
              backgroundColor: record.rank <= 3 ? '#FFD700' : '#3B82F6',
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            {record.avatar}
          </Avatar>
          <div>
            <div className="font-medium text-gray-900 text-base">{name}</div>
            <div className="text-sm text-gray-500 flex items-center">
              <UserOutlined className="mr-1" />
              {record.phone}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Orders',
      dataIndex: 'totalOrders',
      key: 'totalOrders',
      align: 'center',
      render: (orders) => (
        <div className="text-center">
          <div className="font-bold text-xl text-blue-600">{orders}</div>
          <div className="text-xs text-gray-500">orders</div>
        </div>
      ),
    },
    {
      title: 'Weekly Avg',
      dataIndex: 'avgOrdersPerWeek',
      key: 'avgOrdersPerWeek',
      align: 'center',
      render: (avg) => (
        <div className="text-center">
          <div className="font-bold text-lg text-purple-600">{avg.toFixed(1)}</div>
          <div className="text-xs text-gray-500">per week</div>
        </div>
      ),
    },
    {
      title: 'Success Rate',
      dataIndex: 'completionRate',
      key: 'completionRate',
      align: 'center',
      render: (rate) => (
        <div className="text-center">
          <Progress 
            percent={parseFloat(rate)} 
            size="small" 
            strokeColor={parseFloat(rate) >= 80 ? '#10B981' : parseFloat(rate) >= 60 ? '#F59E0B' : '#EF4444'}
            className="mb-1"
          />
          <div className="text-xs text-gray-500">{rate}%</div>
        </div>
      ),
    },
    {
      title: 'Last Order',
      dataIndex: 'lastOrderFormatted',
      key: 'lastOrder',
      align: 'center',
      render: (date) => (
        <div className="text-center">
          <div className="text-sm text-gray-700">{date}</div>
        </div>
      ),
    },
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-800">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const refreshData = () => {
    const startDate = '2020-01-01';
    const endDate = dayjs().add(1, 'day').format('YYYY-MM-DD');
    dispatch(fetchOrdersByDate({ from: startDate, to: endDate }));
    setLastUpdated(dayjs());
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
        <div className="ml-3 text-lg text-gray-600">Loading analytics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 text-lg p-8">
        <ExclamationCircleOutlined className="text-4xl mb-4" />
        <div>Error loading data. Please try again.</div>
      </div>
    );
  }

  return (
    <div className="p-1 min-h-screen">
      {/* Enhanced Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <Title level={2} className="text-gray-800 mb-2 flex items-center">
              <EyeOutlined className="mr-3 text-blue-600" />
              Real-Time Analytics Dashboard
            </Title>
            <Text className="text-gray-600 text-lg">
              Live business insights with comprehensive order performance metrics
            </Text>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-gradient-to-r from-green-400 to-green-500 text-white px-4 py-2 rounded-lg shadow-md">
              <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
              <Text className="text-white text-sm font-medium">Live Data</Text>
            </div>
            <div className="text-right">
              <Text className="text-gray-500 text-sm block">Last updated</Text>
              <Text className="text-gray-700 font-medium">{lastUpdated.format('HH:mm:ss')}</Text>
            </div>
            <Button 
              icon={<ReloadOutlined />}
              onClick={refreshData}
              className="border-blue-500 text-blue-500 hover:bg-blue-50"
            >
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Enhanced Real-time Stats Cards */}
      <Row gutter={[24, 24]} className="mb-8">
        <Col xs={24} sm={12} lg={6}>
          <Card className="shadow-lg border-0 hover:shadow-xl transition-shadow duration-300" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="text-white/80 text-sm mb-1">Today's Orders</div>
                <div className="text-3xl font-bold mb-2">{realTimeStats.today?.totalOrders || 0}</div>
                <div className="text-white/80 text-xs flex items-center">
                  <FireOutlined className="mr-1" />
                  {realTimeStats.lastHour || 0} in last hour
                </div>
              </div>
              <div className="text-right">
                <ShoppingCartOutlined className="text-4xl text-white/80 mb-2" />
                <div className="text-white/80 text-xs">{realTimeStats.today?.uniqueCustomers || 0} customers</div>
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="shadow-lg border-0 hover:shadow-xl transition-shadow duration-300" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="text-white/80 text-sm mb-1">This Week</div>
                <div className="text-3xl font-bold mb-2">{realTimeStats.thisWeek?.totalOrders || 0}</div>
                <div className="text-white/80 text-xs">
                  {realTimeStats.thisWeek?.uniqueCustomers || 0} customers
                </div>
              </div>
              <div className="text-right">
                <CalendarOutlined className="text-4xl text-white/80 mb-2" />
                <div className="text-white/80 text-xs">Week total</div>
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="shadow-lg border-0 hover:shadow-xl transition-shadow duration-300" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' }}>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="text-white/80 text-sm mb-1">This Month</div>
                <div className="text-3xl font-bold mb-2">{realTimeStats.thisMonth?.totalOrders || 0}</div>
                <div className="text-white/80 text-xs">
                  {realTimeStats.thisMonth?.uniqueCustomers || 0} unique customers
                </div>
              </div>
              <div className="text-right">
                <RiseOutlined className="text-4xl text-white/80 mb-2" />
                <div className="text-white/80 text-xs">Monthly total</div>
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="shadow-lg border-0 hover:shadow-xl transition-shadow duration-300" style={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', color: 'white' }}>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="text-white/80 text-sm mb-1">Completion Rate</div>
                <div className="text-3xl font-bold mb-2">{monthlyComparison.current?.completionRate || 0}%</div>
                <div className="text-white/80 text-xs">Monthly success rate</div>
              </div>
              <div className="text-right">
                <CheckCircleOutlined className="text-4xl text-white/80 mb-2" />
                <div className="text-white/80 text-xs">Success metric</div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Enhanced Monthly Comparison */}
      <Row gutter={[24, 24]} className="mb-8">
        <Col span={24}>
          <Card className="shadow-lg border-0">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center">
                <SwapOutlined className="text-blue-500 mr-2 text-xl" />
                <Title level={4} className="mb-0">Monthly Comparison Analysis</Title>
              </div>
              <div className="flex space-x-4">
                <div>
                  <Text className="text-sm text-gray-600 block mb-1">Current Month</Text>
                  <MonthPicker
                    value={selectedMonth}
                    onChange={setSelectedMonth}
                    format="MMMM YYYY"
                    className="w-40"
                  />
                </div>
                <div>
                  <Text className="text-sm text-gray-600 block mb-1">Compare With</Text>
                  <MonthPicker
                    value={selectedComparisonMonth}
                    onChange={setSelectedComparisonMonth}
                    format="MMMM YYYY"
                    className="w-40"
                  />
                </div>
              </div>
            </div>

            <Row gutter={[16, 16]}>
              <Col xs={24} md={6}>
                <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    {monthlyComparison.current?.totalOrders || 0}
                  </div>
                  <div className="text-sm text-gray-600 mb-3">
                    Total Orders ({monthlyComparison.current?.month || 'N/A'})
                  </div>
                  <GrowthIndicator value={monthlyComparison.growth?.orders || 0} />
                  <div className="text-xs text-gray-500 mt-1">
                    vs {monthlyComparison.comparison?.totalOrders || 0} last period
                  </div>
                </div>
              </Col>
              <Col xs={24} md={6}>
                <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    {monthlyComparison.current?.uniqueCustomers || 0}
                  </div>
                  <div className="text-sm text-gray-600 mb-3">
                    Unique Customers ({monthlyComparison.current?.month || 'N/A'})
                  </div>
                  <GrowthIndicator value={monthlyComparison.growth?.customers || 0} />
                  <div className="text-xs text-gray-500 mt-1">
                    vs {monthlyComparison.comparison?.uniqueCustomers || 0} last period
                  </div>
                </div>
              </Col>
              <Col xs={24} md={6}>
                <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200">
                  <div className="text-3xl font-bold text-purple-600 mb-2">
                    {monthlyComparison.current?.avgOrdersPerDay?.toFixed(1) || '0.0'}
                  </div>
                  <div className="text-sm text-gray-600 mb-3">
                    Avg Orders/Day ({monthlyComparison.current?.month || 'N/A'})
                  </div>
                  <GrowthIndicator value={monthlyComparison.growth?.avgOrdersPerDay || 0} />
                  <div className="text-xs text-gray-500 mt-1">
                    vs {monthlyComparison.comparison?.avgOrdersPerDay?.toFixed(1) || '0.0'} last period
                  </div>
                </div>
              </Col>
              <Col xs={24} md={6}>
                <div className="text-center p-6 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl border border-yellow-200">
                  <div className="text-3xl font-bold text-yellow-600 mb-2">
                    {monthlyComparison.current?.completionRate || 0}%
                  </div>
                  <div className="text-sm text-gray-600 mb-3">
                    Completion Rate ({monthlyComparison.current?.month || 'N/A'})
                  </div>
                  <GrowthIndicator value={monthlyComparison.growth?.completionRate || 0} />
                  <div className="text-xs text-gray-500 mt-1">
                    vs {monthlyComparison.comparison?.completionRate || 0}% last period
                  </div>
                </div>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* Enhanced Charts Section */}
      <Row gutter={[24, 24]} className="mb-8">
        <Col xs={24} lg={16}>
          <Card className="shadow-lg border-0" title={
            <div className="flex items-center">
              <LineChart className="mr-2 text-blue-500" />
              <span>Weekly Order Trends - {selectedMonth.format('MMMM YYYY')}</span>
            </div>
          }>
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="week" 
                  tick={{ fontSize: 12 }}
                  axisLine={{ stroke: '#d1d5db' }}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  axisLine={{ stroke: '#d1d5db' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="totalOrders" fill="#3B82F6" name="Total Orders" radius={[4, 4, 0, 0]} />
                <Line 
                  type="monotone" 
                  dataKey="uniqueCustomers" 
                  stroke="#10B981" 
                  strokeWidth={3}
                  dot={{ fill: '#10B981', strokeWidth: 2, r: 6 }}
                  name="Unique Customers"
                />
                <Line 
                  type="monotone" 
                  dataKey="completionRate" 
                  stroke="#F59E0B" 
                  strokeWidth={3}
                  dot={{ fill: '#F59E0B', strokeWidth: 2, r: 6 }}
                  name="Completion Rate (%)"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card className="shadow-lg border-0" title={
            <div className="flex items-center">
              <PieChart className="mr-2 text-green-500" />
              <span>Order Status Distribution</span>
            </div>
          }>
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={orderCycleStats}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name}: ${percentage}%`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {orderCycleStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Enhanced Order Cycle Status Cards */}
      <Row gutter={[16, 16]} className="mb-8">
        {orderCycleStats.map((stat, index) => (
          <Col xs={24} sm={12} md={8} lg={6} key={index}>
            <Card className="shadow-md border-0 hover:shadow-lg transition-shadow duration-300">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    {CYCLE_ICONS[stat.status] || <ClockCircleOutlined style={{ color: '#6B7280' }} />}
                    <Text className="ml-2 text-sm font-medium text-gray-600">{stat.status}</Text>
                  </div>
                  <div className="text-2xl font-bold mb-1" style={{ color: stat.color }}>
                    {stat.count}
                  </div>
                  <div className="text-sm text-gray-500">{stat.percentage}% of total</div>
                </div>
                <div className="text-right">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center" 
                       style={{ backgroundColor: `${stat.color}20` }}>
                    <div className="text-xl font-bold" style={{ color: stat.color }}>
                      {stat.percentage}%
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Enhanced Top Customers Section */}
      <Row gutter={[24, 24]}>
        <Col span={24}>
          <Card className="shadow-lg border-0" title={
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <CrownOutlined className="mr-2 text-yellow-500 text-xl" />
                <span className="text-lg font-semibold">Top Customers - {selectedMonth.format('MMMM YYYY')}</span>
              </div>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                  <span>VIP Customers</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                  <span>Regular Customers</span>
                </div>
              </div>
            </div>
          }>
            <Table
              columns={topCustomersColumns}
              dataSource={topCustomers}
              rowKey="id"
              pagination={false}
              size="large"
              className="custom-table"
              rowClassName={(record) => 
                record.rank <= 3 ? 'bg-gradient-to-r from-yellow-50 to-yellow-100' : 'hover:bg-gray-50'
              }
            />
          </Card>
        </Col>
      </Row>

      {/* Enhanced Monthly Growth Summary */}
      <Row gutter={[24, 24]} className="mt-8">
        <Col span={24}>
          <Card className="shadow-lg border-0 bg-gradient-to-r from-indigo-50 to-purple-50">
            <div className="text-center py-6">
              <Title level={3} className="text-gray-800 mb-4">
                Monthly Performance Summary
              </Title>
              <Row gutter={[32, 32]}>
                <Col xs={24} md={8}>
                  <Statistic
                    title="Total Orders Growth"
                    value={monthlyComparison.growth?.orders || 0}
                    precision={1}
                    valueStyle={{ 
                      color: parseFloat(monthlyComparison.growth?.orders || 0) >= 0 ? '#10B981' : '#EF4444',
                      fontSize: '28px'
                    }}
                    prefix={parseFloat(monthlyComparison.growth?.orders || 0) >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                    suffix="%"
                  />
                </Col>
                <Col xs={24} md={8}>
                  <Statistic
                    title="Customer Growth"
                    value={monthlyComparison.growth?.customers || 0}
                    precision={1}
                    valueStyle={{ 
                      color: parseFloat(monthlyComparison.growth?.customers || 0) >= 0 ? '#10B981' : '#EF4444',
                      fontSize: '28px'
                    }}
                    prefix={parseFloat(monthlyComparison.growth?.customers || 0) >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                    suffix="%"
                  />
                </Col>
                <Col xs={24} md={8}>
                  <Statistic
                    title="Completion Rate Change"
                    value={monthlyComparison.growth?.completionRate || 0}
                    precision={1}
                    valueStyle={{ 
                      color: parseFloat(monthlyComparison.growth?.completionRate || 0) >= 0 ? '#10B981' : '#EF4444',
                      fontSize: '28px'
                    }}
                    prefix={parseFloat(monthlyComparison.growth?.completionRate || 0) >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                    suffix="%"
                  />
                </Col>
              </Row>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;