/**
 * app.js - Main Application Logic
 */

import { referenceCodes } from './src/data/referenceData.js';
import { extractFilesFromZip, parseStudentFiles } from './src/utils/zipHandler.js';
import { evaluateCode } from './src/utils/aiEvaluator.js';

// --- State ---
let apiKey = localStorage.getItem('gemini_api_key') || '';
let currentCategory = localStorage.getItem('last_category') || 'MBTI';
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
const saveSettingsBtn = document.getElementById('save-api-key');
const clearBtn = document.getElementById('clear-btn');
const exportBtn = document.getElementById('export-btn');

// --- Initialization ---
function init() {
  try {
    if (!apiKey) {
      showModal();
    }
    apiKeyInput.value = apiKey;
    
    // 저장된 카테고리 UI 반영
    const savedCategory = localStorage.getItem('last_category') || 'MBTI';
    const targetRadio = document.querySelector(`input[name="category"][value="${savedCategory}"]`);
    if (targetRadio) {
      targetRadio.checked = true;
      currentCategory = savedCategory;
    }
    
    // Load saved results
    const savedResults = localStorage.getItem('code_review_results');
    if (savedResults) {
      results = JSON.parse(savedResults);
      renderResults();
      if (results.length > 0) {
        statusPlaceholder.style.display = 'none';
      }
    }
    
    // Lucide 아이콘 렌더링 (2026 표준)
    if (window.lucide) {
      window.lucide.createIcons();
    }
  } catch (e) {
    console.error("Initialization Error:", e);
  }
}

// --- Event Handlers ---
categoryInputs.forEach(input => {
  input.addEventListener('change', (e) => {
    currentCategory = e.target.value;
    localStorage.setItem('last_category', currentCategory);
  });
});

settingsBtn.addEventListener('click', showModal);
modalBackdrop.addEventListener('click', (e) => {
  if (e.target === modalBackdrop) hideModal();
});

const apiKeyStatus = document.getElementById('api-key-status');

saveSettingsBtn.addEventListener('click', async () => {
  const newKey = apiKeyInput.value.trim();
  if (!newKey) {
    alert('API 키를 입력해주세요.');
    return;
  }

  // 검증 알림
  apiKeyStatus.style.display = 'block';
  apiKeyStatus.style.color = 'var(--text-dim)';
  apiKeyStatus.textContent = '키 요효성 검증 중...';
  saveSettingsBtn.disabled = true;

  const isValid = await validateApiKey(newKey);

  if (isValid) {
    apiKey = newKey;
    localStorage.setItem('gemini_api_key', apiKey);
    apiKeyStatus.style.color = '#4ade80';
    apiKeyStatus.textContent = '✨ 유효한 키입니다. 저장되었습니다.';
    
    setTimeout(() => {
      hideModal();
      saveSettingsBtn.disabled = false;
      apiKeyStatus.style.display = 'none';
    }, 1500);
  } else {
    apiKeyStatus.style.color = '#f87171';
    apiKeyStatus.textContent = '❌ 유효하지 않은 키이거나 할당량이 초과되었습니다.';
    saveSettingsBtn.disabled = false;
  }
});

async function validateApiKey(key) {
  try {
    // 가장 가벼운 API 호출로 키 유효성 확인 (모델 목록 조회)
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    return response.ok;
  } catch (e) {
    return false;
  }
}

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
  dropZone.classList.add('drag-over');
  dropZone.style.borderColor = 'var(--primary)';
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('drag-over');
  dropZone.style.borderColor = 'var(--glass-border)';
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  dropZone.style.borderColor = 'var(--glass-border)';
  console.log("Files dropped");
  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    handleFiles(e.dataTransfer.files);
  }
});

// 파일 선택 버튼 연동
fileInput.addEventListener('change', (e) => {
  console.log("File input changed");
  if (e.target.files && e.target.files.length > 0) {
    handleFiles(e.target.files);
  }
});

// --- Core Logic ---
// --- Core Logic ---
async function handleFiles(files) {
  try {
    console.log("handleFiles starting...", files.length, "files found");
    const allFiles = Array.from(files);
    const targetFiles = allFiles.filter(f => {
      const name = f.name.toLowerCase();
      return name.endsWith('.zip') || name.endsWith('.html');
    });
    
    if (targetFiles.length === 0) {
      alert('.zip 또는 .html 파일을 업로드하거나 드래그해주세요.');
      return;
    }

    const selectedCategory = document.querySelector('input[name="category"]:checked')?.value || currentCategory;
    console.log("Current Mode:", selectedCategory);

    if (!apiKey) {
      alert('AI 분석을 위해 API 키를 먼저 설정해주세요.');
      showModal();
      return;
    }

    fileCountEl.textContent = targetFiles.length;
    statusPlaceholder.style.display = 'none';
    progressContainer.style.display = 'block';
    
    let processed = 0;
    const total = targetFiles.length;
    
    // 저속 안정 모드 (동시 처리 1개)
    const CONCURRENCY = 1; 
    const queue = [...targetFiles];
    
    async function processQueue() {
      while (queue.length > 0) {
        const file = queue.shift();
        if (!file) continue;

        try {
          updateProgress(processed, total, `(${processed + 1}/${total}) ${file.name} 분석 중...`);
          
          if (processed > 0) await new Promise(r => setTimeout(r, 3000));
          
          let studentFiles = {};
          const isZip = file.name.toLowerCase().endsWith('.zip');

          if (isZip) {
            const extracted = await extractFilesFromZip(file);
            studentFiles = parseStudentFiles(extracted, selectedCategory);
          } else {
            const content = await file.text();
            studentFiles = parseStudentFiles({ [file.name]: content }, selectedCategory);
          }

          const reference = referenceCodes[selectedCategory];
          
          let evaluation = null;
          let retries = 0;
          const maxRetries = 3;

          while (retries < maxRetries) {
            try {
              evaluation = await evaluateCode(apiKey, selectedCategory, reference, studentFiles);
              break; 
            } catch (e) {
              const isRetryable = e.message === "RATE_LIMIT_EXCEEDED" || e.name === "AbortError";
              if (isRetryable && retries < maxRetries - 1) {
                const waitTime = (retries + 1) * 3000;
                const reason = e.name === "AbortError" ? "응답 지연" : "속도 제한";
                updateProgress(processed, total, `(${processed + 1}/${total}) ${reason} 발생. ${waitTime/1000}초 후 재시도...`);
                await new Promise(r => setTimeout(r, waitTime));
                retries++;
              } else {
                throw e; 
              }
            }
          }
          
          results.push({
            id: Date.now() + Math.random(),
            filename: file.name,
            category: selectedCategory,
            timestamp: new Date().toLocaleString(),
            ...evaluation
          });
          
          try {
            saveToStorage();
          } catch (e) {
            console.warn("Storage quota exceeded");
          }
          renderResults();
          
        } catch (error) {
          console.error("Analysis Error:", error);
          let errorMsg = error.message;
          if (errorMsg === "RATE_LIMIT_EXCEEDED") errorMsg = "API 속도 제한 초과";
          if (error.name === "AbortError") errorMsg = "응답 시간 초과 (30초)";
          
          results.push({
            id: Date.now() + Math.random(),
            filename: file.name,
            category: selectedCategory,
            score: 0,
            grade: 'F',
            analysis: '분석 중 기술적 오류 발생',
            feedback: `[시스템 오류]\n${errorMsg}\n잠시 후 다시 시도해 주세요.`
          });
          renderResults();
        } finally {
          processed++;
          updateProgress(processed, total, processed === total ? '모든 분석 완료' : `(${processed}/${total}) 분석 중...`);
        }
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    const workers = Array(Math.min(CONCURRENCY, queue.length)).fill(null).map(() => processQueue());
    await Promise.all(workers);
    
  } catch (err) {
    console.error("Critical handleFiles Error:", err);
    alert("파일 처리 중 치명적인 오류가 발생했습니다: " + err.message);
  }
}

function updateProgress(current, total, text) {
  const percent = total > 0 ? Math.round((current / total) * 100) : 0;
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
