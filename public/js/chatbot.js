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

    // DOM Elements
    let triggerBtn, panel, messagesContainer, input, sendBtn;

    // Icons
    const ICONS = {
        chat: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"></path></svg>`,
        close: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"></path></svg>`,
        send: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path></svg>`
    };

    // Initialize
    function init() {
        createDOM();
        attachEvents();
        renderMessages();
        console.log('[Chatbot] Initialized - n8n only mode');
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
        triggerBtn.addEventListener('click', toggleChat);
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
