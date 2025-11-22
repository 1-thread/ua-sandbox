import { NextRequest, NextResponse } from 'next/server';
import { generateStoryConfig, generateGameConfig, generateImage } from '@/lib/openai';
import { generate3DModelFromImage } from '@/lib/meshy';
import { insertIpSession } from '@/lib/supabaseServer';
import { StoryConfig, GameConfig } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for Vercel Pro

function sanitizeGameConfig(config: any): GameConfig {
  // Clamp values to safe ranges
  return {
    ...config,
    character: {
      ...config.character,
      move_speed_units_per_sec: Math.max(2, Math.min(15, config.character?.move_speed_units_per_sec || 6)),
      turn_speed_deg_per_sec: Math.max(60, Math.min(360, config.character?.turn_speed_deg_per_sec || 180)),
    },
    objects: {
      ...config.objects,
      max_prizes: Math.max(3, Math.min(20, config.objects?.max_prizes || 10)),
      max_hazards: Math.max(1, Math.min(15, config.objects?.max_hazards || 6)),
    },
    session: {
      ...config.session,
      duration_sec: Math.max(30, Math.min(180, config.session?.duration_sec || 60)),
      target_score: Math.max(3, Math.min(50, config.session?.target_score || 12)),
      min_score: Math.max(-10, Math.min(0, config.session?.min_score || -5)),
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let idea = body.idea?.trim();

    // Use fallback if empty
    if (!idea) {
      idea = "A shy dragon who secretly runs a bakery on a floating island.";
    }

    console.log('Starting generation pipeline for idea:', idea);

    // Step 1: Generate story config
    console.log('Step 1: Generating story config...');
    const storyConfig: StoryConfig = await generateStoryConfig(idea);

    // Step 2: Generate comic panel images
    console.log('Step 2: Generating comic panel images...');
    const comicPanelPromises = storyConfig.panels.map(panel => 
      generateImage(panel.image_prompt)
    );
    const comicPanelUrls = await Promise.all(comicPanelPromises);

    // Step 3: Generate character reference image
    console.log('Step 3: Generating character reference image...');
    const characterRefUrl = await generateImage(storyConfig.character_ref_prompt);

    // Step 4: Generate 3D model from character reference
    console.log('Step 4: Generating 3D model...');
    const model3D = await generate3DModelFromImage(characterRefUrl);

    // Step 5: Generate game config
    console.log('Step 5: Generating game config...');
    const rawGameConfig = await generateGameConfig(idea, storyConfig);
    const gameConfig = sanitizeGameConfig(rawGameConfig);

    // Step 6: Insert session into Supabase
    console.log('Step 6: Saving session to database...');
    const sessionId = await insertIpSession({
      ip_idea: idea,
      story_title: storyConfig.title,
      story_logline: storyConfig.logline,
      story_config: storyConfig,
      game_config: gameConfig,
      comic_panel_urls: comicPanelUrls,
      model_3d_url: model3D.url,
      character_name: storyConfig.main_character.name,
    });

    console.log('Generation complete! Session ID:', sessionId);

    // Step 7: Return response
    return NextResponse.json({
      session_id: sessionId,
      storyConfig,
      gameConfig,
      comicPanels: comicPanelUrls.map(url => ({ url })),
      characterRefImage: { url: characterRefUrl },
      model3D,
    });
  } catch (error: any) {
    console.error('Generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate IP' },
      { status: 500 }
    );
  }
}

