import { createClient } from '@supabase/supabase-js';
import { IpSession } from './types';

if (!process.env.SUPABASE_URL) {
  throw new Error('SUPABASE_URL is not set');
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
}

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function insertIpSession(data: {
  ip_idea: string;
  story_title: string;
  story_logline: string;
  story_config: any;
  game_config: any;
  comic_panel_urls: string[];
  model_3d_url: string;
  character_name: string | null;
}): Promise<string> {
  const { data: session, error } = await supabase
    .from('ip_sessions')
    .insert({
      ip_idea: data.ip_idea,
      story_title: data.story_title,
      story_logline: data.story_logline,
      story_config: data.story_config,
      game_config: data.game_config,
      comic_panel_urls: data.comic_panel_urls,
      model_3d_url: data.model_3d_url,
      character_name: data.character_name,
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to insert session: ${error.message}`);
  }

  if (!session) {
    throw new Error('No session returned from insert');
  }

  return session.id;
}

