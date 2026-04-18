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
const saveSettingsBtn = document.getElementById('save-api-key');
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
  const targetFiles = allFiles.filter(f => {
    const name = f.name.toLowerCase();
    return name.endsWith('.zip') || name.endsWith('.html');
  });
  
  if (targetFiles.length === 0) {
    alert('.zip 또는 .html 파일을 업로드하거나 드래그해주세요.');
    return;
  }

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
  const total = targetFiles.length;
  
  // 저속 안정 모드 (동시 처리 1개, 지연 시간 강화)
  const CONCURRENCY = 1; 
  const queue = [...targetFiles];
  
  async function processQueue() {
    while (queue.length > 0) {
      const file = queue.shift();
      if (!file) continue;

      try {
        updateProgress(processed, total, `(${processed + 1}/${total}) ${file.name} 분석 중...`);
        
        // 이전 분석과의 간격 (3초 대기)
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
        
        // 재시도 로직 추가
        let evaluation = null;
        let retries = 0;
        const maxRetries = 3;

        while (retries < maxRetries) {
          try {
            evaluation = await evaluateCode(apiKey, selectedCategory, reference, studentFiles);
            break; // 성공 시 루프 탈출
          } catch (e) {
            if (e.message === "RATE_LIMIT_EXCEEDED" && retries < maxRetries - 1) {
              const waitTime = (retries + 1) * 3000; // 3초, 6초... 순차적 대기
              updateProgress(processed, total, `(${processed + 1}/${total}) 속도 제한 발생. ${waitTime/1000}초 후 재시도...`);
              await new Promise(r => setTimeout(r, waitTime));
              retries++;
            } else {
              throw e; // 다른 에러거나 재시도 횟수 초과 시 밖으로 던짐
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
        
        saveToStorage();
        renderResults();
        
      } catch (error) {
        console.error("Analysis Error:", error);
        let errorMsg = error.message;
        if (errorMsg === "RATE_LIMIT_EXCEEDED") errorMsg = "API 일일 사용량 또는 속도 제한을 초과했습니다.";
        
        results.push({
          id: Date.now() + Math.random(),
          filename: file.name,
          category: selectedCategory,
          score: 0,
          grade: 'F',
          analysis: '기술적 분석 오류',
          feedback: `[시스템 오류]\n${errorMsg}\n\n도움말: 학생의 코드는 정상일 수 있으나 분석 서버 부하로 실패했습니다. 잠시 후 해당 파일만 다시 시도해 보세요.`
        });
        renderResults();
      } finally {
        processed++;
        updateProgress(processed, total, processed === total ? '모든 분석 완료' : `(${processed}/${total}) 분석 중...`);
      }
      
      // API 속도 제한 방지를 위한 미세한 지연
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // 병렬 실행 시작
  const workers = Array(Math.min(CONCURRENCY, queue.length))
    .fill(null)
    .map(() => processQueue());

  await Promise.all(workers);
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
