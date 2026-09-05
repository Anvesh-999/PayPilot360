export default function StatCard({
  title,
  value,
  icon: Icon,
  change,
  changeType = 'positive',
  description,
  color = '#6366f1',
  bgColor = '#eef2ff',
  badgeText
}) {
  const isPositive = changeType === 'positive';

  return (
    <div
      className="card card-interactive"
      style={{
        padding: '22px 24px',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        boxShadow: '0 4px 14px rgba(15, 23, 42, 0.04)',
        transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      {/* Top Accent Gradient Line */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '3px',
        background: `linear-gradient(90deg, ${color} 0%, transparent 80%)`
      }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '0.06em'
            }}>
              {title}
            </span>
            {badgeText && (
              <span className="badge badge-gray" style={{ fontSize: '0.65rem', padding: '1px 6px' }}>
                {badgeText}
              </span>
            )}
          </div>
          <div style={{
            fontSize: '1.95rem',
            fontWeight: 800,
            color: '#0f172a',
            marginTop: '8px',
            lineHeight: 1.15,
            letterSpacing: '-0.03em',
            fontVariantNumeric: 'tabular-nums'
          }}>
            {value}
          </div>
        </div>

        {Icon && (
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: bgColor || `${color}18`,
            border: `1px solid ${color}30`,
            color: color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: `0 4px 12px ${color}15`,
            transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            <Icon size={21} />
          </div>
        )}
      </div>

      {(change || description) && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.78rem',
          paddingTop: '12px',
          borderTop: '1px solid #f1f5f9'
        }}>
          {change && (
            <span style={{
              fontWeight: 700,
              color: isPositive ? '#065f46' : '#9f1239',
              backgroundColor: isPositive ? '#ecfdf5' : '#fff1f2',
              border: isPositive ? '1px solid #a7f3d0' : '1px solid #fecdd3',
              padding: '2px 8px',
              borderRadius: '999px',
              fontSize: '0.72rem'
            }}>
              {isPositive ? '↑' : '↓'} {change}
            </span>
          )}
          {description && (
            <span style={{ color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {description}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
