export interface SteamGameDetails {
  type: string;
  name: string;
  steam_appid: number;
  required_age: number;
  is_free: boolean;
  detailed_description: string;
  about_the_game: string;
  short_description: string;
  header_image: string;
  platforms: SteamPlatformResponse;
  developers: string[];
  publishers: string[];
  genres: { id: string; description: string }[];
  screenshots: { id: number; path_thumbnail: string; path_full: string }[];
  release_date: { coming_soon: boolean; date: string };
}

export interface SteamPlatformResponse {
  windows: boolean;
  mac: boolean;
  linux: boolean;
}

export interface SteamAppDetailsResponse {
  [appid: string]: {
    success: boolean;
    data?: SteamGameDetails;
  };
}

export interface SteamOwnedGamesResponse {
  response: {
    game_count: number;
    games: {
      name: string;
      appid: number;
      playtime_forever: number;
      playtime_2weeks?: number;
    }[];
  };
}
