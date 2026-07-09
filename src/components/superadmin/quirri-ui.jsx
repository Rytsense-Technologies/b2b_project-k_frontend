export function QuirriToolbar({ title, subtitle, children }) {
  return (
    <div className="quirri-toolbar">
      <div>
        <h2>{title}</h2>
        {subtitle ? <p className="quirri-mini">{subtitle}</p> : null}
      </div>
      {children ? <div className="quirri-actions">{children}</div> : null}
    </div>
  );
}

export function QuirriFilters({ children }) {
  return <div className="quirri-filters">{children}</div>;
}

export function QuirriHero({ title, description }) {
  return (
    <div className="quirri-hero">
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </div>
  );
}

export function QuirriMetricCards({ items }) {
  return (
    <div className="quirri-grid quirri-cards">
      {items.map((item) => (
        <div key={item.title} className="quirri-card">
          <div className="quirri-metric-title">{item.title}</div>
          <div className="quirri-metric">{item.value}</div>
          {item.trend ? <div className="quirri-trend">{item.trend}</div> : null}
        </div>
      ))}
    </div>
  );
}

export function QuirriSectionTitle({ title, extra, action }) {
  return (
    <div className="quirri-section-title">
      <h3>{title}</h3>
      {extra ? <span className="quirri-mini">{extra}</span> : null}
      {action}
    </div>
  );
}

export function QuirriTable({ columns, children }) {
  return (
    <div className="quirri-card quirri-table-wrap">
      <table className="quirri-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function QuirriLinkButton({ children, onClick, danger = false, type = 'button' }) {
  return (
    <button
      type={type}
      className={`quirri-linkbtn ${danger ? 'quirri-linkbtn-danger' : ''}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function QuirriBtn({ children, variant = 'default', className = '', type = 'button', onClick, disabled }) {
  const variantClass = {
    primary: 'quirri-btn-primary',
    light: 'quirri-btn-light',
    danger: 'quirri-btn-danger',
    default: '',
  }[variant] ?? '';

  return (
    <button
      type={type}
      className={`quirri-btn ${variantClass} ${className}`.trim()}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export function QuirriFormGrid({ children }) {
  return <div className="quirri-form">{children}</div>;
}

export function QuirriField({ label, children, full = false }) {
  return (
    <label className={full ? 'quirri-full' : undefined}>
      {label}
      {children}
    </label>
  );
}

export function QuirriPillList({ items }) {
  return (
    <div className="quirri-pill-list">
      {items.map((item) => (
        <span key={item} className="quirri-pill">{item}</span>
      ))}
    </div>
  );
}
