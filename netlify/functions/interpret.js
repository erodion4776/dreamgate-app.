const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Dream interpreter prompt
const DREAM_INTERPRETER_PROMPT = `You are a compassionate Dream Interpreter. Your role is to interpret dreams in a warm, symbolic, and emotionally insightful way. Do NOT give medical, legal or financial advice. Always be empathetic and personal.

When given a dream, follow this response structure:
1) Acknowledge: one warm sentence acknowledging their dream
2) Summary: 1-2 sentence recap of the dream
3) Symbol explanation: list 3 main symbols and their meanings
4) Emotional insight: 2-4 sentences connecting to feelings or life situations
5) Practical guidance: 1-2 concrete suggestions
6) Follow-up question: one open question to invite reflection

Keep responses under 300 words. Be warm, gentle, and encouraging.`;

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
    const token = event.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'No authorization token provided' })
      };
    }

    // Verify the user with Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid or expired token' })
      };
    }

    // Parse request body
    const { dreamText, dreamId, isContinuation } = JSON.parse(event.body || '{}');
    
    if (!dreamText) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Dream text is required' })
      };
    }

    // Check user's interpretation count for the month (only for new dreams)
    if (!isContinuation) {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      // Count dreams this month
      const { count: dreamCount, error: countError } = await supabase
        .from('dreams')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', startOfMonth.toISOString());

      if (countError) {
        console.error('Count error:', countError);
      }

      // Check subscription status
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('status')
        .eq('user_id', user.id)
        .single();

      const isSubscribed = subscription?.status === 'active';

      // Check if user has reached free limit (3 per month)
      if (!isSubscribed && dreamCount >= 3) {
        return {
          statusCode: 402,
          body: JSON.stringify({ 
            error: 'Free interpretation limit reached. Please subscribe for unlimited access.',
            limit_reached: true 
          })
        };
      }
    }

    // Generate interpretation using OpenAI
    let interpretation;
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: DREAM_INTERPRETER_PROMPT
          },
          {
            role: "user",
            content: dreamText
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      });

      interpretation = completion.choices[0]?.message?.content || 
                      "I couldn't generate an interpretation at this moment. Please try again.";
      
    } catch (openaiError) {
      console.error('OpenAI error:', openaiError);
      
      // Fallback interpretation if OpenAI fails
      interpretation = `Thank you for sharing your dream about "${dreamText.substring(0, 50)}..."

This dream appears to be rich with personal symbolism. Dreams often reflect our subconscious thoughts and emotions.

Key symbols in your dream might represent:
• Current life situations you're processing
• Emotions you're working through
• Desires or fears that need attention

I encourage you to reflect on what these symbols mean to you personally. Consider keeping a dream journal to track patterns over time.

What emotions did you feel most strongly in this dream?`;
    }

    // Save new dream or update existing
    let savedDreamId = dreamId;
    
    if (!isContinuation) {
      // Create new dream entry
      const title = dreamText.length > 50 
        ? dreamText.substring(0, 47) + '...' 
        : dreamText;

      const { data: dream, error: dreamError } = await supabase
        .from('dreams')
        .insert({
          user_id: user.id,
          title: title,
          content: dreamText,
          interpretation: interpretation
        })
        .select()
        .single();

      if (dreamError) {
        console.error('Dream save error:', dreamError);
      } else {
        savedDreamId = dream.id;
      }
    }

    // Save messages to the messages table
    if (savedDreamId) {
      // Save user message
      await supabase
        .from('messages')
        .insert({
          dream_id: savedDreamId,
          sender: 'user',
          content: dreamText
        });

      // Save AI response
      await supabase
        .from('messages')
        .insert({
          dream_id: savedDreamId,
          sender: 'ai',
          content: interpretation
        });
    }

    // Calculate remaining interpretations
    const { count: updatedCount } = await supabase
      .from('dreams')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('status')
      .eq('user_id', user.id)
      .single();

    const isSubscribed = subscription?.status === 'active';
    const remaining = isSubscribed ? 'unlimited' : Math.max(0, 3 - (updatedCount || 0));

    // Return the interpretation
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        reply: interpretation,
        dream_id: savedDreamId,
        interpretations_left: remaining,
        is_continuation: isContinuation
      })
    };

  } catch (error) {
    console.error('Handler error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'An unexpected error occurred. Please try again.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    };
  }
};