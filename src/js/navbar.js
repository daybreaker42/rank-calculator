import { loginWithGoogle, logout, observeAuthState } from './auth.js';

const renderNavbar = (user) => {
    const nav = document.createElement('nav');
    nav.className = 'fixed top-0 left-0 right-0 z-50 glass-nav border-b border-[#d2d2d7] dark:border-[#424245] h-16 flex items-center px-6 transition-all duration-300';
    
    const isMainPage = window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/');
    const isPredictorPage = window.location.pathname.includes('predictor.html') || window.location.pathname.includes('subject.html');

    const isDark = document.documentElement.classList.contains('dark');

    nav.innerHTML = `
        <div class="max-w-7xl w-full mx-auto flex items-center justify-between">
            <div class="flex items-center gap-6">
                <a href="index.html" class="text-xl font-bold tracking-tight text-[#1d1d1f] dark:text-white flex items-center gap-2">
                    <div class="w-8 h-8 bg-[#0071e3] rounded-lg flex items-center justify-center text-white shadow-lg shadow-[#0071e3]/20">
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                        </svg>
                    </div>
                    <span class="hidden sm:inline">Rank Calc</span>
                </a>
                
                <div class="flex items-center gap-1 sm:gap-4 bg-[#f5f5f7]/50 dark:bg-white/5 p-1 rounded-full border border-[#d2d2d7] dark:border-[#424245]">
                    <a href="index.html" class="px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all ${isMainPage ? 'bg-white dark:bg-[#1d1d1f] shadow-sm text-[#0071e3]' : 'text-[#6e6e73] dark:text-gray-400 hover:text-[#1d1d1f] dark:hover:text-white'}">계산기</a>
                    <a href="predictor.html" class="px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all ${isPredictorPage ? 'bg-white dark:bg-[#1d1d1f] shadow-sm text-[#0071e3]' : 'text-[#6e6e73] dark:text-gray-400 hover:text-[#1d1d1f] dark:hover:text-white'}">등수 예측</a>
                </div>
            </div>

            <div class="flex items-center gap-3 sm:gap-5">
                <!-- Theme Toggle -->
                <button id="nav-theme-toggle" class="p-2 rounded-full hover:bg-[#f5f5f7] dark:hover:bg-white/10 transition-colors text-[#6e6e73] dark:text-gray-400">
                    ${isDark ? `
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" /></svg>
                    ` : `
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" /></svg>
                    `}
                </button>

                <div id="auth-container" class="flex items-center border-l border-[#d2d2d7] dark:border-[#424245] pl-3 sm:pl-5">
                    ${user ? `
                        <div class="flex items-center gap-3">
                            <span class="text-xs font-bold text-[#6e6e73] dark:text-gray-400 hidden sm:inline">익명</span>
                            <img src="${user.photoURL || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'}" 
                                 id="profile-img" 
                                 class="w-8 h-8 rounded-full cursor-pointer border border-[#d2d2d7] dark:border-[#424245] hover:ring-2 hover:ring-[#0071e3] transition-all"
                                 title="로그아웃하려면 클릭">
                        </div>
                    ` : `
                        <button id="btn-login" class="bg-[#0071e3] text-white px-5 py-2 rounded-full text-sm font-bold hover:bg-[#0077ED] transition-all shadow-lg shadow-[#0071e3]/20">
                            로그인
                        </button>
                    `}
                </div>
            </div>
        </div>
    `;

    // Replace old navbar if it exists
    const oldNav = document.querySelector('nav');
    if (oldNav) {
        oldNav.replaceWith(nav);
    } else {
        document.body.prepend(nav);
        document.body.classList.add('pt-16');
    }

    // Theme Toggle Listener
    nav.querySelector('#nav-theme-toggle').onclick = () => {
        document.documentElement.classList.toggle('dark');
        localStorage.setItem('theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');
        renderNavbar(user); // Re-render to update icon
    };

    // Auth Listeners
    const loginBtn = nav.querySelector('#btn-login');
    if (loginBtn) {
        loginBtn.onclick = async () => {
            try { await loginWithGoogle(); } catch (err) { alert('로그인에 실패했습니다.'); }
        };
    }

    const profileImg = nav.querySelector('#profile-img');
    if (profileImg) {
        profileImg.onclick = async () => {
            if (confirm('로그아웃 하시겠습니까?')) { await logout(); }
        };
    }
};

// Check stored theme
if (localStorage.getItem('theme') === 'dark' || (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
}

// Initialize
observeAuthState((user) => {
    renderNavbar(user);
});

// Update all elements with class 'current-year'
const updateCurrentYear = () => {
    const currentYear = new Date().getFullYear();
    document.querySelectorAll('.current-year').forEach(el => {
        el.textContent = currentYear;
    });
};

// Run after DOM is fully loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateCurrentYear);
} else {
    updateCurrentYear();
}
