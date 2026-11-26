const DONUT_PALETTE = [
  '#2563EB',
  '#111827',
  '#16A34A',
  '#D97706',
  '#64748B',
  '#DC2626',
  '#334155'
];

export function DonutChart({
  data = [],
  labelKey = 'label',
  valueKey = 'value',
  centerLabel = 'Total'
}) {
  const nonZero = data.filter((d) => Number(d[valueKey] || 0) > 0);
  const total = nonZero.reduce((sum, d) => sum + Number(d[valueKey] || 0), 0);
  if (total === 0) return null;

  const size = 160;
  const strokeWidth = 22;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let cumulativeOffset = 0;

  return (
    <div className="donut-layout">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
        />

        {nonZero.map((item, idx) => {
          const val = Number(item[valueKey] || 0);
          const pct = val / total;
          const dashLen = pct * circumference;
          const dashArray = `${dashLen} ${circumference - dashLen}`;
          const dashOffset = -cumulativeOffset;
          cumulativeOffset += dashLen;
          const color = item.color || DONUT_PALETTE[idx % DONUT_PALETTE.length];

          return (
            <circle
              key={`${item[labelKey]}-${idx}`}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeDasharray={dashArray}
              strokeDashoffset={dashOffset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            >
              <title>{`${item[labelKey]}: ${val}`}</title>
            </circle>
          );
        })}

        <text
          x={size / 2}
          y={size / 2 - 4}
          textAnchor="middle"
          fontSize="20"
          fontWeight="700"
          fill="#0f172a"
        >
          {total}
        </text>
        <text
          x={size / 2}
          y={size / 2 + 14}
          textAnchor="middle"
          fontSize="11"
          fill="#64748b"
        >
          {centerLabel}
        </text>
      </svg>

      <div className="donut-legend">
        {nonZero.map((item, idx) => {
          const val = Number(item[valueKey] || 0);
          const color = item.color || DONUT_PALETTE[idx % DONUT_PALETTE.length];
          return (
            <div key={`${item[labelKey]}-leg-${idx}`} className="donut-legend-row">
              <span className="donut-swatch" style={{ backgroundColor: color }} />
              <span className="donut-legend-label">{item[labelKey]}</span>
              <strong>{val}</strong>
            </div>
          );
        })}
      </div>
    </div>
  );
}
