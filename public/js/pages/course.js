/**
 * Course Page JavaScript
 * Points-based system with quiz completion
 */
let course = null;
let lessons = [];
let currentLesson = null;
let isPurchased = false;
let completedLessonIds = [];
let quiz = null;
let quizPassed = false;
let selectedAnswers = {};

document.addEventListener('DOMContentLoaded', async () => {
    updateNavbar();
    await loadCourse();
});

async function loadCourse() {
    const params = new URLSearchParams(window.location.search);
    const courseId = params.get('id');
    const lessonId = params.get('lesson');
    const showQuiz = params.get('quiz') === 'true';

    if (!courseId) { window.location.href = 'explore.html'; return; }

    try {
        const courseRes = await api.getCourse(courseId);
        if (!courseRes.success) { showToast('Course not found', 'error'); return; }
        course = courseRes.course;

        const lessonsRes = await api.getLessons(courseId);
        lessons = lessonsRes.success ? lessonsRes.lessons : [];

        // Load quiz
        const quizRes = await api.getQuiz(courseId);
        if (quizRes.success) quiz = quizRes.quiz;

        if (isAuthenticated()) {
            try {
                const purchRes = await api.getMyPurchaseIds();
                if (purchRes.success) isPurchased = purchRes.purchaseIds.includes(parseInt(courseId));

                if (isPurchased) {
                    const progressRes = await api.getCourseProgress(courseId);
                    if (progressRes.success) {
                        completedLessonIds = progressRes.progress.completedLessonIds;
                    }

                    // Check if quiz already passed
                    const attemptsRes = await api.getQuizAttempts(courseId);
                    if (attemptsRes.success && attemptsRes.attempts.some(a => a.passed)) {
                        quizPassed = true;
                    }
                }
            } catch (e) { }
        }

        renderSidebar();

        if (showQuiz && quiz && isPurchased) {
            showQuizSection();
        } else if (lessonId && lessons.length > 0 && isPurchased) {
            await loadLesson(parseInt(lessonId));
        } else {
            renderOverview();
        }

        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('courseContent').style.display = 'block';
        document.title = course.title + ' | knowway';
    } catch (e) {
        console.error(e);
        showToast('Failed to load', 'error');
    }
}

function renderSidebar() {
    document.getElementById('sidebarTitle').textContent = course.title;

    const completedCount = completedLessonIds.length;
    const totalLessons = lessons.length;
    const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

    document.getElementById('sidebarMeta').innerHTML = isPurchased && totalLessons > 0
        ? `<div style="margin-bottom:8px">${completedCount}/${totalLessons} lessons completed</div>
           <div class="progress-bar" style="height:4px"><div class="progress-bar-fill" style="width:${progressPercent}%"></div></div>`
        : `${totalLessons} lessons`;

    const nav = document.getElementById('lessonsNav');
    let navHtml = `
        <li class="lesson-nav-item ${!currentLesson && !document.getElementById('quizContent')?.style.display?.includes('block') ? 'active' : ''}" onclick="showOverview()">
            <span class="lesson-nav-number icon-book"></span>
            <span class="lesson-nav-title">Course Overview</span>
        </li>
    `;

    navHtml += lessons.map((l, i) => {
        const isCompleted = completedLessonIds.includes(l.id);
        const isLocked = !isPurchased;
        return `
        <li class="lesson-nav-item ${currentLesson?.id === l.id ? 'active' : ''} ${isLocked ? 'locked' : ''} ${isCompleted ? 'completed' : ''}" 
            onclick="${isPurchased ? `navigateToLesson(${l.id})` : 'showEnrollPrompt()'}">
            <span class="lesson-nav-number">${isLocked ? '<span class="icon-lock"></span>' : isCompleted ? '<span class="icon-check"></span>' : i + 1}</span>
            <span class="lesson-nav-title">${escapeHtml(l.title)}</span>
        </li>`;
    }).join('');

    // Add quiz link if quiz exists
    if (quiz && quiz.questions && quiz.questions.length > 0) {
        const allLessonsComplete = completedLessonIds.length === lessons.length && lessons.length > 0;
        navHtml += `
        <li class="lesson-nav-item quiz-link ${!isPurchased ? 'locked' : ''}" 
            onclick="${isPurchased && allLessonsComplete ? 'showQuizSection()' : isPurchased ? 'showNeedAllLessons()' : 'showEnrollPrompt()'}">
            <span class="lesson-nav-number">${quizPassed ? '<span class="icon-check"></span>' : '<span class="icon-quiz"></span>'}</span>
            <span class="lesson-nav-title">Final Quiz ${quizPassed ? '(Passed)' : ''}</span>
        </li>`;
    }

    nav.innerHTML = navHtml;

    document.getElementById('mobileSelect').innerHTML = `
        <option value="">Course Overview</option>
    ` + lessons.map((l, i) => {
        const isCompleted = completedLessonIds.includes(l.id);
        return `<option value="${isPurchased ? l.id : ''}" ${currentLesson?.id === l.id ? 'selected' : ''} ${!isPurchased ? 'disabled' : ''}>${isCompleted ? '✓ ' : ''}${i + 1}. ${l.title}${!isPurchased ? ' [Locked]' : ''}</option>`;
    }).join('');

    updateEnrollButton();
}

function renderOverview() {
    document.getElementById('courseTitle').textContent = course.title;
    document.getElementById('courseSubtitle').textContent = course.short_description || '';
    document.getElementById('lessonCount').textContent = `${lessons.length} lessons · ${course.duration || 0} hours · ${course.level}`;
    document.getElementById('courseImage').src = course.image_url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800';
    document.getElementById('courseDescription').textContent = course.description || 'This course covers all the essential topics.';

    const learnItems = course.what_you_learn ? course.what_you_learn.split('\n').filter(x => x.trim()) : [];
    if (learnItems.length) {
        document.getElementById('whatYouLearn').innerHTML = learnItems.map(i => `<li>${escapeHtml(i)}</li>`).join('');
    } else {
        document.getElementById('learnSection').style.display = 'none';
    }

    // Show points instead of price
    const isFree = course.is_free;
    const pointCost = course.point_cost || 0;
    document.getElementById('coursePrice').innerHTML = isFree
        ? '<span style="color:var(--green)">Free</span><br><small style="font-size:14px;color:var(--text-secondary)">+500 points on completion</small>'
        : `<span style="color:var(--yellow)"> ${pointCost} points</span><br><small style="font-size:14px;color:var(--text-secondary)">+${Math.round(pointCost * 1.25)} points on completion</small>`;

    document.getElementById('overviewContent').style.display = 'block';
    document.getElementById('lessonContent').style.display = 'none';
    document.getElementById('quizContent').style.display = 'none';
    currentLesson = null;
    renderSidebar();
}

function showOverview() {
    window.history.pushState({}, '', `course.html?id=${course.id}`);
    renderOverview();
}

async function loadLesson(lessonId) {
    try {
        const res = await api.getLesson(lessonId);
        if (!res.success) { showToast('Lesson not found', 'error'); return; }

        currentLesson = res.lesson;

        document.getElementById('overviewContent').style.display = 'none';
        document.getElementById('lessonContent').style.display = 'block';
        document.getElementById('quizContent').style.display = 'none';

        const videoContainer = document.getElementById('lessonVideo');
        if (currentLesson.video_url) {
            const embedUrl = getVideoEmbedUrl(currentLesson.video_url);
            videoContainer.innerHTML = embedUrl
                ? `<iframe class="video-embed" src="${embedUrl}" frameborder="0" allowfullscreen></iframe>`
                : `<a href="${currentLesson.video_url}" target="_blank" class="btn btn-secondary" style="margin-bottom:var(--space-lg)">Watch Video ↗</a>`;
        } else {
            videoContainer.innerHTML = '';
        }

        const isCompleted = completedLessonIds.includes(currentLesson.id);
        document.getElementById('lessonBody').innerHTML = `
            <h1>${escapeHtml(currentLesson.title)}</h1>
            ${parseMarkdown(currentLesson.content || '')}
            <div class="lesson-complete-section">
                <button id="completeBtn" class="btn ${isCompleted ? 'btn-secondary' : 'btn-primary'}" onclick="toggleLessonComplete()">
                    ${isCompleted ? 'Completed' : 'Mark as Complete'}
                </button>
            </div>
        `;

        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');

        if (res.prevLesson) {
            prevBtn.classList.remove('disabled');
            prevBtn.onclick = (e) => { e.preventDefault(); navigateToLesson(res.prevLesson.id); };
            document.getElementById('prevTitle').textContent = res.prevLesson.title;
        } else {
            prevBtn.classList.add('disabled');
            document.getElementById('prevTitle').textContent = '-';
        }

        if (res.nextLesson) {
            nextBtn.classList.remove('disabled');
            nextBtn.onclick = (e) => { e.preventDefault(); navigateToLesson(res.nextLesson.id); };
            document.getElementById('nextTitle').textContent = res.nextLesson.title;
        } else {
            nextBtn.classList.add('disabled');
            document.getElementById('nextTitle').textContent = '-';
        }

        renderSidebar();
        window.scrollTo(0, 0);
    } catch (e) { showToast('Error loading lesson', 'error'); }
}

async function toggleLessonComplete() {
    if (!currentLesson) return;

    const isCompleted = completedLessonIds.includes(currentLesson.id);
    const btn = document.getElementById('completeBtn');
    btn.disabled = true;

    try {
        let res;
        if (isCompleted) {
            res = await api.markLessonIncomplete(currentLesson.id);
            if (res.success) {
                completedLessonIds = completedLessonIds.filter(id => id !== currentLesson.id);
                btn.textContent = 'Mark as Complete';
                btn.className = 'btn btn-primary';
            }
        } else {
            res = await api.markLessonComplete(currentLesson.id);
            if (res.success) {
                completedLessonIds.push(currentLesson.id);
                btn.textContent = 'Completed';
                btn.className = 'btn btn-secondary';
                showToast('Lesson completed!');
            }
        }
        renderSidebar();
    } catch (e) {
        showToast('Error updating progress', 'error');
    }

    btn.disabled = false;
}

function navigateToLesson(lessonId) {
    if (!lessonId) { showOverview(); return; }
    if (!isPurchased) {
        showEnrollPrompt();
        return;
    }
    window.history.pushState({}, '', `course.html?id=${course.id}&lesson=${lessonId}`);
    loadLesson(parseInt(lessonId));
}

function showEnrollPrompt() {
    showToast('Please enroll to access lessons', 'error');
    document.getElementById('enrollBtn').focus();
}

function showNeedAllLessons() {
    showToast('Complete all lessons before taking the quiz', 'error');
}

function updateEnrollButton() {
    const btn = document.getElementById('enrollBtn');
    const mainBtn = document.getElementById('mainEnrollBtn');
    const chatBtn = document.getElementById('chatBtn');
    const mobileBtn = document.getElementById('chatMobileBtn');

    // Show/hide chat buttons based on enrollment
    if (chatBtn) {
        chatBtn.style.display = isPurchased ? 'flex' : 'none';
    }
    if (mobileBtn) {
        mobileBtn.style.display = isPurchased ? '' : 'none';
    }

    // Start background message checking for notifications if enrolled
    if (isPurchased && !chatRefreshInterval) {
        // Initial load to get lastSeenMessageId
        loadChatMessages();
        // Check for new messages every 30 seconds (background)
        setInterval(() => {
            const panel = document.getElementById('chatPanel');
            if (!panel.classList.contains('open')) {
                loadChatMessages();
            }
        }, 30000);
    }

    if (isPurchased) {
        if (quizPassed) {
            btn.textContent = 'Course Completed';
            btn.disabled = true;
            btn.className = 'btn btn-success';
            mainBtn.textContent = 'Course Completed';
            mainBtn.className = 'btn btn-success btn-lg';
        } else {
            const nextLesson = lessons.find(l => !completedLessonIds.includes(l.id)) || lessons[0];
            btn.textContent = lessons.length ? 'Continue Learning' : 'Enrolled';
            btn.onclick = () => { if (nextLesson) navigateToLesson(nextLesson.id); };
            mainBtn.textContent = lessons.length ? 'Continue Learning' : 'Enrolled';
            mainBtn.onclick = () => { if (nextLesson) navigateToLesson(nextLesson.id); };
        }
    } else {
        const isFree = course.is_free;
        const cost = course.point_cost || 0;
        btn.textContent = isFree ? 'Enroll Free' : `Enroll for ${cost} points`;
        mainBtn.textContent = isFree ? 'Enroll for Free' : `Enroll for ${cost} points`;
    }
}

async function handleEnroll() {
    if (isPurchased) {
        const nextLesson = lessons.find(l => !completedLessonIds.includes(l.id)) || lessons[0];
        if (nextLesson) navigateToLesson(nextLesson.id);
        return;
    }
    if (!isAuthenticated()) {
        showToast('Please log in first', 'error');
        window.location.href = 'login.html';
        return;
    }

    try {
        const res = await api.purchaseWithPoints(course.id);
        if (res.success) {
            isPurchased = true;
            updateEnrollButton();
            renderSidebar();
            showToast(res.message || 'Enrolled successfully!');
            updateNavbar(); // Refresh points display
        } else {
            showToast(res.message || 'Failed to enroll', 'error');
        }
    } catch (e) { showToast('Error', 'error'); }
}

// Quiz Functions
function showQuizSection() {
    if (!quiz || !quiz.questions || quiz.questions.length === 0) {
        showToast('No quiz available', 'error');
        return;
    }

    document.getElementById('overviewContent').style.display = 'none';
    document.getElementById('lessonContent').style.display = 'none';
    document.getElementById('quizContent').style.display = 'block';
    currentLesson = null;

    document.getElementById('quizTitle').textContent = quiz.title || 'Final Quiz';
    document.getElementById('quizInfo').textContent = `Answer all ${quiz.questions.length} questions. You need ${quiz.passing_score}% to pass.`;

    selectedAnswers = {};

    const questionsHtml = quiz.questions.map((q, i) => `
        <div class="quiz-question" data-question-id="${q.id}">
            <div class="quiz-question-text">
                <span class="quiz-question-number">Question ${i + 1}:</span> ${escapeHtml(q.question)}
            </div>
            <div class="quiz-options">
                ${q.options.map((opt, j) => `
                    <label class="quiz-option" onclick="selectAnswer(${q.id}, ${j}, this)">
                        <input type="radio" name="q${q.id}" value="${j}">
                        <span class="quiz-option-radio"></span>
                        <span class="quiz-option-text">${escapeHtml(opt)}</span>
                    </label>
                `).join('')}
            </div>
        </div>
    `).join('');

    document.getElementById('quizQuestions').innerHTML = questionsHtml;
    document.getElementById('quizResult').classList.add('hidden');
    document.getElementById('submitQuizBtn').style.display = 'inline-flex';

    window.scrollTo(0, 0);
    renderSidebar();
}

function selectAnswer(questionId, optionIndex, element) {
    selectedAnswers[questionId] = optionIndex;

    // Update UI
    element.closest('.quiz-options').querySelectorAll('.quiz-option').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');
}

async function submitQuiz() {
    if (!quiz) return;

    // Check all questions answered
    const unanswered = quiz.questions.filter(q => selectedAnswers[q.id] === undefined);
    if (unanswered.length > 0) {
        showToast(`Please answer all questions (${unanswered.length} remaining)`, 'error');
        return;
    }

    const btn = document.getElementById('submitQuizBtn');
    btn.disabled = true;
    btn.textContent = 'Submitting...';

    try {
        const res = await api.submitQuiz(quiz.id, selectedAnswers);

        const resultEl = document.getElementById('quizResult');
        resultEl.classList.remove('hidden', 'passed', 'failed');
        resultEl.classList.add(res.passed ? 'passed' : 'failed');

        resultEl.innerHTML = `
            <div class="quiz-result-icon">${res.passed ? 'Congratulations!' : 'Keep trying!'}</div>
            <div class="quiz-result-score">${res.score}%</div>
            <div class="quiz-result-message">${res.message}</div>
            <div class="quiz-result-details">${res.correct} out of ${res.total} correct</div>
            ${res.passed ? `<button class="btn btn-primary btn-lg" onclick="claimReward()" style="margin-top:var(--space-lg)">Claim Your Reward</button>` :
                `<button class="btn btn-secondary" onclick="showQuizSection()" style="margin-top:var(--space-lg)">Try Again</button>`}
        `;

        if (res.passed) {
            quizPassed = true;
            document.getElementById('submitQuizBtn').style.display = 'none';
        }

        renderSidebar();
    } catch (e) {
        showToast('Error submitting quiz', 'error');
    }

    btn.disabled = false;
    btn.textContent = 'Submit Quiz';
}

async function claimReward() {
    try {
        const res = await api.completeCourse(course.id);
        if (res.success) {
            showToast(res.message || `You earned ${res.pointsEarned} points!`);
            updateNavbar(); // Refresh points
            updateEnrollButton();
        } else {
            showToast(res.message || 'Failed to claim reward', 'error');
        }
    } catch (e) {
        showToast('Error claiming reward', 'error');
    }
}

window.onpopstate = () => {
    const params = new URLSearchParams(window.location.search);
    const lessonId = params.get('lesson');
    const showQuiz = params.get('quiz') === 'true';

    if (showQuiz && quiz && isPurchased) showQuizSection();
    else if (lessonId && isPurchased) loadLesson(parseInt(lessonId));
    else renderOverview();
};

// ===== Chat Functionality =====
let chatMessages = [];
let chatRefreshInterval = null;
let lastSeenMessageId = 0;
let unreadCount = 0;

// Get lastSeenMessageId from localStorage per course
function getLastSeenMessageId() {
    const stored = localStorage.getItem(`chat_seen_${course?.id}`);
    return stored ? parseInt(stored) : 0;
}

// Save lastSeenMessageId to localStorage per course
function saveLastSeenMessageId(id) {
    if (course?.id) {
        localStorage.setItem(`chat_seen_${course.id}`, id.toString());
        lastSeenMessageId = id;
    }
}

function toggleChat() {
    const panel = document.getElementById('chatPanel');
    const btn = document.getElementById('chatBtn');
    const mobileBtn = document.getElementById('chatMobileBtn');

    if (panel.classList.contains('open')) {
        panel.classList.remove('open');
        if (btn) btn.classList.remove('active');
        if (chatRefreshInterval) {
            clearInterval(chatRefreshInterval);
            chatRefreshInterval = null;
        }
    } else {
        panel.classList.add('open');
        if (btn) btn.classList.add('active');
        // Clear notifications when opening
        clearNotificationBadge();
        loadChatMessages();
        // Auto-refresh every 10 seconds
        chatRefreshInterval = setInterval(loadChatMessages, 10000);
    }
}

function clearNotificationBadge() {
    unreadCount = 0;
    const badge = document.querySelector('#chatBtn .chat-notification-badge');
    const mobileBadge = document.getElementById('chatMobileBadge');
    if (badge) badge.style.display = 'none';
    if (mobileBadge) mobileBadge.style.display = 'none';
    // Save last seen message to localStorage
    if (chatMessages.length > 0) {
        const maxId = Math.max(...chatMessages.map(m => m.id));
        saveLastSeenMessageId(maxId);
    }
}

function updateNotificationBadge(newCount) {
    if (newCount <= 0) return;
    unreadCount = newCount;

    const btn = document.getElementById('chatBtn');
    const mobileBadge = document.getElementById('chatMobileBadge');

    // Add badge to sidebar button if it doesn't exist
    if (btn && !btn.querySelector('.chat-notification-badge')) {
        const badge = document.createElement('span');
        badge.className = 'chat-notification-badge';
        btn.appendChild(badge);
    } else if (btn) {
        const badge = btn.querySelector('.chat-notification-badge');
        if (badge) {
            badge.style.display = 'flex';
        }
    }

    // Show mobile badge (just a dot)
    if (mobileBadge) {
        mobileBadge.textContent = '';
        mobileBadge.style.display = 'flex';
    }
}

function showMobileChatButton() {
    const mobileBtn = document.getElementById('chatMobileBtn');
    if (mobileBtn && isPurchased) {
        mobileBtn.style.display = '';
    }
}

async function loadChatMessages() {
    if (!course || !isPurchased) return;

    // Load lastSeenMessageId from localStorage on first call
    if (lastSeenMessageId === 0) {
        lastSeenMessageId = getLastSeenMessageId();
    }

    try {
        const res = await api.getChatMessages(course.id);
        if (res.success) {
            chatMessages = res.messages;

            // Check for new messages (only if chat is closed)
            const panel = document.getElementById('chatPanel');
            if (!panel.classList.contains('open') && chatMessages.length > 0) {
                const newMessages = chatMessages.filter(m => m.id > lastSeenMessageId && !m.isOwn);
                if (newMessages.length > 0) {
                    updateNotificationBadge(newMessages.length);
                }
            } else if (panel.classList.contains('open') && chatMessages.length > 0) {
                // Save last seen when chat is open
                const maxId = Math.max(...chatMessages.map(m => m.id));
                saveLastSeenMessageId(maxId);
            }

            renderChatMessages();
        }
    } catch (e) {
        console.error('Error loading chat:', e);
    }
}

function renderChatMessages() {
    const container = document.getElementById('chatMessages');

    if (chatMessages.length === 0) {
        container.innerHTML = `
            <div class="chat-empty">
                <p>No messages yet. Start the conversation!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = chatMessages.map(m => {
        const time = new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return `
            <div class="chat-message ${m.isOwn ? 'own' : 'other'}">
                ${!m.isOwn ? `<div class="chat-message-header">
                    <span class="chat-message-username">${escapeHtml(m.username)}</span>
                    <span class="chat-message-time">${time}</span>
                </div>` : ''}
                <div class="chat-message-text">${escapeHtml(m.message)}</div>
                ${m.isOwn ? `<div class="chat-message-time" style="text-align:right;margin-top:2px">${time}</div>` : ''}
            </div>
        `;
    }).join('');

    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
}

async function sendMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();

    if (!message || !course) return;

    const btn = document.getElementById('chatSendBtn');
    btn.disabled = true;

    try {
        const res = await api.sendChatMessage(course.id, message);
        if (res.success) {
            chatMessages.push(res.message);
            renderChatMessages();
            input.value = '';
        } else {
            showToast(res.message || 'Failed to send message', 'error');
        }
    } catch (e) {
        showToast('Error sending message', 'error');
    }

    btn.disabled = false;
}

// Handle Enter key in chat input
document.addEventListener('DOMContentLoaded', () => {
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }
});
