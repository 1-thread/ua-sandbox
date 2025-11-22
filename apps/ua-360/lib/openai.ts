import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not set');
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateStoryConfig(idea: string): Promise<any> {
  const prompt = `You are a creative IP generator. Given a short IP idea, generate a complete story configuration in JSON format.

IP Idea: "${idea}"

Generate a JSON object with the following exact structure (output ONLY valid JSON, no markdown, no code blocks):

{
  "title": "Story title (short, catchy)",
  "logline": "One sentence logline describing the story",
  "main_character": {
    "name": "Character name",
    "short_description": "Brief physical description",
    "style": "Art style description (e.g., 'cute, clean, colorful, minimal shading')",
    "colors": ["primary color", "secondary color"]
  },
  "panels": [
    {
      "caption": "Caption for panel 1",
      "image_prompt": "Detailed DALL·E prompt for panel 1 image, consistent character design"
    },
    {
      "caption": "Caption for panel 2",
      "image_prompt": "Detailed DALL·E prompt for panel 2 image, consistent with panel 1"
    },
    {
      "caption": "Caption for panel 3",
      "image_prompt": "Detailed DALL·E prompt for panel 3 image, consistent with previous panels"
    }
  ],
  "character_ref_prompt": "Front-facing full body shot of the main character, neutral pose, on plain white background, clean lines, minimal shading, consistent with character design"
}

Ensure all image prompts maintain visual consistency across panels and include the character's description and style.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini", // Cost-effective model
    messages: [
      {
        role: "system",
        content: "You are a JSON generator. Always output valid JSON only, no markdown formatting, no code blocks, no explanatory text. Output ONLY the raw JSON object, nothing else.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.8,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from OpenAI');
  }

  // Try to parse JSON directly, or extract from markdown code blocks if needed
  let jsonString = content.trim();
  
  // Remove markdown code blocks if present
  if (jsonString.startsWith('```')) {
    jsonString = jsonString.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '');
  }
  
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    throw new Error(`Failed to parse JSON: ${e}. Content: ${content.substring(0, 200)}`);
  }
}

export async function generateGameConfig(idea: string, storyConfig: any): Promise<any> {
  const prompt = `You are a game designer. Generate a game configuration JSON for a 3D board game called "3D Board Dash".

IP Idea: "${idea}"
Story Title: "${storyConfig.title}"
Main Character: ${JSON.stringify(storyConfig.main_character)}

The game is a simple isometric 3D board game where:
- The main character moves on a flat board
- Player clicks to move the character
- Prizes appear that give points when collected
- Hazards appear that subtract points when touched
- Game ends after time limit or move limit

Generate a JSON object with this exact structure (output ONLY valid JSON, no markdown, no code blocks):

{
  "game_id": "3d_board_dash_isometric_v1",
  "game_title": "Creative game title featuring the character name",
  "short_instructions": "One sentence instruction for players",
  "camera": {
    "type": "angled",
    "position": { "x": 0, "y": 20, "z": 20 },
    "look_at": { "x": 0, "y": 0, "z": 0 },
    "field_of_view": 40
  },
  "theme": {
    "board_color": "#1e2f45",
    "board_size": { "width": 22, "height": 22 },
    "background_color": "#00101e",
    "light_intensity": 1.2,
    "prize_color": "#ffee7a",
    "hazard_color": "#ff5555",
    "cursor_color": "#ffffff"
  },
  "character": {
    "display_name": "${storyConfig.main_character.name}",
    "move_speed_units_per_sec": 6,
    "turn_speed_deg_per_sec": 180
  },
  "objects": {
    "max_prizes": 10,
    "max_hazards": 6,
    "prize_value": 1,
    "hazard_penalty": -1,
    "spawn_regions": [
      { "x_min": -9, "x_max": 9, "z_min": -9, "z_max": 9 }
    ],
    "respawn_on_collect": true,
    "respawn_on_explode": true
  },
  "session": {
    "mode": "timed",
    "duration_sec": 60,
    "max_moves": 20,
    "target_score": 12,
    "min_score": -5
  },
  "copy": {
    "score_label": "Thematic name for score (e.g., 'Light Orbs')",
    "prize_name": "Thematic name for prizes (e.g., 'orb')",
    "hazard_name": "Thematic name for hazards (e.g., 'storm cloud')",
    "start_message": "Encouraging start message",
    "win_message": "Victory message",
    "lose_message": "Defeat message",
    "time_up_message": "Time's up message"
  }
}

Make the theme colors, prize/hazard names, and messages thematically consistent with the IP idea.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini", // Cost-effective model
    messages: [
      {
        role: "system",
        content: "You are a JSON generator. Always output valid JSON only, no markdown formatting, no code blocks, no explanatory text. Output ONLY the raw JSON object, nothing else.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.7,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from OpenAI');
  }

  // Try to parse JSON directly, or extract from markdown code blocks if needed
  let jsonString = content.trim();
  
  // Remove markdown code blocks if present
  if (jsonString.startsWith('```')) {
    jsonString = jsonString.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '');
  }
  
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    throw new Error(`Failed to parse JSON: ${e}. Content: ${content.substring(0, 200)}`);
  }
}

export async function generateImage(prompt: string): Promise<string> {
  const response = await openai.images.generate({
    model: "dall-e-3",
    prompt: prompt,
    n: 1,
    size: "1024x1024",
    quality: "standard",
  });

  const imageUrl = response.data?.[0]?.url;
  if (!imageUrl) {
    throw new Error('No image URL returned from DALL·E');
  }

  return imageUrl;
}

