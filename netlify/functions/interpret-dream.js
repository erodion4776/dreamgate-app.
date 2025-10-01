exports.handler = async (event, context) => {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };


    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }


    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ 
                success: false,
                error: 'Method not allowed. Please use POST.' 
            })
        };
    }


    try {
        // Parse request body
        const { dream, focusType, category } = JSON.parse(event.body);
        console.log('Received dream for interpretation');


        // Validate input
        if (!dream || dream.trim().length < 10) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    success: false,
                    error: 'Dream description must be at least 10 characters long.' 
                })
            };
        }


        // Check for API key
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
        
        if (!GEMINI_API_KEY) {
            console.error('GEMINI_API_KEY is not set');
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ 
                    success: false,
                    error: 'API configuration error. Please contact support.'
                })
            };
        }


        // Call Gemini API using built-in fetch
        const geminiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5:generateContent?key=${GEMINI_API_KEY}';
        
        const prompt = `You are a compassionate Dream Guide and Interpreter. Your job is to help users understand the meaning of their dreams. You combine psychological, symbolic, cultural, and spiritual perspectives. Always sound empathetic, supportive, and clear.


Dream to interpret (with ${focusType || 'general'} focus):
"${dream}"


Dream Category: ${category || 'unknown'}


Please follow these steps:


1. Acknowledge & Comfort - Start with warmth and empathy. Example: "Thank you for sharing this powerful dream with me..."


2. Break Down Symbols - Identify key objects, actions, or events in the dream and explain their general symbolic meanings.


3. Combine into Interpretation - Explain what the dream means as a whole with these layers:
   - Psychological (mind/emotions)
   - Spiritual/cultural (faith, transformation, or guidance)
   - Personal (how it connects to the dreamer's life situation)


4. Offer Reflection/Guidance - Suggest a comforting reflection, prayer, or affirmation. Example: "This dream may be encouraging you to... A reflection you can carry: '...'"


5. Encourage Action - End with encouragement and suggest journaling or deeper exploration.


Provide your interpretation in this EXACT JSON format (no markdown, just pure JSON):
{
    "core_interpretation": "Start with acknowledgment and comfort, then provide the overall meaning",
    "key_symbols": "Identify and explain the key symbols and their meanings",
    "emotional_significance": "Explain the psychological and emotional layers",
    "guidance_actions": "Offer spiritual perspective and practical guidance with a reflection or affirmation",
    "personal_reflection": "Provide 3-4 thoughtful questions for self-reflection",
    "tags": ["symbol1", "theme1", "emotion1"]
}`;


        console.log('Calling Gemini API...');


        const geminiResponse = await fetch(geminiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.8,
                    maxOutputTokens: 1024
                }
            })
        });


        if (!geminiResponse.ok) {
            const errorText = await geminiResponse.text();
            console.error('Gemini API error:', geminiResponse.status, errorText);
            throw new Error('Failed to get interpretation from AI service');
        }


        const geminiData = await geminiResponse.json();
        console.log('Received Gemini response');
        
        // Extract the AI response text
        const aiText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!aiText) {
            throw new Error('No response text from AI service');
        }


        // Try to extract JSON from response
        let interpretation;
        try {
            // Remove any markdown code blocks
            const cleanedText = aiText
                .replace(/^```json\s*/i, '')
                .replace(/```\s*$/i, '')
                .trim();
            
            // Find JSON object in the response
            const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                interpretation = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('No JSON found in AI response');
            }
        } catch (parseError) {
            console.error('Failed to parse AI response as JSON:', parseError);
            
            // Fallback interpretation
            interpretation = {
                core_interpretation: "Thank you for sharing this meaningful dream with me. " + (aiText.length > 300 ? aiText.substring(0, 300) + "..." : aiText),
                key_symbols: "Your dream contains important symbols that reflect your inner state and current life journey.",
                emotional_significance: "This dream appears to be processing significant emotions and experiences in your life.",
                guidance_actions: "Take time to reflect on what resonates most with you. Consider keeping a dream journal to track patterns. A reflection for you: 'I trust the wisdom of my dreams to guide me toward understanding and peace.'",
                personal_reflection: "What emotions did you feel strongest in the dream? How might this relate to your current life situation? What message might your subconscious be offering you? What aspect of this dream feels most significant to you?",
                tags: ["insight", "reflection", "guidance", focusType || "general", category || "dream"].filter(Boolean).slice(0, 5)
            };
        }


        // Ensure all required fields exist
        const finalInterpretation = {
            core_interpretation: interpretation.core_interpretation || "Thank you for sharing this profound dream with me.",
            key_symbols: interpretation.key_symbols || "The symbols in your dream carry deep meaning.",
            emotional_significance: interpretation.emotional_significance || "Your dream reveals important emotional insights.",
            guidance_actions: interpretation.guidance_actions || "Reflect on what resonates with you. Trust your inner wisdom.",
            personal_reflection: interpretation.personal_reflection || "What aspect of this dream feels most significant to you?",
            tags: Array.isArray(interpretation.tags) ? interpretation.tags.slice(0, 5) : ["dream", "interpretation", "insight"]
        };


        // Return successful response
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                interpretation: finalInterpretation,
                metadata: {
                    dreamLength: dream.length,
                    focusType: focusType || 'general',
                    category: category || 'unknown',
                    timestamp: new Date().toISOString(),
                    model: 'gemini-pro'
                }
            })
        };


    } catch (error) {
        console.error('Function error:', error);
        console.error('Error stack:', error.stack);
        
        // User-friendly error messages
        let errorMessage = 'I apologize, but I encountered an issue interpreting your dream. Please try again.';
        let statusCode = 500;
        
        if (error.message?.includes('API key')) {
            errorMessage = 'The dream interpretation service is not properly configured. Please contact support.';
        } else if (error.message?.includes('quota') || error.message?.includes('limit')) {
            errorMessage = 'The dream interpretation service is temporarily busy. Please try again in a moment.';
            statusCode = 429;
        } else if (error.message?.includes('timeout')) {
            errorMessage = 'The interpretation is taking longer than expected. Please try again.';
            statusCode = 504;
        }
        
        return {
            statusCode,
            headers,
            body: JSON.stringify({
                success: false,
                error: errorMessage,
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            })
        };
    }
};