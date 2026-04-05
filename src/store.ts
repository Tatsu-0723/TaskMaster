import { invoke } from "@tauri-apps/api/core";

export const PATH_KEY = "csv_save_folder";
const FILE_NAME = "tasks.json";

export function getTodayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}/${m}/${day}`;
}

export async function getSavePath(): Promise<string | null> {
  const folder = localStorage.getItem(PATH_KEY);
  if (!folder) return null;
  return `${folder}\\${FILE_NAME}`;
}

export async function loadTasks(): Promise<any[]> {
  const path = await getSavePath();
  if (!path) {
    // パス未設定時は従来のlocalStorageから復元
    const local = localStorage.getItem("task_master_data_v2");
    return local ? JSON.parse(local) : [];
  }
  try {
    const content = await invoke<string>("read_file", { path });
    return JSON.parse(content);
  } catch (e) {
    // ファイルが無い場合はlocalStorageからの移行を試みる
    const local = localStorage.getItem("task_master_data_v2");
    return local ? JSON.parse(local) : [];
  }
}

export async function saveTasks(data: any[]) {
  // バックアップとしてlocalStorageにも残す
  localStorage.setItem("task_master_data_v2", JSON.stringify(data));
  const path = await getSavePath();
  if (!path) return;
  try {
    await invoke("write_file", { path, content: JSON.stringify(data, null, 2) });
  } catch (e) {
    console.error("Save error", e);
  }
}