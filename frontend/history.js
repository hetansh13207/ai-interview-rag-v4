const HISTORY_API_URL = 'http://127.0.0.1:8000/history/';

const historyContainer = document.getElementById('history-container');
const historyMessage = document.getElementById('history-message');
const deleteDialog = document.getElementById('history-delete-dialog');
const deleteRole = document.getElementById('delete-history-role');
const deleteDate = document.getElementById('delete-history-date');
const deleteDuration = document.getElementById('delete-history-duration');
const deleteError = document.getElementById('history-delete-error');
const cancelDeleteButton = document.getElementById('cancel-history-delete');
const confirmDeleteButton = document.getElementById('confirm-history-delete');

let selectedHistory = null;
let selectedHistoryCard = null;
let selectedDeleteButton = null;

function formatHistoryDate(createdAt) {
    if (!createdAt) return 'Date unavailable';

    const utcTimestamp = /(?:Z|[+-]\d{2}:\d{2})$/i.test(createdAt)
        ? createdAt
        : `${createdAt}Z`;
    const date = new Date(utcTimestamp);

    return Number.isNaN(date.getTime())
        ? 'Date unavailable'
        : date.toLocaleString();
}

function getHistoryMetadata(item) {
    const evaluation = item.evaluation || {};
    const duration = evaluation.duration_minutes;
    const hasDuration =
        duration !== null &&
        duration !== undefined &&
        duration !== '' &&
        Number.isFinite(Number(duration));

    return {
        targetRole: evaluation.target_role || 'Not recorded',
        duration: hasDuration ? `${Number(duration)} mins` : null
    };
}

function openDeleteDialog(item, card, button, date) {
    selectedHistory = item;
    selectedHistoryCard = card;
    selectedDeleteButton = button;

    const metadata = getHistoryMetadata(item);
    deleteRole.textContent = metadata.targetRole;
    deleteDate.textContent = date;
    deleteDuration.textContent = metadata.duration || '';
    deleteDuration.closest('div').hidden = !metadata.duration;
    deleteError.textContent = '';
    confirmDeleteButton.disabled = false;
    confirmDeleteButton.textContent = 'Delete';
    deleteDialog.hidden = false;
    cancelDeleteButton.focus();
}

function closeDeleteDialog(restoreFocus = true) {
    deleteDialog.hidden = true;
    selectedHistory = null;
    selectedHistoryCard = null;
    const buttonToFocus = selectedDeleteButton;
    selectedDeleteButton = null;

    if (restoreFocus && buttonToFocus?.isConnected) {
        buttonToFocus.focus();
    }
}

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[character]);
}

function createHistoryCard(item) {
    const date = formatHistoryDate(item.created_at);
    const metadata = getHistoryMetadata(item);
    const card = document.createElement('div');
    card.className = 'history-item';

    const header = document.createElement('div');
    header.className = 'history-item-header';

    const title = document.createElement('h2');
    title.textContent = `Interview on ${date}`;

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'history-delete-button';
    deleteButton.textContent = 'Delete';
    deleteButton.setAttribute('aria-label', `Delete interview from ${date}`);
    deleteButton.addEventListener('click', event => {
        event.stopPropagation();
        openDeleteDialog(item, card, deleteButton, date);
    });

    header.append(title, deleteButton);

    const summary = document.createElement('div');
    summary.className = 'history-summary';
    summary.innerHTML = `
        <span>Target Role: ${escapeHtml(metadata.targetRole)}</span>
        ${metadata.duration ? `<span>Duration: ${escapeHtml(metadata.duration)}</span>` : ''}
    `;

    let messagesHtml = '<div class="history-qa"><h3>Q&A Transcript</h3>';
    (item.messages || []).forEach(msg => {
        const roleClass = msg.role === 'ai' || msg.role === 'bot' || msg.role === 'interviewer' || msg.role === 'assistant' ? 'role-bot' : 'role-user';
        const roleName = msg.role === 'ai' || msg.role === 'bot' || msg.role === 'interviewer' || msg.role === 'assistant' ? 'Interviewer' : 'You';
        messagesHtml += `<div><span class="${roleClass}">${roleName}:</span> <p>${msg.content || msg.text || msg.answer || msg.question}</p></div>`;
    });
    messagesHtml += '</div>';

    let evalHtml = '';
    if (item.evaluation) {
        const evaluationReport = { ...item.evaluation };
        delete evaluationReport.target_role;
        delete evaluationReport.duration_minutes;

        const evaluationText = JSON.stringify(evaluationReport, (key, value) => {
            if (typeof value === 'number' && Number.isFinite(value)) {
                return `__HISTORY_NUMBER_${value.toFixed(2)}__`;
            }
            return value;
        }, 2).replace(/"__HISTORY_NUMBER_(-?\d+\.\d{2})__"/g, '$1');

        evalHtml = `<div class="history-eval">
            <h3>Final Report</h3>
            <pre style="white-space: pre-wrap; font-family: inherit; background: var(--bg-body); padding: 1rem; border-radius: 8px;">${evaluationText}</pre>
        </div>`;
    }

    const details = document.createElement('div');
    details.className = 'history-details';
    details.innerHTML = `${messagesHtml}${evalHtml}`;

    card.append(header, summary, details);
    card.addEventListener('click', () => {
        details.classList.toggle('active');
    });

    return card;
}

async function loadHistory() {
    if (!window.Clerk || !window.Clerk.session) {
        historyContainer.innerHTML = '<p>Please sign in to view your interview history.</p>';
        return false;
    }

    try {
        const response = await fetchWithAuth(HISTORY_API_URL);
        if (!response.ok) throw new Error(`Failed to fetch history (HTTP ${response.status})`);

        const historyData = await response.json();

        if (historyData.length === 0) {
            historyContainer.innerHTML = '<p>No interview history found.</p>';
            return true;
        }

        historyContainer.replaceChildren(
            ...historyData.map(createHistoryCard)
        );
        return true;
    } catch (error) {
        console.error(error);
        historyContainer.innerHTML = '<p>Error loading history.</p>';
        return false;
    }
}

cancelDeleteButton.addEventListener('click', () => {
    closeDeleteDialog();
});

deleteDialog.addEventListener('click', event => {
    if (event.target === deleteDialog) {
        closeDeleteDialog();
    }
});

document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !deleteDialog.hidden) {
        closeDeleteDialog();
    }
});

confirmDeleteButton.addEventListener('click', async () => {
    if (!selectedHistory || confirmDeleteButton.disabled) return;

    confirmDeleteButton.disabled = true;
    confirmDeleteButton.textContent = 'Deleting...';
    deleteError.textContent = '';

    try {
        const response = await fetchWithAuth(
            `${HISTORY_API_URL}${encodeURIComponent(selectedHistory.id)}`,
            { method: 'DELETE' }
        );

        if (response.status === 404) {
            closeDeleteDialog(false);
            const refreshed = await loadHistory();
            if (refreshed) {
                historyMessage.textContent =
                    'This interview is no longer available. History has been refreshed.';
            }
            return;
        }

        if (!response.ok) {
            throw new Error(`Delete failed (HTTP ${response.status})`);
        }

        const deletedCard = selectedHistoryCard;
        closeDeleteDialog(false);
        deletedCard?.remove();

        if (!historyContainer.querySelector('.history-item')) {
            historyContainer.innerHTML = '<p>No interview history found.</p>';
        }
        historyMessage.textContent = '';
    } catch (error) {
        console.error(error);
        deleteError.textContent =
            error.message === 'Not authenticated' ||
            error.message.includes('(HTTP 401)')
                ? 'Your session is no longer available. Please sign in again and retry.'
                : 'Could not delete this interview. Please try again.';
        confirmDeleteButton.disabled = false;
        confirmDeleteButton.textContent = 'Delete';
    }
});

window.clerkReady
    .then(loadHistory)
    .catch(error => {
        console.error(error);
        historyContainer.innerHTML = '<p>Error loading history.</p>';
    });
