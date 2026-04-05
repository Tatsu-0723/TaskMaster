export function analyzeEstAct(data: any[]): string {
  let est = 0, act = 0, doneCount = 0;
  
  data.forEach(task => {
    if (task.status === "Done") {
      const e = parseFloat(task.estTime) || 0;
      const a = parseFloat(task.actTime) || 0;
      if (e > 0 || a > 0) { 
        if(e > 0) { est += e; act += a; doneCount++; }
      }
    }
  });

  if (doneCount === 0 || est === 0) {
    return `<div style="text-align:center; padding: 40px; color: #0ff; font-family: monospace; letter-spacing: 2px;">NO DATA DETECTED</div>`;
  }

  const ratio = (act / est).toFixed(2);
  const ratioNum = Number(ratio);

  // 乖離率に応じたネオンカラーの決定
  let ratioGlow = "#0f0"; // Green (Default/Good)
  if (ratioNum > 1.2) ratioGlow = "#f00"; // Red (Over)
  else if (ratioNum < 0.8) ratioGlow = "#0ff"; // Cyan (Under)

  // グラフのバーの幅計算
  const maxTime = Math.max(est, act);
  const estWidth = maxTime > 0 ? (est / maxTime) * 100 : 0;
  const actWidth = maxTime > 0 ? (act / maxTime) * 100 : 0;

  return `
    <div class="cyber-dashboard">
      <div class="cyber-panel">
        <div class="cyber-header">DONE TASKS</div>
        <div class="cyber-value cyber-pink">${doneCount}</div>
        <div class="cyber-subtext">TOTAL COMPLETED</div>
      </div>

      <div class="cyber-panel">
        <div class="cyber-header">TIME TRACKING</div>
        <div class="cyber-time-grid">
          <div>
            <div class="cyber-subtext">EST.</div>
            <div class="cyber-value cyber-green">${est}<span style="font-size:1.5rem">h</span></div>
          </div>
          <div>
            <div class="cyber-subtext">ACT.</div>
            <div class="cyber-value cyber-cyan">${act}<span style="font-size:1.5rem">h</span></div>
          </div>
        </div>
        <div class="cyber-bars">
          <div class="cyber-bar-wrap">
            <span class="cyber-bar-label">Est</span>
            <div class="cyber-bar-bg"><div class="cyber-bar-fill bg-green" style="width: ${estWidth}%"></div></div>
          </div>
          <div class="cyber-bar-wrap">
            <span class="cyber-bar-label">Act</span>
            <div class="cyber-bar-bg"><div class="cyber-bar-fill bg-cyan" style="width: ${actWidth}%"></div></div>
          </div>
        </div>
      </div>

      <div class="cyber-panel">
        <div class="cyber-header">VARIANCE GAGE</div>
        <div class="cyber-gauge" style="--glow-color: ${ratioGlow};">
          <div class="cyber-gauge-text">${ratio}x</div>
        </div>
        <div class="cyber-subtext">ACT / EST RATIO</div>
      </div>
    </div>
  `;
}