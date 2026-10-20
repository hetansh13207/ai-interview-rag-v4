const CLERK_PUBLISHABLE_KEY = 'YOUR_CLERK_PUBLISHABLE_KEY'; // Replace locally; never put a secret key here.

const HOME_URL = (() => {
    const segments = window.location.pathname.split('/').filter(Boolean);
    const frontendIndex = segments.lastIndexOf('frontend');

    if (frontendIndex >= 0) {
        return `${window.location.origin}/${segments.slice(0, frontendIndex + 1).join('/')}/`;
    }

    return `${window.location.origin}/`;
})();

async function initClerk() {
    if (!window.Clerk) {
        throw new Error('Clerk browser SDK is not available.');
    }

    await window.Clerk.load({
        signInForceRedirectUrl: HOME_URL,
        signInFallbackRedirectUrl: HOME_URL,
        signUpForceRedirectUrl: HOME_URL,
        signUpFallbackRedirectUrl: HOME_URL,
        afterSignOutUrl: HOME_URL
    });

    if (window.Clerk.user && !window.Clerk.session) {
        throw new Error('Clerk session is not ready.');
    }

    if (window.Clerk.session) {
        const token = await window.Clerk.session.getToken();
        if (!token) {
            throw new Error('Clerk session token is not available.');
        }
    }

    const currentPath = window.location.pathname;
    const isProtected = currentPath.includes('/interview/') ||
                        currentPath.includes('/chat/') ||
                        currentPath.includes('/voice/') ||
                        currentPath.includes('history.html');
    if (!window.Clerk.user && isProtected) {
        window.Clerk.openSignIn({
            forceRedirectUrl: HOME_URL,
            fallbackRedirectUrl: HOME_URL
        });
        return;
    }

    const authContainer = document.getElementById('auth-container');
    if (!authContainer) return;

    if (window.Clerk.user) {
        // Signed in
        const isNested = window.location.pathname.includes('/interview/') ||
                         window.location.pathname.includes('/chat/') ||
                         window.location.pathname.includes('/voice/');
        const historyUrl = isNested ? '../history.html' : 'history.html';

        authContainer.innerHTML = `<a href="${historyUrl}" class="feature-button" style="padding: 8px 16px; margin-right: 1rem; text-decoration: none; font-size: 0.9rem;">History</a>`;
        const userBtnDiv = document.createElement('div');
        authContainer.appendChild(userBtnDiv);
        window.Clerk.mountUserButton(userBtnDiv, { afterSignOutUrl: HOME_URL });
    } else {
        // Signed out
        authContainer.innerHTML = '<button id="signInBtn" class="feature-button" style="padding: 8px 16px;">Sign In</button>';
        document.getElementById('signInBtn').addEventListener('click', () => {
            window.Clerk.openSignIn({
                forceRedirectUrl: HOME_URL,
                fallbackRedirectUrl: HOME_URL
            });
        });

        // Intercept clicks on protected links for unauthenticated users
        document.querySelectorAll('a[href*="interview/"], a[href*="chat/"], a[href*="voice/"], a[href*="history.html"]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                    window.Clerk.openSignIn({
                        forceRedirectUrl: HOME_URL,
                        fallbackRedirectUrl: HOME_URL
                    });
            });
        });
    }
}

window.clerkReady = new Promise((resolve, reject) => {
    const initializeClerk = () => {
        initClerk().then(resolve, reject);
    };

    if (document.readyState === 'complete') {
        initializeClerk();
    } else {
        window.addEventListener('load', initializeClerk, { once: true });
    }
});

// Helper function to fetch with auth
async function fetchWithAuth(url, options = {}) {
    if (!window.Clerk || !window.Clerk.session) {
        throw new Error('Not authenticated');
    }
    const token = await window.Clerk.session.getToken();
    options.headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`
    };
    return fetch(url, options);
}
