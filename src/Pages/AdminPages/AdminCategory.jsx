import { useState, useEffect, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCategories, addCategory, updateCategory } from '../../Redux/Slice/categorySlice';
import { 
    Plus, 
    Edit2, 
    Search, 
    X, 
    Loader2, 
    FolderOpen, 
    AlertCircle, 
    Filter,
    RefreshCw,
    Eye,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

const AdminCategory = () => {
    const dispatch = useDispatch();
    const { categories = [], loading, error } = useSelector((state) => state.categories);
    
    // Modal states
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [categoryName, setCategoryName] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Table states
    const [currentPage, setCurrentPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [sortBy, setSortBy] = useState('name');
    const [sortOrder, setSortOrder] = useState('asc');
    
    // Form validation
    const [formErrors, setFormErrors] = useState({});
    const [touched, setTouched] = useState({});

    useEffect(() => {
        if (!categories || categories.length === 0) {
            dispatch(fetchCategories());
        }
    }, [dispatch, categories]);

    // Memoized filtered and sorted categories
    const filteredAndSortedCategories = useMemo(() => {
        if (!categories) return [];
        
        let filtered = categories.filter((category) =>
            category?.categoryName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            category?.categoryId?.toLowerCase().includes(searchQuery.toLowerCase())
        );

        // Sort categories
        filtered.sort((a, b) => {
            let aValue = sortBy === 'name' ? a.categoryName : a.categoryId;
            let bValue = sortBy === 'name' ? b.categoryName : b.categoryId;
            
            if (sortOrder === 'asc') {
                return aValue.localeCompare(bValue);
            } else {
                return bValue.localeCompare(aValue);
            }
        });

        return filtered;
    }, [categories, searchQuery, sortBy, sortOrder]);

    // Pagination calculations
    const totalPages = Math.ceil(filteredAndSortedCategories.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentCategories = filteredAndSortedCategories.slice(startIndex, startIndex + itemsPerPage);

    // Form validation
   // Form validation
const validateForm = useCallback(() => {
    const errors = {};
    
    if (!categoryName.trim()) {
        errors.categoryName = 'Category name is required';
    } else if (categoryName.trim().length < 2) {
        errors.categoryName = 'Category name must be at least 2 characters';
    } else if (categoryName.trim().length > 50) {
        errors.categoryName = 'Category name must be less than 50 characters';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
}, [categoryName]);


    // Modal handlers
    const showModal = useCallback((category = null) => {
        if (category) {
            setCategoryId(category.categoryId);
            setCategoryName(category.categoryName);
            setIsEditing(true);
        } else {
            setCategoryId(uuidv4());
            setCategoryName('');
            setIsEditing(false);
        }
        setFormErrors({});
        setTouched({});
        setIsModalVisible(true);
    }, []);

    const hideModal = useCallback(() => {
        setCategoryName('');
        setCategoryId('');
        setIsEditing(false);
        setIsModalVisible(false);
        setFormErrors({});
        setTouched({});
    }, []);

    // Input handlers
    const handleNameChange = useCallback((e) => {
        setCategoryName(e.target.value);
        if (touched.categoryName) {
            validateForm();
        }
    }, [touched.categoryName, validateForm]);

    const handleNameBlur = useCallback(() => {
        setTouched(prev => ({ ...prev, categoryName: true }));
        validateForm();
    }, [validateForm]);

    const handleSearchChange = useCallback((e) => {
        setSearchQuery(e.target.value);
        setCurrentPage(1); // Reset to first page when searching
    }, []);

    // Form submission
    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            setTouched({ categoryName: true });
            return;
        }

        const categoryData = {
            categoryId,
            categoryName: categoryName.trim(),
        };

        try {
            setIsSubmitting(true);
            if (isEditing) {
                await dispatch(updateCategory({ categoryId, categoryData })).unwrap();
            } else {
                await dispatch(addCategory(categoryData)).unwrap();
            }
            await dispatch(fetchCategories());
            hideModal();
        } catch (error) {
            console.error('Failed to add/update category:', error);
            setFormErrors({ submit: 'Failed to save category. Please try again.' });
        } finally {
            setIsSubmitting(false);
        }
    }, [categoryId, categoryName, isEditing, dispatch, validateForm, hideModal]);

    // Pagination handlers
    const handlePageChange = useCallback((page) => {
        setCurrentPage(page);
    }, []);

    const handleItemsPerPageChange = useCallback((e) => {
        setItemsPerPage(parseInt(e.target.value));
        setCurrentPage(1);
    }, []);

    // Sort handlers
    const handleSort = useCallback((column) => {
        if (sortBy === column) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortOrder('asc');
        }
    }, [sortBy, sortOrder]);

    // Refresh handler
    const handleRefresh = useCallback(() => {
        dispatch(fetchCategories());
    }, [dispatch]);

    // Enhanced pagination component
    const PaginationComponent = () => {
        if (totalPages <= 1) return null;

        const getVisiblePages = () => {
            const delta = 2;
            const range = [];
            const rangeWithDots = [];

            for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
                range.push(i);
            }

            if (currentPage - delta > 2) {
                rangeWithDots.push(1, '...');
            } else {
                rangeWithDots.push(1);
            }

            rangeWithDots.push(...range);

            if (currentPage + delta < totalPages - 1) {
                rangeWithDots.push('...', totalPages);
            } else if (totalPages > 1) {
                rangeWithDots.push(totalPages);
            }

            return rangeWithDots;
        };

        return (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 px-6 py-4 bg-gray-50 border-t">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>Show</span>
                    <select
                        value={itemsPerPage}
                        onChange={handleItemsPerPageChange}
                        className="px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                    </select>
                    <span>of {filteredAndSortedCategories.length} entries</span>
                </div>
                
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Previous
                    </button>
                    
                    {getVisiblePages().map((page, index) => (
                        <button
                            key={index}
                            onClick={() => typeof page === 'number' && handlePageChange(page)}
                            disabled={page === '...'}
                            className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                page === currentPage
                                    ? 'bg-blue-600 text-white border border-blue-600'
                                    : page === '...'
                                    ? 'text-gray-400 cursor-default'
                                    : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                            }`}
                        >
                            {page}
                        </button>
                    ))}
                    
                    <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Next
                        <ChevronRight className="w-4 h-4 ml-1" />
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className=" mx-auto">
                {/* Header Section */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <FolderOpen className="w-8 h-8 text-green-600" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Categories Management</h1>
                                <p className="text-gray-600 mt-1">Organize and manage your product categories</p>
                            </div>
                        </div>
                        <button
                            onClick={handleRefresh}
                            className="flex items-center gap-2 px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Refresh
                        </button>
                    </div>
                </div>

                {/* Controls Section */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        {/* Search Bar */}
                        <div className="flex items-center gap-4 flex-1">
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input
                                    type="text"
                                    placeholder="Search by name or ID..."
                                    value={searchQuery}
                                    onChange={handleSearchChange}
                                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Add Button */}
                        <button
                            onClick={() => showModal()}
                            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all shadow-sm"
                        >
                            <Plus className="w-5 h-5" />
                            Add Category
                        </button>
                    </div>

                    {/* Stats */}
                    <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
                        <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1">
                                <Eye className="w-4 h-4" />
                                Total: {filteredAndSortedCategories.length} categories
                            </span>
                            {searchQuery && (
                                <span className="flex items-center gap-1">
                                    <Filter className="w-4 h-4" />
                                    Filtered: {filteredAndSortedCategories.length} of {categories.length}
                                </span>
                            )}
                        </div>
                        <div className="text-xs text-gray-500">
                            Page {currentPage} of {totalPages}
                        </div>
                    </div>
                </div>

                {/* Content Section */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
                            <p className="text-gray-600">Loading categories...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <AlertCircle className="w-8 h-8 text-red-500 mb-4" />
                            <p className="text-red-600 font-medium">Error loading categories</p>
                            <p className="text-gray-500 text-sm mt-1 mb-4">{error}</p>
                            <button
                                onClick={handleRefresh}
                                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Try Again
                            </button>
                        </div>
                    ) : currentCategories.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <FolderOpen className="w-12 h-12 text-gray-400 mb-4" />
                            <p className="text-gray-600 font-medium">
                                {searchQuery ? 'No categories found' : 'No categories yet'}
                            </p>
                            <p className="text-gray-500 text-sm mt-1 mb-4">
                                {searchQuery ? 'Try different search terms' : 'Create your first category to get started'}
                            </p>
                            {!searchQuery && (
                                <button
                                    onClick={() => showModal()}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add First Category
                                </button>
                            )}
                        </div>
                    ) : (
                        <>
                            {/* Table Header */}
                            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                                <div className="grid grid-cols-12 gap-4 text-sm font-semibold text-gray-700">
                                    <div className="col-span-1 text-center">#</div>
                                    <div 
                                        className="col-span-4 flex items-center gap-2 cursor-pointer hover:text-blue-600 transition-colors"
                                        onClick={() => handleSort('id')}
                                    >
                                        Category ID
                                        {sortBy === 'id' && (
                                            <span className="text-xs">
                                                {sortOrder === 'asc' ? '↑' : '↓'}
                                            </span>
                                        )}
                                    </div>
                                    <div 
                                        className="col-span-5 flex items-center gap-2 cursor-pointer hover:text-blue-600 transition-colors"
                                        onClick={() => handleSort('name')}
                                    >
                                        Category Name
                                        {sortBy === 'name' && (
                                            <span className="text-xs">
                                                {sortOrder === 'asc' ? '↑' : '↓'}
                                            </span>
                                        )}
                                    </div>
                                    <div className="col-span-2 text-center">Actions</div>
                                </div>
                            </div>

                            {/* Table Body */}
                            <div className="divide-y divide-gray-200">
                                {currentCategories.map((category, index) => (
                                    <div 
                                        key={category.categoryId} 
                                        className="px-6 py-4  transition-colors"
                                    >
                                        <div className="grid grid-cols-12 gap-4 items-center">
                                            <div className="col-span-1 text-center text-sm text-gray-500">
                                                {startIndex + index + 1}
                                            </div>
                                            <div className="col-span-4">
                                                <code className="text-x px-2 py-1 rounded text-gray-700">
                                                    {category.categoryId}
                                                </code>
                                            </div>
                                            <div className="col-span-5">
                                                <span className="text-sm font-medium text-gray-900">
                                                    {category.categoryName}
                                                </span>
                                            </div>
                                            <div className="col-span-2 text-center">
                                                <button
                                                    onClick={() => showModal(category)}
                                                    className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                    Edit
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                    <PaginationComponent />
                </div>

                {/* Modal */}
                {isModalVisible && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
                            {/* Modal Header */}
                            <div className="flex items-center justify-between p-6 border-b border-gray-200">
                                <h3 className="text-lg font-semibold text-gray-900">
                                    {isEditing ? 'Edit Category' : 'Add New Category'}
                                </h3>
                                <button
                                    onClick={hideModal}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <form onSubmit={handleSubmit} className="p-6">
                                {formErrors.submit && (
                                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                                        <p className="text-sm text-red-600">{formErrors.submit}</p>
                                    </div>
                                )}

                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Category ID
                                        </label>
                                        <input
                                            type="text"
                                            value={categoryId}
                                            disabled
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed font-mono text-sm"
                                        />
                                        <p className="mt-1 text-xs text-gray-500">
                                            Auto-generated unique identifier
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Category Name
                                            <span className="text-red-500 ml-1">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={categoryName}
                                            onChange={handleNameChange}
                                            onBlur={handleNameBlur}
                                            placeholder="Enter category name"
                                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                                                formErrors.categoryName ? 'border-red-300' : 'border-gray-300'
                                            }`}
                                        />
                                        {formErrors.categoryName && (
                                            <p className="mt-1 text-xs text-red-600">{formErrors.categoryName}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Modal Footer */}
                                <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
                                    <button
                                        type="button"
                                        onClick={hideModal}
                                        className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting || Object.keys(formErrors).length > 0}
                                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                        {isSubmitting ? 'Saving...' : isEditing ? 'Update Category' : 'Add Category'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminCategory;