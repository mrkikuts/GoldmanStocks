// Database types for the Rootline Supabase project.
//
// Generated from the LIVE schema via PostgREST's OpenAPI spec, because the schema was
// applied directly to the database rather than through supabase/migrations, and
// `supabase gen types` needs Docker (not installed here). Regenerate after any schema
// change: fetch /rest/v1/ with `Accept: application/openapi+json`.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      care_events: {
        Row: {
          id: string;
          plant_id: string;
          task_id: string | null;
          worker_id: string | null;
          date: string;
          action: string;
          done: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          plant_id: string;
          task_id?: string | null;
          worker_id?: string | null;
          date: string;
          action: string;
          done?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          plant_id?: string;
          task_id?: string | null;
          worker_id?: string | null;
          date?: string;
          action?: string;
          done?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      clients: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          city: string;
          sites: number;
          plants: number;
          contact: string;
          hours_this_month: number;
          monthly_value: number;
          contract_until: string | null;
          health: string;
          created_at: string;
        };
        Insert: {
          id: string;
          company_id: string;
          name: string;
          city: string;
          sites?: number;
          plants?: number;
          contact: string;
          hours_this_month?: number;
          monthly_value?: number;
          contract_until?: string | null;
          health?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          name?: string;
          city?: string;
          sites?: number;
          plants?: number;
          contact?: string;
          hours_this_month?: number;
          monthly_value?: number;
          contract_until?: string | null;
          health?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      companies: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      offers: {
        Row: {
          id: string;
          client_id: string;
          project_id: string;
          what: string;
          value: number;
          due_date: string;
          subject: string;
          body: string;
          status: string;
          created_at: string;
          approved_at: string | null;
        };
        Insert: {
          id?: string;
          client_id: string;
          project_id: string;
          what: string;
          value: number;
          due_date: string;
          subject: string;
          body: string;
          status?: string;
          created_at?: string;
          approved_at?: string | null;
        };
        Update: {
          id?: string;
          client_id?: string;
          project_id?: string;
          what?: string;
          value?: number;
          due_date?: string;
          subject?: string;
          body?: string;
          status?: string;
          created_at?: string;
          approved_at?: string | null;
        };
        Relationships: [];
      };
      plants: {
        Row: {
          id: string;
          project_id: string;
          species: string;
          common: string;
          kind: string;
          site: string;
          status: string;
          last_care: string | null;
          next_care: string | null;
          next_task: string | null;
          x: number;
          y: number;
          /** migration 0003 — absent (undefined) until it's applied */
          lat?: number | null;
          lng?: number | null;
          created_at: string;
        };
        Insert: {
          id: string;
          project_id: string;
          species: string;
          common: string;
          kind: string;
          site: string;
          status?: string;
          last_care?: string | null;
          next_care?: string | null;
          next_task?: string | null;
          x: number;
          y: number;
          lat?: number | null;
          lng?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          species?: string;
          common?: string;
          kind?: string;
          site?: string;
          status?: string;
          last_care?: string | null;
          next_care?: string | null;
          next_task?: string | null;
          x?: number;
          y?: number;
          lat?: number | null;
          lng?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          client_id: string;
          name: string;
          city: string;
          address: string;
          lat: number;
          lng: number;
          zones: string[];
          lead_worker_id: string | null;
          worker_ids: string[];
          visits_per_month: number;
          monthly_value: number;
          contract_until: string | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id: string;
          client_id: string;
          name: string;
          city: string;
          address: string;
          lat: number;
          lng: number;
          zones: string[];
          lead_worker_id?: string | null;
          worker_ids: string[];
          visits_per_month?: number;
          monthly_value?: number;
          contract_until?: string | null;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          name?: string;
          city?: string;
          address?: string;
          lat?: number;
          lng?: number;
          zones?: string[];
          lead_worker_id?: string | null;
          worker_ids?: string[];
          visits_per_month?: number;
          monthly_value?: number;
          contract_until?: string | null;
          status?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      task_photos: {
        Row: {
          id: string;
          task_id: string;
          storage_path: string;
          taken_at: string;
          lat: number | null;
          lng: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          storage_path: string;
          taken_at: string;
          lat?: number | null;
          lng?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          storage_path?: string;
          taken_at?: string;
          lat?: number | null;
          lng?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          title: string;
          project_id: string;
          site: string;
          plant_id: string | null;
          worker_id: string;
          day: number;
          date: string | null;
          start: number;
          duration: number;
          kind: string;
          weather_note: string | null;
          status: string;
          approved_at: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          title: string;
          project_id: string;
          site: string;
          plant_id?: string | null;
          worker_id: string;
          day: number;
          date?: string | null;
          start: number;
          duration: number;
          kind: string;
          weather_note?: string | null;
          status?: string;
          approved_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          project_id?: string;
          site?: string;
          plant_id?: string | null;
          worker_id?: string;
          day?: number;
          date?: string | null;
          start?: number;
          duration?: number;
          kind?: string;
          weather_note?: string | null;
          status?: string;
          approved_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      weather_cache: {
        Row: {
          key: string;
          fetched_at: string;
          payload: Json;
        };
        Insert: {
          key: string;
          fetched_at?: string;
          payload: Json;
        };
        Update: {
          key?: string;
          fetched_at?: string;
          payload?: Json;
        };
        Relationships: [];
      };
      workers: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          role: string;
          language: string;
          color: string;
          app_role: string;
          user_id: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          company_id: string;
          name: string;
          role: string;
          language: string;
          color: string;
          app_role?: string;
          user_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          name?: string;
          role?: string;
          language?: string;
          color?: string;
          app_role?: string;
          user_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
