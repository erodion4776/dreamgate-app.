import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const DREAM_INTERPRETER_PROMPT = `You are a compassionate Dream Interpreter. Your role is to interpret dreams in a warm, symbolic, and emotionally insightful way. Do NOT give medical, legal or financial advice. Always be empathetic and personal.

When given a dream, follow this response structure:
1) Acknowledge: one warm sentence acknowledging their dream
2) Summary: 1-2 sentence recap of the dream
3) Symbol explanation: list 3 main symbols and their meanings
4) Emotional insight: 2-4 sentences connecting to feelings or life situations
5) Practical guidance: 1-2 concrete suggestions
6) Follow-up question: one open question to invite reflection

Keep responses under 300 words. Be warm, gentle, and encouraging.`;

Deno.serve(async (req: Request) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { dreamText, dreamId, isContinuation } = await req.json();

    if (!dreamText) {
      return new Response(
        JSON.stringify({ error: "Dream text is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!isContinuation) {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count: dreamCount, error: countError } = await supabaseClient
        .from("dreams")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", startOfMonth.toISOString());

      if (countError) {
        console.error("Count error:", countError);
      }

      const { data: subscription } = await supabaseClient
        .from("subscriptions")
        .select("status")
        .eq("user_id", user.id)
        .maybeSingle();

      const isSubscribed = subscription?.status === "active";

      if (!isSubscribed && (dreamCount ?? 0) >= 3) {
        return new Response(
          JSON.stringify({
            error: "Free interpretation limit reached. Please subscribe for unlimited access.",
            limit_reached: true,
          }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    let interpretation: string;

    if (geminiApiKey) {
      try {
        const geminiResponse = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=" + geminiApiKey,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: DREAM_INTERPRETER_PROMPT + "\n\nUser's dream: " + dreamText,
                    },
                  ],
                },
              ],
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 500,
              },
            }),
          }
        );

        if (!geminiResponse.ok) {
          const errorText = await geminiResponse.text();
          console.error("Gemini API error:", errorText);
          throw new Error("Gemini API error");
        }

        const geminiData = await geminiResponse.json();
        interpretation = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ||
          "I couldn't generate an interpretation at this moment. Please try again.";
      } catch (geminiError) {
        console.error("Gemini error:", geminiError);
        interpretation = `Thank you for sharing your dream about "${dreamText.substring(0, 50)}..."

This dream appears to be rich with personal symbolism. Dreams often reflect our subconscious thoughts and emotions.

Key symbols in your dream might represent:
• Current life situations you're processing
• Emotions you're working through
• Desires or fears that need attention

I encourage you to reflect on what these symbols mean to you personally. Consider keeping a dream journal to track patterns over time.

What emotions did you feel most strongly in this dream?`;
      }
    } else {
      interpretation = `Thank you for sharing your dream about "${dreamText.substring(0, 50)}..."

This dream appears to be rich with personal symbolism. Dreams often reflect our subconscious thoughts and emotions.

Key symbols in your dream might represent:
• Current life situations you're processing
• Emotions you're working through
• Desires or fears that need attention

I encourage you to reflect on what these symbols mean to you personally. Consider keeping a dream journal to track patterns over time.

What emotions did you feel most strongly in this dream?`;
    }

    let savedDreamId = dreamId;

    if (!isContinuation) {
      const title =
        dreamText.length > 50
          ? dreamText.substring(0, 47) + "..."
          : dreamText;

      const { data: dream, error: dreamError } = await supabaseClient
        .from("dreams")
        .insert({
          user_id: user.id,
          title: title,
          content: dreamText,
          interpretation: interpretation,
        })
        .select()
        .maybeSingle();

      if (dreamError) {
        console.error("Dream save error:", dreamError);
      } else if (dream) {
        savedDreamId = dream.id;
      }
    }

    if (savedDreamId) {
      await supabaseClient.from("messages").insert({
        dream_id: savedDreamId,
        sender: "user",
        content: dreamText,
      });

      await supabaseClient.from("messages").insert({
        dream_id: savedDreamId,
        sender: "ai",
        content: interpretation,
      });
    }

    const { count: updatedCount } = await supabaseClient
      .from("dreams")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    const { data: subscription } = await supabaseClient
      .from("subscriptions")
      .select("status")
      .eq("user_id", user.id)
      .maybeSingle();

    const isSubscribed = subscription?.status === "active";
    const remaining = isSubscribed
      ? "unlimited"
      : Math.max(0, 3 - (updatedCount || 0));

    return new Response(
      JSON.stringify({
        reply: interpretation,
        dream_id: savedDreamId,
        interpretations_left: remaining,
        is_continuation: isContinuation,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Handler error:", error);
    return new Response(
      JSON.stringify({
        error: "An unexpected error occurred. Please try again.",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
