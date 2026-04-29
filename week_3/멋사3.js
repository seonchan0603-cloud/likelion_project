document.addEventListener('DOMContentLoaded', () => {

    let lionsData = [];
    let currentFilter = 'All'; // 현재 선택된 필터 상태

    // DOM 캐싱
    const totalCountEl = document.getElementById('total-count');
    const toggleFormBtn = document.getElementById('toggle-form-btn');
    const deleteLastBtn = document.getElementById('delete-last-btn');
    const formSection = document.getElementById('form-section');
    const addForm = document.getElementById('add-form');
    const cancelFormBtn = document.getElementById('cancel-form-btn');
    const summaryGrid = document.getElementById('summary-grid');
    const detailList = document.getElementById('detail-list');
    
    // 필터 요소 (만약 HTML에 없어도 에러가 나지 않도록 처리)
    const filterRoleSelect = document.getElementById('filter-role');

    // =========================================
    // [핵심] 상태에 따라 화면을 그리는 render 함수
    // =========================================
    function render() {
        // 1. 기존 화면 비우기
        summaryGrid.innerHTML = '';
        detailList.innerHTML = '';

        // 2. 필터링된 데이터 추출
        const filteredData = lionsData.filter(lion => 
            currentFilter === 'All' || lion.role === currentFilter
        );

        // 3. 데이터가 0명인 경우 빈 상태 표시
        if (filteredData.length === 0) {
            const msg = currentFilter === 'All' 
                ? "아직 등록된 아기사자가 없습니다." 
                : `해당 파트(${currentFilter})에 등록된 아기사자가 없습니다.`;
            
            summaryGrid.innerHTML = `<div class="empty-msg">${msg}</div>`;
            detailList.innerHTML = `<div class="empty-msg">${msg}</div>`;
        } else {
            // 4. 필터링된 데이터만큼 카드 다시 생성
            filteredData.forEach(lion => createLionDOM(lion));
        }

        // 5. 총 인원수 업데이트
        if (totalCountEl) {
            totalCountEl.textContent = `총 ${lionsData.length}명`;
        }
    }

    // =========================================
    // [초기화] HTML에서 기존 데이터 가져오기
    // =========================================
    function initDataFromHTML() {
        const existingCards = summaryGrid.querySelectorAll('.summary-card');
        
        existingCards.forEach((card, index) => {
            const name = card.querySelector('.card-name').textContent;
            const role = card.querySelector('.card-role').textContent;
            const short = card.querySelector('.card-short').textContent;
            
            const hiddenData = card.querySelector('.hidden-data');
            if (hiddenData) {
                const techs = hiddenData.dataset.techs.split(',').map(t => t.trim());
                const bio = hiddenData.dataset.bio;
                const email = hiddenData.dataset.email;
                const phone = hiddenData.dataset.phone;
                const web = hiddenData.dataset.web;
                const word = hiddenData.dataset.word;

                const uniqueId = 'lion-' + Date.now() + '-' + index;
                lionsData.push({ id: uniqueId, name, role, short, techs, bio, email, phone, web, word });
            }
        });

        // 데이터 수집 완료 후 화면을 새롭게 렌더링
        render();
    }

    // =========================================
    // [이벤트] 필터 변경 시
    // =========================================
    if (filterRoleSelect) {
        filterRoleSelect.addEventListener('change', (e) => {
            currentFilter = e.target.value;
            render(); // 필터 바뀔 때마다 다시 그리기
        });
    }

    // =========================================
    // [이벤트] 폼 토글 및 취소
    // =========================================
    toggleFormBtn.addEventListener('click', () => { formSection.classList.toggle('hidden'); });
    cancelFormBtn.addEventListener('click', () => { addForm.reset(); hideAllErrors(); formSection.classList.add('hidden'); });

    function hideAllErrors() {
        const errorMsgs = document.querySelectorAll('.error-msg');
        const inputs = addForm.querySelectorAll('input, select, textarea');
        errorMsgs.forEach(msg => msg.style.display = 'none');
        inputs.forEach(input => input.classList.remove('input-error'));
    }

    function showError(inputEl, errorEl, msg) {
        errorEl.textContent = msg; errorEl.style.display = 'block'; inputEl.classList.add('input-error');
    }

    // =========================================
    // [이벤트] 폼 제출 (데이터 추가)
    // =========================================
    addForm.addEventListener('submit', (e) => {
        e.preventDefault();
        hideAllErrors();

        const newValues = {};
        let isValid = true;
        const fields = ['name', 'role', 'tech', 'short', 'bio', 'email', 'phone', 'web', 'word'];

        fields.forEach(field => {
            const inputEl = document.getElementById(`input-${field}`);
            const errorEl = document.getElementById(`error-${field}`);
            if (!inputEl) return;
            const val = inputEl.value.trim();

            if (val === '') {
                showError(inputEl, errorEl, '필수 항목입니다.'); isValid = false;
            } else {
                if (field === 'email' && !val.includes('@')) { showError(inputEl, errorEl, `이메일 주소에 '@'를 포함해 주세요.`); isValid = false; }
                else if (field === 'web' && !(val.startsWith('http://') || val.startsWith('https://'))) { showError(inputEl, errorEl, `URL(http:// 또는 https://)을 입력하세요.`); isValid = false; }
                else { newValues[field] = val; }
            }
        });

        if (!isValid) return;

        const techArray = newValues.tech.split(',').map(t => t.trim()).filter(t => t !== "");
        const newUniqueId = 'lion-' + Date.now();

        const newLion = {
            id: newUniqueId,
            name: newValues.name, role: newValues.role, short: newValues.short, techs: techArray,
            bio: newValues.bio, email: newValues.email, phone: newValues.phone, web: newValues.web, word: newValues.word
        };

        lionsData.push(newLion);
        
        render(); // 추가 후 화면 통째로 다시 갱신
        
        addForm.reset();
        formSection.classList.add('hidden');
    });

    // =========================================
    // [이벤트] 마지막 항목 삭제
    // =========================================
    deleteLastBtn.addEventListener('click', () => {
        if (lionsData.length === 0) return alert('삭제할 명단이 없습니다.');
        lionsData.pop();
        
        render(); // 삭제 후 화면 통째로 다시 갱신
    });

    // =========================================
    // [이벤트] 스크롤 이동 로직 (이벤트 위임)
    // =========================================
    summaryGrid.addEventListener('click', (e) => {
        const clickedCard = e.target.closest('.summary-card');
        if (!clickedCard) return; 

        const targetId = clickedCard.dataset.id;
        const targetDetailCard = document.querySelector(`.detail-card[data-id="${targetId}"]`);

        if (targetDetailCard) {
            targetDetailCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            document.querySelectorAll('.detail-card').forEach(card => card.classList.remove('highlight-card'));
            targetDetailCard.classList.add('highlight-card');
            setTimeout(() => targetDetailCard.classList.remove('highlight-card'), 1500);
        }
    });

    // =========================================
    // [함수] 카드 화면(DOM) 생성기
    // =========================================
    function createLionDOM(lion) {
        const firstTech = lion.techs.length > 0 ? lion.techs[0] : 'None';
        
        let roleClass = 'role-front';
        if(lion.role === 'Backend') roleClass = 'role-back';
        if(lion.role === 'Design') roleClass = 'role-design';

        // 요약 카드 생성
        const summaryArticle = document.createElement('article');
        summaryArticle.className = 'summary-card';
        summaryArticle.style.cursor = 'pointer'; 
        summaryArticle.dataset.id = lion.id; 
        
        summaryArticle.innerHTML = `
            <div class="card-image-box">
                <img src="https://picsum.photos/400/300?random=${lion.id.slice(-5)}" alt="프로필" class="card-image">
                <span class="badge tech-badge">${firstTech}</span>
            </div>
            <div class="card-text-box">
                <h3 class="card-name">${lion.name}</h3>
                <p class="card-role ${roleClass}">${lion.role}</p>
                <p class="card-short">${lion.short}</p>
            </div>
        `;
        summaryGrid.appendChild(summaryArticle);

        // 상세 카드 생성
        const techListHTML = lion.techs.map(t => `<li>${t}</li>`).join('');
        const detailArticle = document.createElement('article');
        detailArticle.className = 'detail-card';
        detailArticle.dataset.id = lion.id; 

        detailArticle.innerHTML = `
            <div class="detail-header">
                <h3 class="detail-name">${lion.name}</h3>
                <p class="detail-role ${roleClass}">${lion.role}</p>
                <p class="detail-club">LION TRACK</p>
            </div>
            <div class="detail-body">
                <h4 class="detail-section-title">자기소개</h4><p class="detail-text">${lion.bio}</p>
                <h4 class="detail-section-title">연락처</h4>
                <ul class="detail-ul"><li>Email: ${lion.email}</li><li>Phone: ${lion.phone}</li><li><a href="${lion.web}" target="_blank">${lion.web}</a></li></ul>
                <h4 class="detail-section-title">관심 기술</h4><ul class="detail-ul">${techListHTML}</ul>
                <h4 class="detail-section-title">한 마디</h4><p class="detail-text">${lion.word}</p>
            </div>
        `;
        detailList.appendChild(detailArticle);
    }

    // 실행
    initDataFromHTML();

});