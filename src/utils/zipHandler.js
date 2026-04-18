/**
 * zipHandler.js
 * Handles file reading and ZIP extraction using JSZip.
 */

export async function extractFilesFromZip(zipFile) {
  const zip = new JSZip();
  const arrayBuffer = await zipFile.arrayBuffer();
  const contents = await zip.loadAsync(arrayBuffer);
  const files = {};

  for (const filename of Object.keys(contents.files)) {
    const file = contents.files[filename];
    if (!file.dir) {
      const content = await file.async("string");
      files[filename] = content;
    }
  }

  return files;
}

const BLACKLISTED_PATH_KEYWORDS = [
  'papercut_style',
  'pixcel_style',
  '__macosx',
  '.git',
  '.ds_store'
];

export function parseStudentFiles(files, category) {
  // Extract key files for analysis (HTML, JS, CSS)
  const result = {
    html: "",
    js: "",
    css: "",
    all: {}
  };

  for (const [path, content] of Object.entries(files)) {
    const lowerPath = path.toLowerCase();
    
    // 1. 블랙리스트 폴더 및 파일 제외
    const isBlacklisted = BLACKLISTED_PATH_KEYWORDS.some(keyword => lowerPath.includes(keyword));
    if (isBlacklisted) continue;

    // 2. 확장자 기반 수집 (HTML, JS, CSS)
    if (lowerPath.endsWith(".html")) {
      result.html += `\n/* --- File: ${path} --- */\n${content}\n`;
    } else if (lowerPath.endsWith(".js")) {
      result.js += `\n/* --- File: ${path} --- */\n${content}\n`;
    } else if (lowerPath.endsWith(".css")) {
      result.css += `\n/* --- File: ${path} --- */\n${content}\n`;
    }
    
    result.all[path] = content;
  }

  // 3. 만약 수집된 파일이 너무 많거나 중복될 경우 AI가 판단하도록 'all' 데이터 유지
  return result;
}
