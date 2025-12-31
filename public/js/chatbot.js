/**
 * knowway AI Chatbot
 * ==================
 * Handles the floating chatbot widget, API communication, and message history.
 * Integrates with n8n workflow for dynamic system context.
 */

(function () {
    // Config
    const CONFIG = {
        apiEndpoint: '/api/ai-chat/completions', // Backend proxy (API key stored securely on server)
        siteUrl: window.location.origin,
        siteName: 'knowway',
        storageKey: 'knowway_chat_history',
        contextStorageKey: 'knowway_system_context',
        n8nWebhook: 'https://n8n.zackdev.io/webhook-test/get-bot-context',
        contextCacheDuration: 60 * 60 * 1000, // 1 hour cache
        defaultSystemPrompt: 'You are a helpful AI assistant for knowway, a learning platform. Help users navigate the app, find courses, and answer questions about features. Be concise, friendly, and helpful.'
    };

    // State
    let isOpen = false;
    let messages = loadMessages();
    let isTyping = false;
    let systemContext = null;

    // DOM Elements (will be created)
    let triggerBtn, panel, messagesContainer, input, sendBtn;

    // Icons
    const ICONS = {
        chat: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"></path></svg>`,
        close: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"></path></svg>`,
        send: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path></svg>`
    };

    // Initialize
    async function init() {
        createDOM();
        attachEvents();
        renderMessages();
        // Fetch system context from n8n (non-blocking)
        await loadSystemContext();
    }

    // Load system context from n8n webhook or cache
    async function loadSystemContext() {
        try {
            // Check cache first
            const cached = localStorage.getItem(CONFIG.contextStorageKey);
            if (cached) {
                const { context, timestamp } = JSON.parse(cached);
                const isExpired = Date.now() - timestamp > CONFIG.contextCacheDuration;
                if (!isExpired && context) {
                    systemContext = context;
                    console.log('[Chatbot] Loaded system context from cache');
                    return;
                }
            }

            // Fetch from n8n webhook
            console.log('[Chatbot] Fetching system context from n8n...');
            const response = await fetch(CONFIG.n8nWebhook, {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            });

            if (!response.ok) {
                throw new Error(`n8n webhook failed: ${response.status}`);
            }

            const data = await response.json();
            if (data.system_context) {
                systemContext = data.system_context;
                // Cache the context
                localStorage.setItem(CONFIG.contextStorageKey, JSON.stringify({
                    context: systemContext,
                    timestamp: Date.now(),
                    lastUpdated: data.last_updated
                }));
                console.log('[Chatbot] System context loaded from n8n');
            }
        } catch (error) {
            console.warn('[Chatbot] Could not load n8n context, using default:', error.message);
            systemContext = CONFIG.defaultSystemPrompt;
        }
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
        // Toggle Chat
        triggerBtn.addEventListener('click', toggleChat);

        // Send Message
        sendBtn.addEventListener('click', sendMessage);
        input.addEventListener('keydown', (e) => {
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

    // Toggle Chat Visibility
    function toggleChat() {
        isOpen = !isOpen;
        triggerBtn.classList.toggle('active', isOpen);
        panel.classList.toggle('active', isOpen);

        if (isOpen) {
            setTimeout(() => input.focus(), 300);
            scrollToBottom();
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

        // 1. Add User Message
        addMessage('user', text);
        input.value = '';
        input.style.height = 'auto';

        // 2. Show Typing Indicator
        isTyping = true;
        showTypingIndicator();

        try {
            // 3. Call API
            const response = await fetchObject(text);

            // 4. Remove Typing Indicator & Add Bot Response
            removeTypingIndicator();
            addMessage('assistant', response);
        } catch (error) {
            console.error('Chat API Error:', error);
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

    // Connect to Backend AI Proxy
    async function fetchObject(userText) {
        // Prepare context from last few messages
        const recentMessages = messages.slice(-6).map(m => ({
            role: m.role,
            content: m.content
        }));

        // Use dynamic system context from n8n or fallback
        const systemPrompt = systemContext || CONFIG.defaultSystemPrompt;

        // Call backend proxy (API key is secure on server)
        const response = await fetch(CONFIG.apiEndpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                messages: [
                    {
                        "role": "system",
                        "content": systemPrompt
                    },
                    ...recentMessages
                ]
            })
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }

        const data = await response.json();
        return data.content;
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
        // Simple markdown formatter
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');
    }

    // Run
    init();

})();
