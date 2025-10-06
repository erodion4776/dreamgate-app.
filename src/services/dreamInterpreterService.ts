interface InterpretResponse {
  reply: string;
  dream_id?: string;
  interpretations_left?: number | string;
}


export const dreamInterpreterService = {
  async interpretDream(
    dreamText: string,
    token: string,
    dreamId?: string,
    isContinuation?: boolean
  ): Promise<InterpretResponse> {
    const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
    const apiUrl = `${supabaseUrl}/functions/v1/interpret-dream`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        dreamText,
        dreamId,
        isContinuation
      })
    });


    if (!response.ok) {
      if (response.status === 402) {
        throw new Error('LIMIT_REACHED');
      }
      throw new Error('Failed to get interpretation');
    }


    return response.json();
  },


  formatAIResponse(text: string): string {
    let formatted = text;
    formatted = formatted.replace(/(\d)\.\s+([^:]+):/g, '<strong>$2:</strong>');
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    formatted = formatted.replace(/Symbol explanation:/gi, '🔮 <strong>Symbol Explanation:</strong>');
    formatted = formatted.replace(/Emotional insight:/gi, '💭 <strong>Emotional Insight:</strong>');
    formatted = formatted.replace(/Practical guidance:/gi, '✨ <strong>Practical Guidance:</strong>');
    formatted = formatted.replace(/Follow-up question:/gi, '💫 <strong>Follow-up Question:</strong>');
    formatted = formatted.replace(/^- /gm, '• ');
    formatted = formatted.replace(/^• /gm, '&nbsp;&nbsp;• ');
    formatted = formatted.replace(/\n\n/g, '<br><br>');
    formatted = formatted.replace(/\n/g, '<br>');
    return formatted;
  }
};