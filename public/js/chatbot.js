/**
 * knowway AI Chatbot
 * ==================
 * Simple chatbot widget that sends messages to n8n AI Agent workflow.
 */

(function () {
    // Config - Uses backend proxy to keep webhook URL hidden
    const CONFIG = {
        apiEndpoint: '/api/ai-chat/n8n', // Backend proxy (webhook URL hidden in server .env)
        storageKey: 'knowway_chat_history'
    };

    // State
    let isOpen = false;
    let messages = loadMessages();
    let isTyping = false;
    let isDragging = false;
    let idleTimer = null;
    let isIdle = false;
    const IDLE_TIMEOUT = 5000; // 5 seconds

    let dragStartTime = 0;
    let dragStartPos = { x: 0, y: 0 };
    let currentPos = loadPosition();

    // DOM Elements
    let triggerBtn, panel, messagesContainer, input, sendBtn;

    // Icons
    const ICONS = {
        chat: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M19,1L17.74,3.75L15,5L17.74,6.26L19,9L20.25,6.26L23,5L20.25,3.75L19,1M9,4L6.5,9.5L1,12L6.5,14.5L9,20L11.5,14.5L17,12L11.5,9.5L9,4M19,15L17.74,17.74L15,19L17.74,20.26L19,23L20.25,20.26L23,19L20.25,17.74L19,15Z"></path></svg>`,
        close: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"></path></svg>`,
        send: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path></svg>`
    };

    // Initialize
    function init() {
        createDOM();
        applyPosition();
        attachEvents();
        renderMessages();
        resetIdleTimer();
        console.log('[Chatbot] Initialized - Snapping & Idle Mode');
    }

    // Create DOM Structure
    function createDOM() {
        // Trigger Button
        triggerBtn = document.createElement('button');
        triggerBtn.className = 'chatbot-trigger';
        triggerBtn.innerHTML = `
            <span class="icon-chat">${ICONS.chat}</span>
            <span class="icon-close">${ICONS.close}</span>
        `;
        document.body.appendChild(triggerBtn);

        // Chat Panel
        panel = document.createElement('div');
        panel.className = 'chatbot-panel';
        panel.innerHTML = `
            <div class="ai-chat-header">
                <div class="ai-chat-title">
                    <div class="ai-chat-avatar">AI</div>
                    <div class="ai-chat-info">
                        <h3>knowway AI</h3>
                        <span>Always here to help</span>
                    </div>
                </div>
                <button class="ai-chat-close-btn">${ICONS.close}</button>
            </div>
            <div class="ai-chat-messages" id="chatMessages"></div>
            <div class="ai-chat-input-area">
                <textarea class="ai-chat-input" placeholder="Ask anything about courses..." rows="1"></textarea>
                <button class="ai-chat-send-btn">${ICONS.send}</button>
            </div>
        `;
        document.body.appendChild(panel);

        // Cache elements
        messagesContainer = panel.querySelector('#chatMessages');
        input = panel.querySelector('.ai-chat-input');
        sendBtn = panel.querySelector('.ai-chat-send-btn');
    }

    // Attach Event Listeners
    function attachEvents() {
        // Click events
        triggerBtn.addEventListener('click', (e) => {
            if (isDragging) return;
            resetIdleTimer();
            toggleChat();
        });

        // Header close button
        panel.querySelector('.ai-chat-close-btn').addEventListener('click', toggleChat);

        // Drag events (Mouse)
        triggerBtn.addEventListener('mousedown', startDrag);
        window.addEventListener('mousemove', (e) => {
            resetIdleTimer();
            drag(e);
        });
        window.addEventListener('mouseup', stopDrag);

        // Drag events (Touch)
        triggerBtn.addEventListener('touchstart', (e) => {
            resetIdleTimer();
            startDrag(e.touches[0]);
        }, { passive: false });
        window.addEventListener('touchmove', (e) => {
            resetIdleTimer();
            drag(e.touches[0]);
        }, { passive: false });
        window.addEventListener('touchend', stopDrag);

        // Resize handling to keep icon in-bounds
        window.addEventListener('resize', () => {
            containPosition();
            applyPosition();
        });

        // Interaction resets idle
        window.addEventListener('scroll', resetIdleTimer, { passive: true });
        panel.addEventListener('click', resetIdleTimer);
        input.addEventListener('input', resetIdleTimer);

        sendBtn.addEventListener('click', sendMessage);
        input.addEventListener('keydown', (e) => {
            resetIdleTimer();
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        // Auto-resize textarea
        input.addEventListener('input', function () {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
            if (this.value === '') this.style.height = 'auto';
        });
    }

    // Dragging Logic
    function startDrag(e) {
        if (isOpen) return; // Disable dragging when open for simplicity
        isDragging = false;
        dragStartTime = Date.now();
        dragStartPos = {
            x: e.clientX - triggerBtn.offsetLeft,
            y: e.clientY - triggerBtn.offsetTop
        };
        triggerBtn.style.transition = 'none';
        panel.style.transition = 'none';
    }

    function drag(e) {
        if (dragStartTime === 0) return;

        const deltaX = Math.abs(e.clientX - (dragStartPos.x + triggerBtn.offsetLeft));
        const deltaY = Math.abs(e.clientY - (dragStartPos.y + triggerBtn.offsetTop));

        if (!isDragging && (deltaX > 5 || deltaY > 5)) {
            isDragging = true;
            triggerBtn.classList.add('dragging');
        }

        if (isDragging) {
            let x = e.clientX - dragStartPos.x;
            let y = e.clientY - dragStartPos.y;

            // Bounds check
            const pad = 20;
            x = Math.max(pad, Math.min(window.innerWidth - triggerBtn.offsetWidth - pad, x));
            y = Math.max(pad, Math.min(window.innerHeight - triggerBtn.offsetHeight - pad, y));

            currentPos = { x, y };
            applyPosition();
        }
    }

    function stopDrag() {
        if (dragStartTime === 0) return;

        if (isDragging) {
            snapToEdge();
            savePosition();
            setTimeout(() => {
                isDragging = false;
                triggerBtn.classList.remove('dragging');
            }, 50);
        } else {
            // It was a simple click attempt, reset transition immediately
            triggerBtn.style.transition = '';
            panel.style.transition = '';
        }

        dragStartTime = 0;
    }

    function snapToEdge() {
        const pad = 20;
        const width = window.innerWidth;
        const iconWidth = triggerBtn.offsetWidth;

        // Horizontal snapping
        if (currentPos.x < width / 2) {
            currentPos.x = pad;
        } else {
            currentPos.x = width - iconWidth - pad;
        }

        containPosition(); // Final safety check
        triggerBtn.style.transition = 'all 0.4s cubic-bezier(0.18, 0.89, 0.32, 1.28)';
        applyPosition();
    }

    function containPosition() {
        if (!currentPos) return;
        const pad = 20;
        const iconWidth = triggerBtn.offsetWidth || 45;
        const iconHeight = triggerBtn.offsetHeight || 45;

        currentPos.x = Math.max(pad, Math.min(window.innerWidth - iconWidth - pad, currentPos.x));
        currentPos.y = Math.max(pad, Math.min(window.innerHeight - iconHeight - pad, currentPos.y));
    }

    function applyPosition() {
        if (!currentPos) {
            // Default position if none saved
            currentPos = {
                x: window.innerWidth - (triggerBtn.offsetWidth || 45) - 30,
                y: window.innerHeight - (triggerBtn.offsetHeight || 45) - 30
            };
        }

        containPosition();

        triggerBtn.style.left = `${currentPos.x}px`;
        triggerBtn.style.top = `${currentPos.y}px`;
        triggerBtn.style.bottom = 'auto';
        triggerBtn.style.right = 'auto';

        // Panel positioning is now CSS-based (centered toast)
        // We only need to adjust it if we want it to avoid the icon, 
        // but for a centered toast, the CSS handles it better.
    }

    function loadPosition() {
        const saved = localStorage.getItem('knowway_chatbot_pos');
        return saved ? JSON.parse(saved) : null;
    }

    function savePosition() {
        localStorage.setItem('knowway_chatbot_pos', JSON.stringify(currentPos));
    }

    // Idle Timer Logic
    function resetIdleTimer() {
        if (isIdle) {
            isIdle = false;
            triggerBtn.classList.remove('idle');
        }

        clearTimeout(idleTimer);
        if (!isOpen) {
            idleTimer = setTimeout(setIdleState, IDLE_TIMEOUT);
        }
    }

    function setIdleState() {
        if (isOpen || isDragging) return;
        isIdle = true;
        triggerBtn.classList.add('idle');
    }

    // Toggle Chat Visibility
    function toggleChat() {
        isOpen = !isOpen;
        triggerBtn.classList.toggle('active', isOpen);
        panel.classList.toggle('active', isOpen);

        // Hide/Show trigger icon
        if (isOpen) {
            triggerBtn.style.display = 'none';
        } else {
            triggerBtn.style.display = 'flex';
        }

        if (isOpen) {
            clearTimeout(idleTimer);
            triggerBtn.classList.remove('idle');
            setTimeout(() => input.focus(), 300);
            scrollToBottom();
        } else {
            resetIdleTimer();
        }
    }

    // Load Messages from LocalStorage
    function loadMessages() {
        const saved = localStorage.getItem(CONFIG.storageKey);
        return saved ? JSON.parse(saved) : [{
            role: 'assistant',
            content: 'Hello! I\'m your knowway AI assistant. How can I help you with your learning journey today?'
        }];
    }

    // Save Messages to LocalStorage
    function saveMessages() {
        localStorage.setItem(CONFIG.storageKey, JSON.stringify(messages));
    }

    // Render Messages
    function renderMessages() {
        messagesContainer.innerHTML = messages.map(msg => `
            <div class="ai-message ${msg.role === 'user' ? 'user' : 'bot'}">
                ${msg.role === 'assistant' ? formatMarkdown(msg.content) : escapeHtml(msg.content)}
            </div>
        `).join('');
        scrollToBottom();
    }

    // Send Message Logic
    async function sendMessage() {
        const text = input.value.trim();
        if (!text || isTyping) return;

        // Add User Message
        addMessage('user', text);
        input.value = '';
        input.style.height = 'auto';

        // Show Typing Indicator
        isTyping = true;
        showTypingIndicator();

        try {
            // Call n8n AI Agent
            const response = await callN8N(text);
            removeTypingIndicator();
            addMessage('assistant', response);
        } catch (error) {
            console.error('[Chatbot] Error:', error);
            removeTypingIndicator();
            addMessage('assistant', 'Sorry, I encountered an error. Please try again later.');
        } finally {
            isTyping = false;
        }
    }

    function addMessage(role, content) {
        messages.push({ role, content });
        saveMessages();

        const msgDiv = document.createElement('div');
        msgDiv.className = `ai-message ${role === 'user' ? 'user' : 'bot'}`;
        msgDiv.innerHTML = role === 'assistant' ? formatMarkdown(content) : escapeHtml(content);
        messagesContainer.appendChild(msgDiv);

        scrollToBottom();
    }

    function showTypingIndicator() {
        const loader = document.createElement('div');
        loader.className = 'ai-message bot loading';
        loader.id = 'typingIndicator';
        loader.innerHTML = `
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        `;
        messagesContainer.appendChild(loader);
        scrollToBottom();
    }

    function removeTypingIndicator() {
        const loader = document.getElementById('typingIndicator');
        if (loader) loader.remove();
    }

    // Call backend proxy (which forwards to n8n)
    async function callN8N(userText) {
        const response = await fetch(CONFIG.apiEndpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                query: userText
            })
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }

        const data = await response.json();
        return data.content || 'Sorry, I could not generate a response.';
    }

    function scrollToBottom() {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Helpers
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function formatMarkdown(text) {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');
    }

    // Run
    init();

})();
