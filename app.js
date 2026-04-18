/**
 * app.js - Main Application Logic
 */

import { referenceCodes } from './src/data/referenceData.js';
import { extractFilesFromZip, parseStudentFiles } from './src/utils/zipHandler.js';
import { evaluateCode } from './src/utils/aiEvaluator.js';

// --- State ---
let apiKey = localStorage.getItem('gemini_api_key') || '';
let currentCategory = 'MBTI';
let results = [];

// --- UI Elements ---
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const fileCountEl = document.getElementById('file-count');
const progressContainer = document.getElementById('progress-container');
const progressBar = document.getElementById('progress-bar');
const progressPercent = document.getElementById('progress-percent');
const statusText = document.getElementById('status-text');
const statusPlaceholder = document.getElementById('status-placeholder');
const resultsList = document.getElementById('results-list');
const categoryInputs = document.querySelectorAll('input[name="category"]');
const settingsBtn = document.getElementById('settings-btn');
const modalBackdrop = document.getElementById('modal-backdrop');
const apiKeyInput = document.getElementById('api-key-input');
const saveSettingsBtn = document.getElementById('save-settings');
const clearBtn = document.getElementById('clear-btn');
const exportBtn = document.getElementById('export-btn');

// --- Initialization ---
function init() {
  if (!apiKey) {
    showModal();
  }
  apiKeyInput.value = apiKey;
  
  // Load saved results
  const savedResults = localStorage.getItem('code_review_results');
  if (savedResults) {
    results = JSON.parse(savedResults);
    renderResults();
    if (results.length > 0) {
      statusPlaceholder.style.display = 'none';
    }
  }
}

// --- Event Handlers ---
categoryInputs.forEach(input => {
  input.addEventListener('change', (e) => {
    currentCategory = e.target.value;
  });
});

settingsBtn.addEventListener('click', showModal);
modalBackdrop.addEventListener('click', (e) => {
  if (e.target === modalBackdrop) hideModal();
});

saveSettingsBtn.addEventListener('click', () => {
  apiKey = apiKeyInput.value.trim();
  localStorage.setItem('gemini_api_key', apiKey);
  hideModal();
});

clearBtn.addEventListener('click', () => {
  if (!confirm('모든 분석 결과를 삭제하시겠습니까?')) return;
  results = [];
  localStorage.removeItem('code_review_results');
  renderResults();
  fileCountEl.textContent = '0';
  statusPlaceholder.style.display = 'block';
  progressContainer.style.display = 'none';
});

exportBtn.addEventListener('click', () => {
  if (results.length === 0) {
    alert('내보낼 분석 결과가 없습니다.');
    return;
  }
  exportToExcel();
});

// Drag & Drop
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.style.borderColor = 'var(--primary)';
});

dropZone.addEventListener('dragleave', () => {
  dropZone.style.borderColor = 'var(--glass-border)';
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.style.borderColor = 'var(--glass-border)';
  handleFiles(e.dataTransfer.files);
});

fileInput.addEventListener('change', (e) => {
  handleFiles(e.target.files);
});

// --- Core Logic ---
async function handleFiles(files) {
  const allFiles = Array.from(files);
  // 확장자 대소문자 무시 필터링
  const targetFiles = allFiles.filter(f => {
    const name = f.name.toLowerCase();
    return name.endsWith('.zip') || name.endsWith('.html');
  });
  
  if (targetFiles.length === 0) {
    alert('.zip 또는 .html 파일을 업로드하거나 드래그해주세요.');
    return;
  }

  // 최신 카테고리 상태 확인
  const selectedCategory = document.querySelector('input[name="category"]:checked')?.value || currentCategory;

  if (!apiKey) {
    alert('AI 분석을 위해 API 키를 먼저 설정해주세요.');
    showModal();
    return;
  }

  fileCountEl.textContent = targetFiles.length;
  statusPlaceholder.style.display = 'none';
  progressContainer.style.display = 'block';
  
  let processed = 0;
  
  for (const file of targetFiles) {
    try {
      updateProgress(processed, targetFiles.length, `${file.name} 분석 중...`);
      
      let studentFiles = {};
      const isZip = file.name.toLowerCase().endsWith('.zip');

      if (isZip) {
        const extracted = await extractFilesFromZip(file);
        studentFiles = parseStudentFiles(extracted, selectedCategory);
      } else {
        // 단일 HTML 파일 처리
        const content = await file.text();
        // 경로 구분자 문제 방지를 위해 파일명만 전달
        studentFiles = parseStudentFiles({ [file.name]: content }, selectedCategory);
      }

      const reference = referenceCodes[selectedCategory];
      const evaluation = await evaluateCode(apiKey, selectedCategory, reference, studentFiles);
      
      results.push({
        id: Date.now() + Math.random(),
        filename: file.name,
        category: selectedCategory,
        timestamp: new Date().toLocaleString(),
        ...evaluation
      });
      
      saveToStorage();
      renderResults();
      processed++;
    } catch (error) {
      console.error("Analysis Error:", error);
      results.push({
        filename: file.name,
        category: selectedCategory,
        score: 0,
        grade: 'F',
        analysis: '분석 중 기술적 오류 발생',
        feedback: `[시스템 오류]\n${error.message}\n\n도움말: API 키가 유효한지, 혹은 파일 형식이 올바른지 확인해주세요.`
      });
      renderResults();
      processed++;
    }
  }
  
  updateProgress(processed, targetFiles.length, '분석 완료');
}

function updateProgress(current, total, text) {
  const percent = Math.round((current / total) * 100);
  progressBar.style.width = `${percent}%`;
  progressPercent.textContent = `${percent}%`;
  statusText.textContent = text;
}

function renderResults() {
  resultsList.innerHTML = '';
  results.forEach(res => {
    const card = document.createElement('div');
    card.className = 'result-card bento-card';
    card.style.padding = '1.5rem';
    
    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
        <div>
          <h4 style="margin-bottom: 0.25rem;">${res.filename}</h4>
          <span style="font-size: 0.75rem; color: var(--text-dim);">${res.category}</span>
        </div>
        <div class="grade-badge grade-${res.grade}">${res.grade}</div>
      </div>
      <div style="font-size: 0.9rem; margin-bottom: 1rem; color: var(--text-dim);">
        <strong>점수:</strong> ${res.score}점
      </div>
      <div style="font-size: 0.85rem; margin-bottom: 1rem;">
        ${res.analysis}
      </div>
      <details style="font-size: 0.8rem; background: rgba(0,0,0,0.2); border-radius: 0.5rem; padding: 0.5rem;">
        <summary style="cursor: pointer; color: var(--primary);">상세 피드백 보기</summary>
        <div style="margin-top: 0.5rem; color: var(--text-main); white-space: pre-wrap;">
          ${res.feedback}
        </div>
      </details>
    `;
    resultsList.prepend(card);
  });
}

function showModal() {
  modalBackdrop.style.display = 'flex';
}

function hideModal() {
  modalBackdrop.style.display = 'none';
}

function saveToStorage() {
  localStorage.setItem('code_review_results', JSON.stringify(results));
}

function exportToExcel() {
  try {
    const data = results.map(res => ({
      '파일명': res.filename,
      '카테고리': res.category,
      '점수': res.score,
      '등급': res.grade,
      '분석 요약': res.analysis,
      '피드백': res.feedback,
      '개선 제안': res.improvements ? res.improvements.join(', ') : '',
      '분석 일시': res.timestamp
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "분석결과");
    
    // 스타일 조정 (Header bold 등)은 기본 xlsx 라이브러리에서 제한적이지만 보더 등은 가능
    const fileName = `코드리뷰_결과_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  } catch (error) {
    console.error('Excel Export Error:', error);
    alert('엑셀 파일 생성 중 오류가 발생했습니다.');
  }
}

init();
