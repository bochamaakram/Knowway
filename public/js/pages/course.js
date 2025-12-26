/**
 * Course Page JavaScript
 */
let course = null;
let lessons = [];
let currentLesson = null;
let isPurchased = false;

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
            } catch (e) { }
        }

        renderSidebar();

        if (lessonId && lessons.length > 0) {
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
    document.getElementById('sidebarMeta').textContent = `${lessons.length} lessons`;

    const nav = document.getElementById('lessonsNav');
    nav.innerHTML = `
        <li class="lesson-nav-item ${!currentLesson ? 'active' : ''}" onclick="showOverview()">
            <span class="lesson-nav-number">📖</span>
            <span class="lesson-nav-title">Course Overview</span>
        </li>
    ` + lessons.map((l, i) => `
        <li class="lesson-nav-item ${currentLesson?.id === l.id ? 'active' : ''}" onclick="navigateToLesson(${l.id})">
            <span class="lesson-nav-number">${i + 1}</span>
            <span class="lesson-nav-title">${escapeHtml(l.title)}</span>
        </li>
    `).join('');

    document.getElementById('mobileSelect').innerHTML = `
        <option value="">Course Overview</option>
    ` + lessons.map((l, i) => `
        <option value="${l.id}" ${currentLesson?.id === l.id ? 'selected' : ''}>${i + 1}. ${l.title}</option>
    `).join('');

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

        document.getElementById('lessonBody').innerHTML = `
            <h1>${escapeHtml(currentLesson.title)}</h1>
            ${parseMarkdown(currentLesson.content || '')}
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

function navigateToLesson(lessonId) {
    if (!lessonId) { showOverview(); return; }
    window.history.pushState({}, '', `course.html?id=${course.id}&lesson=${lessonId}`);
    loadLesson(parseInt(lessonId));
}

function updateEnrollButton() {
    const btn = document.getElementById('enrollBtn');
    const mainBtn = document.getElementById('mainEnrollBtn');

    if (isPurchased) {
        btn.textContent = lessons.length ? 'Start Learning' : 'Enrolled ✓';
        btn.onclick = () => { if (lessons.length) navigateToLesson(lessons[0].id); };
        mainBtn.textContent = lessons.length ? 'Start Learning' : 'Enrolled ✓';
        mainBtn.onclick = () => { if (lessons.length) navigateToLesson(lessons[0].id); };
    }
}

async function handleEnroll() {
    if (isPurchased) {
        if (lessons.length) navigateToLesson(lessons[0].id);
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
            showToast('Enrolled successfully!');
        } else {
            showToast(res.message || 'Failed to enroll', 'error');
        }
    } catch (e) { showToast('Error', 'error'); }
}

window.onpopstate = () => {
    const params = new URLSearchParams(window.location.search);
    const lessonId = params.get('lesson');
    if (lessonId) loadLesson(parseInt(lessonId));
    else renderOverview();
};
