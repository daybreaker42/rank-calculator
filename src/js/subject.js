import { db, auth, doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, addDoc, serverTimestamp, increment, arrayUnion, arrayRemove, orderBy, limit, onSnapshot } from './firebase-config.js';
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
let chart = null;

// UI Elements
const lockedOverlay = document.getElementById('locked-overlay');
const scoreModal = document.getElementById('score-input-modal');
const scoreForm = document.getElementById('score-form');
const commentsList = document.getElementById('comments-list');
const commentForm = document.getElementById('comment-form');
const commentInputArea = document.getElementById('comment-input-area');

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
    if (!currentUser) {
        lockedOverlay.classList.remove('hidden');
        return;
    }
    
    const voteId = `${currentUser.uid}_${subjectId}_${currentTab}`;
    const voteRef = doc(db, 'votes', voteId);
    const voteSnap = await getDoc(voteRef);

    if (voteSnap.exists()) {
        userVote = voteSnap.data();
        lockedOverlay.classList.add('hidden');
        document.getElementById('input-score').value = userVote.score;
        document.getElementById('input-min').value = userVote.minScore;
        document.getElementById('input-max').value = userVote.maxScore;
        
        // After verifying vote, load the protected stats
        await loadStatsData();
    } else {
        userVote = null;
        lockedOverlay.classList.remove('hidden');
        resetStatsUI();
    }
    
    // Always load comments (they have their own rules)
    loadComments();
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
document.getElementById('btn-close-score-modal').onclick = () => scoreModal.classList.add('hidden');

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

        // 2. Update stats in the sub-collection doc
        const statsRef = doc(db, 'subjects', subjectId, 'stats', currentTab);
        
        const statsUpdates = {
            sum: increment(isUpdate ? score - userVote.score : score),
            count: increment(isUpdate ? 0 : 1),
            [`histogram.${bucket}`]: increment(1)
        };
        
        if (isUpdate) {
            const oldBucket = Math.floor(userVote.score / 5) * 5;
            if (oldBucket !== bucket) {
                statsUpdates[`histogram.${oldBucket}`] = increment(-1);
            }
        }

        // Handle min/max (Note: Simple override for now, ideally needs aggregation)
        // Since we can't easily calculate true min/max with increment, 
        // we update if current score is more extreme.
        const statsSnap = await getDoc(statsRef);
        
        if (statsSnap.exists()) {
            const statsData = statsSnap.data();
            if (!statsData.min || minScore < statsData.min) statsUpdates.min = minScore;
            if (!statsData.max || maxScore > statsData.max) statsUpdates.max = maxScore;
            await updateDoc(statsRef, statsUpdates);
        } else {
            // Initialize if missing (e.g. due to previous subject creation bug)
            const initialStats = {
                count: 1,
                sum: score,
                min: minScore,
                max: maxScore,
                histogram: { [bucket]: 1 }
            };
            await setDoc(statsRef, initialStats);
        }
        
        // 3. Update main subject doc for popularity
        if (!isUpdate) {
            await updateDoc(doc(db, 'subjects', subjectId), {
                voteCount: increment(1)
            });
        }

        scoreModal.classList.add('hidden');
        await checkUserVote();
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
                // In real app, use a cloud function or proper security rules
                // For now, assume client can delete if owner
            }
        };
    }

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
