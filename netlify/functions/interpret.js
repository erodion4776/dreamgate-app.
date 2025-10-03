const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Gemini API Key
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// System prompt for Dream Interpreter
const SYSTEM_PROMPT = `You are a compassionate Dream Interpreter. Your role is to interpret dreams in a warm, symbolic, and emotionally insightful way. Do NOT give medical, legal or financial advice and avoid religious dogma. Always be empathetic and personal.

When given a dream, follow this response structure:
1) Acknowledge: one warm sentence (e.g., "That sounds powerful — thank you for sharing.").
2) Summary: 1–2 sentence recap of the dream.
3) Symbol explanation: list 3 main symbols (objects/people/actions) and short symbolic meanings.
4) Emotional insight: 2–4 sentences connecting the dream to feelings, stressors, or life situations.
5) Practical guidance: 1–2 concrete suggestions (journaling prompt, affirmation, small action).
6) Follow-up question: one open question to invite reflection (e.g., "How did you feel when...").

Tone: warm, gentle, human. Encourage reflection, not prescriptions.

If user asks about anything not related to dreams, reply:
"I'm here only to help you understand dreams. Please tell me a dream you'd like me to interpret."`;

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Get the authorization token
    const authHeader = event.headers.authorization;
    if (!authHeader) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'No authorization header' })
      };
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify the user with Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid token' })
      };
    }

    // Parse the request body
    const { dreamText } = JSON.parse(event.body);

    if (!dreamText) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Dream text is required' })
      };
    }

    // Check free usage limit (3 free interpretations)
    const { data: existingDreams, error: countError } = await supabase
      .from('dreams')
      .select('id', { count: 'exact', head: false })
      .eq('user_id', user.id);

    if (countError) {
      throw new Error('Error checking usage limit');
    }

    // Check if user has exceeded free limit
    const FREE_LIMIT = 3;
    if (existingDreams.length >= FREE_LIMIT) {
      // Check if user has an active subscription
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (!subscription) {
        return {
          statusCode: 402,
          body: JSON.stringify({ error: 'Free limit reached. Please subscribe.' })
        };
      }
    }

    // Call Google Gemini API for dream interpretation
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`;
    
    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [{
            text: SYSTEM_PROMPT
          }]
        },
        contents: [{
          parts: [{
            text: dreamText
          }]
        }],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 600,
          topP: 0.95,
          topK: 40
        }
      })
    });

    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.json();
      throw new Error(`Gemini API Error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const geminiData = await geminiResponse.json();
    
    // Extract the interpretation from Gemini's response
    const interpretation = geminiData.candidates[0].content.parts[0].text;

    // Create a title for the dream (first 50 characters)
    const title = dreamText.substring(0, 50) + (dreamText.length > 50 ? '...' : '');

    // Save the dream to database
    const { data: dream, error: dreamError } = await supabase
      .from('dreams')
      .insert({
        user_id: user.id,
        title: title,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (dreamError) {
      throw new Error('Error saving dream: ' + dreamError.message);
    }

    // Save user message
    const { error: userMsgError } = await supabase
      .from('messages')
      .insert({
        dream_id: dream.id,
        sender: 'user',
        content: dreamText,
        created_at: new Date().toISOString()
      });

    if (userMsgError) {
      throw new Error('Error saving user message: ' + userMsgError.message);
    }

    // Save AI response
    const { error: aiMsgError } = await supabase
      .from('messages')
      .insert({
        dream_id: dream.id,
        sender: 'ai',
        content: interpretation,
        created_at: new Date().toISOString()
      });

    if (aiMsgError) {
      throw new Error('Error saving AI message: ' + aiMsgError.message);
    }

    // Return the interpretation
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        reply: interpretation,
        dreamId: dream.id
      })
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: error.message || 'Internal server error' 
      })
    };
  }
};
