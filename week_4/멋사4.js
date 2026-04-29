document.addEventListener('DOMContentLoaded', () => {

    // [3] 단일 진실 공급원: 원본 데이터 배열
    let lionsData = [];
    let currentRetryAction = null; // 재시도를 위한 함수 저장

    // --- DOM 요소 캐싱 ---
    const totalCountEl = document.getElementById('total-count');
    const toggleFormBtn = document.getElementById('toggle-form-btn');
    const deleteLastBtn = document.getElementById('delete-last-btn');
    const formSection = document.getElementById('form-section');
    const addForm = document.getElementById('add-form');
    const cancelFormBtn = document.getElementById('cancel-form-btn');
    
    const summaryGrid = document.getElementById('summary-grid');
    const detailList = document.getElementById('detail-list');
    const emptyStateSummary = document.getElementById('empty-state-summary');
    const emptyStateDetail = document.getElementById('empty-state-detail');

    // 4주차 추가 DOM
    const asyncStatusEl = document.getElementById('async-status');
    const retryBtn = document.getElementById('retry-btn');
    const btnAddRandom1 = document.getElementById('add-random-1-btn');
    const btnAddRandom5 = document.getElementById('add-random-5-btn');
    const btnRefreshAll = document.getElementById('refresh-all-btn');
    const btnFillRandom = document.getElementById('fill-random-btn');

    const searchInput = document.getElementById('search-name');
    const roleFilter = document.getElementById('filter-role');
    const sortType = document.getElementById('sort-type');

    // =========================================
    // [4] 초기 화면 데이터 동기화
    // =========================================
    function initDataFromHTML() {
        const existingCards = summaryGrid.querySelectorAll('.summary-card');
        
        existingCards.forEach((card, index) => {
            const name = card.querySelector('.card-name').textContent;
            const role = card.querySelector('.card-role').textContent;
            const short = card.querySelector('.card-short').textContent;
            
            const hiddenData = card.querySelector('.hidden-data');
            const techs = hiddenData.dataset.techs.split(',').map(t => t.trim());
            const isMyCard = hiddenData.dataset.ismycard === "true"; // 내 카드 식별
            
            lionsData.push({
                id: Date.now() + index, // 고유 ID 부여
                createdAt: Date.now() + index,
                isMyCard: isMyCard,
                name, role, short, techs, 
                bio: hiddenData.dataset.bio,
                email: hiddenData.dataset.email,
                phone: hiddenData.dataset.phone,
                web: hiddenData.dataset.web,
                word: hiddenData.dataset.word,
                image: card.querySelector('img').src
            });
        });

        renderAll(); // 초기 데이터를 기반으로 화면 다시 그리기
    }

    // =========================================
    // [8] 데이터 렌더링 파이프라인 (필터/정렬/검색)
    // =========================================
    function getProcessedData() {
        let result = [...lionsData];

        // 1. 검색 (이름 기준)
        const keyword = searchInput.value.toLowerCase().trim();
        if (keyword) {
            result = result.filter(lion => lion.name.toLowerCase().includes(keyword));
        }

        // 2. 필터 (파트 기준)
        const role = roleFilter.value;
        if (role !== 'All') {
            result = result.filter(lion => lion.role === role);
        }

        // 3. 정렬 (최신순 / 이름순)
        const sort = sortType.value;
        if (sort === 'name') {
            result.sort((a, b) => a.name.localeCompare(b.name));
        } else if (sort === 'newest') {
            result.sort((a, b) => b.createdAt - a.createdAt);
        }

        return result;
    }

    // 데이터 기반 화면 업데이트
    function renderAll() {
        const processedData = getProcessedData();
        
        summaryGrid.innerHTML = '';
        detailList.innerHTML = '';

        // [8-3] 빈 상태(Empty State) 처리
        if (processedData.length === 0) {
            emptyStateSummary.classList.remove('hidden');
            emptyStateDetail.classList.remove('hidden');
        } else {
            emptyStateSummary.classList.add('hidden');
            emptyStateDetail.classList.add('hidden');
            
            processedData.forEach(lion => {
                createLionDOM(lion);
            });
        }
        
        // 총 인원은 '전체 명단 데이터' 길이 표시
        totalCountEl.textContent = `총 ${lionsData.length}명`;
    }

    // =========================================
    // [6] 비동기 상태 UI 관리
    // =========================================
    function setUIState(state, action = null) {
        const allAsyncBtns = [btnAddRandom1, btnAddRandom5, btnRefreshAll, btnFillRandom];
        
        asyncStatusEl.className = 'status-text';
        retryBtn.classList.add('hidden');

        if (state === 'loading') {
            asyncStatusEl.textContent = '불러오는 중...';
            asyncStatusEl.classList.add('loading');
            allAsyncBtns.forEach(btn => btn.disabled = true);
        } else if (state === 'success') {
            asyncStatusEl.textContent = '완료!';
            asyncStatusEl.classList.add('success');
            allAsyncBtns.forEach(btn => btn.disabled = false);
            setTimeout(() => setUIState('ready'), 2000); // 2초 후 기본 상태 복귀
        } else if (state === 'error') {
            asyncStatusEl.textContent = '불러오기 실패';
            asyncStatusEl.classList.add('error');
            allAsyncBtns.forEach(btn => btn.disabled = false);
            retryBtn.classList.remove('hidden');
            currentRetryAction = action; // 실패한 작업 저장
        } else {
            asyncStatusEl.textContent = '준비 완료';
            asyncStatusEl.classList.add('ready');
            allAsyncBtns.forEach(btn => btn.disabled = false);
        }
    }

    // 재시도 버튼 클릭
    retryBtn.addEventListener('click', () => {
        if (currentRetryAction) currentRetryAction();
    });

    // =========================================
    // [5] 외부 데이터 Fetch 및 데이터 가공
    // =========================================
    async function fetchRandomUsers(count) {
        try {
            const response = await fetch(`https://randomuser.me/api/?results=${count}&nat=us,gb,ca,au,nz`);
            if (!response.ok) throw new Error('API Network Error');
            const data = await response.json();
            return mapApiToLionData(data.results);
        } catch (error) {
            throw error;
        }
    }

    // API 응답 데이터를 아기 사자 객체 규격으로 변환
    function mapApiToLionData(apiResults) {
        const roles = ['Frontend', 'Backend', 'Design'];
        const techsPool = {
            'Frontend': ['React', 'Vue', 'JavaScript', 'HTML/CSS', 'TypeScript'],
            'Backend': ['Spring', 'Node.js', 'Django', 'MySQL', 'GraphQL'],
            'Design': ['Figma', 'Zeplin', 'Prototyping', 'UX Writing', 'Design System']
        };

        return apiResults.map((user, index) => {
            const role = roles[Math.floor(Math.random() * roles.length)];
            // 풀에서 랜덤 기술 2개 추출
            const shuffledTechs = techsPool[role].sort(() => 0.5 - Math.random());
            const techs = shuffledTechs.slice(0, 2);

            return {
                id: Date.now() + index + Math.random(),
                createdAt: Date.now() + index,
                isMyCard: false,
                name: `${user.name.last}${user.name.first}`, // 영어 이름 결합
                role: role,
                short: "외부 API에서 합류한 아기 사자입니다.",
                techs: techs,
                bio: `${user.location.city}에서 온 ${role} 개발/디자인 지망생입니다.`,
                email: user.email,
                phone: user.cell,
                web: `https://github.com/${user.login.username}`,
                word: "최선을 다하겠습니다!",
                image: user.picture.large
            };
        });
    }

    // =========================================
    // [7] 버튼 동작: 랜덤 추가 및 전체 새로고침
    // =========================================
    const handleAddRandom = async (count) => {
        const action = () => handleAddRandom(count);
        setUIState('loading');
        try {
            const newLions = await fetchRandomUsers(count);
            lionsData = [...lionsData, ...newLions];
            renderAll();
            setUIState('success');
        } catch (error) {
            setUIState('error', action);
        }
    };

    btnAddRandom1.addEventListener('click', () => handleAddRandom(1));
    btnAddRandom5.addEventListener('click', () => handleAddRandom(5));

    btnRefreshAll.addEventListener('click', async () => {
        const action = () => btnRefreshAll.click();
        setUIState('loading');
        try {
            // [7-2] '내 카드' 보존 로직 및 현재 개수 유지
            const currentTotalCount = lionsData.length;
            const myCard = lionsData.find(lion => lion.isMyCard);
            const neededCount = myCard ? currentTotalCount - 1 : currentTotalCount;

            let newLions = [];
            if (neededCount > 0) {
                newLions = await fetchRandomUsers(neededCount);
            }

            lionsData = myCard ? [myCard, ...newLions] : newLions;
            
            // 내 카드를 가장 예전 데이터로 취급하여 최신순 정렬 시 뒤로가게 함
            if(myCard) myCard.createdAt = 0; 

            renderAll();
            setUIState('success');
        } catch (error) {
            setUIState('error', action);
        }
    });

    // =========================================
    // [9] 폼 보조 기능 (랜덤 값 채우기)
    // =========================================
    btnFillRandom.addEventListener('click', async () => {
        const action = () => btnFillRandom.click();
        setUIState('loading');
        try {
            const randomData = await fetchRandomUsers(1);
            const data = randomData[0];

            document.getElementById('input-name').value = data.name;
            document.getElementById('input-role').value = data.role;
            document.getElementById('input-tech').value = data.techs.join(', ');
            document.getElementById('input-short').value = data.short;
            document.getElementById('input-bio').value = data.bio;
            document.getElementById('input-email').value = data.email;
            document.getElementById('input-phone').value = data.phone;
            document.getElementById('input-web').value = data.web;
            document.getElementById('input-word').value = data.word;

            // 에러 메시지 감추기
            hideAllErrors();
            setUIState('success');
        } catch (error) {
            setUIState('error', action);
        }
    });

    // =========================================
    // 이벤트 리스너 연결 (필터, 정렬, 검색, 폼, 삭제)
    // =========================================
    searchInput.addEventListener('input', renderAll);
    roleFilter.addEventListener('change', renderAll);
    sortType.addEventListener('change', renderAll);

    toggleFormBtn.addEventListener('click', () => formSection.classList.toggle('hidden'));
    cancelFormBtn.addEventListener('click', () => { addForm.reset(); hideAllErrors(); formSection.classList.add('hidden'); });

    addForm.addEventListener('submit', (e) => {
        e.preventDefault();
        hideAllErrors();

        let isValid = true;
        const newValues = {};
        const fields = ['name', 'role', 'tech', 'short', 'bio', 'email', 'phone', 'web', 'word'];

        fields.forEach(field => {
            const inputEl = document.getElementById(`input-${field}`);
            const errorEl = document.getElementById(`error-${field}`);
            const val = inputEl.value.trim();

            if (val === '') {
                errorEl.textContent = '필수 항목입니다.';
                errorEl.style.display = 'block';
                inputEl.classList.add('input-error');
                isValid = false;
            } else {
                newValues[field] = val;
            }
        });

        if (!isValid) return;

        const techArray = newValues.tech.split(',').map(t => t.trim()).filter(t => t !== "");

        const newLion = {
            id: Date.now(),
            createdAt: Date.now(),
            isMyCard: false,
            name: newValues.name, role: newValues.role, short: newValues.short,
            techs: techArray, bio: newValues.bio, email: newValues.email,
            phone: newValues.phone, web: newValues.web, word: newValues.word,
            image: `https://picsum.photos/400/300?random=${Date.now()}` // 폼 추가시 랜덤 사진
        };

        lionsData.push(newLion);
        renderAll(); // 추가 후 데이터 파이프라인을 거쳐 다시 그림
        
        addForm.reset();
        formSection.classList.add('hidden');
    });

    function hideAllErrors() {
        const errorMsgs = document.querySelectorAll('.error-msg');
        const inputs = addForm.querySelectorAll('input, select, textarea');
        errorMsgs.forEach(msg => msg.style.display = 'none');
        inputs.forEach(input => input.classList.remove('input-error'));
    }

    deleteLastBtn.addEventListener('click', () => {
        if (lionsData.length === 0) {
            alert('삭제할 명단이 없습니다.');
            return;
        }
        lionsData.pop(); // 원본 데이터에서 마지막 삭제
        renderAll();     // 화면 동기화
    });

    // =========================================
    // 화면에 카드 그리는 DOM 조작 유틸 함수
    // =========================================
    function createLionDOM(lion) {
        const firstTech = lion.techs.length > 0 ? lion.techs[0] : 'None';
        let roleClass = 'role-front';
        if(lion.role === 'Backend') roleClass = 'role-back';
        if(lion.role === 'Design') roleClass = 'role-design';

        const myCardClass = lion.isMyCard ? 'my-card' : '';

        // 요약 카드
        const summaryArticle = document.createElement('article');
        summaryArticle.className = `summary-card ${myCardClass}`;
        summaryArticle.innerHTML = `
            <figure class="card-image-box">
                <img src="${lion.image}" alt="프로필" class="card-image">
                <strong class="badge tech-badge">${firstTech}</strong>
            </figure>
            <section class="card-text-box">
                <h3 class="card-name">${lion.name}</h3>
                <p class="card-role ${roleClass}">${lion.role}</p>
                <p class="card-short">${lion.short}</p>
            </section>
        `;
        summaryGrid.appendChild(summaryArticle);

        // 상세 카드
        const techListHTML = lion.techs.map(t => `<li>${t}</li>`).join('');
        const detailArticle = document.createElement('article');
        detailArticle.className = 'detail-card';
        detailArticle.innerHTML = `
            <header class="detail-header">
                <h3 class="detail-name">${lion.name} <span class="detail-role ${roleClass}">${lion.role}</span></h3>
                <p class="detail-club">LION TRACK</p>
            </header>
            <section class="detail-body">
                <h4 class="detail-section-title">자기소개</h4><p class="detail-text">${lion.bio}</p>
                <h4 class="detail-section-title">연락처</h4>
                <ul class="detail-ul">
                    <li>Email: ${lion.email}</li><li>Phone: ${lion.phone}</li><li><a href="${lion.web}" target="_blank">${lion.web}</a></li>
                </ul>
                <h4 class="detail-section-title">관심 기술</h4><ul class="detail-ul">${techListHTML}</ul>
                <h4 class="detail-section-title">한 마디</h4><p class="detail-text">${lion.word}</p>
            </section>
        `;
        detailList.appendChild(detailArticle);
    }

    // 실행 시작
    initDataFromHTML();

});