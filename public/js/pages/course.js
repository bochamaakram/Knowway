/**
 * Course Page JavaScript
 */
let course = null;
let lessons = [];
let currentLesson = null;
let isPurchased = false;
let completedLessonIds = [];

document.addEventListener('DOMContentLoaded', async () => {
    updateNavbar();
    await loadCourse();
});

async function loadCourse() {
    const params = new URLSearchParams(window.location.search);
    const courseId = params.get('id');
    const lessonId = params.get('lesson');

    if (!courseId) { window.location.href = 'explore.html'; return; }

    try {
        const courseRes = await api.getCourse(courseId);
        if (!courseRes.success) { showToast('Course not found', 'error'); return; }
        course = courseRes.course;

        const lessonsRes = await api.getLessons(courseId);
        lessons = lessonsRes.success ? lessonsRes.lessons : [];

        if (isAuthenticated()) {
            try {
                const purchRes = await api.getMyPurchaseIds();
                if (purchRes.success) isPurchased = purchRes.purchaseIds.includes(parseInt(courseId));

                if (isPurchased) {
                    const progressRes = await api.getCourseProgress(courseId);
                    if (progressRes.success) {
                        completedLessonIds = progressRes.progress.completedLessonIds;
                    }
                }
            } catch (e) { }
        }

        renderSidebar();

        if (lessonId && lessons.length > 0 && isPurchased) {
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
    nav.innerHTML = `
        <li class="lesson-nav-item ${!currentLesson ? 'active' : ''}" onclick="showOverview()">
            <span class="lesson-nav-number">📖</span>
            <span class="lesson-nav-title">Course Overview</span>
        </li>
    ` + lessons.map((l, i) => {
        const isCompleted = completedLessonIds.includes(l.id);
        const isLocked = !isPurchased;
        return `
        <li class="lesson-nav-item ${currentLesson?.id === l.id ? 'active' : ''} ${isLocked ? 'locked' : ''} ${isCompleted ? 'completed' : ''}" 
            onclick="${isPurchased ? `navigateToLesson(${l.id})` : 'showEnrollPrompt()'}">
            <span class="lesson-nav-number">${isLocked ? '🔒' : isCompleted ? '✓' : i + 1}</span>
            <span class="lesson-nav-title">${escapeHtml(l.title)}</span>
        </li>`;
    }).join('');

    document.getElementById('mobileSelect').innerHTML = `
        <option value="">Course Overview</option>
    ` + lessons.map((l, i) => {
        const isCompleted = completedLessonIds.includes(l.id);
        return `<option value="${isPurchased ? l.id : ''}" ${currentLesson?.id === l.id ? 'selected' : ''} ${!isPurchased ? 'disabled' : ''}>${isCompleted ? '✓ ' : ''}${i + 1}. ${l.title}${!isPurchased ? ' 🔒' : ''}</option>`;
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

    const price = parseFloat(course.price);
    document.getElementById('coursePrice').textContent = price === 0 ? 'Free' : '$' + price.toFixed(2);

    document.getElementById('overviewContent').style.display = 'block';
    document.getElementById('lessonContent').style.display = 'none';
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
                    ${isCompleted ? '✓ Completed' : 'Mark as Complete'}
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
                btn.textContent = '✓ Completed';
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

function updateEnrollButton() {
    const btn = document.getElementById('enrollBtn');
    const mainBtn = document.getElementById('mainEnrollBtn');

    if (isPurchased) {
        const nextLesson = lessons.find(l => !completedLessonIds.includes(l.id)) || lessons[0];
        btn.textContent = lessons.length ? 'Continue Learning' : 'Enrolled ✓';
        btn.onclick = () => { if (nextLesson) navigateToLesson(nextLesson.id); };
        mainBtn.textContent = lessons.length ? 'Continue Learning' : 'Enrolled ✓';
        mainBtn.onclick = () => { if (nextLesson) navigateToLesson(nextLesson.id); };
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
        const res = await api.purchaseCourse(course.id);
        if (res.success) {
            isPurchased = true;
            updateEnrollButton();
            renderSidebar();
            showToast('Enrolled successfully!');
        } else {
            showToast(res.message || 'Failed to enroll', 'error');
        }
    } catch (e) { showToast('Error', 'error'); }
}

window.onpopstate = () => {
    const params = new URLSearchParams(window.location.search);
    const lessonId = params.get('lesson');
    if (lessonId && isPurchased) loadLesson(parseInt(lessonId));
    else renderOverview();
};
