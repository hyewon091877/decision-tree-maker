// 전역 변수
let blockCounter = 0;
let blocks = [];
let draggedBlock = null;
let offsetX, offsetY;

// DOM 요소
const workspace = document.getElementById('workspace');
const addQuestionBtn = document.getElementById('addQuestion');
const addAnswerBtn = document.getElementById('addAnswer');
const clearAllBtn = document.getElementById('clearAll');
const exportTreeBtn = document.getElementById('exportTree');

// 초기화
document.addEventListener('DOMContentLoaded', () => {
    loadFromStorage();
    setupEventListeners();
});

// 이벤트 리스너 설정
function setupEventListeners() {
    addQuestionBtn.addEventListener('click', () => createBlock('question'));
    addAnswerBtn.addEventListener('click', () => createBlock('answer'));
    clearAllBtn.addEventListener('click', clearWorkspace);
    exportTreeBtn.addEventListener('click', exportTree);
}

// 블록 생성
function createBlock(type) {
    blockCounter++;
    const block = document.createElement('div');
    block.className = `block block-${type}`;
    block.id = `block-${blockCounter}`;
    block.style.left = `${50 + (blockCounter * 20) % 400}px`;
    block.style.top = `${50 + (blockCounter * 30) % 400}px`;

    const typeLabel = type === 'question' ? '❓ 질문' : '✅ 답변';
    const placeholder = type === 'question' 
        ? '예: 이 천체는 스스로 빛을 낼까요?' 
        : '예: 태양입니다!';

    block.innerHTML = `
        <div class="block-header">
            <span class="block-type">${typeLabel}</span>
            <button class="delete-btn" onclick="deleteBlock('${block.id}')">✕</button>
        </div>
        <div class="block-content">
            <textarea class="block-input" placeholder="${placeholder}" 
                onchange="saveToStorage()">${''}</textarea>
        </div>
    `;

    workspace.appendChild(block);
    
    // 안내 메시지 제거
    const instruction = workspace.querySelector('.instruction');
    if (instruction) {
        instruction.remove();
    }

    // 드래그 기능 추가
    makeDraggable(block);
    
    // 블록 정보 저장
    blocks.push({
        id: block.id,
        type: type,
        x: parseInt(block.style.left),
        y: parseInt(block.style.top),
        content: ''
    });

    saveToStorage();
}

// 블록을 드래그 가능하게 만들기
function makeDraggable(block) {
    block.addEventListener('mousedown', startDrag);
    block.addEventListener('touchstart', startDrag);
}

function startDrag(e) {
    if (e.target.classList.contains('block-input') || 
        e.target.classList.contains('delete-btn')) {
        return;
    }

    draggedBlock = e.target.closest('.block');
    if (!draggedBlock) return;

    draggedBlock.classList.add('dragging');

    const rect = draggedBlock.getBoundingClientRect();
    const workspaceRect = workspace.getBoundingClientRect();

    if (e.type === 'touchstart') {
        offsetX = e.touches[0].clientX - rect.left;
        offsetY = e.touches[0].clientY - rect.top;
    } else {
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
    }

    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', stopDrag);
    document.addEventListener('touchmove', drag);
    document.addEventListener('touchend', stopDrag);

    e.preventDefault();
}

function drag(e) {
    if (!draggedBlock) return;

    const workspaceRect = workspace.getBoundingClientRect();
    let clientX, clientY;

    if (e.type === 'touchmove') {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }

    let newX = clientX - workspaceRect.left - offsetX;
    let newY = clientY - workspaceRect.top - offsetY;

    // 작업 공간 경계 제한
    newX = Math.max(0, Math.min(newX, workspaceRect.width - draggedBlock.offsetWidth));
    newY = Math.max(0, Math.min(newY, workspaceRect.height - draggedBlock.offsetHeight));

    draggedBlock.style.left = `${newX}px`;
    draggedBlock.style.top = `${newY}px`;
}

function stopDrag() {
    if (draggedBlock) {
        draggedBlock.classList.remove('dragging');
        
        // 위치 정보 업데이트
        const blockData = blocks.find(b => b.id === draggedBlock.id);
        if (blockData) {
            blockData.x = parseInt(draggedBlock.style.left);
            blockData.y = parseInt(draggedBlock.style.top);
        }
        
        saveToStorage();
        draggedBlock = null;
    }

    document.removeEventListener('mousemove', drag);
    document.removeEventListener('mouseup', stopDrag);
    document.removeEventListener('touchmove', drag);
    document.removeEventListener('touchend', stopDrag);
}

// 블록 삭제
function deleteBlock(blockId) {
    const block = document.getElementById(blockId);
    if (block && confirm('이 블록을 삭제하시겠습니까?')) {
        block.remove();
        blocks = blocks.filter(b => b.id !== blockId);
        saveToStorage();
    }
}

// 전체 삭제
function clearWorkspace() {
    if (blocks.length === 0) {
        alert('삭제할 블록이 없습니다.');
        return;
    }

    if (confirm('모든 블록을 삭제하시겠습니까?')) {
        workspace.innerHTML = `
            <div class="instruction">
                <p>👆 위의 버튼을 눌러 블록을 추가하고, 드래그하여 배치하세요!</p>
            </div>
        `;
        blocks = [];
        blockCounter = 0;
        saveToStorage();
    }
}

// 로컬 스토리지에 저장
function saveToStorage() {
    // 현재 블록의 내용 업데이트
    blocks.forEach(blockData => {
        const block = document.getElementById(blockData.id);
        if (block) {
            const textarea = block.querySelector('.block-input');
            if (textarea) {
                blockData.content = textarea.value;
            }
        }
    });

    localStorage.setItem('decisionTreeBlocks', JSON.stringify(blocks));
    localStorage.setItem('decisionTreeCounter', blockCounter);
}

// 로컬 스토리지에서 불러오기
function loadFromStorage() {
    const savedBlocks = localStorage.getItem('decisionTreeBlocks');
    const savedCounter = localStorage.getItem('decisionTreeCounter');

    if (savedBlocks) {
        blocks = JSON.parse(savedBlocks);
        blockCounter = parseInt(savedCounter) || 0;

        blocks.forEach(blockData => {
            const block = document.createElement('div');
            block.className = `block block-${blockData.type}`;
            block.id = blockData.id;
            block.style.left = `${blockData.x}px`;
            block.style.top = `${blockData.y}px`;

            const typeLabel = blockData.type === 'question' ? '❓ 질문' : '✅ 답변';
            const placeholder = blockData.type === 'question' 
                ? '예: 이 천체는 스스로 빛을 낼까요?' 
                : '예: 태양입니다!';

            block.innerHTML = `
                <div class="block-header">
                    <span class="block-type">${typeLabel}</span>
                    <button class="delete-btn" onclick="deleteBlock('${block.id}')">✕</button>
                </div>
                <div class="block-content">
                    <textarea class="block-input" placeholder="${placeholder}" 
                        onchange="saveToStorage()">${blockData.content}</textarea>
                </div>
            `;

            workspace.appendChild(block);
            makeDraggable(block);
        });

        // 안내 메시지 제거
        const instruction = workspace.querySelector('.instruction');
        if (instruction && blocks.length > 0) {
            instruction.remove();
        }
    }
}

// 트리 내보내기 (JSON)
function exportTree() {
    if (blocks.length === 0) {
        alert('내보낼 블록이 없습니다.');
        return;
    }

    // 현재 상태 저장
    saveToStorage();

    const dataStr = JSON.stringify(blocks, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `결정트리_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);

    alert('결정 트리가 JSON 파일로 저장되었습니다!');
}