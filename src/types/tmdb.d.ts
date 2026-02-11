export interface BelongsToCollection {
  id: number;
  name: string;
  poster_path: string;
  backdrop_path: string;
}

export interface MovieDetails {
  adult: boolean;
  backdrop_path: string;
  belongs_to_collection?: BelongsToCollection;
  budget: number;
  genres: Genre[];
  homepage: string;
  id: number;
  imdb_id: string | null;
  original_language: string;
  original_title: string;
  overview: string;
  popularity: number;
  poster_path?: string;
  production_companies: ProductionCompany[];
  production_countries: ProductionCountry[];
  release_date: string;
  revenue: number;
  runtime: number;
  spoken_languages: SpokenLanguage[];
  status: string;
  tagline: string;
  title: string;
  video: boolean;
  vote_average: number;
  vote_count: number;
}

export enum ReleaseDateType {
  'Premiere' = 1,
  'Theatrical (limited)',
  'Theatrical',
  'Digital',
  'Physical',
  'TV',
}

export interface ReleaseDate {
  certification: string;
  descriptors: string[];
  iso_639_1: string;
  release_date: string;
  type: ReleaseDateType;
  note: string;
}

export interface ReleaseDateResult {
  iso_3166_1: CountryCode;
  release_dates: ReleaseDate[];
}

export interface ReleaseDates {
  id: number;
  results: ReleaseDateResult[];
}

export interface SimilarMovies {
  page: number;
  results: Movie[];
  total_pages: number;
  total_results: number;
}

export interface MovieList {
  description: string;
  favorite_count: number;
  id: number;
  item_count: number;
  iso_639_1: string;
  list_type: string;
  name: string;
  poster_path: string;
}

export interface MovieLists {
  id: number;
  page: number;
  results: MovieList[];
  total_pages: number;
  total_results: number;
}

export interface LatestMovie {
  adult: boolean;
  backdrop_path?: string;
  belongs_to_collection?: BelongsToCollection;
  budget: number;
  genres: Genre[];
  homepage: string;
  id: number;
  imdb_id: string | null;
  original_language: string;
  original_title: string;
  overview: string;
  popularity: number;
  poster_path: string;
  production_companies: ProductionCompany[];
  production_countries: ProductionCountry[];
  release_date: string;
  revenue: number;
  runtime: number;
  spoken_languages: SpokenLanguage[];
  status: string;
  tagline: string;
  title: string;
  video: boolean;
  vote_average: number;
  vote_count: number;
}

export interface Dates {
  maximum: string;
  minimum: string;
}

export interface MoviesPlayingNow {
  page: number;
  results: Movie[];
  dates: Dates;
  total_pages: number;
  total_results: number;
}

export interface PopularMovies {
  page: number;
  results: Movie[];
  total_results: number;
  total_pages: number;
}

export interface TopRatedMovies {
  page: number;
  results: Movie[];
  total_results: number;
  total_pages: number;
}

export interface UpcomingMovies {
  page: number;
  results: Movie[];
  total_results: number;
  total_pages: number;
}

export type MovieChangeValue =
  | string
  | {
  person_id: number;
  character: string;
  order: number;
  cast_id: number;
  credit_id: string;
}
  | unknown;

export interface ErrorResponse {
  status_code: number;
  status_message: string;
  success: boolean;
}

export type MediaType = 'movie' | 'tv' | 'person';

export interface AuthorDetails {
  name: string;
  username: string;
  avatar_path: string;
  rating?: number;
}

export type KnownFor = MovieWithMediaType | TVWithMediaType;

export interface Person {
  id: number;
  name: string;
  original_name: string;
  known_for: KnownFor[];
  profile_path: string;
  adult: boolean;
  known_for_department: string;
  gender: number;
  popularity: number;
}

export interface PersonWithMediaType extends Person {
  media_type: 'person';
}

export interface Movie {
  id: number;
  poster_path: string;
  adult: boolean;
  overview: string;
  release_date: string;
  genre_ids: number[];
  original_title: string;
  original_language: string;
  title: string;
  backdrop_path: string;
  popularity: number;
  vote_count: number;
  video: boolean;
  vote_average: number;
}

export interface MovieWithMediaType extends Movie {
  media_type: 'movie';
}

export interface Company {
  id: number;
  logo_path: string;
  name: string;
  origin_country: string;
}

export interface TV {
  id: number;
  adult: boolean;
  name: string;
  first_air_date: string;
  backdrop_path: string;
  genre_ids: number[];
  origin_country: string[];
  original_language: string;
  original_name: string;
  overview: string;
  poster_path: string;
  popularity: number;
  vote_count: number;
  vote_average: number;
}

export interface TVWithMediaType extends TV {
  media_type: 'tv';
}

export interface Genre {
  id: number;
  name: string;
}

export interface ExternalIds {
  imdb_id: string;
  facebook_id: string;
  instagram_id: string;
  twitter_id: string;
  tvdb_id?: number;
  freebase_mid?: string;
  freebase_id?: string;
  tvrage_id?: number;
  wikidata_id: string;
  tiktok_id?: string;
  youtube_id?: string;
  id: number;
}

export interface ProductionCompany {
  id: number;
  logo_path: string;
  name: string;
  origin_country: string;
}

export interface ProductionCountry {
  iso_3166_1: CountryCode;
  name: string;
}

export interface SpokenLanguage {
  english_name: string;
  iso_639_1: string;
  name: string;
}

export interface ContentRatings {
  results: ContentRatingsResult[];
  id: number;
}

export interface ContentRatingsResult {
  descriptor: unknown[];
  iso_3166_1: CountryCode;
  rating: string;
}

export interface Recommendation {
  adult: boolean;
  backdrop_path?: string;
  genre_ids: number[];
  id: number;
  original_language: string;
  original_title: string;
  overview: string;
  release_date: string;
  poster_path?: string;
  popularity: number;
  title: string;
  video: boolean;
  vote_average: number;
  vote_count: number;
}

export interface Recommendations {
  page: number;
  results: Recommendation[];
  total_pages: number;
  total_results: number;
}

export interface Review {
  author: string;
  author_details: AuthorDetails;
  content: string;
  created_at: string;
  id: string;
  updated_at: string;
  url: string;
}

export interface Reviews {
  id: number;
  page: number;
  results: Review[];
  total_pages: number;
  total_results: number;
}

export interface TranslationData {
  title: string;
  overview: string;
  homepage: string;
  tagline: string;
  runtime: number;
}

export interface Translation {
  iso_3166_1: CountryCode;
  iso_639_1: string;
  name: string;
  english_name: string;
  data: TranslationData;
}

export interface Translations {
  id: number;
  translations: Translation[];
}

export interface Image {
  aspect_ratio: number;
  file_path: string;
  height: number;
  iso_639_1: string;
  vote_average: number;
  vote_count: number;
  width: number;
}

export interface Images {
  id: number;
  backdrops: Image[];
  logos: Image[];
  posters: Image[];
}

export const CountryCodes = ['AE', 'AR', 'AT', 'AU', 'BE', 'BG', 'BO', 'BR', 'CA', 'CH', 'CL', 'CO', 'CR', 'CV', 'CZ', 'DE', 'DK', 'EC', 'EE', 'EG', 'ES', 'FI', 'FR', 'GB', 'GH', 'GR', 'GT', 'HK', 'HN', 'HU', 'ID', 'IE', 'IL', 'IN', 'IT', 'JP', 'LT', 'LV', 'MU', 'MX', 'MY', 'MZ', 'NL', 'NO', 'NZ', 'PE', 'PH', 'PL', 'PT', 'PY', 'RU', 'SA', 'SE', 'SG', 'SI', 'SK', 'TH', 'TR', 'TW', 'UG', 'US', 'VE', 'ZA'] as const;

export type CountryCode = (typeof CountryCodes)[number];

export interface Search<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

export type MultiSearchResult =
  | MovieWithMediaType
  | TVWithMediaType
  | PersonWithMediaType;

export interface TV {
  id: number;
  adult: boolean;
  name: string;
  first_air_date: string;
  backdrop_path: string;
  genre_ids: number[];
  origin_country: string[];
  original_language: string;
  original_name: string;
  overview: string;
  poster_path: string;
  popularity: number;
  vote_count: number;
  vote_average: number;
}

export interface TVWithMediaType extends TV {
  media_type: 'tv';
}

export interface Movie {
  id: number;
  poster_path: string;
  adult: boolean;
  overview: string;
  release_date: string;
  genre_ids: number[];
  original_title: string;
  original_language: string;
  title: string;
  backdrop_path: string;
  popularity: number;
  vote_count: number;
  video: boolean;
  vote_average: number;
}

export interface MovieWithMediaType extends Movie {
  media_type: 'movie';
}

export interface CreatedBy {
  id: number;
  credit_id: string;
  name: string;
  gender: number;
  profile_path: string;
}

export interface NextEpisodeToAir {
  id: number;
  name: string;
  overview: string;
  vote_average: number;
  vote_count: number;
  air_date: string;
  episode_number: number;
  production_code: string;
  runtime: number;
  season_number: number;
  show_id: number;
  still_path: string;
}

export interface LastEpisodeToAir {
  air_date: string;
  episode_number: number;
  id: number;
  name: string;
  overview: string;
  production_code: string;
  season_number: number;
  still_path: string;
  vote_average: number;
  vote_count: number;
}

export interface Network {
  name: string;
  id: number;
  logo_path: string;
  origin_country: string;
}

export interface Season {
  air_date: string;
  episode_count: number;
  id: number;
  name: string;
  overview: string;
  poster_path: string;
  season_number: number;
}

export interface TvShowDetails {
  backdrop_path: string;
  created_by: CreatedBy[];
  episode_run_time: number[];
  first_air_date: string;
  genres: Genre[];
  homepage: string;
  id: number;
  in_production: boolean;
  languages: string[];
  last_air_date: string;
  last_episode_to_air: LastEpisodeToAir;
  name: string;
  next_episode_to_air?: NextEpisodeToAir;
  networks: Network[];
  number_of_episodes: number;
  number_of_seasons: number;
  origin_country: string[];
  original_language: string;
  original_name: string;
  overview: string;
  popularity: number;
  poster_path: string;
  production_companies: ProductionCompany[];
  production_countries: ProductionCountry[];
  seasons: Season[];
  spoken_languages: SpokenLanguage[];
  status: string;
  tagline: string;
  type: string;
  vote_average: number;
  vote_count: number;
}

export interface Network {
  id: number;
  logo_path: string;
  name: string;
  origin_country: string;
}

export interface EpisodeGroup {
  description: string;
  episode_count: number;
  group_count: number;
  id: string;
  name: string;
  network: Network;
  type: number;
}

export interface EpisodeGroups {
  results: EpisodeGroup[];
  id: number;
}

export interface ScreenedTheatricallyResult {
  id: number;
  episode_number: number;
  season_number: number;
}

export interface ScreenedTheatrically {
  id: number;
  results: ScreenedTheatricallyResult[];
}

export interface SimilarTvShow {
  backdrop_path: string;
  first_air_date: string;
  genre_ids: number[];
  id: number;
  original_language: string;
  original_name: string;
  overview: string;
  origin_country: string[];
  poster_path: string;
  popularity: number;
  name: string;
  vote_average: number;
  vote_count: number;
}

export interface SimilarTvShows {
  page: number;
  results: SimilarTvShow[];
  total_pages: number;
  total_results: number;
}

export interface TvRecommendation {
  backdrop_path: string;
  first_air_date: string;
  genre_ids: number[];
  id: number;
  original_language: string;
  original_name: string;
  overview: string;
  origin_country: string[];
  poster_path: string;
  popularity: number;
  name: string;
  vote_average: number;
  vote_count: number;
}

export interface TvRecommendations {
  page: number;
  results: TvRecommendation[];
  total_pages: number;
  total_results: number;
}

export interface LatestTvShows {
  backdrop_path?: string;
  created_by: CreatedBy[];
  episode_run_time: number[];
  first_air_date: string;
  genres: Genre[];
  homepage: string;
  id: number;
  in_production: boolean;
  languages: string[];
  last_air_date: string;
  name: string;
  networks: Network[];
  number_of_episodes: number;
  number_of_seasons: number;
  origin_country: string[];
  original_language: string;
  original_name: string;
  overview?: string;
  popularity: number;
  poster_path?: string;
  production_companies: ProductionCompany[];
  seasons: Season[];
  status: string;
  type: string;
  vote_average: number;
  vote_count: number;
}

export interface OnTheAirResult {
  poster_path: string;
  popularity: number;
  id: number;
  backdrop_path: string;
  vote_average: number;
  overview: string;
  first_air_date: string;
  origin_country: string[];
  genre_ids: number[];
  original_language: string;
  vote_count: number;
  name: string;
  original_name: string;
}

export interface OnTheAir {
  page: number;
  results: OnTheAirResult[];
  total_results: number;
  total_pages: number;
}

export interface AiringTodayResult {
  poster_path: string;
  popularity: number;
  id: number;
  backdrop_path: string;
  vote_average: number;
  overview: string;
  first_air_date: string;
  origin_country: string[];
  genre_ids: number[];
  original_language: string;
  vote_count: number;
  name: string;
  original_name: string;
}

export interface TvShowsAiringToday {
  page: number;
  results: AiringTodayResult[];
  total_results: number;
  total_pages: number;
}

export interface PopularTvShowResult {
  poster_path: string;
  popularity: number;
  id: number;
  backdrop_path: string;
  vote_average: number;
  overview: string;
  first_air_date: string;
  origin_country: string[];
  genre_ids: number[];
  original_language: string;
  vote_count: number;
  name: string;
  original_name: string;
}

export interface PopularTvShows {
  page: number;
  results: PopularTvShowResult[];
  total_results: number;
  total_pages: number;
}

export interface TopRatedTvShowResult {
  poster_path: string;
  popularity: number;
  id: number;
  backdrop_path: string;
  vote_average: number;
  overview: string;
  first_air_date: string;
  origin_country: string[];
  genre_ids: number[];
  original_language: string;
  vote_count: number;
  name: string;
  original_name: string;
}

export interface TopRatedTvShows {
  page: number;
  results: TopRatedTvShowResult[];
  total_results: number;
  total_pages: number;
}

export interface TvShowChangeValue {
  season_id: number;
  season_number: number;
}

export interface TvShowImageOptions extends LanguageOption {
  /**
   * a list of ISO-639-1 values to query
   */
  include_image_language?: string[];
}

export interface TvShowVideoOptions extends LanguageOption {
  /**
   * a list of ISO-639-1 values to query
   */
  include_video_language?: string[];
}

export interface SeasonSelection {
  tvShowID: number;
  seasonNumber: number;
}

export interface SeasonDetails {
  air_date: string;
  episodes: Episode[];
  name: string;
  overview: string;
  id: number;
  poster_path: string | null;
  season_number: number;
}

export type TvSeasonChangeValue =
  | string
  | {
  episode_id: number;
  episode_number: number;
};

export interface EpisodeSelection {
  tvShowID: number;
  seasonNumber: number;
  episodeNumber: number;
}

export interface Episode {
  air_date: string;
  episode_number: number;
  crew: Crew[];
  guest_stars: GuestStar[];
  id: number;
  name: string;
  overview: string;
  production_code: string;
  season_number: number;
  still_path: string;
  vote_average: number;
  vote_count: number;
  runtime: number;
  show_id: number;
}

export interface GuestStar {
  credit_id: string;
  order: number;
  character: string;
  adult: boolean;
  gender: number | null;
  id: number;
  known_for_department: string;
  name: string;
  original_name: string;
  popularity: number;
  profile_path: string | null;
}

export interface TvEpisodeCredit extends Credits {
  guest_stars: GuestStar[];
}

export interface TvEpisodeTranslations {
  id: number;
  translations: {
    iso_3166_1: CountryCode;
    iso_639_1: string;
    name: string;
    english_name: string;
    data: {
      name: string;
      overview: string;
    };
  };
}

export type TvEpisodeChangeValue = string | unknown;
