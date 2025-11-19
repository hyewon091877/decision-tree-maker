// 전역 변수
let blockCounter = 0;
let blocks = [];
let connections = [];
let draggedBlock = null;
let offsetX, offsetY;
let connectionMode = false;
let selectedBlock = null;

// DOM 요소
const workspace = document.getElementById('workspace');
const connectionLayer = document.getElementById('connectionLayer');
const addQuestionBtn = document.getElementById('addQuestion');
const addAnswerBtn = document.getElementById('addAnswer');
const addConnectionBtn = document.getElementById('addConnection');
const clearAllBtn = document.getElementById('clearAll');
const exportImageBtn = document.getElementById('exportImage');
const modeIndicator = document.getElementById('modeIndicator');

// 초기화
document.addEventListener('DOMContentLoaded', () => {
    loadFromStorage();
    setupEventListeners();
    updateConnectionLayer();
});

// 이벤트 리스너 설정
function setupEventListeners() {
    addQuestionBtn.addEventListener('click', () => createBlock('question'));
    addAnswerBtn.addEventListener('click', () => createBlock('answer'));
    addConnectionBtn.addEventListener('click', toggleConnectionMode);
    clearAllBtn.addEventListener('click', clearWorkspace);
    exportImageBtn.addEventListener('click', exportAsImage);
}

// 블록 생성
function createBlock(type) {
    blockCounter++;
    const block = document.createElement('div');
    block.className = `block block-${type}`;
    block.id = `block-${blockCounter}`;
    
    // 블록을 중앙 근처에 생성 (겹치지 않게)
    const row = Math.floor((blockCounter - 1) / 3);
    const col = (blockCounter - 1) % 3;
    block.style.left = `${100 + col * 250}px`;
    block.style.top = `${100 + row * 200}px`;

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

    // 드래그 및 클릭 기능 추가
    makeDraggable(block);
    block.addEventListener('click', handleBlockClick);
    
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

// 연결 모드 토글
function toggleConnectionMode() {
    connectionMode = !connectionMode;
    
    if (connectionMode) {
        addConnectionBtn.style.background = 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)';
        addConnectionBtn.style.color = '#333';
        modeIndicator.style.display = 'block';
        workspace.style.cursor = 'crosshair';
        
        // 모든 블록에 연결 모드 표시
        document.querySelectorAll('.block').forEach(block => {
            block.classList.add('connecting-mode');
        });
    } else {
        addConnectionBtn.style.background = 'linear-gradient(135deg, #4299e1 0%, #3182ce 100%)';
        addConnectionBtn.style.color = 'white';
        modeIndicator.style.display = 'none';
        workspace.style.cursor = 'default';
        selectedBlock = null;
        
        document.querySelectorAll('.block').forEach(block => {
            block.classList.remove('connecting-mode', 'selected');
        });
    }
}

// 블록 클릭 핸들러
function handleBlockClick(e) {
    if (!connectionMode) return;
    if (e.target.classList.contains('block-input') || 
        e.target.classList.contains('delete-btn')) {
        return;
    }
    
    const block = e.currentTarget;
    
    if (!selectedBlock) {
        // 첫 번째 블록 선택
        selectedBlock = block;
        block.classList.add('selected');
        modeIndicator.innerHTML = '<span>🔗 연결 모드: 도착 블록을 클릭하세요</span>';
    } else if (selectedBlock.id === block.id) {
        // 같은 블록 클릭 시 선택 취소
        selectedBlock.classList.remove('selected');
        selectedBlock = null;
        modeIndicator.innerHTML = '<span>🔗 연결 모드: 시작 블록을 클릭하세요</span>';
    } else {
        // 두 번째 블록 선택 - 연결 생성
        createConnection(selectedBlock.id, block.id);
        selectedBlock.classList.remove('selected');
        selectedBlock = null;
        modeIndicator.innerHTML = '<span>🔗 연결 모드: 시작 블록을 클릭하세요</span>';
    }
}

// 연결 생성
function createConnection(fromId, toId) {
    // 이미 같은 연결이 있는지 확인
    const exists = connections.some(conn => 
        conn.from === fromId && conn.to === toId
    );
    
    if (exists) {
        alert('이미 연결되어 있습니다!');
        return;
    }
    
    // 레이블 선택 (예/아니오)
    const label = prompt('연결 레이블을 입력하세요:\n1. 예\n2. 아니오\n3. 기타 (직접 입력)', '예');
    
    if (label === null) return; // 취소
    
    const labelType = label === '예' ? 'yes' : label === '아니오' ? 'no' : 'custom';
    
    connections.push({
        id: `conn-${Date.now()}`,
        from: fromId,
        to: toId,
        label: label,
        labelType: labelType
    });
    
    updateConnectionLayer();
    saveToStorage();
}

// 연결 레이어 업데이트
function updateConnectionLayer() {
    // SVG 초기화
    connectionLayer.innerHTML = '';
    
    // 레이블 컨테이너 초기화
    document.querySelectorAll('.connection-label').forEach(el => el.remove());
    
    connections.forEach(conn => {
        const fromBlock = document.getElementById(conn.from);
        const toBlock = document.getElementById(conn.to);
        
        if (!fromBlock || !toBlock) return;
        
        const fromRect = fromBlock.getBoundingClientRect();
        const toRect = toBlock.getBoundingClientRect();
        const workspaceRect = workspace.getBoundingClientRect();
        
        // 시작점 (블록 중앙 하단)
        const x1 = fromRect.left - workspaceRect.left + fromRect.width / 2;
        const y1 = fromRect.top - workspaceRect.top + fromRect.height;
        
        // 끝점 (블록 중앙 상단)
        const x2 = toRect.left - workspaceRect.left + toRect.width / 2;
        const y2 = toRect.top - workspaceRect.top;
        
        // 곡선 경로 생성 (베지어 곡선)
        const midY = (y1 + y2) / 2;
        const path = `M ${x1} ${y1} Q ${x1} ${midY}, ${(x1 + x2) / 2} ${midY} T ${x2} ${y2}`;
        
        // SVG 경로 생성
        const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        pathElement.setAttribute('d', path);
        pathElement.setAttribute('class', 'connection-line');
        pathElement.setAttribute('stroke', conn.labelType === 'yes' ? '#48bb78' : conn.labelType === 'no' ? '#f56565' : '#764ba2');
        connectionLayer.appendChild(pathElement);
        
        // 화살표 생성
        const arrowSize = 12;
        const angle = Math.atan2(y2 - midY, x2 - (x1 + x2) / 2);
        const arrowPoints = [
            [x2, y2],
            [x2 - arrowSize * Math.cos(angle - Math.PI / 6), y2 - arrowSize * Math.sin(angle - Math.PI / 6)],
            [x2 - arrowSize * Math.cos(angle + Math.PI / 6), y2 - arrowSize * Math.sin(angle + Math.PI / 6)]
        ];
        
        const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        polygon.setAttribute('points', arrowPoints.map(p => p.join(',')).join(' '));
        polygon.setAttribute('class', 'connection-arrow');
        polygon.setAttribute('fill', conn.labelType === 'yes' ? '#48bb78' : conn.labelType === 'no' ? '#f56565' : '#764ba2');
        connectionLayer.appendChild(polygon);
        
        // 레이블 생성 (HTML 요소로)
        const labelDiv = document.createElement('div');
        labelDiv.className = `connection-label connection-label-${conn.labelType}`;
        labelDiv.textContent = conn.label;
        labelDiv.style.left = `${(x1 + x2) / 2 - 30}px`;
        labelDiv.style.top = `${midY - 15}px`;
        labelDiv.dataset.connId = conn.id;
        
        // 레이블 클릭으로 연결 삭제
        labelDiv.addEventListener('click', () => deleteConnection(conn.id));
        
        workspace.appendChild(labelDiv);
    });
}

// 연결 삭제
function deleteConnection(connId) {
    if (confirm('이 연결을 삭제하시겠습니까?')) {
        connections = connections.filter(c => c.id !== connId);
        updateConnectionLayer();
        saveToStorage();
    }
}

// 블록을 드래그 가능하게 만들기
function makeDraggable(block) {
    block.addEventListener('mousedown', startDrag);
    block.addEventListener('touchstart', startDrag);
}

function startDrag(e) {
    if (connectionMode) return;
    if (e.target.classList.contains('block-input') || 
        e.target.classList.contains('delete-btn')) {
        return;
    }

    draggedBlock = e.target.closest('.block');
    if (!draggedBlock) return;

    draggedBlock.classList.add('dragging');

    const rect = draggedBlock.getBoundingClientRect();

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

    let newX = clientX - workspaceRect.left - offsetX + workspace.scrollLeft;
    let newY = clientY - workspaceRect.top - offsetY + workspace.scrollTop;

    // 최소값만 제한 (음수 방지)
    newX = Math.max(0, newX);
    newY = Math.max(0, newY);

    draggedBlock.style.left = `${newX}px`;
    draggedBlock.style.top = `${newY}px`;
    
    // 작업 공간 자동 확장
    expandWorkspaceIfNeeded(newX, newY);
    
    // 연결선 실시간 업데이트
    updateConnectionLayer();
}

// 작업 공간 자동 확장
function expandWorkspaceIfNeeded(x, y) {
    const currentHeight = parseInt(workspace.style.minHeight || '2000');
    const currentWidth = workspace.offsetWidth;
    
    // 블록이 하단 근처에 있으면 높이 확장
    if (y + 300 > currentHeight) {
        workspace.style.minHeight = `${y + 500}px`;
    }
    
    // SVG 레이어도 같이 확장
    connectionLayer.style.height = workspace.style.minHeight;
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
        updateConnectionLayer();
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
        
        // 관련 연결도 삭제
        connections = connections.filter(c => c.from !== blockId && c.to !== blockId);
        
        updateConnectionLayer();
        saveToStorage();
    }
}

// 전체 삭제
function clearWorkspace() {
    if (blocks.length === 0) {
        alert('삭제할 블록이 없습니다.');
        return;
    }

    if (confirm('모든 블록과 연결을 삭제하시겠습니까?')) {
        workspace.innerHTML = `
            <svg id="connectionLayer" class="connection-layer"></svg>
            <div class="instruction">
                <div class="instruction-content">
                    <h2>📚 사용 방법</h2>
                    <ol>
                        <li><strong>질문 추가</strong>: 보라색 질문 블록 생성</li>
                        <li><strong>답변 추가</strong>: 초록색 답변 블록 생성</li>
                        <li><strong>블록 이동</strong>: 블록을 드래그하여 위치 조정</li>
                        <li><strong>연결하기</strong>: 연결 모드 → 시작 블록 클릭 → 끝 블록 클릭</li>
                    </ol>
                </div>
            </div>
        `;
        
        // connectionLayer 재할당
        const newConnectionLayer = document.getElementById('connectionLayer');
        if (newConnectionLayer) {
            connectionLayer.replaceWith(newConnectionLayer);
        }
        
        blocks = [];
        connections = [];
        blockCounter = 0;
        
        if (connectionMode) {
            toggleConnectionMode();
        }
        
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
    localStorage.setItem('decisionTreeConnections', JSON.stringify(connections));
    localStorage.setItem('decisionTreeCounter', blockCounter);
}

// 로컬 스토리지에서 불러오기
function loadFromStorage() {
    const savedBlocks = localStorage.getItem('decisionTreeBlocks');
    const savedConnections = localStorage.getItem('decisionTreeConnections');
    const savedCounter = localStorage.getItem('decisionTreeCounter');

    if (savedBlocks) {
        blocks = JSON.parse(savedBlocks);
        connections = JSON.parse(savedConnections) || [];
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
            block.addEventListener('click', handleBlockClick);
        });

        // 안내 메시지 제거
        const instruction = workspace.querySelector('.instruction');
        if (instruction && blocks.length > 0) {
            instruction.remove();
        }
        
        // 연결선 그리기
        setTimeout(() => updateConnectionLayer(), 100);
    }
}

// 트리 내보내기 (JSON)
function exportTree() {
    if (blocks.length === 0) {
        alert('내보낼 블록이 없습니다.');
        return;
    }

    saveToStorage();

    const exportData = {
        blocks: blocks,
        connections: connections
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `결정트리_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);

    alert('결정 트리가 JSON 파일로 저장되었습니다!');
}

// 이미지로 내보내기 (PNG)
async function exportAsImage() {
    if (blocks.length === 0) {
        alert('저장할 블록이 없습니다.');
        return;
    }

    try {
        // html2canvas 라이브러리 동적 로드
        if (typeof html2canvas === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
            document.head.appendChild(script);
            
            await new Promise((resolve, reject) => {
                script.onload = resolve;
                script.onerror = reject;
            });
        }

        // 저장 버튼 임시 숨김
        const controls = document.querySelector('.controls');
        const modeInd = document.getElementById('modeIndicator');
        const originalControlsDisplay = controls.style.display;
        const originalModeDisplay = modeInd.style.display;
        
        controls.style.display = 'none';
        modeInd.style.display = 'none';

        // 작업 공간만 캡처
        const canvas = await html2canvas(workspace, {
            backgroundColor: '#ffffff',
            scale: 2, // 고해상도
            logging: false,
            useCORS: true
        });

        // 버튼 다시 표시
        controls.style.display = originalControlsDisplay;
        modeInd.style.display = originalModeDisplay;

        // PNG로 다운로드
        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `결정트리_${new Date().toISOString().split('T')[0]}.png`;
            link.click();
            URL.revokeObjectURL(url);
            
            alert('결정 트리가 PNG 이미지로 저장되었습니다!');
        }, 'image/png');

    } catch (error) {
        console.error('이미지 저장 오류:', error);
        alert('이미지 저장 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
}