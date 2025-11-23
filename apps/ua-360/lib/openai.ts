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
      "image_prompt": "Detailed DALL·E prompt for panel 1 in animated comic book style, consistent character design"
    },
    {
      "caption": "Caption for panel 2",
      "image_prompt": "Detailed DALL·E prompt for panel 2 in animated comic book style, consistent with panel 1"
    },
    {
      "caption": "Caption for panel 3",
      "image_prompt": "Detailed DALL·E prompt for panel 3 in animated comic book style, consistent with previous panels"
    }
  ],
  "character_ref_prompt": "A prompt will be generated from the first comic panel image to extract the main character as a 3D plastic toy"
}

IMPORTANT - Comic Panel Image Style Guidelines:
When generating image_prompt fields for each panel, you MUST include these specific style elements to create animated comic book style images:

1. Art Style: "animated comic book style, vibrant colors, bold outlines, cel-shaded animation aesthetic, dynamic action lines and motion effects"

2. Visual Elements: Include references to:
   - Comic book panel layout with clear borders
   - Bold black outlines around characters and objects
   - Bright, saturated colors typical of animated comics
   - Dramatic lighting and shadows
   - Action lines, speed lines, or motion blur where appropriate
   - Comic book-style speech bubbles or sound effects positioning
   - Dramatic camera angles and perspective
   - Expressive character poses and emotions

3. Consistency: Maintain the exact same character design, colors, and proportions across all three panels, but vary the poses, expressions, and camera angles to show progression of the story.

4. Quality: Specify "high-quality animated comic illustration, professional comic book art style, cinematic composition"

Ensure all image prompts maintain visual consistency across panels, include the character's description and style, and ALWAYS specify "animated comic book style" prominently in each prompt.`;

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

export async function generateCharacterRefPrompt(
  firstPanelImageUrl: string,
  storyConfig: any
): Promise<string> {
  const characterDescription = storyConfig.main_character?.short_description || 'character';
  const characterName = storyConfig.main_character?.name || 'the main character';
  const characterStyle = storyConfig.main_character?.style || 'cute, clean, colorful';
  const characterColors = storyConfig.main_character?.colors?.join(', ') || '';

  const prompt = `You are creating a DALL·E prompt to generate a character reference image for 3D model generation.

Context:
- A comic panel image has been generated showing "${characterName}" (${characterDescription})
- The character appears in the image at this URL: ${firstPanelImageUrl}
- Character style: ${characterStyle}
- Character colors: ${characterColors}

Task:
Generate a detailed DALL·E prompt that will create a 3D plastic toy version of this exact character. The prompt MUST:

1. Extract and isolate ONLY the main character from the comic panel - NO other characters, objects, or background elements
2. Maintain the exact appearance, colors, and features of the character as shown in the first panel
3. Transform the character into a 3D plastic toy aesthetic (smooth surfaces, toy-like materials, slightly stylized but recognizable)
4. Show EXACTLY ONE SINGLE INSTANCE of the character - full body, perfectly centered in the middle of the image, facing directly forward toward the camera
5. Place the character on a PURE WHITE background (#FFFFFF) with absolutely no shadows, no ground, no textures, no gradients - just solid white
6. Keep all character details intact: same colors, proportions, features, clothing/accessories
7. Make it look like a high-quality collectible toy or action figure
8. Ensure the character is the ONLY subject in the image - no other characters, no background elements, no props (unless they are part of the character's design like clothing or accessories)
9. The character should be clearly visible and well-lit, standing or posed in a neutral position suitable for 3D modeling reference
10. CRITICAL: Show ONLY ONE VIEW - frontal view facing the camera. Do NOT show multiple views, side views, back views, or any other angles. Just one single front-facing view.
11. CRITICAL: Show ONLY ONE INSTANCE of the character. Do NOT create multiple copies, variations, or different poses of the character. Only one single character in the center.

CRITICAL REQUIREMENTS:
- ONE SINGLE CHARACTER ONLY - no duplicates, no multiple instances, no variations
- Character positioned in the CENTER of the image - perfectly centered horizontally and vertically
- Pure white background (#FFFFFF) with no variations, shadows, or textures
- Full body view from front ONLY - facing directly forward toward the camera
- ONE VIEW ONLY - no multiple views, no side views, no different angles, no rotation views
- No other objects, characters, or background elements
- Character should be clearly isolated and prominent in the center
- Character must face directly forward, not at an angle or from the side
- The prompt must explicitly state "single character", "one character", "centered", and "frontal view only"

Important: The prompt should be detailed enough that DALL·E can recreate the character accurately, referencing the specific appearance from the comic panel, while ensuring ONLY ONE SINGLE CHARACTER appears centered on a pure white background with a SINGLE FRONTAL VIEW. No multiple views or multiple instances.

Output ONLY the DALL·E prompt text, nothing else. No explanations, no markdown, just the prompt.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "You are a prompt engineer. Generate detailed, specific DALL·E prompts that accurately describe visual concepts. Output ONLY the prompt text, no explanations.",
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
    throw new Error('No response from OpenAI for character ref prompt');
  }

  // Clean up the response - remove any markdown or extra formatting
  let promptText = content.trim();
  if (promptText.startsWith('```')) {
    promptText = promptText.replace(/^```(?:text)?\n?/i, '').replace(/\n?```$/i, '');
  }
  
  return promptText.trim();
}

