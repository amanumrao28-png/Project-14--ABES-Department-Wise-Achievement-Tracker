export function BarChart({
  data = [],
  labelKey = 'label',
  valueKey = 'value',
  color = 'var(--chart-1)',
  height = 230
}) {
  if (!data.length) return null;

  const maxVal = Math.max(...data.map((d) => Number(d[valueKey] || 0)), 1);
  const width = 560;
  const padLeft = 42;
  const padRight = 16;
  const padTop = 16;
  const padBottom = 42;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;
  const step = chartW / data.length;
  const barW = Math.min(44, Math.max(14, step * 0.58));

  return (
    <div className="svg-chart-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} className="svg-chart" role="img">
        {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
          const y = padTop + chartH - tick * chartH;
          const label = Math.round(maxVal * tick);
          return (
            <g key={tick}>
              <line x1={padLeft} y1={y} x2={width - padRight} y2={y} stroke="var(--chart-grid)" strokeDasharray="3 3" />
              <text x={padLeft - 6} y={y + 4} textAnchor="end" fontSize="10" fill="var(--chart-axis)">
                {label}
              </text>
            </g>
          );
        })}

        {data.map((item, idx) => {
          const val = Number(item[valueKey] || 0);
          const barH = (val / maxVal) * chartH;
          const x = padLeft + idx * step + (step - barW) / 2;
          const y = padTop + chartH - barH;
          const rawLabel = String(item[labelKey] || '');
          const shortLabel = rawLabel.length > 12 ? `${rawLabel.slice(0, 11)}…` : rawLabel;

          return (
            <g key={`${rawLabel}-${idx}`}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={Math.max(barH, 2)}
                rx="4"
                fill={color}
                opacity="0.9"
              >
                <title>{`${rawLabel}: ${val}`}</title>
              </rect>
              <text
                x={x + barW / 2}
                y={y - 5}
                textAnchor="middle"
                fontSize="10"
                fontWeight="600"
                fill="var(--color-text)"
              >
                {val}
              </text>
              <text
                x={x + barW / 2}
                y={height - 14}
                textAnchor="middle"
                fontSize="10"
                fill="var(--chart-axis)"
              >
                {shortLabel}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
