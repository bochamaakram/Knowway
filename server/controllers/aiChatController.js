/**
 * AI Chatbot Controller
 * ======================
 * Proxies requests to OpenRouter API to keep the API key secure on the backend.
 * The API key is stored in environment variables, not exposed to the frontend.
 * 
 * Endpoints:
 * - POST /api/ai-chat/completions - Sends messages to OpenRouter and returns response
 */

/**
 * Chat Completion
 * ---------------
 * Proxies chat completion requests to OpenRouter API.
 * Keeps API key secure on the server.
 * 
 * @route POST /api/ai-chat/completions
 * @body {Array} messages - Array of message objects {role, content}
 * @returns {object} response - OpenRouter API response
 */
exports.chatCompletion = async (req, res) => {
    try {
        const { messages } = req.body;

        // Validate messages array
        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({
                success: false,
                message: 'Messages array is required'
            });
        }

        // Get API key from environment
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) {
            console.error('OPENROUTER_API_KEY not configured');
            return res.status(500).json({
                success: false,
                message: 'AI service not configured'
            });
        }

        // Proxy request to OpenRouter
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': process.env.SITE_URL || 'https://knowway-eight.vercel.app',
                'X-Title': 'knowway',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'google/gemma-3-27b-it:free',
                messages: messages
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('OpenRouter API error:', response.status, errorText);
            throw new Error(`OpenRouter API error: ${response.status}`);
        }

        const data = await response.json();

        // Return the response content
        res.json({
            success: true,
            content: data.choices[0].message.content
        });

    } catch (err) {
        console.error('AI Chat error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to get AI response'
        });
    }
};
