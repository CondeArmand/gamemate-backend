export interface TwitchToken {
  access_token: string;
  expires_in: number;
  token_type: string;
}

export interface IGDBImage {
  id: number;
  url: string;
}

export interface IGDBGenre {
  id: number;
  name: string;
}

export interface IGDBPlatform {
  id: number;
  abbreviation: string;
}

export interface IGDBGame {
  id: number;
  name: string;
  summary: string;
  cover: IGDBImage;
  first_release_date: number; // Unix timestamp
  total_rating: number;
  genres: IGDBGenre[];
  platforms: IGDBPlatform[];
  screenshots: IGDBImage[];
}
