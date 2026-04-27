import { db, auth, doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, getDocs, addDoc, serverTimestamp, increment, arrayUnion, arrayRemove, orderBy, limit, onSnapshot } from './firebase-config.js';
import { observeAuthState } from './auth.js';

const urlParams = new URLSearchParams(window.location.search);
const subjectId = urlParams.get('id');

if (!subjectId) {
    window.location.href = 'predictor.html';
}

let currentSubject = null;
let currentStats = null;
let currentUser = null;
let currentTab = 'midterm'; // midterm or final
let userVote = null;
let isFavorited = false;
let chart = null;

// UI Elements
const lockedOverlay = document.getElementById('locked-overlay');
const scoreModal = document.getElementById('score-input-modal');
const scoreForm = document.getElementById('score-form');
const commentsList = document.getElementById('comments-list');
const commentForm = document.getElementById('comment-form');
const commentInputArea = document.getElementById('comment-input-area');
const btnEditScore = document.getElementById('btn-edit-score');
const modalTitle = document.getElementById('modal-title');

// Initialize
observeAuthState(async (user) => {
    currentUser = user;
    if (user) {
        commentInputArea.classList.remove('hidden');
    } else {
        commentInputArea.classList.add('hidden');
    }
    await loadSubjectMetadata();
    await checkUserVote();
    if (user) {
        checkFavoriteStatus();
    }
});

const loadSubjectMetadata = async () => {
    const docRef = doc(db, 'subjects', subjectId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        currentSubject = docSnap.data();
        updateHeader();
    } else {
        alert('과목을 찾을 수 없습니다.');
        window.location.href = 'predictor.html';
    }
};

const checkUserVote = async () => {
    // Clear previous state for a smooth transition
    resetStatsUI();
    
    if (!currentUser) {
        lockedOverlay.classList.remove('hidden');
        return;
    }
    
    try {
        const voteId = `${currentUser.uid}_${subjectId}_${currentTab}`;
        const voteRef = doc(db, 'votes', voteId);
        const voteSnap = await getDoc(voteRef);

        if (voteSnap.exists()) {
            userVote = voteSnap.data();
            lockedOverlay.classList.add('hidden');
            document.getElementById('input-score').value = userVote.score;
            document.getElementById('input-min').value = userVote.minScore || '';
            document.getElementById('input-max').value = userVote.maxScore || '';
            btnEditScore.classList.remove('hidden');
            
            // After verifying vote, load the protected stats
            await loadStatsData();
        } else {
            userVote = null;
            lockedOverlay.classList.remove('hidden');
            btnEditScore.classList.add('hidden');
        }
    } catch (err) {
        console.error("Error checking user vote:", err);
        userVote = null;
        lockedOverlay.classList.remove('hidden');
        btnEditScore.classList.add('hidden');
    }
    
    // Always load comments (they have their own rules)
    loadComments();
};

const checkFavoriteStatus = async () => {
    if (!currentUser) return;
    const favId = `${currentUser.uid}_${subjectId}`;
    const favRef = doc(db, 'favorites', favId);
    const favSnap = await getDoc(favRef);
    isFavorited = favSnap.exists();
    updateFavoriteUI();
};

const updateFavoriteUI = () => {
    const icon = document.getElementById('favorite-icon');
    if (isFavorited) {
        icon.setAttribute('fill', 'currentColor');
        icon.classList.add('text-red-500');
        icon.classList.remove('text-[#d2d2d7]');
    } else {
        icon.setAttribute('fill', 'none');
        icon.classList.remove('text-red-500');
        icon.classList.add('text-[#d2d2d7]');
    }
};

document.getElementById('btn-favorite').onclick = async () => {
    if (!currentUser) {
        alert('로그인이 필요한 기능입니다.');
        return;
    }

    const favId = `${currentUser.uid}_${subjectId}`;
    const favRef = doc(db, 'favorites', favId);

    try {
        if (isFavorited) {
            await deleteDoc(favRef);
            isFavorited = false;
        } else {
            await setDoc(favRef, {
                userId: currentUser.uid,
                subjectId,
                subjectName: currentSubject.name,
                subjectCode: currentSubject.code,
                timestamp: serverTimestamp()
            });
            isFavorited = true;
        }
        updateFavoriteUI();
    } catch (err) {
        console.error(err);
        alert('즐겨찾기 설정에 실패했습니다.');
    }
};

const loadStatsData = async () => {
    try {
        const statsRef = doc(db, 'subjects', subjectId, 'stats', currentTab);
        const statsSnap = await getDoc(statsRef);
        
        if (statsSnap.exists()) {
            currentStats = statsSnap.data();
        } else {
            // Handle missing stats (e.g. due to subject creation bug)
            currentStats = { count: 0, sum: 0, min: null, max: null, histogram: {} };
        }
        updateStatsUI();
        renderChart();
    } catch (err) {
        console.error("Stats access denied or error:", err);
        lockedOverlay.classList.remove('hidden');
    }
};

const updateHeader = () => {
    document.getElementById('header-code').innerText = currentSubject.code;
    document.getElementById('header-term').innerText = `${currentSubject.year}년 ${currentSubject.semester}`;
    document.getElementById('header-name').innerText = currentSubject.name;
    document.getElementById('header-prof').innerText = `${currentSubject.professor} 교수님`;
};

const resetStatsUI = () => {
    document.getElementById('stat-mean').innerText = '--';
    document.getElementById('stat-rank').innerText = '--';
    document.getElementById('stat-min').innerText = '--';
    document.getElementById('stat-max').innerText = '--';
    if (chart) chart.destroy();
};

const updateStatsUI = () => {
    if (!currentStats) return;
    
    const mean = currentStats.count > 0 ? (currentStats.sum / currentStats.count).toFixed(2) : '--';
    document.getElementById('stat-mean').innerText = mean;
    document.getElementById('stat-min').innerText = currentStats.min ?? '--';
    document.getElementById('stat-max').innerText = currentStats.max ?? '--';
    
    if (userVote && currentStats.count > 0) {
        // Simple rank estimation based on histogram
        let higherCount = 0;
        const histogram = currentStats.histogram || {};
        const myScore = userVote.score;
        
        Object.keys(histogram).forEach(bucket => {
            if (parseInt(bucket) > myScore) {
                higherCount += histogram[bucket];
            }
        });
        
        const rank = higherCount + 1;
        document.getElementById('stat-rank').innerText = `${rank} / ${currentStats.count}`;
    }
};

const renderChart = () => {
    if (!currentStats) return;
    const histogram = currentStats.histogram || {};
    
    const labels = [];
    const data = [];
    for (let i = 0; i <= 100; i += 5) {
        labels.push(`${i}`);
        data.push(histogram[i] || 0);
    }

    const ctx = document.getElementById('distribution-chart').getContext('2d');
    if (chart) chart.destroy();

    const isDark = document.documentElement.classList.contains('dark');

    chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '학생 수',
                data: data,
                backgroundColor: '#0071e3',
                borderRadius: 4,
                hoverBackgroundColor: '#0077ED'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => `약 ${ctx.raw}명`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: isDark ? '#424245' : '#d2d2d7' },
                    ticks: { color: '#86868b', stepSize: 1 }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#86868b' }
                }
            }
        }
    });
};

// Tabs
document.getElementById('tab-midterm').onclick = () => switchTab('midterm');
document.getElementById('tab-final').onclick = () => switchTab('final');

const switchTab = (tab) => {
    currentTab = tab;
    document.getElementById('tab-midterm').className = tab === 'midterm' ? 'tab-active px-6 py-3 font-semibold' : 'tab-inactive px-6 py-3 font-semibold';
    document.getElementById('tab-final').className = tab === 'final' ? 'tab-active px-6 py-3 font-semibold' : 'tab-inactive px-6 py-3 font-semibold';
    checkUserVote();
};

// Modal Logic
document.getElementById('btn-unlock').onclick = () => {
    if (!currentUser) {
        alert('로그인이 필요한 기능입니다.');
        return;
    }
    scoreModal.classList.remove('hidden');
};

btnEditScore.onclick = () => {
    modalTitle.innerText = '점수 수정';
    scoreModal.classList.remove('hidden');
};

document.getElementById('btn-close-score-modal').onclick = () => {
    scoreModal.classList.add('hidden');
    modalTitle.innerText = '점수 입력'; // Reset for next time
};

// Submit Score
scoreForm.onsubmit = async (e) => {
    e.preventDefault();
    const score = parseFloat(document.getElementById('input-score').value);
    const minScore = parseFloat(document.getElementById('input-min').value) || 0;
    const maxScore = parseFloat(document.getElementById('input-max').value) || 100;

    const voteId = `${currentUser.uid}_${subjectId}_${currentTab}`;
    const voteRef = doc(db, 'votes', voteId);
    
    const bucket = Math.floor(score / 5) * 5;

    try {
        const isUpdate = !!userVote;
        
        // 1. Save/Update vote FIRST
        // This is critical because security rules only allow reading stats if a vote exists
        await setDoc(voteRef, {
            userId: currentUser.uid,
            subjectId,
            type: currentTab,
            score,
            minScore,
            maxScore,
            timestamp: serverTimestamp()
        });

        // 2. Stats update is now handled by Cloud Functions securely.
        scoreModal.classList.add('hidden');
        
        // Give the Cloud Function a moment to process the trigger before refreshing UI
        setTimeout(async () => {
            await checkUserVote();
        }, 1200);
    } catch (err) {
        console.error(err);
        alert('저장에 실패했습니다.');
    }
};

// Comments
let commentsUnsubscribe = null;
const loadComments = () => {
    if (commentsUnsubscribe) commentsUnsubscribe();
    
    const q = query(
        collection(db, 'comments'), 
        where('subjectId', '==', subjectId),
        where('boardId', '==', currentTab),
        orderBy('timestamp', 'desc'),
        limit(50)
    );

    commentsUnsubscribe = onSnapshot(q, (snapshot) => {
        commentsList.innerHTML = '';
        if (snapshot.empty) {
            commentsList.innerHTML = '<p class="text-center text-sm text-[#6e6e73] my-8">첫 댓글을 남겨보세요!</p>';
            return;
        }

        snapshot.forEach(doc => {
            renderComment(doc.id, doc.data());
        });
    });
};

const renderComment = (id, data) => {
    const div = document.createElement('div');
    div.className = 'p-4 rounded-2xl bg-[#f5f5f7] dark:bg-black border border-transparent dark:border-[#424245] animate-in slide-in-from-bottom-2 duration-300';
    
    const isOwner = currentUser && currentUser.uid === data.userId;
    
    div.innerHTML = `
        <div class="flex items-center justify-between mb-1">
            <span class="text-xs font-bold text-[#0071e3]">익명 ${data.anonymousId}</span>
            <div class="flex items-center gap-2">
                <span class="text-[10px] text-[#86868b]">${data.timestamp ? new Date(data.timestamp.toDate()).toLocaleString() : '방금 전'}</span>
                ${isOwner ? `<button class="text-[10px] text-red-500 hover:underline btn-delete-comment" data-id="${id}">삭제</button>` : ''}
            </div>
        </div>
        <p class="text-sm leading-relaxed">${data.text}</p>
        <div class="mt-2 flex items-center gap-4">
            <button class="text-xs flex items-center gap-1 text-[#6e6e73] hover:text-[#0071e3] transition-colors btn-like" data-id="${id}">
                <svg class="w-3.5 h-3.5" fill="${data.likedBy?.includes(currentUser?.uid) ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" stroke-width="2" /></svg>
                <span>${data.likes || 0}</span>
            </button>
        </div>
    `;

    // Delete listener
    const deleteBtn = div.querySelector('.btn-delete-comment');
    if (deleteBtn) {
        deleteBtn.onclick = async () => {
            if (confirm('댓글을 삭제하시겠습니까?')) {
                try {
                    await deleteDoc(doc(db, 'comments', id));
                } catch (err) {
                    alert('삭제 권한이 없거나 오류가 발생했습니다.');
                }
            }
        };
    }

    // Like listener
    const likeBtn = div.querySelector('.btn-like');
    likeBtn.onclick = async () => {
        if (!currentUser) {
            alert('로그인이 필요합니다.');
            return;
        }
        const commentRef = doc(db, 'comments', id);
        const hasLiked = data.likedBy?.includes(currentUser.uid);
        
        try {
            await updateDoc(commentRef, {
                likes: increment(hasLiked ? -1 : 1),
                likedBy: hasLiked ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid)
            });
        } catch (err) {
            console.error(err);
        }
    };

    commentsList.appendChild(div);
};

commentForm.onsubmit = async (e) => {
    e.preventDefault();
    const text = document.getElementById('comment-text').value.trim();
    if (!text || !currentUser) return;

    try {
        // Get or Create Anonymous ID for this user in this subject/board
        const anonId = await getOrCreateAnonymousId();
        
        await addDoc(collection(db, 'comments'), {
            subjectId,
            boardId: currentTab,
            userId: currentUser.uid,
            anonymousId: anonId,
            text,
            likes: 0,
            likedBy: [],
            timestamp: serverTimestamp()
        });

        document.getElementById('comment-text').value = '';
    } catch (err) {
        alert('댓글 작성에 실패했습니다.');
    }
};

const getOrCreateAnonymousId = async () => {
    // Check if user already has an ID assigned for this context
    const q = query(collection(db, 'comments'), 
                    where('subjectId', '==', subjectId), 
                    where('boardId', '==', currentTab), 
                    where('userId', '==', currentUser.uid), 
                    limit(1));
    const snap = await getDocs(q);
    
    if (!snap.empty) {
        return snap.docs[0].data().anonymousId;
    } else {
        // Increment global counter in subject doc
        const subjectRef = doc(db, 'subjects', subjectId);
        const counterField = `commentCounters.${currentTab}`;
        await updateDoc(subjectRef, { [counterField]: increment(1) });
        
        const freshSnap = await getDoc(subjectRef);
        return freshSnap.data().commentCounters[currentTab];
    }
};
