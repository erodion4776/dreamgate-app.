exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ success: false, error: 'Method not allowed.' }) };
    }

    try {
        const { dream, focusType, category } = JSON.parse(event.body);

        if (!dream || dream.trim().length < 10) {
            return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Dream description must be at least 10 characters long.' }) };
        }

        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
        
        if (!GEMINI_API_KEY) {
            console.error('GEMINI_API_KEY is not set');
            return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: 'API configuration error.' }) };
        }

        // --- FINAL CORRECTION BASED ON YOUR DOCUMENTATION ---
        // Using the v1beta endpoint and the correct 'gemini-1.5-flash' model name
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
        
        const prompt = `You are a compassionate Dream Guide. Interpret the following dream with a '${focusType}' focus, categorized as '${category}': "${dream}". Respond in this EXACT JSON format (no markdown): {"core_interpretation": "...", "key_symbols": "...", "emotional_significance": "...", "guidance_actions": "...", "personal_reflection": "...", "tags": ["tag1", "tag2"]}`;

        const geminiResponse = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        if (!geminiResponse.ok) {
            const errorText = await geminiResponse.text();
            throw new Error(`Gemini API Error: ${errorText}`);
        }

        const geminiData = await geminiResponse.json();
        const aiText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!aiText) { throw new Error('No response text from AI service'); }

        let interpretation;
        try {
            const cleanedText = aiText.match(/\{[\s\S]*\}/)[0];
            interpretation = JSON.parse(cleanedText);
        } catch (parseError) {
            console.error('Failed to parse AI response as JSON:', parseError, "---Original AI Text---", aiText);
            // Fallback if JSON is malformed
            interpretation = {
                core_interpretation: "The AI returned a response, but it was not formatted correctly. Here is the raw text: " + aiText,
                key_symbols: "N/A", emotional_significance: "N/A", guidance_actions: "N/A",
                personal_reflection: "N/A", tags: ["error"]
            };
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                interpretation: interpretation
            })
        };

    } catch (error) {
        console.error('Function error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ success: false, error: error.message })
        };
    }
};