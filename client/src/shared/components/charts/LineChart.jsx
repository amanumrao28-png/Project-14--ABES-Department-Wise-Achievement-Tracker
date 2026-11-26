export function LineChart({
  data = [],
  labelKey = 'label',
  valueKey = 'value',
  color = '#16A34A',
  height = 220
}) {
  if (!data.length) return null;

  const maxVal = Math.max(...data.map((d) => Number(d[valueKey] || 0)), 1);
  const width = 560;
  const padLeft = 42;
  const padRight = 20;
  const padTop = 18;
  const padBottom = 38;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const points = data.map((item, idx) => {
    const val = Number(item[valueKey] || 0);
    const x =
      data.length === 1
        ? padLeft + chartW / 2
        : padLeft + (idx / (data.length - 1)) * chartW;
    const y = padTop + chartH - (val / maxVal) * chartH;
    return { x, y, val, label: String(item[labelKey] || '') };
  });

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');
  const areaPoints =
    points.length > 1
      ? `${points[0].x},${padTop + chartH} ${polylinePoints} ${points[points.length - 1].x},${padTop + chartH}`
      : '';

  return (
    <div className="svg-chart-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} className="svg-chart" role="img">
        {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
          const y = padTop + chartH - tick * chartH;
          const label = Math.round(maxVal * tick);
          return (
            <g key={tick}>
              <line x1={padLeft} y1={y} x2={width - padRight} y2={y} stroke="#e2e8f0" strokeDasharray="3 3" />
              <text x={padLeft - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#64748b">
                {label}
              </text>
            </g>
          );
        })}

        {areaPoints && <polygon points={areaPoints} fill={color} opacity="0.12" />}

        {points.length > 1 && (
          <polyline
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            points={polylinePoints}
          />
        )}

        {points.map((pt, idx) => {
          const showLabel =
            data.length <= 8 || idx === 0 || idx === data.length - 1 || idx % Math.ceil(data.length / 6) === 0;
          return (
            <g key={`${pt.label}-${idx}`}>
              <circle cx={pt.x} cy={pt.y} r="4.5" fill="#ffffff" stroke={color} strokeWidth="2.5">
                <title>{`${pt.label}: ${pt.val}`}</title>
              </circle>
              {showLabel && (
                <text x={pt.x} y={height - 12} textAnchor="middle" fontSize="10" fill="#475569">
                  {pt.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
