const { GoogleGenerativeAI } = require('@google/generative-ai');


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


        console.log('Initializing Gemini AI...');
        
        // Initialize Gemini
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });


        // Create the prompt based on your specifications
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


        console.log('Generating interpretation...');


        // Generate content
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        console.log('Received Gemini response, length:', text.length);


        // Parse the response
        let interpretation;
        try {
            // Clean the response - remove any markdown formatting
            const cleanedText = text
                .replace(/^```json\s*/i, '')
                .replace(/```\s*$/i, '')
                .replace(/^```\s*/gm, '')
                .trim();
            
            // Find JSON object in the response
            const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                interpretation = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('No JSON found in response');
            }
        } catch (parseError) {
            console.error('Failed to parse Gemini response:', parseError);
            console.log('Raw response:', text.substring(0, 500));
            
            // Fallback interpretation
            interpretation = {
                core_interpretation: "Thank you for sharing this meaningful dream with me. " + text.substring(0, 500) + "...",
                key_symbols: "Your dream contains important symbols that reflect your inner state and current life journey.",
                emotional_significance: "This dream appears to be processing significant emotions and experiences in your life.",
                guidance_actions: "Take time to reflect on what resonates most with you. Consider keeping a dream journal to track patterns. A reflection for you: 'I trust the wisdom of my dreams to guide me.'",
                personal_reflection: "What emotions did you feel strongest in the dream? How might this relate to your current life situation? What message might your subconscious be offering you?",
                tags: ["insight", "reflection", "guidance", focusType || "general", category || "dream"].filter(Boolean)
            };
        }


        // Ensure all required fields exist and add empathetic touch if missing
        const finalInterpretation = {
            core_interpretation: interpretation.core_interpretation || 
                "Thank you for sharing this profound dream with me. Your subconscious is speaking to you in powerful ways.",
            key_symbols: interpretation.key_symbols || 
                "The symbols in your dream are rich with meaning and deserve careful consideration.",
            emotional_significance: interpretation.emotional_significance || 
                "The emotional landscape of your dream reveals important insights about your inner world.",
            guidance_actions: interpretation.guidance_actions || 
                "Take time to sit with this interpretation. A reflection for you: 'My dreams guide me toward greater understanding and peace.'",
            personal_reflection: interpretation.personal_reflection || 
                "Consider: What aspect of this dream feels most significant to you? How does it relate to your current life path?",
            tags: Array.isArray(interpretation.tags) ? interpretation.tags : ["dream", "interpretation", "insight"]
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