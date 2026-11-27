/**
 * 26-week (182-day) daily activity calendar heatmap using actual achievement dates.
 */
export function CalendarHeatmap({ data = [], accent = 'var(--chart-1)' }) {
  const countByDate = Object.fromEntries(
    data.map((d) => [d.date, Number(d.count || 0)])
  );
  const maxCount = Math.max(...data.map((d) => Number(d.count || 0)), 1);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Align grid to 26 weeks (182 days)
  const totalDays = 26 * 7;
  const cells = [];
  for (let offset = totalDays - 1; offset >= 0; offset -= 1) {
    const dt = new Date(today);
    dt.setDate(today.getDate() - offset);
    const iso = dt.toISOString().slice(0, 10);
    const count = countByDate[iso] || 0;
    cells.push({ date: iso, count, dayOfWeek: dt.getDay() });
  }

  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  const getOpacity = (count) => {
    if (count === 0) return 0;
    const ratio = count / maxCount;
    if (ratio >= 0.75) return 1;
    if (ratio >= 0.45) return 0.7;
    if (ratio >= 0.2) return 0.45;
    return 0.25;
  };

  return (
    <div>
      <div className="heatmap-scroll">
        <div className="heatmap-grid" role="img" aria-label="Achievement activity calendar heatmap">
          {weeks.map((week, wIdx) => (
            <div key={wIdx} className="heatmap-week">
              {week.map((cell) => {
                const opacity = getOpacity(cell.count);
                return (
                  <div
                    key={cell.date}
                    className="heatmap-cell"
                    title={`${cell.date}: ${cell.count} achievement(s)`}
                    style={{
                      backgroundColor: opacity === 0 ? 'var(--color-surface-subtle)' : accent,
                      opacity: opacity === 0 ? 0.75 : opacity
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="heatmap-footer">
        <span className="form-hint">Last 26 weeks activity</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span className="form-hint">Less</span>
          {[0, 0.25, 0.5, 0.75, 1].map((lvl) => (
            <span
              key={lvl}
              className="heatmap-cell"
              style={{
                backgroundColor: lvl === 0 ? 'var(--color-surface-subtle)' : accent,
                opacity: lvl === 0 ? 0.75 : lvl
              }}
            />
          ))}
          <span className="form-hint">More</span>
        </div>
      </div>
    </div>
  );
}
