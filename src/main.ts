import { TabulatorFull as Tabulator } from 'tabulator-tables';
import "tabulator-tables/dist/css/tabulator_midnight.min.css";
import { invoke } from "@tauri-apps/api/core";
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
import { PATH_KEY, getTodayStr, loadTasks, saveTasks } from './store';
import { analyzeEstAct } from './stats';

let table: Tabulator | null = null;
const statuses = ["To Do", "In Progress", "Pending", "Done"];
let activeRow: any = null;
let lastKeyDTime = 0;

async function autoSave() {
  if (!table) return;
  await saveTasks(table.getData());
}

async function checkDeadlines(data: any[]) {
  try {
    let permission = await isPermissionGranted();
    if (!permission) {
      const p = await requestPermission();
      permission = p === 'granted';
    }
    if (!permission) return;

    const todayStr = getTodayStr().replace(/\//g, '');
    const urgentTasks = data.filter(t => {
      if (t.status === "Done" || !t.deadline) return false;
      const dl = String(t.deadline).replace(/[^0-9]/g, '');
      return dl.length === 8 && dl <= todayStr;
    });

    if (urgentTasks.length > 0) {
      sendNotification({
        title: 'Task Master 期限アラート',
        body: `今日または期限切れのタスクが ${urgentTasks.length} 件あります！`
      });
    }
  } catch (e) { console.error("Notification error", e); }
}

function applyFilters() {
  if (!table) return;
  const statusVal = (document.getElementById("filter-status") as HTMLSelectElement).value;
  const searchVal = (document.getElementById("search-input") as HTMLInputElement).value.toLowerCase();
  const dateInput = (document.getElementById("filter-date") as HTMLInputElement);
  const dateVal = dateInput.value.replace(/[^0-9]/g, '');

  const currentActiveId = activeRow ? activeRow.getData().id : null;

  table.setFilter((data: any) => {
    const matchStatus = statusVal ? data.status === statusVal : true;
    const matchSearch = searchVal ? (
      String(data.category || "").toLowerCase().includes(searchVal) ||
      String(data.subject || "").toLowerCase().includes(searchVal) ||
      String(data.notes || "").toLowerCase().includes(searchVal)
    ) : true;
    const dbDateClean = String(data.createdAt || "").replace(/[^0-9]/g, '');
    const matchDate = dateVal ? dbDateClean.startsWith(dateVal) : true;
    return matchStatus && matchSearch && matchDate;
  });

  setTimeout(() => {
    const activeRows = table?.getRows("active") || [];
    let targetRow = activeRows.find((r: any) => r.getData().id === currentActiveId) || activeRows[0];
    if (targetRow) setActiveRow(targetRow, false);
  }, 10);
}

function setActiveRow(row: any, doScroll: boolean = true) {
  if (!row) return;
  if (activeRow) try { activeRow.getElement().classList.remove("active-row"); } catch(e){}
  activeRow = row;
  try { activeRow.getElement().classList.add("active-row"); } catch(e){}
  if (doScroll) activeRow.scrollTo().catch(() => {});
}

function deleteAction(row: any) {
  if (!row) return;
  if (confirm("Delete this task?")) {
    const nextRow = row.getNextRow() || row.getPrevRow();
    row.delete();
    autoSave();
    if (nextRow) setActiveRow(nextRow, false);
  }
}

function showStatsModal(contentHtml: string) {
  const overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,5,10,0.9);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);";
  
  const box = document.createElement("div");
  box.className = "cyber-modal";
  box.innerHTML = `
    <div class="cyber-title">TASKMASTER PRO - ANALYTICS</div>
    ${contentHtml}
    <button id="stats-close" class="cyber-close-btn">CLOSE [ESC]</button>
  `;
  
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  const closeBtn = document.getElementById("stats-close") as HTMLButtonElement;
  closeBtn.focus();

  const cleanup = () => {
    document.body.removeChild(overlay);
    document.removeEventListener("keydown", escHandler);
    if (activeRow) activeRow.getElement().focus();
  };

  closeBtn.onclick = cleanup;
  const escHandler = (e: KeyboardEvent) => {
    if (e.key === "Escape" || e.key === "Enter") {
      e.preventDefault();
      cleanup();
    }
  };
  document.addEventListener("keydown", escHandler);
}

// 💡 設定モーダルのバグ修正版
async function showSettings(currentPath: string): Promise<string | null> {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,5,10,0.9);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);";
    
    const box = document.createElement("div");
    box.className = "cyber-modal";
    box.style.width = "700px";
    box.innerHTML = `
      <div class="cyber-title">SYSTEM CONFIGURATION</div>
      <div class="cyber-panel" style="margin-bottom: 20px;">
        <div class="cyber-header">DATA & CSV PATH</div>
        <input type="text" id="path-input" class="cyber-input" value="${currentPath}" spellcheck="false">
      </div>
      <div class="cyber-panel">
        <div class="cyber-header">KEYBOARD OVERRIDES</div>
        <div class="cyber-shortcuts">
          <div class="shortcut-item"><span class="cyber-key">/</span> SEARCH (VIM)</div>
          <div class="shortcut-item"><span class="cyber-key">j</span> <span class="cyber-key">k</span> MOVE DOWN/UP</div>
          <div class="shortcut-item"><span class="cyber-key">Tab</span> EDIT CAT</div>
          <div class="shortcut-item"><span class="cyber-key">Enter</span> EDIT NOTES</div>
          <div class="shortcut-item"><span class="cyber-key">Esc</span> NORMAL MODE</div>
          <div class="shortcut-item"><span class="cyber-key">dd</span> DELETE TASK</div>
          <div class="shortcut-item"><span class="cyber-key">1</span> - <span class="cyber-key">4</span> SET STATUS</div>
          <div class="shortcut-item"><span class="cyber-key">Ctrl</span> + <span class="cyber-key">S</span> EXPORT</div>
        </div>
      </div>
      <div style="display:flex;justify-content:flex-end;gap:15px;margin-top:30px;">
        <button id="path-cancel" class="cyber-btn-outline">CANCEL [ESC]</button>
        <button id="path-save" class="cyber-btn-solid">SAVE [ENTER]</button>
      </div>
    `;
    
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    
    const inputEl = document.getElementById("path-input") as HTMLInputElement;
    inputEl.select();

    const cleanup = () => {
      document.body.removeChild(overlay);
      document.removeEventListener("keydown", keyHandler);
      if (activeRow) activeRow.getElement().focus();
    };

    // 💡 値を取得してから画面を消す（順番の修正）
    document.getElementById("path-cancel")!.onclick = () => { cleanup(); resolve(null); };
    document.getElementById("path-save")!.onclick = () => { 
      const val = inputEl.value;
      cleanup(); 
      resolve(val); 
    };

    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault(); cleanup(); resolve(null);
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const val = inputEl.value;
        cleanup(); resolve(val);
      }
    };
    document.addEventListener("keydown", keyHandler);
  });
}

const statusOrder: { [key: string]: number } = { "To Do": 1, "In Progress": 2, "Pending": 3, "Done": 4 };
const statusSorter = (a: any, b: any) => (statusOrder[a] || 99) - (statusOrder[b] || 99);

const statusFormatter = (cell: any) => {
  const val = cell.getValue();
  const badge = document.createElement("div");
  badge.className = "status-badge";
  badge.innerText = val === "In Progress" ? "Working" : val;
  badge.setAttribute("data-status", val);
  return badge;
};

const priorityFormatter = (cell: any) => {
  const val = cell.getValue();
  return val ? `<span class="priority-badge priority-${val}">P${val}</span>` : "";
};

const deleteFormatter = (cell: any) => {
  const btn = document.createElement("button");
  btn.className = "delete-btn";
  btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>`;
  btn.onclick = (e) => { e.stopPropagation(); deleteAction(cell.getRow()); };
  return btn;
};

async function init() {
  let data = await loadTasks();

  data = data.map((d: any) => {
    if (d.deadline && !d.deadline.includes("/")) {
      const c = d.deadline.replace(/[^0-9]/g, '');
      if (c.length === 8) d.deadline = `${c.substring(0,4)}/${c.substring(4,6)}/${c.substring(6,8)}`;
    }
    if (d.createdAt && !d.createdAt.includes("/")) {
      const c = d.createdAt.replace(/[^0-9]/g, '');
      if (c.length === 8) d.createdAt = `${c.substring(0,4)}/${c.substring(4,6)}/${c.substring(6,8)}`;
    }
    return d;
  });

  table = new Tabulator("#task-table", {
    data: data,
    layout: "fitColumns",
    columns: [
      { title: "Status", field: "status", formatter: statusFormatter, sorter: statusSorter, width: 110 },
      { title: "Category", field: "category", editor: "input", width: 140 },
      { title: "Subject", field: "subject", editor: "input", widthGrow: 2 },
      { title: "Prio", field: "priority", editor: "number", formatter: priorityFormatter, width: 70, hozAlign: "center" },
      { title: "Est", field: "estTime", editor: "number", width: 60, hozAlign: "right" },
      { title: "Act", field: "actTime", editor: "number", width: 60, hozAlign: "right" },
      { title: "Deadline", field: "deadline", editor: "input", editorParams: { selectContents: true }, width: 120 },
      { title: "Notes", field: "notes", editor: "textarea", formatter: "textarea", vertAlign: "top", widthGrow: 3 },
      { title: "", formatter: deleteFormatter, width: 60, hozAlign: "center", headerSort: false, download: false },
    ],
  });

  table.on("tableBuilt", () => {
    const firstRow = table?.getRows("active")[0];
    if (firstRow) setActiveRow(firstRow, false);
    checkDeadlines(data);
  });

  table.on("rowClick", (_e, row) => setActiveRow(row, false));
  table.on("cellEditing", (cell) => setActiveRow(cell.getRow(), false));

  table.on("cellEdited", (cell: any) => {
    const field = cell.getField();
    const val = cell.getValue();
    if (field === "status") {
      cell.getRow().update({ doneDate: val === "Done" ? getTodayStr() : "" });
    }
    if (field === "deadline" && val) {
      const clean = val.replace(/[^0-9]/g, '');
      if (clean.length === 8) cell.setValue(`${clean.substring(0,4)}/${clean.substring(4,6)}/${clean.substring(6,8)}`);
    }
    cell.getRow().normalizeHeight();
    autoSave();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("add-task")?.addEventListener("click", () => {
    if (!table) return;
    const todayStr = getTodayStr();
    table.addRow({ id: Date.now(), status: "To Do", deadline: todayStr, createdAt: todayStr, doneDate: "" }, true).then(row => {
      setActiveRow(row, true); row.getCell("category").edit();
    });
  });

  document.getElementById("all-delete")?.addEventListener("click", () => {
    if (confirm("Clear all?")) { table?.clearData(); activeRow = null; autoSave(); }
  });

  document.getElementById("show-stats")?.addEventListener("click", () => {
    if (!table) return;
    const htmlContent = analyzeEstAct(table.getData());
    showStatsModal(htmlContent);
  });

  document.getElementById("filter-status")?.addEventListener("change", applyFilters);
  
  const searchInput = document.getElementById("search-input") as HTMLInputElement;
  searchInput?.addEventListener("input", applyFilters);
  searchInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault(); searchInput.blur();
      if (activeRow) activeRow.getElement().focus();
    }
    if (e.key === "Escape") {
      e.preventDefault(); searchInput.value = ""; applyFilters(); searchInput.blur();
      if (activeRow) activeRow.getElement().focus();
    }
  });

  document.getElementById("filter-date")?.addEventListener("input", applyFilters);
  
  // 💡 設定ボタン処理の強化（不要な文字を消去し、アラートを表示）
  document.getElementById("set-path")?.addEventListener("click", async () => {
    const currentPath = localStorage.getItem(PATH_KEY) || "C:\\";
    const newPath = await showSettings(currentPath);
    if (newPath) {
      // 末尾の円マークや誤って入れたダブルクオーテーションを除去
      const cleanPath = newPath.replace(/\\$/, '').replace(/"/g, ''); 
      localStorage.setItem(PATH_KEY, cleanPath);
      await autoSave(); 
      alert(`✅ 保存先を更新しました！\n\nパス: ${cleanPath}\n\n※データ(tasks.json)の同期が完了しました。`);
    }
  });

  // 💡 CSVエクスポート処理の強化（結果をアラートで通知）
  document.getElementById("export-csv")?.addEventListener("click", async () => {
    if (!table) return;
    const folderPath = localStorage.getItem(PATH_KEY);
    if (!folderPath) { alert("⚠️ まずは歯車アイコンから保存先フォルダを設定してください。"); return; }
    
    const fullPath = `${folderPath}\\tasks_${getTodayStr().replace(/\//g, '')}.csv`;
    try {
      const data = table.getData("active");
      const headers = ["Added Date", "Done Date", "Status", "Category", "Subject", "Prio", "Est", "Act", "Deadline", "Notes"];
      const rows = data.map((d: any) => [d.createdAt || "", d.doneDate || "", d.status, d.category, d.subject, d.priority, d.estTime, d.actTime, d.deadline || "", `"${(d.notes || "").replace(/"/g, '""')}"`]);
      const bom = "\uFEFF";
      const csvContent = bom + [headers.join(","), ...rows.map((r: any) => r.join(","))].join("\n");
      
      await invoke("write_file", { path: fullPath, content: csvContent });
      
      const btn = document.getElementById("export-csv");
      if (btn) { btn.innerText = "Saved!"; setTimeout(() => btn.innerText = "Export CSV", 1500); }
      
      alert(`✅ CSVを出力しました！\n\n保存先: ${fullPath}`);
    } catch (err) { 
      alert(`❌ エラーが発生しました:\n${err}\n\n※Excelで同名のCSVを開いている場合は、閉じてから再度お試しください。`); 
    }
  });
  
  init();
});

document.addEventListener('keydown', (e) => {
  const isEditing = document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA';
  
  if (isEditing && e.key === "Escape") { (document.activeElement as HTMLElement)?.blur(); return; }

  if (!isEditing) {
    if (e.key === "/") {
      e.preventDefault();
      const searchInput = document.getElementById("search-input") as HTMLInputElement;
      searchInput?.focus();
      searchInput?.select();
      return; 
    }

    if (e.key === "ArrowDown" || e.key.toLowerCase() === "j") { e.preventDefault(); const next = activeRow?.getNextRow(); if (next) setActiveRow(next, true); }
    if (e.key === "ArrowUp" || e.key.toLowerCase() === "k") { e.preventDefault(); const prev = activeRow?.getPrevRow(); if (prev) setActiveRow(prev, true); }
    if (e.key === "Tab") { e.preventDefault(); if (activeRow) activeRow.getCell("category").edit(); }
    if (e.key === "Enter" && !e.ctrlKey) { e.preventDefault(); if (activeRow) activeRow.getCell("notes").edit(); }
    
    if (e.key.toLowerCase() === "d") {
      const now = Date.now();
      if (now - lastKeyDTime < 500) { if (activeRow) deleteAction(activeRow); lastKeyDTime = 0; }
      else lastKeyDTime = now;
    }

    if (activeRow && ["1", "2", "3", "4"].includes(e.key)) {
      e.preventDefault();
      const newStatus = statuses[parseInt(e.key) - 1];
      activeRow.update({ status: newStatus, doneDate: newStatus === "Done" ? getTodayStr() : "" });
      if (table?.getSorters().some((s: any) => s.field === "status")) {
        const sorters = table.getSorters().map((s: any) => ({column: s.field, dir: s.dir}));
        table.setSort(sorters);
      }
      autoSave(); applyFilters(); 
    }
  }

  if (e.ctrlKey && e.key.toLowerCase() === 's') { e.preventDefault(); document.getElementById("export-csv")?.click(); }
  if (e.ctrlKey && e.key.toLowerCase() === 'f') { e.preventDefault(); document.getElementById("search-input")?.focus(); }
  if (e.ctrlKey && (e.key === '+' || e.code === 'Semicolon' || e.code === 'Equal')) { e.preventDefault(); document.getElementById("add-task")?.click(); }
  if (e.ctrlKey && e.key === 'Enter') (document.activeElement as HTMLElement)?.blur();
});