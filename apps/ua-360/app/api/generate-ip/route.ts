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
    
    console.log('Story config generated successfully:', JSON.stringify(storyConfig, null, 2));

    // Return immediately after story config generation
    // Frontend will then make separate API calls for images
    console.log('Returning story config immediately - images will be generated separately');
    
    // Return response with story config only
    return NextResponse.json({
      session_id: 'debug-mode-no-session',
      storyConfig,
      originalIdea: idea, // Save original idea for regeneration
      gameConfig: {
        game_id: 'debug',
        game_title: 'Debug Mode - Game Not Generated',
        short_instructions: 'Game config not generated in debug mode',
        camera: { type: 'angled', position: { x: 0, y: 20, z: 20 }, look_at: { x: 0, y: 0, z: 0 }, field_of_view: 40 },
        theme: { board_color: '#1e2f45', board_size: { width: 22, height: 22 }, background_color: '#00101e', light_intensity: 1.2, prize_color: '#ffee7a', hazard_color: '#ff5555', cursor_color: '#ffffff' },
        character: { display_name: storyConfig.main_character?.name || 'Character', move_speed_units_per_sec: 6, turn_speed_deg_per_sec: 180 },
        objects: { max_prizes: 10, max_hazards: 6, prize_value: 1, hazard_penalty: -1, spawn_regions: [{ x_min: -9, x_max: 9, z_min: -9, z_max: 9 }], respawn_on_collect: true, respawn_on_explode: true },
        session: { mode: 'timed' as const, duration_sec: 60, max_moves: 20, target_score: 12, min_score: -5 },
        copy: { score_label: 'Score', prize_name: 'prize', hazard_name: 'hazard', start_message: 'Debug mode', win_message: 'Win', lose_message: 'Lose', time_up_message: 'Time up' },
      } as GameConfig,
      comicPanels: [
        { url: 'placeholder' }, // First panel placeholder - will be loaded later
        { url: 'placeholder' }, // Second panel placeholder
        { url: 'placeholder' }, // Third panel placeholder
      ],
      characterRefImage: { url: 'placeholder' }, // Will be loaded later
      model3D: { url: 'placeholder', format: 'glb' as const },
    });

    // Step 2 (continued): Generate remaining comic panel images (DISABLED FOR DEBUG - code below will not execute)
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
    console.log('Character reference URL:', characterRefUrl);
    let model3D;
    try {
      model3D = await generate3DModelFromImage(characterRefUrl);
    } catch (meshyError: any) {
      console.error('Meshy API error details:', meshyError);
      // For now, throw a more descriptive error
      // In production, you might want to skip 3D model generation and continue with a placeholder
      throw new Error(`3D model generation failed: ${meshyError.message}. Please check your Meshy API key and endpoint configuration.`);
    }

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

