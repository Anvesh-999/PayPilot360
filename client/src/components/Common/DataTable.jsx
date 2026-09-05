import { useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight, ArrowUpDown, X, Inbox } from 'lucide-react';

export default function DataTable({
  columns = [],
  data: propData = [],
  searchKey,
  searchPlaceholder = 'Search records...',
  actions,
  pageSize: initialPageSize = 25,
  emptyMessage = 'No records found'
}) {
  const data = useMemo(() => {
    if (Array.isArray(propData)) return propData;
    if (Array.isArray(propData?.data)) return propData.data;
    return [];
  }, [propData]);

  const [pageSize, setPageSize] = useState(initialPageSize);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState(null);
  const [sortAsc, setSortAsc] = useState(true);

  // Filter
  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    const lower = searchTerm.toLowerCase();
    return data.filter((row) => {
      if (searchKey && row[searchKey] !== undefined) {
        return String(row[searchKey]).toLowerCase().includes(lower);
      }
      return Object.values(row).some(val => 
        val !== null && val !== undefined && String(val).toLowerCase().includes(lower)
      );
    });
  }, [data, searchTerm, searchKey]);

  // Sort
  const sortedData = useMemo(() => {
    if (!sortField) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      if (sortAsc) return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });
  }, [filteredData, sortField, sortAsc]);

  // Paginate
  const totalPages = Math.ceil(sortedData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const handleSort = (key) => {
    if (sortField === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(key);
      setSortAsc(true);
    }
  };

  return (
    <div className="card" style={{ padding: '0', overflow: 'hidden', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 4px 14px rgba(15, 23, 42, 0.04)' }}>
      {/* Top Toolbar: Search & Action Buttons */}
      <div style={{
        padding: '14px 20px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        borderBottom: '1px solid #f1f5f9',
        backgroundColor: '#fafbfc'
      }}>
        <div style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          maxWidth: '320px',
          width: '100%'
        }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            style={{
              paddingLeft: '36px',
              paddingRight: searchTerm ? '32px' : '12px',
              height: '38px',
              width: '100%',
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '10px',
              color: '#0f172a',
              fontSize: '0.86rem',
              outline: 'none',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
              transition: 'border-color 0.15s, box-shadow 0.15s'
            }}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              style={{
                position: 'absolute',
                right: '8px',
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {actions && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {actions}
          </div>
        )}
      </div>

      {/* Table Content */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{
              backgroundColor: '#f8fafc',
              borderBottom: '1px solid #e2e8f0'
            }}>
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  onClick={() => col.sortable && handleSort(col.key)}
                  style={{
                    padding: '12px 20px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: '#64748b',
                    letterSpacing: '0.06em',
                    cursor: col.sortable ? 'pointer' : 'default',
                    userSelect: 'none',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{col.label}</span>
                    {col.sortable && (
                      <ArrowUpDown
                        size={12}
                        color={sortField === col.key ? '#4f46e5' : '#94a3b8'}
                      />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ textAlign: 'center', padding: '48px 20px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '50%',
                      background: '#f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#94a3b8'
                    }}>
                      <Inbox size={22} />
                    </div>
                    <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 500 }}>
                      {emptyMessage}
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rIdx) => (
                <tr
                  key={row.id || rIdx}
                  style={{
                    borderBottom: '1px solid #f1f5f9',
                    transition: 'background-color 0.15s ease'
                  }}
                  className="table-row-hover"
                >
                  {columns.map((col, cIdx) => (
                    <td
                      key={cIdx}
                      style={{
                        padding: '14px 20px',
                        fontSize: '0.875rem',
                        color: '#334155',
                        verticalAlign: 'middle'
                      }}
                    >
                      {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div style={{
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTop: '1px solid #f1f5f9',
        fontSize: '0.78rem',
        color: '#64748b',
        backgroundColor: '#fafbfc'
      }}>
        <span>
          Showing <strong style={{ color: '#0f172a' }}>{sortedData.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</strong> to <strong style={{ color: '#0f172a' }}>{Math.min(currentPage * pageSize, sortedData.length)}</strong> of <strong style={{ color: '#0f172a' }}>{sortedData.length}</strong> entries
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              style={{
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#1e293b',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={500}>All (500)</option>
            </select>
          </div>
          <button
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            style={{
              padding: '6px 12px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: currentPage === 1 ? '#94a3b8' : '#334155',
              borderRadius: '8px',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontWeight: 500,
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
            }}
          >
            <ChevronLeft size={14} /> Prev
          </button>
          <span style={{ padding: '0 6px', fontWeight: 700, color: '#0f172a' }}>
            {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage >= totalPages}
            style={{
              padding: '6px 12px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: currentPage >= totalPages ? '#94a3b8' : '#334155',
              borderRadius: '8px',
              cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontWeight: 500,
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
            }}
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
