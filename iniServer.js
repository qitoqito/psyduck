import http from 'http';
import net from 'net';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const PARSE_DIR = path.join(ROOT, 'parse');
const CONFIG_DIR = path.join(ROOT, 'config');

// ==================== INI 解析 ====================
// 支持: [section] / key=value / key=value #备注 / ;key=value(禁用项) / ;key=value #备注
// listMode=true 时:section 下每行作为一个数组元素(代理池/cookie 场景)
function parseIni(text, listMode) {
  const result = {};
  let current = null; // null 表示尚未遇到 section
  const lines = text.split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(/^\[(.+)\]$/);
    if (m) {
      current = m[1].trim();
      if (!result[current]) result[current] = listMode ? [] : {};
      continue;
    }
    // list 模式:每行解析为 { value, comment }(支持 # 或 ; 行内备注)
    if (listMode) {
      const holder = current === null ? (result.__global__ = result.__global__ || []) : (result[current] = result[current] || []);
      let valuePart = line;
      let comment = '';
      const cm = valuePart.match(/(?:^|\s)([#;])\s?(.*)$/);
      if (cm) {
        comment = cm[2].trim();
        valuePart = valuePart.slice(0, cm.index).trim();
      }
      holder.push({ value: valuePart, comment: comment });
      continue;
    }
    // 检测 ; 前缀 → 禁用项,去掉 ; 后继续按 key=value 解析
    let disabled = false;
    let work = line;
    if (work.startsWith(';')) {
      disabled = true;
      work = work.slice(1).trim();
    }
    const idx = work.indexOf('=');
    if (idx <= 0) continue; // 纯注释行(无 =)跳过
    const key = work.slice(0, idx).trim();
    let valuePart = work.slice(idx + 1).trim();
    // 提取行内注释:# 或 ; 在值开头(紧跟=)或空格后均视为注释标记,只保留注释文本
    let comment = '';
    const cm = valuePart.match(/(?:^|\s)([#;])\s?(.*)$/);
    if (cm) {
      comment = cm[2].trim(); // 去掉 # 前缀,只保留文本
      valuePart = valuePart.slice(0, cm.index).trim();
    }
    const holder = current === null ? (result.__global__ = result.__global__ || {}) : (result[current] = result[current] || {});
    holder[key] = { value: valuePart, comment: comment, disabled: disabled };
  }
  if (result.__global__ && (Array.isArray(result.__global__) ? result.__global__.length === 0 : Object.keys(result.__global__).length === 0)) delete result.__global__;
  return result;
}

// ==================== INI 序列化 ====================
function stringifyEntry(k, v) {
  // 兼容旧格式(纯字符串值)
  if (typeof v === 'string') return `${k}=${v}`;
  const prefix = v.disabled ? ';' : '';
  const comment = v.comment ? ` # ${v.comment}` : ''; // 保存时自动补 # 前缀
  return `${prefix}${k}=${v.value}${comment}`;
}

// list 模式元素序列化:对象输出 value # comment,字符串原样
function stringifyListItem(item) {
  if (typeof item === 'string') return item;
  const comment = item.comment ? ` # ${item.comment}` : '';
  return `${item.value}${comment}`;
}

function stringifyIni(obj) {
  const parts = [];
  if (obj.__global__ && Object.keys(obj.__global__).length) {
    if (Array.isArray(obj.__global__)) {
      parts.push(obj.__global__.map(stringifyListItem).join('\n'));
    } else {
      parts.push(Object.entries(obj.__global__).map(([k, v]) => stringifyEntry(k, v)).join('\n'));
    }
  }
  for (const section of Object.keys(obj)) {
    if (section === '__global__') continue;
    const val = obj[section];
    // 数组(list 模式):每行一个元素
    if (Array.isArray(val)) {
      if (val.length === 0) continue; // 空节点不写入
      parts.push(`[${section}]\n${val.map(stringifyListItem).join('\n')}`);
      continue;
    }
    const entries = Object.entries(val || {});
    if (entries.length === 0) continue; // 空节点不写入
    const kvs = entries.map(([k, v]) => stringifyEntry(k, v)).join('\n');
    parts.push(`[${section}]\n${kvs}`);
  }
  return parts.join('\n\n') + '\n';
}

// ==================== 加载 JS 文件 prompt ====================
async function loadPrompts(type) {
  const dir = path.join(PARSE_DIR, type);
  if (!fs.existsSync(dir)) return { prompts: {}, meta: {} };
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.js') && !f.startsWith('.')).sort();
  const prompts = {};
  const meta = {};

  for (const file of files) {
    const name = path.basename(file, '.js');
    try {
      const filePath = path.join(dir, file);
      // 加时间戳绕过 ESM 缓存,保证修改后能读到最新
      const mod = await import(pathToFileURL(filePath).href + '?t=' + Date.now());
      const MainClass = mod.Main || mod.default?.Main;
      if (MainClass) {
        const instance = new MainClass();
        const profile = instance.profile || {};
        const hasPrompt = !!(profile.prompt && Object.keys(profile.prompt).length > 0);
        meta[name] = { title: profile.title || '', hasPrompt };
        if (hasPrompt) {
          prompts[name] = profile.prompt;
        }
      }
    } catch (err) {
      console.error(`[prompt] 加载 ${file} 失败:`, err.message);
      meta[name] = { title: '', hasPrompt: false, error: err.message };
    }
  }

  return { prompts, meta };
}

// ==================== prompt 与 ini 数据合并 ====================
function mergePromptData(iniData, prompts) {
  const merged = JSON.parse(JSON.stringify(iniData));

  for (const [sectionName, promptObj] of Object.entries(prompts)) {
    if (!promptObj || typeof promptObj !== 'object') continue;
    if (!merged[sectionName]) merged[sectionName] = {};

    for (const [key, promptValue] of Object.entries(promptObj)) {
      const promptStr = String(promptValue);
      if (merged[sectionName][key]) {
        // 兼容旧格式(纯字符串)
        if (typeof merged[sectionName][key] === 'string') {
          merged[sectionName][key] = { value: merged[sectionName][key], comment: promptStr, disabled: false, isPrompt: true };
          continue;
        }
        const entry = merged[sectionName][key];
        entry.isPrompt = true; // 标记为 prompt 字段
        // 已开启且无备注 → 追加 prompt 作为备注
        if (!entry.disabled && !entry.comment) {
          entry.comment = promptStr;
        }
        // 禁用、无值、无备注 → 模板项,补上备注
        else if (entry.disabled && !entry.value && !entry.comment) {
          entry.comment = promptStr;
        }
      } else {
        // ini 中不存在该 key → 添加为禁用模板项(等价 ;key= #备注)
        merged[sectionName][key] = { value: '', comment: promptStr, disabled: true, isPrompt: true };
      }
    }
  }

  return merged;
}

// ==================== 节点排序 ====================
// 排序规则:有 prompt 的节点在前(文件名排序) → 无 prompt 的节点在后(文件名排序)
// → ini 中多出的节点保持原顺序在最后
function sortSections(data, meta) {
  const ordered = {};
  if (data.__global__) ordered.__global__ = data.__global__;
  const withPrompt = [];
  const withoutPrompt = [];
  for (const key of Object.keys(meta)) {
    if (data[key] === undefined) continue;
    if (meta[key].hasPrompt) withPrompt.push(key);
    else withoutPrompt.push(key);
  }
  for (const key of withPrompt) ordered[key] = data[key];
  for (const key of withoutPrompt) ordered[key] = data[key];
  for (const key of Object.keys(data)) {
    if (key === '__global__' || key in meta) continue;
    ordered[key] = data[key];
  }
  return ordered;
}

// ==================== 工具 ====================
function safeName(name) {
  return /^[A-Za-z0-9_\-]+$/.test(name);
}

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve) => {
    let buf = '';
    req.on('data', (c) => (buf += c));
    req.on('end', () => resolve(buf));
  });
}

// list 模式白名单:file 匹配具体文件路径,dir 匹配整个目录
const LIST_WHITELIST = {
  file: ['config/proxy.ini'],
  dir: ['cookie'],
};

// 判断是否为 list 模式文件:命中 file 白名单(basename 匹配)或 dir 白名单(整个目录)
function isListFile(name, dir) {
  if (LIST_WHITELIST.dir.includes(dir)) return true;
  const base = `${name}.ini`;
  if (LIST_WHITELIST.file.some(f => path.basename(f) === base)) return true;
  return false;
}

// 读取 config/config.ini 的 env.iniPath(激活且非空时返回路径)
function getIniPath() {
  const cfgPath = path.join(CONFIG_DIR, 'config.ini');
  if (!fs.existsSync(cfgPath)) return null;
  const text = fs.readFileSync(cfgPath, 'utf-8');
  const data = parseIni(text);
  const env = data.env;
  if (!env || !env.iniPath || env.iniPath.disabled) return null;
  const p = (env.iniPath.value || '').trim();
  return p || null;
}

// 读取 config/config.ini 的 [env] 节点,返回 { key: value } 平铺对象(跳过禁用项)
function getEnvConfig() {
  const cfgPath = path.join(CONFIG_DIR, 'config.ini');
  if (!fs.existsSync(cfgPath)) return {};
  const text = fs.readFileSync(cfgPath, 'utf-8');
  const data = parseIni(text);
  const env = data.env || {};
  const result = {};
  for (const [k, v] of Object.entries(env)) {
    if (typeof v === 'string') { result[k] = v; continue; }
    if (!v.disabled) result[k] = v.value || '';
  }
  return result;
}

// 列出 parse 顶层子目录(脚本组)+ config 下无对应目录的 ini + cookie 目录 ini
// parse 下无对应 ini 时自动创建
function listScripts() {
  const result = [];
  const seen = new Set();
  // parse 顶层脚本组(不递归)
  if (fs.existsSync(PARSE_DIR)) {
    const entries = fs.readdirSync(PARSE_DIR, { withFileTypes: true });
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      seen.add(e.name);
      const iniPath = path.join(CONFIG_DIR, `${e.name}.ini`);
      // parse 目录存在但 config 无对应 ini → 自动创建空 ini
      if (!fs.existsSync(iniPath)) {
        fs.writeFileSync(iniPath, '', 'utf-8');
        console.log(`[auto] 已创建 config/${e.name}.ini`);
      }
      const files = fs.readdirSync(path.join(PARSE_DIR, e.name)).filter((f) => !f.startsWith('.'));
      result.push({ name: e.name, hasIni: true, isDir: true, dir: 'config', isList: false, files });
    }
  }
  // config 下无对应 parse 目录的 ini
  if (fs.existsSync(CONFIG_DIR)) {
    const inis = fs.readdirSync(CONFIG_DIR).filter(f => f.endsWith('.ini'));
    for (const f of inis) {
      const name = path.basename(f, '.ini');
      if (!seen.has(name)) {
        result.push({ name, hasIni: true, isDir: false, dir: 'config', isList: isListFile(name, 'config'), files: [] });
      }
    }
  }
  // 白名单 dir 目录下的 ini(cookie 等列表目录)
  for (const dirName of LIST_WHITELIST.dir) {
    const dirPath = path.join(ROOT, dirName);
    if (!fs.existsSync(dirPath)) continue;
    const inis = fs.readdirSync(dirPath).filter(f => f.endsWith('.ini'));
    for (const f of inis) {
      const name = path.basename(f, '.ini');
      result.push({ name, hasIni: true, isDir: false, dir: dirName, isList: isListFile(name, dirName), files: [] });
    }
  }
  // iniPath 外部目录(config/config.ini env.iniPath 激活时)
  const extDir = getIniPath();
  if (extDir && fs.existsSync(extDir)) {
    const inis = fs.readdirSync(extDir).filter(f => f.endsWith('.ini'));
    for (const f of inis) {
      const name = path.basename(f, '.ini');
      result.push({ name, hasIni: true, isDir: false, dir: 'iniPath', isList: isListFile(name, 'iniPath'), files: [] });
    }
  }
  return result;
}

// ==================== 内嵌前端页面 ====================
const INDEX_HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Pysduck Ini</title>
<style>
  :root {
    --bg: #f4f5fa;
    --surface: #ffffff;
    --sidebar: #0e1017;
    --sidebar-hover: #1a1d29;
    --sidebar-active: linear-gradient(135deg, #6366f1, #8b5cf6);
    --border: #e8eaf0;
    --border-light: #f0f1f6;
    --text: #171923;
    --text-2: #71758a;
    --text-3: #a0a4b8;
    --accent: #6366f1;
    --accent-hover: #4f46e5;
    --accent-bg: rgba(99,102,241,.06);
    --violet-bg: #f5f3ff;
    --violet-border: #ddd6fe;
    --green: #10b981;
    --green-bg: #ecfdf5;
    --red: #ef4444;
    --red-bg: #fef2f2;
    --amber: #f59e0b;
    --amber-bg: #fffbeb;
    --blue: #3b82f6;
    --blue-bg: #eff6ff;
    --radius: 12px;
    --radius-sm: 8px;
    --shadow: 0 1px 2px rgba(16,18,26,.04);
    --shadow-md: 0 4px 16px rgba(16,18,26,.06);
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, "SF Pro Text", "PingFang SC", "Microsoft YaHei", sans-serif; background: var(--bg); color: var(--text); height: 100vh; display: flex; overflow: hidden; }

  /* ===== 侧边栏 ===== */
  .sidebar { width: 250px; background: var(--sidebar); display: flex; flex-direction: column; flex-shrink: 0; }
  .sidebar-brand { padding: 22px 22px 18px; border-bottom: 1px solid rgba(255,255,255,.06); }
  .sidebar-brand .logo { display: flex; align-items: center; gap: 10px; }
  .sidebar-brand .logo-icon { width: 32px; height: 32px; border-radius: 8px; background: var(--sidebar-active); display: flex; align-items: center; justify-content: center; font-size: 15px; color: #fff; font-weight: 700; }
  .sidebar-brand .logo-text { font-size: 15px; font-weight: 600; color: #e2e4ec; letter-spacing: .3px; }
  .script-list { flex: 1; overflow-y: auto; padding: 10px 12px; }
  .script-list::-webkit-scrollbar { width: 4px; }
  .script-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,.1); border-radius: 4px; }
  .script-item { padding: 11px 14px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; border-radius: var(--radius-sm); transition: all .15s; margin-bottom: 2px; }
  .script-item:hover { background: var(--sidebar-hover); }
  .script-item.active { background: var(--sidebar-active); box-shadow: 0 2px 8px rgba(99,102,241,.3); }
  .script-item .s-name { font-size: 13px; font-weight: 500; color: #aeb2c5; transition: color .15s; }
  .script-item:hover .s-name { color: #e2e4ec; }
  .script-item.active .s-name { color: #fff; }
  .script-item .s-badge { font-size: 10px; background: rgba(255,255,255,.08); color: #8b8fa3; border-radius: 6px; padding: 2px 7px; }
  .script-item.active .s-badge { background: rgba(255,255,255,.2); color: #fff; }
  .script-item.no-ini .s-badge { background: rgba(239,68,68,.2); color: #fca5a5; }
  .sidebar-footer { padding: 12px; border-top: 1px solid rgba(255,255,255,.06); }
  .btn-new-ini { width: 100%; padding: 9px; background: rgba(255,255,255,.06); border: 1px dashed rgba(255,255,255,.15); border-radius: var(--radius-sm); color: #8b8fa3; font-size: 12px; font-weight: 500; cursor: pointer; transition: all .15s; }
  .btn-new-ini:hover { background: rgba(99,102,241,.15); border-color: rgba(99,102,241,.4); color: #c7c9d6; }

  /* ===== 主区域 ===== */
  .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
  .toolbar { background: rgba(255,255,255,.85); backdrop-filter: blur(12px); padding: 14px 50px 14px 32px; display: flex; align-items: center; gap: 10px; border-bottom: 1px solid var(--border-light); z-index: 2; }
  .toolbar .title { font-size: 17px; font-weight: 700; flex: 1; letter-spacing: -.2px; }
  .toolbar .title small { color: var(--text-3); font-weight: 400; font-size: 12px; margin-left: 10px; background: var(--bg); padding: 3px 8px; border-radius: 6px; }
  .btn { padding: 5px 11px; border: 1px solid transparent; border-radius: var(--radius-sm); cursor: pointer; font-size: 12px; font-weight: 500; transition: all .15s; display: inline-flex; align-items: center; gap: 6px; line-height: 1.4; }
  .btn-success { background: var(--green); color: #fff; border-color: var(--green); box-shadow: 0 1px 4px rgba(16,185,129,.3); }
  .btn-success:hover { background: #059669; border-color: #059669; transform: translateY(-1px); box-shadow: 0 3px 8px rgba(16,185,129,.35); }
  .btn-ghost { background: transparent; color: var(--text-2); border-color: var(--border); }
  .btn-ghost:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-bg); }
  .btn-primary-soft { background: var(--accent-bg); color: var(--accent); border-color: transparent; }
  .btn-primary-soft:hover { background: #e0e0fb; }
  .btn-blue-soft { background: var(--blue-bg); color: var(--blue); border-color: transparent; }
  .btn-blue-soft:hover { background: #dbeafe; }
  .btn-danger-soft { background: var(--red-bg); color: var(--red); border-color: transparent; }
  .btn-danger-soft:hover { background: #fee2e2; }
  .status { font-size: 12px; color: var(--text-3); }
  .status.ok { color: var(--green); font-weight: 600; }
  /* 筛选胶囊开关 */
  .filter-toggle { cursor: pointer; user-select: none; }
  .filter-toggle input { display: none; }
  .filter-pill { display: inline-flex; align-items: center; gap: 6px; padding: 5px 13px; border-radius: 999px; font-size: 12px; font-weight: 500; border: 1px solid var(--border); color: var(--text-3); background: transparent; transition: all .15s; white-space: nowrap; }
  .filter-pill .filter-dot { width: 6px; height: 6px; border-radius: 50%; background: #cdd0dc; transition: all .15s; flex-shrink: 0; }
  .filter-pill:hover { border-color: var(--accent); color: var(--accent); }
  .filter-toggle input:checked + .filter-pill { background: var(--accent-bg); border-color: var(--violet-border); color: var(--accent); }
  .filter-toggle input:checked + .filter-pill .filter-dot { background: var(--accent); box-shadow: 0 0 0 3px rgba(99,102,241,.15); }
  /* 搜索框 */
  .search-input { padding: 5px 12px; border: 1px solid var(--border); border-radius: 999px; font-size: 12px; width: 150px; background: var(--surface); color: var(--text); transition: all .15s; }
  .search-input:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-bg); width: 200px; }
  .search-input::placeholder { color: var(--text-3); }

  /* ===== 内容区 ===== */
  .content { flex: 1; overflow-y: auto; padding: 28px 32px; }
  .content::-webkit-scrollbar { width: 6px; }
  .content::-webkit-scrollbar-thumb { background: #d1d5e0; border-radius: 6px; }
  .empty { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--text-3); gap: 14px; }
  .empty .empty-icon { width: 72px; height: 72px; border-radius: 20px; background: var(--accent-bg); display: flex; align-items: center; justify-content: center; font-size: 30px; }
  .empty .empty-text { font-size: 14px; font-weight: 500; color: var(--text-2); }

  /* ===== Section 卡片 ===== */
  .section-card { background: var(--surface); border-radius: var(--radius); margin-bottom: 14px; box-shadow: var(--shadow); border: 1px solid var(--border-light); transition: box-shadow .2s, transform .2s; overflow: hidden; }
  .section-card:hover { box-shadow: var(--shadow-md); }
  .section-card.unselected { opacity: .55; }
  .section-header { display: flex; align-items: center; gap: 10px; padding: 13px 18px; cursor: pointer; user-select: none; transition: background .15s; }
  .section-header:hover { background: var(--accent-bg); }
  .section-header .arrow { display: inline-flex; transition: transform .2s; font-size: 11px; color: var(--text-3); width: 16px; }
  .section-card.collapsed .arrow { transform: rotate(-90deg); }
  .section-card.collapsed .section-body { display: none; }
  .section-header .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--sidebar-active); flex-shrink: 0; }
  .section-name { font-weight: 600; font-size: 13.5px; color: var(--text); display: flex; align-items: center; gap: 8px; flex: 1; }
  .section-title { font-size: 12px; font-weight: 400; color: var(--text-3); }
  .badge-unselected { font-size: 10px; font-weight: 600; color: var(--amber); background: var(--amber-bg); border-radius: 6px; padding: 2px 7px; }
  .section-count { font-size: 11px; color: var(--text-3); font-weight: 500; background: var(--bg); padding: 2px 9px; border-radius: 6px; }

  /* ===== KV 行 ===== */
  .kv-list { padding: 4px 18px 14px; }
  .kv-row { display: flex; gap: 8px; align-items: center; padding: 5px 0; }
  .kv-row input[type="text"], .add-row input[type="text"] { padding: 8px 11px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; transition: all .15s; background: var(--surface); color: var(--text); }
  .kv-row input[type="text"]:focus, .add-row input[type="text"]:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-bg); }
  .kv-row .key, .add-row .key { width: 190px; font-family: ui-monospace, "SF Mono", "Cascadia Code", monospace; background: #f8f9fc; font-weight: 500; }
  .kv-row .key.is-prompt { background: var(--violet-bg); border-color: var(--violet-border); }
  .kv-row .key.is-prompt:focus { border-color: #8b5cf6; box-shadow: 0 0 0 3px rgba(139,92,246,.1); }
  .kv-row .val, .add-row .val { flex: 1; font-family: ui-monospace, "SF Mono", "Cascadia Code", monospace; }
  .kv-row .cmt, .add-row .cmt { width: 140px; font-size: 12px; color: var(--text-2); font-family: ui-monospace, monospace; }
  /* 备注预览气泡 */
  .cmt-wrap { position: relative; width: 140px; flex-shrink: 0; }
  .cmt-wrap .cmt { width: 100%; }
  /* 全局备注预览气泡(fixed 定位,不受父容器裁剪) */
  .cmt-tooltip { position: fixed; background: #1a1d29; color: #e2e4ec; padding: 8px 12px; border-radius: 8px; font-size: 12px; line-height: 1.6; white-space: pre-wrap; word-break: break-all; max-width: 340px; z-index: 9999; box-shadow: 0 4px 16px rgba(0,0,0,.3); pointer-events: none; display: none; }
  .kv-row.disabled .key, .kv-row.disabled .val, .kv-row.disabled .cmt { opacity: .4; text-decoration: line-through; }

  /* ===== 开关 ===== */
  .switch { position: relative; display: inline-block; width: 34px; height: 20px; flex-shrink: 0; }
  .switch input { display: none; }
  .switch .track { position: absolute; inset: 0; background: #d1d5e0; border-radius: 999px; transition: background .2s; cursor: pointer; }
  .switch .track::after { content: ''; position: absolute; width: 16px; height: 16px; left: 2px; top: 2px; background: #fff; border-radius: 50%; transition: transform .2s; box-shadow: 0 1px 3px rgba(0,0,0,.15); }
  .switch input:checked + .track { background: var(--accent); }
  .switch input:checked + .track::after { transform: translateX(14px); }

  /* ===== 新增行 ===== */
  .add-row { display: flex; gap: 8px; align-items: center; padding: 10px 0 4px; border-top: 1px dashed var(--border); margin-top: 8px; }
  .add-row input[type="text"] { border-style: dashed; border-color: #cdd0dc; }
  .add-row input[type="text"]:focus { border-style: solid; }

  /* ===== 模态框 ===== */
  .modal-mask { position: fixed; inset: 0; background: rgba(14,16,23,.45); backdrop-filter: blur(2px); z-index: 500; display: none; align-items: center; justify-content: center; }
  .modal-mask.show { display: flex; }
  .modal { background: var(--surface); border-radius: 16px; width: 380px; box-shadow: 0 20px 60px rgba(0,0,0,.25); overflow: hidden; animation: modalIn .18s ease; }
  @keyframes modalIn { from { opacity: 0; transform: translateY(12px) scale(.97); } to { opacity: 1; transform: none; } }
  .modal-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--border-light); }
  .modal-title { font-size: 15px; font-weight: 700; }
  .modal-close { background: none; border: none; font-size: 14px; color: var(--text-3); cursor: pointer; padding: 4px; border-radius: 6px; transition: all .15s; }
  .modal-close:hover { background: var(--bg); color: var(--text); }
  .modal-body { padding: 18px 20px; display: flex; flex-direction: column; gap: 14px; }
  .modal-tip { font-size: 12px; color: var(--text-3); background: var(--bg); padding: 8px 10px; border-radius: 8px; }
  .modal-tip-danger { color: var(--red); background: var(--red-bg); }
  .modal-field { display: flex; align-items: center; gap: 12px; }
  .modal-field > label:first-child { width: 44px; font-size: 13px; font-weight: 600; color: var(--text-2); flex-shrink: 0; }
  .modal-field input[type="text"] { flex: 1; padding: 9px 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; transition: all .15s; }
  .modal-field input[type="text"]:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-bg); }
  .modal-row { justify-content: flex-start; }
  .modal-footer { display: flex; justify-content: flex-end; gap: 8px; padding: 14px 20px; border-top: 1px solid var(--border-light); }
  /* 文本预览 */
  .text-content { width: 100%; padding: 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-family: ui-monospace, "SF Mono", "Cascadia Code", monospace; font-size: 12px; line-height: 1.7; color: var(--text); background: var(--bg); resize: vertical; white-space: pre; outline: none; }
  .text-content:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-bg); }

  /* ===== 移动端汉堡按钮(PC隐藏) ===== */
  .btn-menu { display: none; background: none; border: none; font-size: 18px; color: var(--text); cursor: pointer; padding: 4px; border-radius: 6px; flex-shrink: 0; }
  .sidebar-overlay { display: none; position: fixed; inset: 0; background: rgba(14,16,23,.5); z-index: 99; }

  /* ===== 移动端适配 ===== */
  @media (max-width: 768px) {
    body { flex-direction: column; }
    /* 侧边栏:抽屉式 */
    .sidebar { position: fixed; left: 0; top: 0; bottom: 0; width: 240px; z-index: 100; transform: translateX(-100%); transition: transform .25s ease; }
    .sidebar.open { transform: translateX(0); }
    .sidebar-overlay.show { display: block; }
    .btn-menu { display: inline-flex; }
    /* 主区域占满 */
    .main { width: 100%; }
    /* 工具栏:换行+缩小间距 */
    .toolbar { padding: 10px 14px; flex-wrap: wrap; gap: 6px; }
    .toolbar .title { font-size: 15px; width: 100%; flex: none; }
    .toolbar .title small { font-size: 10px; margin-left: 6px; padding: 2px 6px; }
    .btn { padding: 5px 9px; font-size: 11px; }
    .search-input { width: 110px; }
    .search-input:focus { width: 140px; }
    .filter-pill { padding: 4px 10px; font-size: 11px; }
    /* 内容区 padding 缩小 */
    .content { padding: 14px; }
    /* Section 卡片:名称独占一行,按钮组换行 */
    .section-header { padding: 10px 12px; gap: 4px 6px; flex-wrap: wrap; }
    .section-header .arrow { display: none; }
    .section-header .dot { display: none; }
    .section-name { font-size: 13px; min-width: 0; width: 100%; flex: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .section-count { margin-left: auto; }
    .section-header .btn { padding: 4px 8px; font-size: 10px; }
    .kv-list { padding: 4px 12px 12px; }
    /* KV 行:纵向堆叠 */
    .kv-row { flex-wrap: wrap; gap: 6px; }
    .kv-row .key, .add-row .key { width: calc(100% - 50px); }
    .kv-row .val, .add-row .val { width: 100%; flex: none; }
    .kv-row .cmt, .add-row .cmt { width: calc(100% - 60px); }
    .cmt-wrap { width: calc(100% - 60px); }
    .add-row { flex-wrap: wrap; }
    .add-row .key { width: 100%; }
    /* 模态框自适应 */
    .modal { width: calc(100vw - 24px); max-width: 380px; }
    .modal[style*="480px"] { max-width: 480px; }
  }
</style>
</head>
<body>
  <div class="sidebar-overlay" id="sidebarOverlay" onclick="toggleSidebar(false)"></div>
  <aside class="sidebar" id="sidebar">
    <div class="sidebar-brand">
      <div class="logo">
        <div class="logo-icon">p</div>
        <div class="logo-text">Psyduck Ini</div>
      </div>
    </div>
    <div class="script-list" id="scriptList"></div>
    <div class="sidebar-footer">
      <button class="btn-new-ini" id="btnNewIni" onclick="openCreateIniModal()">+ 新建 ini</button>
    </div>
  </aside>
  <main class="main">
    <div class="toolbar">
      <button class="btn-menu" onclick="toggleSidebar(true)">☰</button>
      <div class="title" id="toolbarTitle">选择脚本</div>
      <span class="status" id="status"></span>
      
      <input type="text" id="searchInput" class="search-input" placeholder="搜索节点..." oninput="renderConfig()" style="display:none">
      <label class="filter-toggle" id="toggleFilter" style="display:none"><input type="checkbox" id="toggleOrphan" onchange="renderConfig()"><span class="filter-pill"><i class="filter-dot"></i>仅显示有脚本的节点</span></label>
      <button class="btn btn-danger-soft" id="btnDelIni" onclick="openDeleteIniModal()" style="display:none">删除文件</button>
      <button class="btn btn-ghost" onclick="loadScripts()">刷新</button>
      <button class="btn btn-primary-soft" id="btnAddSection" onclick="addSection()" style="display:none">添加节点</button>
      <button class="btn btn-blue-soft" id="btnBatchAdd" onclick="openBatchModal()" style="display:none">批量添加</button>
      <button class="btn btn-danger-soft" id="btnBatchDel" onclick="openBatchDelModal()" style="display:none">批量删除</button>
      <button class="btn btn-success" id="btnSave" onclick="saveConfig()" style="display:none">保存</button>
     
    </div>
    <div class="content" id="content">
      <div class="empty"><div class="empty-icon">📂</div><div class="empty-text">从左侧选择一个脚本开始编辑</div></div>
    </div>
  </main>
  <div class="cmt-tooltip" id="cmtTooltip"></div>
  <!-- 批量添加字段模态框 -->
  <div class="modal-mask" id="batchModal" onclick="if(event.target===this)closeBatchModal()">
    <div class="modal">
      <div class="modal-header">
        <span class="modal-title">批量添加字段</span>
        <button class="modal-close" onclick="closeBatchModal()">✕</button>
      </div>
      <div class="modal-body">
        <div class="modal-tip">将向当前配置的所有节点添加以下字段(已存在的 key 会跳过)</div>
        <div class="modal-field"><label>Key</label><input type="text" id="batchKey" placeholder="字段名,如 test"></div>
        <div class="modal-field"><label>Value</label><input type="text" id="batchVal" placeholder="值"></div>
        <div class="modal-field"><label>备注</label><input type="text" id="batchCmt" placeholder="备注"></div>
        <div class="modal-field modal-row"><label>启用</label><label class="switch"><input type="checkbox" id="batchEnabled" checked><span class="track"></span></label></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" onclick="closeBatchModal()">取消</button>
        <button class="btn btn-success" onclick="applyBatchAdd()">添加</button>
      </div>
    </div>
  </div>
  <!-- 批量删除字段模态框 -->
  <div class="modal-mask" id="batchDelModal" onclick="if(event.target===this)closeBatchDelModal()">
    <div class="modal">
      <div class="modal-header">
        <span class="modal-title">批量删除字段</span>
        <button class="modal-close" onclick="closeBatchDelModal()">✕</button>
      </div>
      <div class="modal-body">
        <div class="modal-tip modal-tip-danger">将从当前配置的所有节点中删除指定 key(不存在的自动跳过)</div>
        <div class="modal-field"><label>Key</label><input type="text" id="batchDelKey" placeholder="要删除的字段名,如 task"></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" onclick="closeBatchDelModal()">取消</button>
        <button class="btn btn-danger-soft" onclick="applyBatchDel()">删除</button>
      </div>
    </div>
  </div>
  <!-- 节点文本预览模态框 -->
  <div class="modal-mask" id="textModal" onclick="if(event.target===this)closeTextModal()">
    <div class="modal" style="width:480px">
      <div class="modal-header">
        <span class="modal-title" id="textModalTitle">节点文本</span>
        <button class="modal-close" onclick="closeTextModal()">✕</button>
      </div>
      <div class="modal-body">
        <textarea id="textModalContent" class="text-content" readonly rows="12" spellcheck="false"></textarea>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" onclick="closeTextModal()">关闭</button>
        <button class="btn btn-primary-soft" onclick="copySectionText(this)">复制</button>
      </div>
    </div>
  </div>
  <!-- 新建 ini 模态框 -->
  <div class="modal-mask" id="createIniModal" onclick="if(event.target===this)closeCreateIniModal()">
    <div class="modal">
      <div class="modal-header">
        <span class="modal-title">新建 ini</span>
        <button class="modal-close" onclick="closeCreateIniModal()">✕</button>
      </div>
      <div class="modal-body">
        <div class="modal-tip">将在所选目录下创建空的 ini 文件</div>
        <div class="modal-field"><label>名称</label><input type="text" id="createIniName" placeholder="文件名,不含 .ini 后缀"></div>
        <div class="modal-field"><label>目录</label>
          <select id="createIniDir" style="flex:1;padding:9px 12px;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:13px;background:var(--surface);color:var(--text)">
            <option value="config">config</option>
            <option value="cookie">cookie</option>
            <option value="iniPath">iniPath(外部目录)</option>
          </select>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" onclick="closeCreateIniModal()">取消</button>
        <button class="btn btn-success" onclick="applyCreateIni()">创建</button>
      </div>
    </div>
  </div>
  <!-- 删除 ini 模态框 -->
  <div class="modal-mask" id="deleteIniModal" onclick="if(event.target===this)closeDeleteIniModal()">
    <div class="modal">
      <div class="modal-header">
        <span class="modal-title">删除 ini</span>
        <button class="modal-close" onclick="closeDeleteIniModal()">✕</button>
      </div>
      <div class="modal-body">
        <div class="modal-tip modal-tip-danger" id="deleteIniTip">确认删除该文件?此操作不可恢复!</div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" onclick="closeDeleteIniModal()">取消</button>
        <button class="btn btn-danger-soft" onclick="applyDeleteIni()">删除</button>
      </div>
    </div>
  </div>
<script>
let currentName = null;
let currentDir = 'config';

// 侧边栏抽屉(移动端)
function toggleSidebar(open) {
  document.getElementById('sidebar').classList.toggle('open', open);
  document.getElementById('sidebarOverlay').classList.toggle('show', open);
}
let isListMode = false;
let configData = {};
let configMeta = {};
let expandedSections = new Set();
let scriptsMap = {};
let iniPathActive = false;
let dirty = false; // 是否有未保存的修改

function markDirty() {
  dirty = true;
  setStatus('未保存', 'err');
}

// 刷新/关闭页面前,有未保存修改时浏览器弹出确认
window.addEventListener('beforeunload', (e) => {
  if (!dirty) return;
  e.preventDefault();
  e.returnValue = '';
});

// 从当前 URL 提取安全入口前缀和 key,拼接 API 请求地址
const AUTH_PREFIX = location.pathname.endsWith('/') ? location.pathname.slice(0, -1) : location.pathname;
const AUTH_KEY = new URLSearchParams(location.search).get('key') || '';
function apiUrl(p) {
  let u = AUTH_PREFIX + p;
  if (AUTH_KEY) u += (p.includes('?') ? '&' : '?') + 'key=' + encodeURIComponent(AUTH_KEY);
  return u;
}

async function loadScripts() {
  const res = await fetch(apiUrl('/api/scripts'));
  const json = await res.json();
  const list = document.getElementById('scriptList');
  list.innerHTML = '';
  iniPathActive = !!json.iniPathActive;
  json.scripts.forEach(s => {
    scriptsMap[s.name + '|' + s.dir] = s;
    const div = document.createElement('div');
    div.className = 'script-item' + (s.hasIni ? '' : ' no-ini') + (s.name + '|' + s.dir === currentName + '|' + currentDir ? ' active' : '');
    const badge = s.dir === 'cookie' ? 'cookie' : (s.dir === 'iniPath' ? 'iniPath' : (s.isDir ? s.files.length + ' 文件' : 'ini'));
    div.innerHTML = \`<span class="s-name">\${s.name}</span><span class="s-badge">\${badge}</span>\`;
    div.onclick = () => selectScript(s.name, s.dir);
    list.appendChild(div);
  });
}

async function selectScript(name, dir) {
  // 有未保存修改时提示
  if (dirty && !confirm('当前配置有未保存的修改,确认切换?')) return;
  currentName = name;
  currentDir = dir || 'config';
  dirty = false;
  toggleSidebar(false); // 移动端选中后自动关闭侧边栏
  document.querySelectorAll('.script-item').forEach(el => el.classList.remove('active'));
  loadScripts();
  const res = await fetch(apiUrl('/api/config?name=' + encodeURIComponent(name) + '&dir=' + currentDir));
  const json = await res.json();
  if (!res.ok) {
    document.getElementById('toolbarTitle').innerHTML = name + '<small>未找到</small>';
    document.getElementById('content').innerHTML = \`<div class="empty"><div class="empty-icon">⚠️</div><div class="empty-text">\${currentDir}/\${name}.ini 不存在</div></div>\`;
    toggleButtons(false);
    document.getElementById('toggleFilter').style.display = 'none';
    const si = document.getElementById('searchInput');
    si.style.display = 'none';
    si.value = '';
    return;
  }
  expandedSections.clear();
  configData = json.data;
  configMeta = json.meta || {};
  isListMode = !!json.isList;
  document.getElementById('toolbarTitle').innerHTML = name + '<small>' + currentDir + '/' + name + '.ini</small>';
  toggleButtons(true);
  // 只有 parse 目录才显示"仅显示有脚本的节点"开关(纯 ini 无意义)
  document.getElementById('toggleFilter').style.display = scriptsMap[currentName + '|' + currentDir]?.isDir ? '' : 'none';
  const si = document.getElementById('searchInput');
  si.style.display = '';
  si.value = '';
  renderConfig();
  setStatus('');
}

function toggleButtons(show) {
  document.getElementById('btnAddSection').style.display = show ? '' : 'none';
  // 批量添加/删除对 list 模式无意义
  document.getElementById('btnBatchAdd').style.display = (show && !isListMode) ? '' : 'none';
  document.getElementById('btnBatchDel').style.display = (show && !isListMode) ? '' : 'none';
  document.getElementById('btnSave').style.display = show ? '' : 'none';
  // parse 目录对应的 ini 不允许删除
  document.getElementById('btnDelIni').style.display = (show && !scriptsMap[currentName + '|' + currentDir]?.isDir) ? '' : 'none';
}

function renderConfig() {
  const content = document.getElementById('content');
  content.innerHTML = '';
  const sections = Object.keys(configData);
  if (sections.length === 0) {
    content.innerHTML = '<div class="empty"><div class="empty-icon">📄</div><div class="empty-text">配置为空,点击上方"添加节点"开始</div></div>';
    return;
  }
  const filterOn = document.getElementById('toggleOrphan').checked;
  const isDir = scriptsMap[currentName + '|' + currentDir]?.isDir; // 仅目录类型脚本应用过滤
  const keyword = (document.getElementById('searchInput').value || '').trim().toLowerCase();
  let visible = 0;
  sections.forEach(section => {
    // 开关激活时,跳过无对应 JS 文件的节点(meta 中不存在);纯 ini 不过滤
    if (isDir && filterOn && section !== '__global__' && !(section in configMeta)) return;
    // 搜索过滤:匹配节点名或 profile.title(不区分大小写)
    if (keyword) {
      const title = (configMeta[section]?.title || '').toLowerCase();
      if (section !== '__global__' && !section.toLowerCase().includes(keyword) && !title.includes(keyword)) return;
    }
    content.appendChild(buildSectionCard(section, configData[section]));
    visible++;
  });
  if (visible === 0) {
    content.innerHTML = '<div class="empty"><div class="empty-icon">🔍</div><div class="empty-text">没有匹配的节点</div></div>';
    return;
  }
  // 搜索时自动展开所有匹配的卡片,方便查看内容
  if (keyword) content.querySelectorAll('.section-card').forEach(c => c.classList.remove('collapsed'));
}

// ===== list 模式节点卡片(代理池/cookie) =====
function buildListSectionCard(section, items) {
  const isGlobal = section === '__global__';
  const isExpanded = expandedSections.has(section);
  const card = document.createElement('div');
  card.className = 'section-card' + (isExpanded ? '' : ' collapsed');

  const header = document.createElement('div');
  header.className = 'section-header';
  const arrow = document.createElement('span');
  arrow.className = 'arrow';
  arrow.textContent = '▾';
  const dot = document.createElement('span');
  dot.className = 'dot';
  dot.style.background = '#10b981';
  const name = document.createElement('span');
  name.className = 'section-name';
  name.textContent = isGlobal ? '全局参数' : section;
  const listBadge = document.createElement('span');
  listBadge.className = 'badge-unselected';
  listBadge.style.color = '#10b981';
  listBadge.style.background = '#ecfdf5';
  listBadge.textContent = '列表';
  name.appendChild(listBadge);
  const count = document.createElement('span');
  count.className = 'section-count';
  count.textContent = items.length + ' 项';
  header.append(arrow, dot, name, count);
  if (!isGlobal) {
    const renBtn = document.createElement('button');
    renBtn.className = 'btn btn-ghost';
    renBtn.textContent = '改名';
    renBtn.onclick = (e) => {
      e.stopPropagation();
      renameSection(section);
    };
    header.appendChild(renBtn);
    const txtBtn = document.createElement('button');
    txtBtn.className = 'btn btn-ghost';
    txtBtn.textContent = '文本';
    txtBtn.onclick = (e) => {
      e.stopPropagation();
      showSectionText(section);
    };
    header.appendChild(txtBtn);
    const delBtn = document.createElement('button');
    delBtn.className = 'btn btn-danger-soft';
    delBtn.textContent = '删除';
    delBtn.onclick = (e) => {
      e.stopPropagation();
      if (confirm('确认删除节点 [' + section + '] ?')) {
        delete configData[section];
        expandedSections.delete(section);
        markDirty();
        renderConfig();
      }
    };
    header.appendChild(delBtn);
  }
  header.onclick = (e) => {
    if (e.target.closest('button')) return;
    if (expandedSections.has(section)) {
      expandedSections.delete(section);
      card.classList.add('collapsed');
    } else {
      expandedSections.add(section);
      card.classList.remove('collapsed');
    }
  };
  card.appendChild(header);

  const body = document.createElement('div');
  body.className = 'section-body';
  const list = document.createElement('div');
  list.className = 'kv-list';
  items.forEach((item, idx) => {
    // 兼容纯字符串旧数据
    if (typeof item === 'string') items[idx] = item = { value: item, comment: '' };
    const row = document.createElement('div');
    row.className = 'kv-row';
    const idxSpan = document.createElement('span');
    idxSpan.className = 'section-count';
    idxSpan.style.minWidth = '28px';
    idxSpan.textContent = (idx + 1);
    const valInput = document.createElement('input');
    valInput.type = 'text';
    valInput.className = 'val';
    valInput.value = item.value;
    valInput.onchange = () => { item.value = valInput.value; markDirty(); };
    const cmtInput = document.createElement('input');
    cmtInput.type = 'text';
    cmtInput.className = 'cmt';
    cmtInput.value = item.comment;
    cmtInput.placeholder = '备注';
    cmtInput.onchange = () => {
      item.comment = cmtInput.value;
      updateCmtPreview(cmtWrap, item.comment);
      markDirty();
    };
    const cmtWrap = document.createElement('div');
    cmtWrap.className = 'cmt-wrap';
    cmtWrap.appendChild(cmtInput);
    updateCmtPreview(cmtWrap, item.comment);
    const delBtn = document.createElement('button');
    delBtn.className = 'btn btn-danger-soft';
    delBtn.textContent = '删除';
    delBtn.onclick = () => {
      if (!confirm('确认删除第 ' + (idx + 1) + ' 行 ?')) return;
      items.splice(idx, 1);
      markDirty();
      renderConfig();
    };
    row.append(idxSpan, valInput, cmtWrap, delBtn);
    list.appendChild(row);
  });
  // 添加行
  const addRow = document.createElement('div');
  addRow.className = 'add-row';
  const addInput = document.createElement('input');
  addInput.type = 'text';
  addInput.className = 'val';
  addInput.placeholder = '新值';
  const addCmt = document.createElement('input');
  addCmt.type = 'text';
  addCmt.className = 'cmt';
  addCmt.placeholder = '备注';
  const addBtn = document.createElement('button');
  addBtn.className = 'btn btn-ghost';
  addBtn.textContent = '添加';
  addBtn.onclick = () => {
    const v = addInput.value.trim();
    if (!v) return alert('值不能为空');
    items.push({ value: v, comment: addCmt.value.trim() });
    expandedSections.add(section);
    markDirty();
    renderConfig();
  };
  addRow.append(addInput, addCmt, addBtn);
  list.appendChild(addRow);
  body.appendChild(list);
  card.appendChild(body);
  return card;
}

function buildSectionCard(section, kvs) {
  // list 模式:数组渲染
  if (Array.isArray(kvs)) return buildListSectionCard(section, kvs);
  const isGlobal = section === '__global__';
  const isExpanded = expandedSections.has(section);
  const meta = configMeta[section];
  const isUnselected = meta && meta.hasPrompt === false;
  const card = document.createElement('div');
  card.className = 'section-card' + (isExpanded ? '' : ' collapsed') + (isUnselected ? ' unselected' : '');

  const header = document.createElement('div');
  header.className = 'section-header';
  const arrow = document.createElement('span');
  arrow.className = 'arrow';
  arrow.textContent = '▾';
  const dot = document.createElement('span');
  dot.className = 'dot';
  const name = document.createElement('span');
  name.className = 'section-name';
  name.textContent = isGlobal ? '全局参数' : section;
  if (meta && meta.title) {
    const t = document.createElement('span');
    t.className = 'section-title';
    t.textContent = meta.title;
    name.appendChild(t);
  }
  if (meta && meta.hasPrompt === false) {
    const b = document.createElement('span');
    b.className = 'badge-unselected';
    b.textContent = '未选中';
    name.appendChild(b);
  }
  const count = document.createElement('span');
  count.className = 'section-count';
  count.textContent = Object.keys(kvs).length + ' 项';
  header.append(arrow, dot, name, count);
  if (!isGlobal) {
    const renBtn = document.createElement('button');
    renBtn.className = 'btn btn-ghost';
    renBtn.textContent = '改名';
    renBtn.onclick = (e) => {
      e.stopPropagation();
      renameSection(section);
    };
    header.appendChild(renBtn);
    const txtBtn = document.createElement('button');
    txtBtn.className = 'btn btn-ghost';
    txtBtn.textContent = '文本';
    txtBtn.onclick = (e) => {
      e.stopPropagation();
      showSectionText(section);
    };
    header.appendChild(txtBtn);
    // 复制/分身仅对 parse 目录类型脚本显示(纯 ini 无意义)
    if (scriptsMap[currentName + '|' + currentDir]?.isDir) {
      const dupBtn = document.createElement('button');
      dupBtn.className = 'btn btn-ghost';
      dupBtn.textContent = '复制';
      dupBtn.onclick = (e) => {
        e.stopPropagation();
        duplicateSection(section, false);
      };
      header.appendChild(dupBtn);
      const mapBtn = document.createElement('button');
      mapBtn.className = 'btn btn-ghost';
      mapBtn.textContent = '分身';
      mapBtn.onclick = (e) => {
        e.stopPropagation();
        duplicateSection(section, true);
      };
      header.appendChild(mapBtn);
    }
    const delBtn = document.createElement('button');
    delBtn.className = 'btn btn-danger-soft';
    delBtn.textContent = '删除';
    delBtn.onclick = (e) => {
      e.stopPropagation();
      if (confirm('确认删除节点 [' + section + '] ?')) {
        delete configData[section];
        expandedSections.delete(section);
        markDirty();
        renderConfig();
      }
    };
    header.appendChild(delBtn);
  }
  header.onclick = (e) => {
    if (e.target.closest('button')) return;
    if (expandedSections.has(section)) {
      expandedSections.delete(section);
      card.classList.add('collapsed');
    } else {
      expandedSections.add(section);
      card.classList.remove('collapsed');
    }
  };
  card.appendChild(header);

  const body = document.createElement('div');
  body.className = 'section-body';
  const list = document.createElement('div');
  list.className = 'kv-list';
  Object.keys(kvs).forEach(key => {
    list.appendChild(buildKvRow(section, key, kvs[key]));
  });
  const addRow = document.createElement('div');
  addRow.className = 'add-row';
  addRow.innerHTML = \`<label class="switch"><input type="checkbox" class="add-toggle" checked><span class="track"></span></label><input type="text" class="key" placeholder="新 key"><input type="text" class="val" placeholder="新 value"><input type="text" class="cmt" placeholder="备注">\`;
  const addBtn = document.createElement('button');
  addBtn.className = 'btn btn-ghost';
  addBtn.textContent = '添加';
  addBtn.onclick = () => {
    const k = addRow.querySelector('.key').value.trim();
    const v = addRow.querySelector('.val').value.trim();
    const c = addRow.querySelector('.cmt').value.trim();
    const enabled = addRow.querySelector('.add-toggle').checked;
    if (!k) return alert('key 不能为空');
    configData[section][k] = { value: v, comment: c, disabled: !enabled };
    expandedSections.add(section);
    markDirty();
    renderConfig();
  };
  addRow.appendChild(addBtn);
  list.appendChild(addRow);
  body.appendChild(list);
  card.appendChild(body);
  return card;
}

// 备注预览:fixed 定位气泡,自动选择上方/下方,不受父容器裁剪
function updateCmtPreview(cmtWrap, comment) {
  const input = cmtWrap.querySelector('.cmt');
  // 清理旧事件
  input.onmouseenter = null;
  input.onmouseleave = null;
  if (!comment) return; // 只要有备注就显示气泡
  input.onmouseenter = () => {
    const tip = document.getElementById('cmtTooltip');
    tip.textContent = comment;
    tip.style.display = 'block';
    const rect = input.getBoundingClientRect();
    const tipRect = tip.getBoundingClientRect();
    let top = rect.bottom + 6;
    // 下方空间不够则放上方
    if (top + tipRect.height > window.innerHeight - 8) {
      top = rect.top - tipRect.height - 6;
    }
    let left = rect.left;
    // 防止右侧溢出,与内容区右边界对齐(内容区 padding 32px)
    const contentRect = document.getElementById('content').getBoundingClientRect();
    const rightLimit = contentRect.right - 4;
    if (left + tipRect.width > rightLimit) {
      left = rightLimit - tipRect.width;
    }
    if (left < contentRect.left) left = contentRect.left;
    tip.style.top = top + 'px';
    tip.style.left = left + 'px';
  };
  input.onmouseleave = () => {
    document.getElementById('cmtTooltip').style.display = 'none';
  };
}

function buildKvRow(section, key, entry) {
  if (typeof entry === 'string') entry = { value: entry, comment: '', disabled: false };
  const row = document.createElement('div');
  row.className = 'kv-row' + (entry.disabled ? ' disabled' : '');

  const sw = document.createElement('label');
  sw.className = 'switch';
  const toggle = document.createElement('input');
  toggle.type = 'checkbox';
  toggle.checked = !entry.disabled;
  const track = document.createElement('span');
  track.className = 'track';
  sw.append(toggle, track);
  toggle.onchange = () => {
    entry.disabled = !toggle.checked;
    row.classList.toggle('disabled', entry.disabled);
    markDirty();
  };

  const keyInput = document.createElement('input');
  keyInput.type = 'text';
  keyInput.className = 'key' + (entry.isPrompt ? ' is-prompt' : '');
  keyInput.value = key;
  if (entry.isPrompt) keyInput.title = '来自脚本 prompt 定义';
  keyInput.onchange = () => {
    const newKey = keyInput.value.trim();
    if (!newKey || newKey === key) { keyInput.value = key; return; }
    if (configData[section][newKey] !== undefined) { alert('key 已存在: ' + newKey); keyInput.value = key; return; }
    const v = configData[section][key];
    delete configData[section][key];
    configData[section][newKey] = v;
    markDirty();
    renderConfig();
  };
  const valInput = document.createElement('input');
  valInput.type = 'text';
  valInput.className = 'val';
  valInput.value = entry.value;
  valInput.onchange = () => { entry.value = valInput.value; markDirty(); };
  const cmtInput = document.createElement('input');
  cmtInput.type = 'text';
  cmtInput.className = 'cmt';
  cmtInput.value = entry.comment;
  cmtInput.placeholder = '备注';
  cmtInput.onchange = () => {
    entry.comment = cmtInput.value;
    updateCmtPreview(cmtWrap, entry.comment);
    markDirty();
  };
  // 备注预览气泡
  const cmtWrap = document.createElement('div');
  cmtWrap.className = 'cmt-wrap';
  cmtWrap.appendChild(cmtInput);
  updateCmtPreview(cmtWrap, entry.comment);
  const delBtn = document.createElement('button');
  delBtn.className = 'btn btn-danger-soft';
  delBtn.textContent = '删除';
  delBtn.onclick = () => {
    if (!confirm('确认删除字段 [' + key + '] ?')) return;
    delete configData[section][key];
    markDirty();
    renderConfig();
  };
  row.append(sw, keyInput, valInput, cmtWrap, delBtn);
  return row;
}

// ---------- 节点文本预览 ----------
function showSectionText(section) {
  const kvs = configData[section];
  const lines = ['[' + section + ']'];
  if (Array.isArray(kvs)) {
    kvs.forEach(item => {
      if (typeof item === 'string') { lines.push(item); return; }
      lines.push(item.value + (item.comment ? ' # ' + item.comment : ''));
    });
  } else {
    Object.entries(kvs).forEach(([k, v]) => {
      if (typeof v === 'string') { lines.push(k + '=' + v); return; }
      const prefix = v.disabled ? ';' : '';
      const comment = v.comment ? ' # ' + v.comment : '';
      lines.push(prefix + k + '=' + v.value + comment);
    });
  }
  document.getElementById('textModalTitle').textContent = section;
  document.getElementById('textModalContent').value = lines.join('\\n');
  document.getElementById('textModal').classList.add('show');
}

function closeTextModal() {
  document.getElementById('textModal').classList.remove('show');
}

function copySectionText(btn) {
  const ta = document.getElementById('textModalContent');
  ta.select();
  document.execCommand('copy');
  btn.textContent = '已复制 ✓';
  setTimeout(() => { btn.textContent = '复制'; }, 1500);
}

function addSection() {
  const name = prompt('请输入节点名称:');
  if (!name) return;
  const trimmed = name.trim();
  if (configData[trimmed] !== undefined) return alert('节点已存在');
  configData[trimmed] = isListMode ? [] : {};
  expandedSections.add(trimmed);
  markDirty();
  renderConfig();
}

// ---------- 节点改名 ----------
function renameSection(section) {
  const input = prompt('请输入新的节点名称:', section);
  if (input === null) return; // 用户取消
  const newName = input.trim();
  if (!newName) return alert('名称不能为空');
  if (newName === section) return; // 没变化
  if (!/^[A-Za-z0-9_\\-]+$/.test(newName)) return alert('名称只能包含字母、数字、下划线和中划线');
  if (configData[newName] !== undefined) return alert('节点已存在: ' + newName);
  if (!confirm(\`确认将节点 [\${section}] 改名为 [\${newName}] ?\`)) return;

  // 重建对象,保持原 key 顺序(在原位置替换)
  const newData = {};
  for (const key of Object.keys(configData)) {
    newData[key === section ? newName : key] = configData[key];
  }
  configData = newData;

  // 迁移 meta:新名称若已有 meta(对应 JS 文件)则保留,否则迁移旧 meta
  if (configMeta[section] !== undefined) {
    if (configMeta[newName] === undefined) configMeta[newName] = configMeta[section];
    delete configMeta[section];
  }

  // 迁移展开状态
  if (expandedSections.has(section)) {
    expandedSections.delete(section);
    expandedSections.add(newName);
  }
  markDirty();
  renderConfig();
}

// ---------- 节点复制/分身 ----------
// map=true 时在复制的内容上追加 map=<源节点名>,表示用指定名称运行源脚本
function duplicateSection(section, map) {
  const action = map ? '分身' : '复制';
  const input = prompt(action + '节点 [' + section + '] 到:', '');
  if (input === null) return; // 用户取消
  const target = input.trim();
  if (!target) return alert('名称不能为空');
  if (target === section) return alert('目标名称与源节点相同');
  if (!/^[A-Za-z0-9_\\-]+$/.test(target)) return alert('名称只能包含字母、数字、下划线和中划线');

  // 深拷贝源节点内容(避免共享引用)
  const content = JSON.parse(JSON.stringify(configData[section]));
  // 分身:追加 map=源节点名
  if (map) content.map = { value: section, comment: '', disabled: false };

  if (configData[target] !== undefined) {
    // 目标已存在 → 二次确认覆盖内容(位置不变)
    if (!confirm('节点 [' + target + '] 已存在,确认用 [' + section + '] 的内容' + (map ? '(含分身)' : '') + '覆盖它?')) return;
    configData[target] = content;
  } else {
    // 新建 → 二次确认后插入到源节点后面,保持相邻
    if (!confirm('确认' + action + '节点 [' + section + '] 到 [' + target + '] ?')) return;
    const newData = {};
    for (const key of Object.keys(configData)) {
      newData[key] = configData[key];
      if (key === section) newData[target] = content;
    }
    configData = newData;
    expandedSections.add(target);
  }
  markDirty();
  renderConfig();
}

// ---------- 删除 ini ----------
function openDeleteIniModal() {
  if (!currentName) return;
  // parse 目录对应的 config ini 不允许删除(刷新会自动重建)
  const s = scriptsMap[currentName + '|' + currentDir];
  if (s && s.isDir) return alert('该 ini 对应 parse 目录,删除后会被自动重建,不支持删除');
  document.getElementById('deleteIniTip').textContent = '确认删除 ' + currentDir + '/' + currentName + '.ini ? 此操作不可恢复!';
  document.getElementById('deleteIniModal').classList.add('show');
}

function closeDeleteIniModal() {
  document.getElementById('deleteIniModal').classList.remove('show');
}

async function applyDeleteIni() {
  const res = await fetch(apiUrl('/api/config/delete?name=' + encodeURIComponent(currentName) + '&dir=' + currentDir), {
    method: 'DELETE'
  });
  const json = await res.json();
  if (!res.ok) return alert(json.error || '删除失败');
  closeDeleteIniModal();
  currentName = null;
  document.getElementById('toolbarTitle').textContent = '选择脚本';
  document.getElementById('content').innerHTML = '<div class="empty"><div class="empty-icon">📂</div><div class="empty-text">从左侧选择一个脚本开始编辑</div></div>';
  toggleButtons(false);
  document.getElementById('btnDelIni').style.display = 'none';
  await loadScripts();
}

// ---------- 新建 ini ----------
function openCreateIniModal() {
  document.getElementById('createIniName').value = '';
  document.getElementById('createIniDir').value = 'config';
  // iniPath 未激活时隐藏该选项
  const opt = document.querySelector('#createIniDir option[value="iniPath"]');
  if (opt) opt.style.display = iniPathActive ? '' : 'none';
  document.getElementById('createIniModal').classList.add('show');
  document.getElementById('createIniName').focus();
}

function closeCreateIniModal() {
  document.getElementById('createIniModal').classList.remove('show');
}

async function applyCreateIni() {
  const name = document.getElementById('createIniName').value.trim();
  const dir = document.getElementById('createIniDir').value;
  if (!/^[A-Za-z0-9_\\-]+$/.test(name)) return alert('名称只能包含字母、数字、下划线和中划线');
  if (!confirm('确认创建 ' + dir + '/' + name + '.ini ?')) return;
  const res = await fetch(apiUrl('/api/config/create'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: name, dir: dir })
  });
  const json = await res.json();
  if (!res.ok) return alert(json.error || '创建失败');
  closeCreateIniModal();
  await loadScripts();
  selectScript(name, dir);
}

// ---------- 批量添加字段 ----------
function openBatchModal() {
  document.getElementById('batchKey').value = '';
  document.getElementById('batchVal').value = '';
  document.getElementById('batchCmt').value = '';
  document.getElementById('batchEnabled').checked = true;
  document.getElementById('batchModal').classList.add('show');
  document.getElementById('batchKey').focus();
}

function closeBatchModal() {
  document.getElementById('batchModal').classList.remove('show');
}

function applyBatchAdd() {
  const k = document.getElementById('batchKey').value.trim();
  const v = document.getElementById('batchVal').value.trim();
  const c = document.getElementById('batchCmt').value.trim();
  const enabled = document.getElementById('batchEnabled').checked;
  if (!k) return alert('key 不能为空');
  const sectionNames = Object.keys(configData).filter(s => s !== '__global__');
  if (!sectionNames.length) return alert('没有可添加的节点');
  if (!confirm(\`确认将字段 "\${k}" 添加到 \${sectionNames.length} 个节点?\`)) return;
  let added = 0, skipped = 0;
  for (const section of Object.keys(configData)) {
    if (section === '__global__') continue;
    if (configData[section][k] !== undefined) { skipped++; continue; }
    configData[section][k] = { value: v, comment: c, disabled: !enabled };
    added++;
  }
  closeBatchModal();
  markDirty();
  renderConfig();
  alert(\`已添加到 \${added} 个节点\${skipped ? \`,跳过 \${skipped} 个(已存在)\` : ''}\`);
}

// ---------- 批量删除字段 ----------
function openBatchDelModal() {
  document.getElementById('batchDelKey').value = '';
  document.getElementById('batchDelModal').classList.add('show');
  document.getElementById('batchDelKey').focus();
}

function closeBatchDelModal() {
  document.getElementById('batchDelModal').classList.remove('show');
}

function applyBatchDel() {
  const k = document.getElementById('batchDelKey').value.trim();
  if (!k) return alert('key 不能为空');
  // 统计匹配数
  let count = 0;
  for (const section of Object.keys(configData)) {
    if (section === '__global__') continue;
    if (configData[section][k] !== undefined) count++;
  }
  if (count === 0) return alert(\`没有找到 key 为 "\${k}" 的字段\`);
  if (!confirm(\`确认从 \${count} 个节点中删除 key "\${k}"?\`)) return;
  for (const section of Object.keys(configData)) {
    if (section === '__global__') continue;
    delete configData[section][k];
  }
  closeBatchDelModal();
  markDirty();
  renderConfig();
  alert(\`已从 \${count} 个节点中删除 "\${k}"\`);
}

async function saveConfig() {
  if (!confirm('确认保存到 ' + currentDir + '/' + currentName + '.ini ?')) return;
  setStatus('保存中...', '');
  const res = await fetch(apiUrl('/api/config?name=' + encodeURIComponent(currentName) + '&dir=' + currentDir), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(configData)
  });
  if (res.ok) {
    dirty = false;
    setStatus('已保存 ✓', 'ok');
    setTimeout(() => setStatus(''), 2000);
  } else {
    const json = await res.json();
    setStatus('失败', 'err');
    alert('保存失败: ' + (json.error || res.status));
  }
}

function setStatus(text, cls) {
  const el = document.getElementById('status');
  el.textContent = text;
  el.className = 'status' + (cls ? ' ' + cls : '');
}

loadScripts();
</script>
</body>
</html>`;

// ==================== 启动校验(端口/安全配置) ====================
// 检测端口是否可用
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const tester = net.createServer();
    tester.once('error', () => resolve(false));
    tester.once('listening', () => tester.close(() => resolve(true)));
    tester.listen(port);
  });
}

// 随机生成可用端口(20000-29999 区间)
async function pickRandomPort() {
  for (let i = 0; i < 50; i++) {
    const port = 20000 + Math.floor(Math.random() * 10000);
    if (await isPortAvailable(port)) return port;
  }
  return null;
}

// 随机生成入口路径(8 位小写字母数字)
function randomEntry() {
  return Math.random().toString(36).slice(2, 10);
}

// 随机生成令牌(12 位字母数字)
function randomToken() {
  return Math.random().toString(36).slice(2, 14);
}

// 将缺失的配置项追加到 config/config.ini 的 [env] 节点(保留原文件格式)
function saveEnvDefaults(defaults) {
  const cfgPath = path.join(CONFIG_DIR, 'config.ini');
  const text = fs.readFileSync(cfgPath, 'utf-8');
  const lines = text.split('\n');
  // 定位 [env] 区间
  let envStart = -1;
  let envEnd = lines.length;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (t === '[env]') { envStart = i; continue; }
    if (envStart >= 0 && t.startsWith('[') && t.endsWith(']')) { envEnd = i; break; }
  }
  const newLines = Object.entries(defaults).map(([k, v]) => `${k}=${v}`);
  if (envStart < 0) {
    // 无 [env] 节点,文件末尾追加
    if (lines[lines.length - 1].trim() !== '') lines.push('');
    lines.push('[env]', ...newLines);
  } else {
    // 在 [env] 区间末尾(下一个 section 之前)插入
    lines.splice(envEnd, 0, ...newLines);
  }
  fs.writeFileSync(cfgPath, lines.join('\n'), 'utf-8');
}

async function initServer() {
  const cfgPath = path.join(CONFIG_DIR, 'config.ini');
  if (!fs.existsSync(cfgPath)) {
    console.error('[启动失败] config/config.ini 文件不存在,请先创建该文件');
    process.exit(1);
  }
  const envConfig = getEnvConfig();
  const defaults = {};

  // 端口:未配置或无效时随机分配(20000-29999)
  let PORT = Number(envConfig.iniPort);
  if (!PORT || PORT < 1 || PORT > 65535) {
    PORT = await pickRandomPort();
    if (!PORT) {
      console.error('[启动失败] 20000-29999 区间无可用端口');
      process.exit(1);
    }
    defaults.iniPort = PORT;
  }

  // 安全入口:未配置时随机生成
  let AUTH_PATH = (envConfig.iniEntry || '').trim().replace(/^\/+|\/+$/g, '');
  if (!AUTH_PATH) {
    AUTH_PATH = randomEntry();
    defaults.iniEntry = AUTH_PATH;
  }

  // 安全令牌:未配置时随机生成
  let AUTH_KEY = (envConfig.iniToken || '').trim();
  if (!AUTH_KEY) {
    AUTH_KEY = randomToken();
    defaults.iniToken = AUTH_KEY;
  }

  // 保存自动生成的配置
  if (Object.keys(defaults).length > 0) {
    saveEnvDefaults(defaults);
    console.log('[auto] 已自动生成并保存到 config/config.ini [env]:', Object.keys(defaults).join(', '));
  }

  return { PORT, AUTH_PATH, AUTH_KEY };
}

const { PORT, AUTH_PATH, AUTH_KEY } = await initServer();

// ==================== 路由 ====================
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  try {
    // 安全入口验证:路径必须以 /{AUTH_PATH} 开头,否则 404
    let pathname = url.pathname;
    if (AUTH_PATH) {
      const prefix = '/' + AUTH_PATH;
      if (pathname === prefix) pathname = '/';
      else if (pathname.startsWith(prefix + '/')) pathname = pathname.slice(prefix.length);
      else return sendJson(res, 404, { error: '未找到' });
    }
    // 安全参数验证:query key 或 header X-Auth-Key 必须匹配
    if (AUTH_KEY) {
      const key = url.searchParams.get('key') || req.headers['x-auth-key'] || '';
      if (key !== AUTH_KEY) return sendJson(res, 403, { error: '无权限访问' });
    }

    // 静态文件
    if (req.method === 'GET' && (pathname === '/' || pathname === '/index.html')) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(INDEX_HTML);
    }

    // API: 列出脚本
    if (req.method === 'GET' && pathname === '/api/scripts') {
      return sendJson(res, 200, { scripts: listScripts(), iniPathActive: !!getIniPath() });
    }

    // API: 读取配置(合并 prompt)
    if (req.method === 'GET' && pathname === '/api/config') {
      const name = url.searchParams.get('name');
      if (!safeName(name)) return sendJson(res, 400, { error: '非法名称' });
      const dir = url.searchParams.get('dir') || 'config';
      if (dir !== 'config' && dir !== 'iniPath' && !LIST_WHITELIST.dir.includes(dir)) return sendJson(res, 400, { error: '非法目录' });
      const baseDir = dir === 'config' ? CONFIG_DIR : (dir === 'iniPath' ? getIniPath() : path.join(ROOT, dir));
      const iniPath = path.join(baseDir, `${name}.ini`);
      // ini 不存在时自动创建空文件
      if (!fs.existsSync(iniPath)) {
        fs.writeFileSync(iniPath, '', 'utf-8');
        console.log(`[auto] 已创建 ${dir}/${name}.ini`);
      }
      const text = fs.readFileSync(iniPath, 'utf-8');
      const listMode = isListFile(name, dir);
      const iniData = parseIni(text, listMode);
      if (listMode) {
        // list 模式:无 prompt 合并,直接返回
        return sendJson(res, 200, { name, dir, isList: true, data: iniData, meta: {} });
      }
      const { prompts, meta } = await loadPrompts(name);
      const merged = mergePromptData(iniData, prompts);
      // 无 prompt 的 JS 文件也要生成空 section,前端标记"未选中"
      for (const fileName of Object.keys(meta)) {
        if (!merged[fileName]) merged[fileName] = {};
      }
      // 按 parse 目录 JS 文件顺序重排节点
      const sorted = sortSections(merged, meta);
      return sendJson(res, 200, { name, dir, isList: false, data: sorted, meta });
    }

    // API: 创建新 ini 文件
    if (req.method === 'POST' && pathname === '/api/config/create') {
      const body = await readBody(req);
      let payload;
      try {
        payload = JSON.parse(body);
      } catch {
        return sendJson(res, 400, { error: '请求体不是合法 JSON' });
      }
      const name = payload.name;
      if (!safeName(name)) return sendJson(res, 400, { error: '名称只能包含字母、数字、下划线和中划线' });
      const dir = payload.dir || 'config';
      if (dir !== 'config' && dir !== 'iniPath' && !LIST_WHITELIST.dir.includes(dir)) return sendJson(res, 400, { error: '非法目录' });
      const baseDir = dir === 'config' ? CONFIG_DIR : (dir === 'iniPath' ? getIniPath() : path.join(ROOT, dir));
      if (!baseDir) return sendJson(res, 400, { error: 'iniPath 未配置或未激活' });
      if (!fs.existsSync(baseDir)) return sendJson(res, 400, { error: `目录不存在: ${dir}` });
      const iniPath = path.join(baseDir, `${name}.ini`);
      if (fs.existsSync(iniPath)) return sendJson(res, 409, { error: `${dir}/${name}.ini 已存在` });
      fs.writeFileSync(iniPath, '', 'utf-8');
      console.log(`[create] 已创建 ${dir}/${name}.ini`);
      return sendJson(res, 200, { ok: true, name, dir });
    }

    // API: 删除 ini 文件
    if (req.method === 'DELETE' && pathname === '/api/config/delete') {
      const name = url.searchParams.get('name');
      if (!safeName(name)) return sendJson(res, 400, { error: '非法名称' });
      const dir = url.searchParams.get('dir') || 'config';
      if (dir !== 'config' && dir !== 'iniPath' && !LIST_WHITELIST.dir.includes(dir)) return sendJson(res, 400, { error: '非法目录' });
      // parse 目录对应的 config ini 不允许删除
      if (dir === 'config' && fs.existsSync(path.join(PARSE_DIR, name))) return sendJson(res, 400, { error: '该 ini 对应 parse 目录,不支持删除' });
      const baseDir = dir === 'config' ? CONFIG_DIR : (dir === 'iniPath' ? getIniPath() : path.join(ROOT, dir));
      if (!baseDir) return sendJson(res, 400, { error: 'iniPath 未配置或未激活' });
      const iniPath = path.join(baseDir, `${name}.ini`);
      if (!fs.existsSync(iniPath)) return sendJson(res, 404, { error: `${dir}/${name}.ini 不存在` });
      fs.unlinkSync(iniPath);
      console.log(`[delete] 已删除 ${dir}/${name}.ini`);
      return sendJson(res, 200, { ok: true, name, dir });
    }

    // API: 保存配置
    if (req.method === 'POST' && pathname === '/api/config') {
      const name = url.searchParams.get('name');
      if (!safeName(name)) return sendJson(res, 400, { error: '非法名称' });
      const dir = url.searchParams.get('dir') || 'config';
      if (dir !== 'config' && dir !== 'iniPath' && !LIST_WHITELIST.dir.includes(dir)) return sendJson(res, 400, { error: '非法目录' });
      const baseDir = dir === 'config' ? CONFIG_DIR : (dir === 'iniPath' ? getIniPath() : path.join(ROOT, dir));
      const body = await readBody(req);
      let obj;
      try {
        obj = JSON.parse(body);
      } catch {
        return sendJson(res, 400, { error: '请求体不是合法 JSON' });
      }
      const iniPath = path.join(baseDir, `${name}.ini`);
      fs.writeFileSync(iniPath, stringifyIni(obj), 'utf-8');
      return sendJson(res, 200, { ok: true, name });
    }

    sendJson(res, 404, { error: '未找到' });
  } catch (err) {
    console.error(err);
    sendJson(res, 500, { error: String(err.message || err) });
  }
});

server.listen(PORT, () => {
  let entry = `http://localhost:${PORT}`;
  if (AUTH_PATH) entry += '/' + AUTH_PATH;
  if (AUTH_KEY) entry += `?key=${AUTH_KEY}`;
  console.log(`INI 编辑器已启动: ${entry}`);
  console.log(`修改端口/入口/key: 编辑 config/config.ini [env] 节点的 iniPort / iniEntry / iniToken, 重启服务生效`);
});