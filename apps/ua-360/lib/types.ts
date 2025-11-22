// Story Config (config.json) types
export interface MainCharacter {
  name: string;
  short_description: string;
  style: string;
  colors: string[];
}

export interface ComicPanel {
  caption: string;
  image_prompt: string;
}

export interface StoryConfig {
  title: string;
  logline: string;
  main_character: MainCharacter;
  panels: ComicPanel[];
  character_ref_prompt: string;
}

// Game Config (game_config.json) types
export interface CameraConfig {
  type: string;
  position: { x: number; y: number; z: number };
  look_at: { x: number; y: number; z: number };
  field_of_view: number;
}

export interface ThemeConfig {
  board_color: string;
  board_size: { width: number; height: number };
  background_color: string;
  light_intensity: number;
  prize_color: string;
  hazard_color: string;
  cursor_color: string;
}

export interface CharacterConfig {
  display_name: string;
  move_speed_units_per_sec: number;
  turn_speed_deg_per_sec: number;
}

export interface SpawnRegion {
  x_min: number;
  x_max: number;
  z_min: number;
  z_max: number;
}

export interface ObjectsConfig {
  max_prizes: number;
  max_hazards: number;
  prize_value: number;
  hazard_penalty: number;
  spawn_regions: SpawnRegion[];
  respawn_on_collect: boolean;
  respawn_on_explode: boolean;
}

export interface SessionConfig {
  mode: "timed" | "moves";
  duration_sec: number;
  max_moves: number;
  target_score: number;
  min_score: number;
}

export interface CopyConfig {
  score_label: string;
  prize_name: string;
  hazard_name: string;
  start_message: string;
  win_message: string;
  lose_message: string;
  time_up_message: string;
}

export interface GameConfig {
  game_id: string;
  game_title: string;
  short_instructions: string;
  camera: CameraConfig;
  theme: ThemeConfig;
  character: CharacterConfig;
  objects: ObjectsConfig;
  session: SessionConfig;
  copy: CopyConfig;
}

// API Response types
export interface ComicPanelImage {
  url: string;
}

export interface Model3D {
  url: string;
  format: "glb" | "obj";
}

export interface GenerateIPResponse {
  session_id: string;
  storyConfig: StoryConfig;
  gameConfig: GameConfig;
  comicPanels: ComicPanelImage[];
  characterRefImage: { url: string };
  model3D: Model3D;
}

// Supabase types
export interface IpSession {
  id: string;
  created_at: string;
  ip_idea: string;
  story_title: string;
  story_logline: string;
  story_config: StoryConfig;
  game_config: GameConfig;
  comic_panel_urls: string[];
  model_3d_url: string;
  character_name: string | null;
  notes: string | null;
}

// Frontend state types
export type AppMode = "idle" | "loading" | "ready" | "error";

