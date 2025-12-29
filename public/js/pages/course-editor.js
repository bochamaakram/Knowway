/**
 * Course Editor Page JavaScript
 */
let myCourses = [];
let currentCourse = null;
let currentLessons = [];
let editingLesson = null;

document.addEventListener('DOMContentLoaded', async () => {
    updateNavbar();
    await checkAccess();
});

async function checkAccess() {
    if (!isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const roleRes = await api.getMyRole();
        if (!roleRes.success || (roleRes.role !== 'super_admin' && roleRes.role !== 'teacher')) {
            document.getElementById('loadingState').classList.add('hidden');
            document.getElementById('accessDenied').classList.remove('hidden');
            return;
        }
        document.getElementById('loadingState').classList.add('hidden');
        document.getElementById('mainContent').classList.remove('hidden');
        await loadMyCourses();
        setupForms();
    } catch (e) {
        document.getElementById('loadingState').classList.add('hidden');
        document.getElementById('accessDenied').classList.remove('hidden');
    }
}

async function loadMyCourses() {
    const res = await api.getCourses({ limit: 100 });
    if (res.success) {
        // Get user from API (no localStorage)
        const user = await getCurrentUser();
        if (user) {
            myCourses = res.courses.filter(c => c.user_id === user.id);
        } else {
            myCourses = [];
        }
        renderCoursesList();
    }
}

function renderCoursesList() {
    const container = document.getElementById('coursesList');
    if (!myCourses.length) {
        container.innerHTML = '<div style="padding:var(--space-lg);text-align:center;color:var(--text-muted)">No courses yet</div>';
        return;
    }
    container.innerHTML = myCourses.map(c => `
        <div class="course-list-item ${currentCourse?.id === c.id ? 'active' : ''}" onclick="selectCourse(${c.id})">
            <div class="item-title">${escapeHtml(c.title)}</div>
            <div class="item-meta">${formatCategory(c.category)} · ${c.level}</div>
        </div>
    `).join('');
}

async function selectCourse(id) {
    currentCourse = myCourses.find(c => c.id === id);
    renderCoursesList();
    hideAllPanels();
    document.getElementById('lessonsPanel').classList.remove('hidden');
    document.getElementById('currentCourseName').textContent = currentCourse.title;
    await loadLessons();
}

async function loadLessons() {
    const res = await api.getLessons(currentCourse.id);
    if (res.success) {
        currentLessons = res.lessons;
        renderLessonsList();
    }
}

function renderLessonsList() {
    const container = document.getElementById('lessonsList');
    if (!currentLessons.length) {
        container.innerHTML = '<div style="padding:var(--space-lg);text-align:center;color:var(--text-muted)">No lessons yet. Add your first lesson!</div>';
        return;
    }
    container.innerHTML = currentLessons.map((l, i) => `
        <div class="lesson-list-item" onclick="editLesson(${l.id})">
            <div class="item-title"><span class="drag-handle">⋮⋮</span> ${i + 1}. ${escapeHtml(l.title)}</div>
        </div>
    `).join('');
}

function setupForms() {
    document.getElementById('courseForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            title: document.getElementById('courseTitle').value,
            short_description: document.getElementById('courseShortDesc').value,
            description: document.getElementById('courseDesc').value,
            category: document.getElementById('courseCategory').value,
            level: document.getElementById('courseLevel').value,
            is_free: document.getElementById('courseFree').checked,
            point_cost: parseInt(document.getElementById('coursePointCost').value) || 0,
            points_reward: parseInt(document.getElementById('coursePointsReward').value) || 500,
            duration: parseInt(document.getElementById('courseDuration').value) || 0,
            image_url: document.getElementById('courseImage').value
        };
        const id = document.getElementById('courseId').value;
        try {
            const res = id ? await api.updateCourse(id, data) : await api.createCourse(data);
            if (res.success) {
                showToast(id ? 'Course updated!' : 'Course created!');
                await loadMyCourses();
                if (res.courseId) {
                    currentCourse = { id: res.courseId, ...data };
                    await selectCourse(res.courseId);
                } else if (id) {
                    await selectCourse(parseInt(id));
                }
            } else {
                showToast(res.message || 'Failed', 'error');
            }
        } catch (e) { showToast('Error', 'error'); }
    });

    document.getElementById('lessonForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            course_id: currentCourse.id,
            title: document.getElementById('lessonTitle').value,
            content: document.getElementById('lessonContent').value,
            video_url: document.getElementById('lessonVideo').value
        };
        const id = document.getElementById('lessonId').value;
        try {
            const res = id ? await api.updateLesson(id, data) : await api.createLesson(data);
            if (res.success) {
                showToast(id ? 'Lesson updated!' : 'Lesson created!');
                await loadLessons();
                hideAllPanels();
                document.getElementById('lessonsPanel').classList.remove('hidden');
            } else {
                showToast(res.message || 'Failed', 'error');
            }
        } catch (e) { showToast('Error', 'error'); }
    });
}

function hideAllPanels() {
    ['welcomePanel', 'courseFormPanel', 'lessonsPanel', 'lessonFormPanel'].forEach(id =>
        document.getElementById(id).classList.add('hidden')
    );
}

function showCourseForm(course = null) {
    hideAllPanels();
    document.getElementById('courseFormPanel').classList.remove('hidden');
    document.getElementById('courseFormTitle').textContent = course ? 'Edit Course' : 'New Course';
    document.getElementById('courseId').value = course?.id || '';
    document.getElementById('courseTitle').value = course?.title || '';
    document.getElementById('courseShortDesc').value = course?.short_description || '';
    document.getElementById('courseDesc').value = course?.description || '';
    document.getElementById('courseCategory').value = course?.category || 'dev';
    document.getElementById('courseLevel').value = course?.level || 'beginner';
    document.getElementById('courseFree').checked = course?.is_free ?? true;
    document.getElementById('coursePointCost').value = course?.point_cost || 0;
    document.getElementById('coursePointsReward').value = course?.points_reward || 500;
    document.getElementById('courseDuration').value = course?.duration || 0;
    document.getElementById('courseImage').value = course?.image_url || '';
    togglePointsFields();
}

function togglePointsFields() {
    const isFree = document.getElementById('courseFree').checked;
    document.getElementById('pointCostGroup').style.display = isFree ? 'none' : 'block';
}

function cancelCourseForm() {
    hideAllPanels();
    if (currentCourse) {
        document.getElementById('lessonsPanel').classList.remove('hidden');
    } else {
        document.getElementById('welcomePanel').classList.remove('hidden');
    }
}

function editCurrentCourse() {
    showCourseForm(currentCourse);
}

async function deleteCurrentCourse() {
    if (!confirm('Delete this course and all its lessons?')) return;
    try {
        const res = await api.deleteCourse(currentCourse.id);
        if (res.success) {
            showToast('Course deleted');
            currentCourse = null;
            await loadMyCourses();
            hideAllPanels();
            document.getElementById('welcomePanel').classList.remove('hidden');
        } else {
            showToast(res.message || 'Failed', 'error');
        }
    } catch (e) { showToast('Error', 'error'); }
}

function addNewLesson() {
    editingLesson = null;
    hideAllPanels();
    document.getElementById('lessonFormPanel').classList.remove('hidden');
    document.getElementById('lessonFormTitle').textContent = 'New Lesson';
    document.getElementById('lessonId').value = '';
    document.getElementById('lessonTitle').value = '';
    document.getElementById('lessonContent').value = '';
    document.getElementById('lessonVideo').value = '';
    document.getElementById('deleteLessonBtn').style.display = 'none';
}

async function editLesson(id) {
    try {
        const res = await api.getLesson(id);
        if (res.success) {
            editingLesson = res.lesson;
            hideAllPanels();
            document.getElementById('lessonFormPanel').classList.remove('hidden');
            document.getElementById('lessonFormTitle').textContent = 'Edit Lesson';
            document.getElementById('lessonId').value = editingLesson.id;
            document.getElementById('lessonTitle').value = editingLesson.title;
            document.getElementById('lessonContent').value = editingLesson.content || '';
            document.getElementById('lessonVideo').value = editingLesson.video_url || '';
            document.getElementById('deleteLessonBtn').style.display = 'block';
        }
    } catch (e) { showToast('Error loading lesson', 'error'); }
}

function cancelLessonForm() {
    hideAllPanels();
    document.getElementById('lessonsPanel').classList.remove('hidden');
}

async function deleteCurrentLesson() {
    if (!confirm('Delete this lesson?')) return;
    try {
        const res = await api.deleteLesson(editingLesson.id);
        if (res.success) {
            showToast('Lesson deleted');
            await loadLessons();
            hideAllPanels();
            document.getElementById('lessonsPanel').classList.remove('hidden');
        } else {
            showToast(res.message || 'Failed', 'error');
        }
    } catch (e) { showToast('Error', 'error'); }
}
