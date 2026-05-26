// BranchProductsPage.jsx
import { useEffect, useMemo, useState, useCallback } from "react"
import { useDispatch, useSelector } from "react-redux"
import { fetchBranchProducts } from "../../Redux/Slice/branchProductSlice"
import { 
  SearchOutlined, 
  ReloadOutlined, 
  CopyOutlined, 
  CheckOutlined,
  DownloadOutlined,
  LeftOutlined,
  RightOutlined,
  DoubleLeftOutlined,
  DoubleRightOutlined,
  ShopOutlined,

  InboxOutlined
} from "@ant-design/icons"
import * as XLSX from "xlsx"

const DEFAULT_PAGE_SIZE = 10

const BranchProductsPage = () => {
  const dispatch = useDispatch()
  const { data = [], loading, error } = useSelector((state) => state.branchProducts)

  // UI state
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [copiedCode, setCopiedCode] = useState(null)
  const [sortField, setSortField] = useState("productName")
  const [sortOrder, setSortOrder] = useState("asc")

  useEffect(() => {
    dispatch(fetchBranchProducts())
  }, [dispatch])

  // Copy to clipboard function
  const handleCopy = useCallback(async (text, productKey) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedCode(productKey)
      setTimeout(() => setCopiedCode(null), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
      // Fallback for older browsers
      const textArea = document.createElement("textarea")
      textArea.value = text
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand("copy")
      document.body.removeChild(textArea)
      setCopiedCode(productKey)
      setTimeout(() => setCopiedCode(null), 2000)
    }
  }, [])

  // Normalize server payload -> UI rows
  const products = useMemo(() => {
    const list = Array.isArray(data) ? data : []
    return list.map((p, idx) => ({
      key: p?.productCode ?? `${p?.productName ?? "row"}-${idx}`,
      productName: p?.productName ?? "-",
      productCode: p?.productCode ?? "-",
      sellingPrice:
        typeof p?.sellingPrice === "number"
          ? p.sellingPrice
          : p?.sellingPrice != null
            ? Number(p.sellingPrice)
            : null,
      quantity: p?.quantity ?? p?.stockQuantity ?? 0,
      branchName: p?.branchName ?? "-",
    }))
  }, [data])

  // Search
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return products
    return products.filter((p) => {
      const name = String(p.productName ?? "").toLowerCase()
      const code = String(p.productCode ?? "").toLowerCase()
      const branch = String(p.branchName ?? "").toLowerCase()
      return name.includes(q) || code.includes(q) || branch.includes(q)
    })
  }, [products, query])

  // Sort
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let aVal = a[sortField]
      let bVal = b[sortField]
      
      if (sortField === "sellingPrice" || sortField === "quantity") {
        aVal = Number(aVal) || 0
        bVal = Number(bVal) || 0
      } else {
        aVal = String(aVal).toLowerCase()
        bVal = String(bVal).toLowerCase()
      }
      
      if (sortOrder === "asc") {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0
      }
    })
  }, [filtered, sortField, sortOrder])

  // Statistics
  const stats = useMemo(() => {
    const list = Array.isArray(products) ? products : []
    return {
      total: list.length,
      filtered: filtered.length,
      totalValue: list.reduce((sum, p) => sum + (Number(p.sellingPrice) || 0), 0),
      totalStock: list.reduce((sum, p) => sum + (Number(p.quantity) || 0), 0),
    }
  }, [products, filtered])

  // Pagination calculations
  const total = sorted.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [query, pageSize, sortField, sortOrder])

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize
    return sorted.slice(start, start + pageSize)
  }, [sorted, page, pageSize])

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  const goTo = (p) => setPage(Math.min(Math.max(1, p), totalPages))

  // Handle sort
  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortOrder("asc")
    }
  }

  // Export to Excel
  const exportToExcel = () => {
    try {
      const exportData = sorted.map((product, index) => ({
        "S/N": index + 1,
        "Product Name": product.productName,
        "Product Code": product.productCode,
        "Price": product.sellingPrice,
     
        "Branch": product.branchName,
      }))

      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(exportData)
      
      ws["!cols"] = [
        { wch: 5 },
        { wch: 40 },
        { wch: 15 },
        { wch: 12 },
        { wch: 10 },
        { wch: 20 },
      ]

      XLSX.utils.book_append_sheet(wb, ws, "Branch Products")
      const filename = `branch_products_${new Date().toISOString().split("T")[0]}.xlsx`
      XLSX.writeFile(wb, filename)
    } catch (error) {
      console.error("Export error:", error)
    }
  }

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = []
    const maxVisiblePages = 5
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      if (page <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i)
        pages.push("...")
        pages.push(totalPages)
      } else if (page >= totalPages - 2) {
        pages.push(1)
        pages.push("...")
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i)
      } else {
        pages.push(1)
        pages.push("...")
        for (let i = page - 1; i <= page + 1; i++) pages.push(i)
        pages.push("...")
        pages.push(totalPages)
      }
    }
    
    return pages
  }

  // Sort indicator
  const SortIndicator = ({ field }) => {
    if (sortField !== field) return <span className="ml-1 text-gray-300">↕</span>
    return <span className="ml-1 text-blue-600">{sortOrder === "asc" ? "↑" : "↓"}</span>
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:px-2">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <ShopOutlined className="text-blue-600" />
                Branch Products
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                View and search branch inventory. Click on product code to copy.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={exportToExcel}
                disabled={loading || total === 0}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <DownloadOutlined />
                Export Excel
              </button>
              <button
                type="button"
                onClick={() => dispatch(fetchBranchProducts())}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ReloadOutlined className={loading ? "animate-spin" : ""} />
                {loading ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>
        </div>


        {/* Search and Filters */}
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
            {/* Search */}
            <div className="sm:col-span-6">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Search Products
              </label>
              <div className="relative">
                <SearchOutlined className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name, code, or branch..."
                  className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
                {query && (
                  <button
                    onClick={() => setQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Sort By */}
            <div className="sm:col-span-3">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Sort By
              </label>
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="productName">Product Name</option>
                <option value="productCode">Product Code</option>
                <option value="sellingPrice">Price</option>
                <option value="quantity">Quantity</option>
              </select>
            </div>

            {/* Page Size */}
            <div className="sm:col-span-3">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Items per Page
              </label>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              >
                {[10, 20, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n} items
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Results Summary */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-4">
            <p className="text-sm text-gray-600">
              {total === 0 ? (
                <span className="text-gray-500">No results found</span>
              ) : (
                <>
                  Showing <span className="font-semibold text-gray-900">{from}</span> to{" "}
                  <span className="font-semibold text-gray-900">{to}</span> of{" "}
                  <span className="font-semibold text-gray-900">{total}</span> products
                </>
              )}
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
              >
                {sortOrder === "asc" ? "↑ Ascending" : "↓ Descending"}
              </button>
              
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  Clear Search
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
            <div className="flex flex-col items-center justify-center">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
              <p className="mt-4 text-sm font-medium text-gray-600">Loading branch products...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-red-100 p-2">
                <span className="text-lg text-red-600">⚠</span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-red-800">Error Loading Products</h3>
                <p className="mt-1 text-sm text-red-700">{String(error)}</p>
                <button
                  onClick={() => dispatch(fetchBranchProducts())}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
                >
                  <ReloadOutlined />
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && total === 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <InboxOutlined className="text-2xl text-gray-400" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900">No Products Found</h3>
            <p className="mt-2 text-sm text-gray-500">
              {query ? "Try adjusting your search terms." : "No branch products available."}
            </p>
            {query && (
              <button
                onClick={() => setQuery("")}
                className="mt-4 inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                Clear Search
              </button>
            )}
          </div>
        )}

        {/* Products Table */}
        {!loading && !error && total > 0 && (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      #
                    </th>
                    <th 
                      className="cursor-pointer px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-700"
                      onClick={() => handleSort("productName")}
                    >
                      <span className="flex items-center">
                        Product Name
                        <SortIndicator field="productName" />
                      </span>
                    </th>
                    <th 
                      className="cursor-pointer px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-700"
                      onClick={() => handleSort("productCode")}
                    >
                      <span className="flex items-center">
                        Code
                        <SortIndicator field="productCode" />
                      </span>
                    </th>
                    <th 
                      className="cursor-pointer px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-700"
                      onClick={() => handleSort("sellingPrice")}
                    >
                      <span className="flex items-center justify-end">
                        Price
                        <SortIndicator field="sellingPrice" />
                      </span>
                    </th>
                   
                    <th className="px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 bg-white">
                  {paged.map((p, index) => (
                    <tr 
                      key={p.key} 
                      className="transition hover:bg-blue-50/50"
                    >
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500">
                        {from + index}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900 line-clamp-2">
                            {p.productName}
                          </span>
                          {p.branchName && p.branchName !== "-" && (
                            <span className="mt-0.5 text-xs text-gray-500">
                              Branch: {p.branchName}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center rounded-md bg-blue-50 px-2.5 py-1 font-mono text-sm font-medium text-blue-700">
                            {p.productCode}
                          </span>
                          <button
                            onClick={() => handleCopy(p.productCode, p.key)}
                            className={`inline-flex h-7 w-7 items-center justify-center rounded-md transition ${
                              copiedCode === p.key
                                ? "bg-green-100 text-green-600"
                                : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
                            }`}
                            title={copiedCode === p.key ? "Copied!" : "Copy code"}
                          >
                            {copiedCode === p.key ? (
                              <CheckOutlined className="text-sm" />
                            ) : (
                              <CopyOutlined className="text-sm" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-right">
                        <span className="text-sm font-semibold text-gray-900">
                          {typeof p.sellingPrice === "number" && !Number.isNaN(p.sellingPrice)
                            ? `₵${p.sellingPrice.toLocaleString()}`
                            : "-"}
                        </span>
                      </td>
                    
                      <td className="whitespace-nowrap px-4 py-4 text-center">
                        <button
                          onClick={() => {
                            const text = `${p.productName}\nCode: ${p.productCode}\nPrice: ₵${p.sellingPrice?.toLocaleString() || '-'}\nStock: ${p.quantity || 0}`
                            handleCopy(text, `full-${p.key}`)
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
                        >
                          <CopyOutlined />
                          Copy All
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col gap-4 border-t border-gray-200 bg-gray-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-gray-600">
                Page <span className="font-semibold text-gray-900">{page}</span> of{" "}
                <span className="font-semibold text-gray-900">{totalPages}</span>
                <span className="ml-2 text-gray-400">•</span>
                <span className="ml-2">{total} total items</span>
              </div>

              <div className="flex flex-wrap items-center gap-1">
                {/* First Page */}
                <button
                  onClick={() => goTo(1)}
                  disabled={page === 1}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  title="First page"
                >
                  <DoubleLeftOutlined />
                </button>

                {/* Previous Page */}
                <button
                  onClick={() => goTo(page - 1)}
                  disabled={page === 1}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  title="Previous page"
                >
                  <LeftOutlined />
                </button>

                {/* Page Numbers */}
                <div className="hidden items-center gap-1 sm:flex">
                  {getPageNumbers().map((pageNum, index) => (
                    pageNum === "..." ? (
                      <span 
                        key={`ellipsis-${index}`} 
                        className="px-2 text-gray-400"
                      >
                        ...
                      </span>
                    ) : (
                      <button
                        key={pageNum}
                        onClick={() => goTo(pageNum)}
                        className={`inline-flex h-9 min-w-[2.25rem] items-center justify-center rounded-lg px-3 text-sm font-medium transition ${
                          page === pageNum
                            ? "bg-blue-600 text-white shadow-sm"
                            : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  ))}
                </div>

                {/* Mobile Page Indicator */}
                <div className="flex items-center gap-2 sm:hidden">
                  <input
                    type="number"
                    min={1}
                    max={totalPages}
                    value={page}
                    onChange={(e) => goTo(Number(e.target.value))}
                    className="h-9 w-16 rounded-lg border border-gray-200 bg-white px-2 text-center text-sm outline-none focus:border-blue-500"
                  />
                  <span className="text-sm text-gray-500">/ {totalPages}</span>
                </div>

                {/* Next Page */}
                <button
                  onClick={() => goTo(page + 1)}
                  disabled={page === totalPages}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  title="Next page"
                >
                  <RightOutlined />
                </button>

                {/* Last Page */}
                <button
                  onClick={() => goTo(totalPages)}
                  disabled={page === totalPages}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  title="Last page"
                >
                  <DoubleRightOutlined />
                </button>

                {/* Jump to Page (Desktop) */}
                <div className="ml-2 hidden items-center gap-2 border-l border-gray-200 pl-4 lg:flex">
                  <span className="text-sm text-gray-500">Go to:</span>
                  <input
                    type="number"
                    min={1}
                    max={totalPages}
                    value={page}
                    onChange={(e) => {
                      const val = Number(e.target.value)
                      if (val >= 1 && val <= totalPages) {
                        goTo(val)
                      }
                    }}
                    className="h-9 w-16 rounded-lg border border-gray-200 bg-white px-2 text-center text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Keyboard Shortcuts Hint */}
        {!loading && !error && total > 0 && (
          <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-400">
            <span>💡 Click on column headers to sort</span>
            <span>•</span>
            <span>Click the copy icon to copy product code</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default BranchProductsPage