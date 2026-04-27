import { db, auth, query, where, collection, getDocs, addDoc, setDoc, deleteDoc, orderBy, limit, serverTimestamp, doc, getDoc } from './firebase-config.js';
import { observeAuthState } from './auth.js';

const searchInput = document.getElementById('subject-search');
const searchResults = document.getElementById('search-results');
const popularList = document.getElementById('popular-subjects');
const favoritesSection = document.getElementById('favorites-section');
const favoritesList = document.getElementById('favorites-list');
const addSubjectModal = document.getElementById('add-subject-modal');
const addSubjectForm = document.getElementById('add-subject-form');

let allSubjects = [];
let currentUser = null;

// Initialize
observeAuthState((user) => {
    currentUser = user;
    loadPopularSubjects();
    if (user) {
        loadFavorites();
    } else {
        favoritesSection.classList.add('hidden');
    }
});

const loadPopularSubjects = async () => {
    try {
        const q = query(collection(db, 'subjects'), orderBy('voteCount', 'desc'), limit(6));
        const querySnapshot = await getDocs(q);
        
        popularList.innerHTML = '';
        if (querySnapshot.empty) {
            popularList.innerHTML = '<p class="col-span-full text-center text-[#6e6e73]">아직 등록된 과목이 없습니다.</p>';
        }

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            renderSubjectCard(popularList, { id: doc.id, ...data });
        });

        // Load all for search
        const allSnapshot = await getDocs(collection(db, 'subjects'));
        allSubjects = allSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (err) {
        console.error("Error loading subjects:", err);
    }
};

const renderSubjectCard = (container, subject) => {
    const card = document.createElement('a');
    card.href = `subject.html?id=${subject.id}`;
    card.className = 'group p-6 rounded-2xl bg-white dark:bg-[#1d1d1f] border border-[#d2d2d7] dark:border-[#424245] hover:shadow-xl transition-all flex flex-col justify-between h-40';
    card.innerHTML = `
        <div>
            <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-bold text-[#0071e3] bg-[#0071e3]/10 px-2 py-1 rounded-md uppercase tracking-wider">${subject.code}</span>
                <span class="text-xs text-[#6e6e73] dark:text-gray-400">${subject.year} ${subject.semester}</span>
            </div>
            <h3 class="text-lg font-bold group-hover:text-[#0071e3] transition-colors line-clamp-1">${subject.name}</h3>
            <p class="text-sm text-[#6e6e73] dark:text-gray-400">${subject.professor} 교수님</p>
        </div>
        <div class="flex items-center justify-between mt-4">
            <span class="text-xs text-[#6e6e73] dark:text-gray-400">참여자 ${subject.voteCount || 0}명</span>
            <svg class="w-5 h-5 text-[#d2d2d7] dark:text-[#424245] group-hover:text-[#0071e3] transition-all transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
        </div>
    `;
    container.appendChild(card);
};

// Search Logic
searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase().trim();
    if (!term) {
        searchResults.classList.add('hidden');
        return;
    }

    const filtered = allSubjects.filter(s => 
        s.code.toLowerCase().includes(term) || 
        s.name.toLowerCase().includes(term) || 
        s.professor.toLowerCase().includes(term)
    ).slice(0, 5);

    renderSearchResults(filtered, term);
});

searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const term = e.target.value.toLowerCase().trim();
        if (!term) return;
        window.location.href = `search.html?q=${encodeURIComponent(term)}`;
    }
});

const renderSearchResults = (results, term) => {
    searchResults.innerHTML = '';
    searchResults.classList.remove('hidden');

    if (results.length > 0) {
        results.forEach(s => {
            const item = document.createElement('a');
            item.href = `subject.html?id=${s.id}`;
            item.className = 'flex items-center justify-between p-4 hover:bg-[#f5f5f7] dark:hover:bg-[#2c2c2e] transition-colors border-b last:border-0 border-[#d2d2d7] dark:border-[#424245]';
            item.innerHTML = `
                <div class="flex flex-col">
                    <span class="text-xs font-bold text-[#0071e3] uppercase">${s.code}</span>
                    <span class="text-base font-semibold">${s.name}</span>
                    <span class="text-xs text-[#6e6e73]">${s.professor} 교수님</span>
                </div>
                <svg class="w-5 h-5 text-[#d2d2d7]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" stroke-width="2" /></svg>
            `;
            searchResults.appendChild(item);
        });
    }

    const addNew = document.createElement('button');
    addNew.className = 'w-full p-4 text-center text-sm font-medium text-[#0071e3] hover:bg-[#f5f5f7] dark:hover:bg-[#2c2c2e] transition-colors';
    addNew.innerText = `"${term}" 과목 직접 추가하기 +`;
    addNew.onclick = () => {
        if (!currentUser) {
            alert('로그인이 필요한 기능입니다.');
            return;
        }
        addSubjectModal.classList.remove('hidden');
        document.getElementById('new-subject-name').value = term;
    };
    searchResults.appendChild(addNew);
};

// Close modal
document.getElementById('btn-close-modal').onclick = () => addSubjectModal.classList.add('hidden');

// Add Subject
addSubjectForm.onsubmit = async (e) => {
    e.preventDefault();
    const code = document.getElementById('new-subject-code').value.toUpperCase();
    const name = document.getElementById('new-subject-name').value;
    const professor = document.getElementById('new-subject-prof').value;
    const year = parseInt(document.getElementById('new-subject-year').value);
    const semester = document.getElementById('new-subject-semester').value;

    try {
        // 1. Create main subject doc
        const subjectRef = await addDoc(collection(db, 'subjects'), {
            code, name, professor, year, semester,
            voteCount: 0,
            createdAt: serverTimestamp(),
            commentCounters: { midterm: 0, final: 0 }
        });

        // 2. Initialize stats sub-collection
        const initialStats = { count: 0, sum: 0, min: null, max: null, histogram: {} };
        await setDoc(doc(db, 'subjects', subjectRef.id, 'stats', 'midterm'), initialStats);
        await setDoc(doc(db, 'subjects', subjectRef.id, 'stats', 'final'), initialStats);

        window.location.href = `subject.html?id=${subjectRef.id}`;
    } catch (err) {
        console.error(err);
        alert('과목 추가에 실패했습니다.');
    }
};

const loadFavorites = async () => {
    if (!currentUser) return;
    
    try {
        const q = query(
            collection(db, 'favorites'),
            where('userId', '==', currentUser.uid),
            orderBy('timestamp', 'desc'),
            limit(20)
        );
        const querySnapshot = await getDocs(q);
        
        favoritesList.innerHTML = '';
        if (querySnapshot.empty) {
            favoritesSection.classList.add('hidden');
            return;
        }

        favoritesSection.classList.remove('hidden');
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            renderFavoriteCard(favoritesList, { id: data.subjectId, name: data.subjectName, code: data.subjectCode });
        });
    } catch (err) {
        console.error("Error loading favorites:", err);
    }
};

const renderFavoriteCard = (container, subject) => {
    const card = document.createElement('a');
    card.href = `subject.html?id=${subject.id}`;
    card.className = 'flex-shrink-0 w-48 p-4 rounded-2xl bg-white dark:bg-[#1d1d1f] border border-[#d2d2d7] dark:border-[#424245] hover:shadow-lg transition-all group';
    card.innerHTML = `
        <div class="flex flex-col h-full justify-between">
            <div>
                <span class="text-[10px] font-bold text-[#0071e3] uppercase tracking-wider">${subject.code}</span>
                <h3 class="text-sm font-bold group-hover:text-[#0071e3] transition-colors line-clamp-2 mt-1">${subject.name}</h3>
            </div>
            <div class="flex items-center justify-end mt-4">
                <svg class="w-4 h-4 text-[#d2d2d7] group-hover:text-[#0071e3] transition-all transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
            </div>
        </div>
    `;
    container.appendChild(card);
};

// Hide search results on click outside
document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
        searchResults.classList.add('hidden');
    }
});
