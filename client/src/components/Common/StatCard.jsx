export default function StatCard({ title, value, icon: Icon, change, changeType = 'positive', description, color = '#14b8a6' }) {
  const isPositive = changeType === 'positive';
  
  return (
    <div className="card" style={{
      padding: '24px',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      borderTop: `3px solid ${color}`
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <span style={{
            fontSize: '0.8rem',
            fontWeight: 600,
            color: 'var(--text-muted, #94a3b8)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            {title}
          </span>
          <div style={{
            fontSize: '1.85rem',
            fontWeight: 700,
            color: 'var(--text-primary, #ffffff)',
            marginTop: '6px',
            lineHeight: 1.2
          }}>
            {value}
          </div>
        </div>
        {Icon && (
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: `${color}18`,
            color: color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Icon size={22} />
          </div>
        )}
      </div>

      {(change || description) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
          {change && (
            <span style={{
              fontWeight: 600,
              color: isPositive ? '#10b981' : '#ef4444',
              backgroundColor: isPositive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              padding: '2px 6px',
              borderRadius: '4px'
            }}>
              {isPositive ? '↑' : '↓'} {change}
            </span>
          )}
          {description && (
            <span style={{ color: 'var(--text-muted, #94a3b8)' }}>
              {description}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
