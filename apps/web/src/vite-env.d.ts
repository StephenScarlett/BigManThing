/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_GAME_SERVER_URL: string;
  readonly VITE_GOOGLE_MAPS_API_KEY: string;
  readonly VITE_GOOGLE_MAPS_MAP_ID: string;
  readonly VITE_GOOGLE_MAPS_MAP_ID_LIGHT?: string;
  readonly VITE_GOOGLE_MAPS_MAP_ID_DARK?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
