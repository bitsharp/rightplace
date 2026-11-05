export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      blocks: {
        Row: {
          blocked_id: string;
          blocker_id: string;
          created_at: string;
        };
        ComputedFields: never;
        Insert: {
          blocked_id: string;
          blocker_id: string;
          created_at?: string;
        };
        Update: {
          blocked_id?: string;
          blocker_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'blocks_blocked_id_fkey';
            columns: ['blocked_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'blocks_blocked_id_fkey';
            columns: ['blocked_id'];
            isOneToOne: false;
            referencedRelation: 'public_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'blocks_blocker_id_fkey';
            columns: ['blocker_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'blocks_blocker_id_fkey';
            columns: ['blocker_id'];
            isOneToOne: false;
            referencedRelation: 'public_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      chat_messages: {
        Row: {
          created_at: string;
          id: string;
          kind: string;
          photo_path: string | null;
          room_id: string;
          text: string | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          kind: string;
          photo_path?: string | null;
          room_id: string;
          text?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          kind?: string;
          photo_path?: string | null;
          room_id?: string;
          text?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'chat_messages_room_id_fkey';
            columns: ['room_id'];
            isOneToOne: false;
            referencedRelation: 'chat_rooms';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'chat_messages_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'chat_messages_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'public_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      chat_rooms: {
        Row: {
          created_at: string;
          event_id: string | null;
          expires_at: string;
          id: string;
          night_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          event_id?: string | null;
          expires_at: string;
          id?: string;
          night_id?: string | null;
        };
        Update: {
          created_at?: string;
          event_id?: string | null;
          expires_at?: string;
          id?: string;
          night_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'chat_rooms_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: true;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'chat_rooms_night_id_fkey';
            columns: ['night_id'];
            isOneToOne: true;
            referencedRelation: 'nights';
            referencedColumns: ['id'];
          },
        ];
      };
      cities: {
        Row: {
          center: unknown;
          country: string;
          created_at: string;
          default_zoom: number;
          id: string;
          is_active: boolean;
          name: string;
          places_areas: string[];
          places_radius_m: number;
          slug: string;
          taxi_phone: string | null;
          timezone: string;
        };
        ComputedFields: never;
        Insert: {
          center: unknown;
          country: string;
          created_at?: string;
          default_zoom?: number;
          id?: string;
          is_active?: boolean;
          name: string;
          places_areas?: string[];
          places_radius_m?: number;
          slug: string;
          taxi_phone?: string | null;
          timezone: string;
        };
        Update: {
          center?: unknown;
          country?: string;
          created_at?: string;
          default_zoom?: number;
          id?: string;
          is_active?: boolean;
          name?: string;
          places_areas?: string[];
          places_radius_m?: number;
          slug?: string;
          taxi_phone?: string | null;
          timezone?: string;
        };
        Relationships: [];
      };
      contact_hashes_tmp: {
        Row: {
          created_at: string;
          hash: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          hash: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          hash?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'contact_hashes_tmp_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contact_hashes_tmp_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'public_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      declarations: {
        Row: {
          created_at: string;
          event_id: string | null;
          expires_at: string;
          id: string;
          intent: string;
          night_id: string | null;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          event_id?: string | null;
          expires_at: string;
          id?: string;
          intent: string;
          night_id?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          event_id?: string | null;
          expires_at?: string;
          id?: string;
          intent?: string;
          night_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'declarations_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'declarations_night_id_fkey';
            columns: ['night_id'];
            isOneToOne: false;
            referencedRelation: 'nights';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'declarations_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'declarations_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'public_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      events: {
        Row: {
          created_at: string;
          creator_id: string;
          description: string | null;
          ends_at: string;
          id: string;
          is_sponsored: boolean;
          name: string;
          sponsored_until: string | null;
          starts_at: string;
          target_age_bands: string[];
          target_genders: string[];
          updated_at: string;
          venue_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          creator_id: string;
          description?: string | null;
          ends_at: string;
          id?: string;
          is_sponsored?: boolean;
          name: string;
          sponsored_until?: string | null;
          starts_at: string;
          target_age_bands?: string[];
          target_genders?: string[];
          updated_at?: string;
          venue_id: string;
        };
        Update: {
          created_at?: string;
          creator_id?: string;
          description?: string | null;
          ends_at?: string;
          id?: string;
          is_sponsored?: boolean;
          name?: string;
          sponsored_until?: string | null;
          starts_at?: string;
          target_age_bands?: string[];
          target_genders?: string[];
          updated_at?: string;
          venue_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'events_creator_id_fkey';
            columns: ['creator_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'events_creator_id_fkey';
            columns: ['creator_id'];
            isOneToOne: false;
            referencedRelation: 'public_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'events_venue_id_fkey';
            columns: ['venue_id'];
            isOneToOne: false;
            referencedRelation: 'venues';
            referencedColumns: ['id'];
          },
        ];
      };
      follows: {
        Row: {
          created_at: string;
          followee_id: string;
          follower_id: string;
          responded_at: string | null;
          status: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          followee_id: string;
          follower_id: string;
          responded_at?: string | null;
          status?: string;
        };
        Update: {
          created_at?: string;
          followee_id?: string;
          follower_id?: string;
          responded_at?: string | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'follows_followee_id_fkey';
            columns: ['followee_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'follows_followee_id_fkey';
            columns: ['followee_id'];
            isOneToOne: false;
            referencedRelation: 'public_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'follows_follower_id_fkey';
            columns: ['follower_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'follows_follower_id_fkey';
            columns: ['follower_id'];
            isOneToOne: false;
            referencedRelation: 'public_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      night_hour_stats: {
        Row: {
          avg_declared: number;
          hour: number;
          samples: number;
          updated_at: string;
          venue_id: string;
          weekday: number;
        };
        ComputedFields: never;
        Insert: {
          avg_declared: number;
          hour: number;
          samples: number;
          updated_at?: string;
          venue_id: string;
          weekday: number;
        };
        Update: {
          avg_declared?: number;
          hour?: number;
          samples?: number;
          updated_at?: string;
          venue_id?: string;
          weekday?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'night_hour_stats_venue_id_fkey';
            columns: ['venue_id'];
            isOneToOne: false;
            referencedRelation: 'venues';
            referencedColumns: ['id'];
          },
        ];
      };
      nights: {
        Row: {
          id: string;
          night_date: string;
          venue_id: string;
        };
        ComputedFields: never;
        Insert: {
          id?: string;
          night_date: string;
          venue_id: string;
        };
        Update: {
          id?: string;
          night_date?: string;
          venue_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'nights_venue_id_fkey';
            columns: ['venue_id'];
            isOneToOne: false;
            referencedRelation: 'venues';
            referencedColumns: ['id'];
          },
        ];
      };
      phone_hashes: {
        Row: {
          hash: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          hash: string;
          user_id: string;
        };
        Update: {
          hash?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'phone_hashes_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'phone_hashes_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'public_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      post_comments: {
        Row: {
          created_at: string;
          id: string;
          post_id: string;
          text: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          post_id: string;
          text: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          post_id?: string;
          text?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'post_comments_post_id_fkey';
            columns: ['post_id'];
            isOneToOne: false;
            referencedRelation: 'posts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'post_comments_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'post_comments_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'public_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      post_likes: {
        Row: {
          created_at: string;
          post_id: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          post_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          post_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'post_likes_post_id_fkey';
            columns: ['post_id'];
            isOneToOne: false;
            referencedRelation: 'posts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'post_likes_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'post_likes_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'public_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      posts: {
        Row: {
          caption: string | null;
          created_at: string;
          event_id: string | null;
          expires_at: string;
          id: string;
          night_id: string | null;
          photo_path: string | null;
          user_id: string;
          visible_from: string;
        };
        ComputedFields: never;
        Insert: {
          caption?: string | null;
          created_at?: string;
          event_id?: string | null;
          expires_at: string;
          id?: string;
          night_id?: string | null;
          photo_path?: string | null;
          user_id: string;
          visible_from: string;
        };
        Update: {
          caption?: string | null;
          created_at?: string;
          event_id?: string | null;
          expires_at?: string;
          id?: string;
          night_id?: string | null;
          photo_path?: string | null;
          user_id?: string;
          visible_from?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'posts_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'posts_night_id_fkey';
            columns: ['night_id'];
            isOneToOne: false;
            referencedRelation: 'nights';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'posts_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'posts_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'public_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          birth_date: string | null;
          city_id: string | null;
          coarse_location: unknown;
          coarse_location_at: string | null;
          contacts_opt_in: boolean;
          created_at: string;
          deleted_at: string | null;
          gender: string | null;
          handle: string;
          handle_changed_at: string | null;
          id: string;
          is_creator: boolean;
          locale: string;
          location_opt_in: boolean;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          birth_date?: string | null;
          city_id?: string | null;
          coarse_location?: unknown;
          coarse_location_at?: string | null;
          contacts_opt_in?: boolean;
          created_at?: string;
          deleted_at?: string | null;
          gender?: string | null;
          handle: string;
          handle_changed_at?: string | null;
          id: string;
          is_creator?: boolean;
          locale?: string;
          location_opt_in?: boolean;
          updated_at?: string;
        };
        Update: {
          birth_date?: string | null;
          city_id?: string | null;
          coarse_location?: unknown;
          coarse_location_at?: string | null;
          contacts_opt_in?: boolean;
          created_at?: string;
          deleted_at?: string | null;
          gender?: string | null;
          handle?: string;
          handle_changed_at?: string | null;
          id?: string;
          is_creator?: boolean;
          locale?: string;
          location_opt_in?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'profiles_city_id_fkey';
            columns: ['city_id'];
            isOneToOne: false;
            referencedRelation: 'cities';
            referencedColumns: ['id'];
          },
        ];
      };
      push_tokens: {
        Row: {
          platform: string;
          token: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          platform: string;
          token: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          platform?: string;
          token?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'push_tokens_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'push_tokens_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'public_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      reports: {
        Row: {
          created_at: string;
          id: string;
          reason: string | null;
          reporter_id: string;
          resolved_at: string | null;
          target_id: string;
          target_kind: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          reason?: string | null;
          reporter_id: string;
          resolved_at?: string | null;
          target_id: string;
          target_kind: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          reason?: string | null;
          reporter_id?: string;
          resolved_at?: string | null;
          target_id?: string;
          target_kind?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'reports_reporter_id_fkey';
            columns: ['reporter_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reports_reporter_id_fkey';
            columns: ['reporter_id'];
            isOneToOne: false;
            referencedRelation: 'public_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      search_history: {
        Row: {
          searched_at: string;
          user_id: string;
          venue_id: string;
        };
        ComputedFields: never;
        Insert: {
          searched_at?: string;
          user_id: string;
          venue_id: string;
        };
        Update: {
          searched_at?: string;
          user_id?: string;
          venue_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'search_history_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'search_history_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'public_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'search_history_venue_id_fkey';
            columns: ['venue_id'];
            isOneToOne: false;
            referencedRelation: 'venues';
            referencedColumns: ['id'];
          },
        ];
      };
      subscriptions: {
        Row: {
          current_period_end: string | null;
          product_id: string;
          provider: string;
          status: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          current_period_end?: string | null;
          product_id: string;
          provider?: string;
          status: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          current_period_end?: string | null;
          product_id?: string;
          provider?: string;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'subscriptions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'subscriptions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'public_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      venue_typical_busyness: {
        Row: {
          hour: number;
          level: number;
          source: string;
          updated_at: string;
          venue_id: string;
          weekday: number;
        };
        ComputedFields: never;
        Insert: {
          hour: number;
          level: number;
          source: string;
          updated_at?: string;
          venue_id: string;
          weekday: number;
        };
        Update: {
          hour?: number;
          level?: number;
          source?: string;
          updated_at?: string;
          venue_id?: string;
          weekday?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'venue_typical_busyness_venue_id_fkey';
            columns: ['venue_id'];
            isOneToOne: false;
            referencedRelation: 'venues';
            referencedColumns: ['id'];
          },
        ];
      };
      venues: {
        Row: {
          address: string | null;
          city_id: string;
          created_at: string;
          google_place_id: string;
          id: string;
          is_active: boolean;
          kind: string;
          location: unknown;
          name: string;
          opening_hours: Json | null;
          places_synced_at: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          address?: string | null;
          city_id: string;
          created_at?: string;
          google_place_id: string;
          id?: string;
          is_active?: boolean;
          kind: string;
          location?: unknown;
          name: string;
          opening_hours?: Json | null;
          places_synced_at?: string | null;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          city_id?: string;
          created_at?: string;
          google_place_id?: string;
          id?: string;
          is_active?: boolean;
          kind?: string;
          location?: unknown;
          name?: string;
          opening_hours?: Json | null;
          places_synced_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'venues_city_id_fkey';
            columns: ['city_id'];
            isOneToOne: false;
            referencedRelation: 'cities';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      accepted_follows: {
        Row: {
          followee_id: string;
          follower_id: string;
          responded_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          followee_id?: string | null;
          follower_id?: string | null;
          responded_at?: string | null;
        };
        Update: {
          followee_id?: string | null;
          follower_id?: string | null;
          responded_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'follows_followee_id_fkey';
            columns: ['followee_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'follows_followee_id_fkey';
            columns: ['followee_id'];
            isOneToOne: false;
            referencedRelation: 'public_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'follows_follower_id_fkey';
            columns: ['follower_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'follows_follower_id_fkey';
            columns: ['follower_id'];
            isOneToOne: false;
            referencedRelation: 'public_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      public_profiles: {
        Row: {
          age_band: string | null;
          gender: string | null;
          handle: string;
          id: string;
          is_creator: boolean;
        };
        ComputedFields: never;
        Insert: {
          age_band?: never;
          gender?: string | null;
          handle?: string | null;
          id?: string | null;
          is_creator?: boolean | null;
        };
        Update: {
          age_band?: never;
          gender?: string | null;
          handle?: string | null;
          id?: string | null;
          is_creator?: boolean | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      accept_follow: { Args: { p_follower_id: string }; Returns: undefined };
      age_band: { Args: { p_birth_date: string }; Returns: string };
      attendance_band: { Args: { p_count: number }; Returns: string };
      block_user: { Args: { p_user_id: string }; Returns: undefined };
      cancel_follow_request: { Args: { p_user_id: string }; Returns: undefined };
      clear_my_phone_hash: { Args: Record<PropertyKey, never>; Returns: undefined };
      coarsen: { Args: { p_point: unknown }; Returns: unknown };
      complete_profile: {
        Args: {
          p_birth_date: string;
          p_city_slug: string;
          p_contacts_opt_in: boolean;
          p_gender: string;
          p_is_creator: boolean;
          p_locale: string;
          p_location_opt_in: boolean;
        };
        Returns: undefined;
      };
      count_follow_requests: { Args: Record<PropertyKey, never>; Returns: number };
      create_event: {
        Args: {
          p_description: string;
          p_ends_at: string;
          p_name: string;
          p_starts_at: string;
          p_target_age_bands?: string[];
          p_target_genders?: string[];
          p_venue_id: string;
        };
        Returns: string;
      };
      current_night_date: { Args: { p_city_id: string }; Returns: string };
      declare: {
        Args: { p_event_id?: string; p_intent: string; p_venue_id?: string };
        Returns: string;
      };
      decline_follow: { Args: { p_follower_id: string }; Returns: undefined };
      delete_my_account: { Args: Record<PropertyKey, never>; Returns: undefined };
      generate_handle: { Args: Record<PropertyKey, never>; Returns: string };
      get_active_cities: {
        Args: Record<PropertyKey, never>;
        Returns: {
          country: string;
          default_zoom: number;
          lat: number;
          lng: number;
          name: string;
          slug: string;
        }[];
      };
      get_blocked_users: {
        Args: Record<PropertyKey, never>;
        Returns: {
          blocked_at: string;
          handle: string;
          user_id: string;
        }[];
      };
      get_city_map: {
        Args: { p_city_slug: string; p_view?: string };
        Returns: {
          friends_count: number;
          friends_going: string[];
          going_band: string;
          is_hot_spot: boolean;
          is_sponsored: boolean;
          kind: string;
          lat: number;
          lng: number;
          maybe_band: string;
          name: string;
          typical_level: number;
          venue_id: string;
        }[];
      };
      get_city_sync_info: {
        Args: { p_city_slug: string };
        Returns: {
          areas: string[];
          country: string;
          is_active: boolean;
          lat: number;
          lng: number;
          name: string;
          radius_m: number;
        }[];
      };
      get_event_attendance: {
        Args: { p_event_id: string };
        Returns: {
          going_band: string;
          maybe_band: string;
          target_age_bands: string[];
          target_genders: string[];
        }[];
      };
      get_feed: {
        Args: { p_before?: string; p_limit?: number };
        Returns: {
          author_handle: string;
          author_id: string;
          caption: string;
          comment_count: number;
          expires_at: string;
          like_count: number;
          liked_by_me: boolean;
          photo_path: string;
          post_id: string;
          venue_name: string;
          visible_from: string;
        }[];
      };
      get_follow_requests: {
        Args: Record<PropertyKey, never>;
        Returns: {
          age_band: string;
          gender: string;
          handle: string;
          is_creator: boolean;
          requested_at: string;
          user_id: string;
        }[];
      };
      get_followers: {
        Args: Record<PropertyKey, never>;
        Returns: {
          age_band: string;
          followed_at: string;
          gender: string;
          handle: string;
          i_follow: boolean;
          is_creator: boolean;
          user_id: string;
        }[];
      };
      get_following: {
        Args: Record<PropertyKey, never>;
        Returns: {
          age_band: string;
          followed_at: string;
          follows_me: boolean;
          gender: string;
          handle: string;
          is_creator: boolean;
          tonight_venue_id: string;
          tonight_venue_name: string;
          user_id: string;
        }[];
      };
      get_my_creator_events: {
        Args: Record<PropertyKey, never>;
        Returns: {
          ends_at: string;
          event_id: string;
          going_band: string;
          is_sponsored: boolean;
          maybe_band: string;
          name: string;
          starts_at: string;
          target_age_bands: string[];
          target_genders: string[];
          venue_name: string;
        }[];
      };
      get_my_declaration: {
        Args: Record<PropertyKey, never>;
        Returns: {
          declaration_id: string;
          event_id: string;
          expires_at: string;
          intent: string;
          venue_id: string;
          venue_name: string;
        }[];
      };
      get_recommended_venue: {
        Args: { p_city_slug: string };
        Returns: {
          kind: string;
          name: string;
          reason: string;
          venue_id: string;
        }[];
      };
      get_stories: {
        Args: Record<PropertyKey, never>;
        Returns: {
          handle: string;
          latest_post_at: string;
          user_id: string;
        }[];
      };
      get_venue_detail: {
        Args: { p_venue_id: string };
        Returns: {
          address: string;
          city_name: string;
          city_slug: string;
          country: string;
          google_place_id: string;
          kind: string;
          lat: number;
          lng: number;
          name: string;
          opening_hours: Json;
          taxi_number: string;
          timezone: string;
          venue_id: string;
        }[];
      };
      get_venue_stats: {
        Args: { p_segment?: string; p_venue_id: string };
        Returns: {
          avg_age: number;
          female_pct: number;
          friends: Json;
          going_band: string;
          is_sponsored: boolean;
          male_pct: number;
          maybe_band: string;
          other_pct: number;
        }[];
      };
      import_typical_manual: {
        Args: { p_city_slug: string; p_rows: Json };
        Returns: {
          cells: number;
          venues: number;
        }[];
      };
      is_adult: { Args: { p_birth_date: string }; Returns: boolean };
      level_from_avg: { Args: { p_avg: number }; Returns: number };
      match_contacts: {
        Args: { p_hashes: string[] };
        Returns: {
          age_band: string;
          gender: string;
          handle: string;
          is_creator: boolean;
          user_id: string;
        }[];
      };
      night_date_at: { Args: { p_at: string; p_city_id: string }; Returns: string };
      night_end: { Args: { p_night_date: string; p_timezone: string }; Returns: string };
      regenerate_handle: { Args: Record<PropertyKey, never>; Returns: string };
      remember_venue: { Args: { p_venue_id: string }; Returns: undefined };
      remove_follower: { Args: { p_follower_id: string }; Returns: undefined };
      report: {
        Args: { p_reason?: string; p_target_id: string; p_target_kind: string };
        Returns: undefined;
      };
      request_follow: { Args: { p_user_id: string }; Returns: string };
      search_users: {
        Args: { p_query: string };
        Returns: {
          age_band: string;
          follow_state: string;
          follows_me: boolean;
          gender: string;
          handle: string;
          is_creator: boolean;
          tonight_venue_id: string;
          tonight_venue_name: string;
          user_id: string;
        }[];
      };
      search_venues: {
        Args: { p_city_slug: string; p_kind?: string; p_query?: string };
        Returns: {
          address: string;
          going_band: string;
          is_sponsored: boolean;
          kind: string;
          maybe_band: string;
          name: string;
          venue_id: string;
        }[];
      };
      set_locale: { Args: { p_locale: string }; Returns: undefined };
      set_my_phone_hash: { Args: { p_hash: string }; Returns: undefined };
      sync_places_venues: {
        Args: { p_city_slug: string; p_rows: Json };
        Returns: {
          demo_deactivated: number;
          inserted: number;
          updated: number;
        }[];
      };
      typical_level: { Args: { p_at: string; p_venue_id: string }; Returns: number };
      unblock_user: { Args: { p_user_id: string }; Returns: undefined };
      undeclare: { Args: Record<PropertyKey, never>; Returns: undefined };
      unfollow: { Args: { p_user_id: string }; Returns: undefined };
      update_coarse_location: { Args: { p_lat: number; p_lng: number }; Returns: undefined };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
