import { createClient } from '@supabase/supabase-js';


const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


export const dreamService = {
  async getDreams(userId: string) {
    const { data, error } = await supabase
      .from('dreams')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (error) throw error;
    return data;
  },


  async createDream(userId: string, title: string, content: string, interpretation: string) {
    const { data, error } = await supabase
      .from('dreams')
      .insert({
        user_id: userId,
        title,
        content,
        interpretation
      })
      .select()
      .maybeSingle();

    if (error) throw error;
    return data;
  },


  async deleteDream(dreamId: string) {
    const { error } = await supabase
      .from('dreams')
      .delete()
      .eq('id', dreamId);
    
    if (error) throw error;
  },


  async getMessages(dreamId: string) {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('dream_id', dreamId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data;
  },


  async addMessage(dreamId: string, sender: 'user' | 'ai', content: string) {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        dream_id: dreamId,
        sender,
        content
      })
      .select()
      .maybeSingle();

    if (error) throw error;
    return data;
  }
};


export const userService = {
  async getUserInterpretationData(userId: string) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);


    const { data: dreams } = await supabase
      .from('dreams')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', startOfMonth.toISOString());


    const dreamCount = dreams?.length || 0;


    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('status')
      .eq('user_id', userId)
      .maybeSingle();


    const isSubscribed = subscription?.status === 'active';


    return {
      is_subscribed: isSubscribed,
      remaining: isSubscribed ? 999 : Math.max(0, 3 - dreamCount),
      total_used: dreamCount
    };
  },


  async ensureUserRecords(userId: string, email: string) {
    const operations = [
      supabase.from('profiles').upsert({
        id: userId,
        email: email,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' }),
      
      supabase.from('user_limits').upsert({
        user_id: userId,
        monthly_free_limit: 3,
        interpretations_this_month: 0,
        last_reset_date: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' }),
      
      supabase.from('subscriptions').upsert({
        user_id: userId,
        status: 'free',
        plan_type: 'free_tier',
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' })
    ];


    await Promise.allSettled(operations);
  }
};