--
-- PostgreSQL database dump
--

\restrict P6VajzkMlw68Cy1aBHfst5BtbyDthCbdjEl4xPGuYwWzsDSF8mLySN2IUcYS9e8

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pg_graphql; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_graphql WITH SCHEMA graphql;


--
-- Name: EXTENSION pg_graphql; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_graphql IS 'pg_graphql: GraphQL support';


--
-- Name: pg_stat_statements; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;


--
-- Name: EXTENSION pg_stat_statements; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_stat_statements IS 'track planning and execution statistics of all SQL statements executed';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: supabase_vault; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;


--
-- Name: EXTENSION supabase_vault; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION supabase_vault IS 'Supabase Vault Extension';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: wrappers; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS wrappers WITH SCHEMA extensions;


--
-- Name: EXTENSION wrappers; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION wrappers IS 'Foreign data wrappers developed by Supabase';


--
-- Name: detect_media_type(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.detect_media_type(url text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    AS $_$
BEGIN
  -- Check for image extensions
  IF url ~* '\.(jpg|jpeg|png|gif|webp|heic|heif)(\?|$)' THEN
    RETURN 'image';
  -- Check for video extensions
  ELSIF url ~* '\.(mp4|mov|avi|mkv|m4v|flv|wmv|webm)(\?|$)' THEN
    RETURN 'video';
  -- Check for audio extensions
  ELSIF url ~* '\.(mp3|wav|m4a|aac|ogg|opus)(\?|$)' THEN
    RETURN 'audio';
  ELSE
    -- Default to image if unknown
    RETURN 'image';
  END IF;
END;
$_$;


--
-- Name: FUNCTION detect_media_type(url text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.detect_media_type(url text) IS 'Helper function to detect media type (image/video/audio) from URL extension';


--
-- Name: detect_mime_type(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.detect_mime_type(url text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    AS $_$
DECLARE
  media_type TEXT;
BEGIN
  media_type := detect_media_type(url);

  CASE media_type
    WHEN 'image' THEN
      -- Try to detect specific image format
      IF url ~* '\.png(\?|$)' THEN RETURN 'image/png';
      ELSIF url ~* '\.gif(\?|$)' THEN RETURN 'image/gif';
      ELSIF url ~* '\.webp(\?|$)' THEN RETURN 'image/webp';
      ELSIF url ~* '\.heic(\?|$)' THEN RETURN 'image/heic';
      ELSIF url ~* '\.heif(\?|$)' THEN RETURN 'image/heif';
      ELSE RETURN 'image/jpeg';  -- Default for jpg/jpeg
      END IF;
    WHEN 'video' THEN
      -- Try to detect specific video format
      IF url ~* '\.mp4(\?|$)' THEN RETURN 'video/mp4';
      ELSIF url ~* '\.mov(\?|$)' THEN RETURN 'video/quicktime';
      ELSIF url ~* '\.avi(\?|$)' THEN RETURN 'video/x-msvideo';
      ELSIF url ~* '\.mkv(\?|$)' THEN RETURN 'video/x-matroska';
      ELSIF url ~* '\.webm(\?|$)' THEN RETURN 'video/webm';
      ELSE RETURN 'video/mp4';  -- Default
      END IF;
    WHEN 'audio' THEN
      -- Try to detect specific audio format
      IF url ~* '\.mp3(\?|$)' THEN RETURN 'audio/mpeg';
      ELSIF url ~* '\.wav(\?|$)' THEN RETURN 'audio/wav';
      ELSIF url ~* '\.m4a(\?|$)' THEN RETURN 'audio/mp4';
      ELSIF url ~* '\.aac(\?|$)' THEN RETURN 'audio/aac';
      ELSIF url ~* '\.ogg(\?|$)' THEN RETURN 'audio/ogg';
      ELSIF url ~* '\.opus(\?|$)' THEN RETURN 'audio/opus';
      ELSE RETURN 'audio/mpeg';  -- Default
      END IF;
    ELSE
      RETURN 'application/octet-stream';
  END CASE;
END;
$_$;


--
-- Name: FUNCTION detect_mime_type(url text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.detect_mime_type(url text) IS 'Helper function to detect MIME type from URL extension';


--
-- Name: extract_filename_from_url(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.extract_filename_from_url(url text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    AS $_$
DECLARE
  filename TEXT;
BEGIN
  -- Extract filename from URL path
  filename := substring(url from '/([^/]+)$');
  -- If no filename found, return a default
  IF filename IS NULL OR filename = '' THEN
    filename := 'unknown';
  END IF;
  RETURN filename;
END;
$_$;


--
-- Name: FUNCTION extract_filename_from_url(url text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.extract_filename_from_url(url text) IS 'Helper function to extract filename from URL';


--
-- Name: extract_storage_path(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.extract_storage_path(url text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    AS $_$
DECLARE
  path TEXT;
BEGIN
  -- Extract path after /storage/v1/object/public/heirlooms-media/
  path := substring(url from '/storage/v1/object/public/[^/]+/(.+)$');
  IF path IS NULL OR path = '' THEN
    -- Fallback: just use the filename
    path := extract_filename_from_url(url);
  END IF;
  RETURN path;
END;
$_$;


--
-- Name: FUNCTION extract_storage_path(url text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.extract_storage_path(url text) IS 'Helper function to extract storage path from Supabase Storage URL';


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      SPLIT_PART(NEW.email, '@', 1)
    )
  );
  RETURN NEW;
END;
$$;


--
-- Name: is_admin_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin_user() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  SELECT EXISTS(
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
$$;


--
-- Name: FUNCTION is_admin_user(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.is_admin_user() IS 'Returns true if the current authenticated user has admin privileges';


--
-- Name: update_artifact_media_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_artifact_media_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $$;


--
-- Name: update_user_media_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_user_media_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $$;


--
-- Name: heirlooms_media_fdw; Type: FOREIGN DATA WRAPPER; Schema: -; Owner: -
--

CREATE FOREIGN DATA WRAPPER heirlooms_media_fdw HANDLER extensions.iceberg_fdw_handler VALIDATOR extensions.iceberg_fdw_validator;


--
-- Name: heirlooms_media_fdw_server; Type: SERVER; Schema: -; Owner: -
--

CREATE SERVER heirlooms_media_fdw_server FOREIGN DATA WRAPPER heirlooms_media_fdw OPTIONS (
    catalog_uri 'https://lfssobatohlllwuieauc.storage.supabase.co/storage/v1/iceberg',
    "s3.endpoint" 'https://lfssobatohlllwuieauc.storage.supabase.co/storage/v1/s3',
    vault_aws_access_key_id 'cd96b284-5aad-4ed7-8d76-ce27399c72f7',
    vault_aws_secret_access_key '177011b2-1ac0-426b-b046-b72e0b6c6dc9',
    vault_token '25b3d849-36e0-42b6-8bf6-b4a83907ab68',
    warehouse 'heirlooms-media'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: artifact_media; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.artifact_media (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    artifact_id uuid NOT NULL,
    media_id uuid NOT NULL,
    role text DEFAULT 'gallery'::text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    block_id text,
    caption_override text,
    is_primary boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT role_check CHECK ((role = ANY (ARRAY['gallery'::text, 'inline_block'::text, 'cover'::text])))
);


--
-- Name: TABLE artifact_media; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.artifact_media IS 'Join table linking artifacts to media with roles (gallery/inline/cover) and custom ordering. Enables media reuse and flexible display.';


--
-- Name: COLUMN artifact_media.role; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.artifact_media.role IS 'Media role: gallery (top carousel), inline_block (embedded in content), cover (thumbnail)';


--
-- Name: COLUMN artifact_media.sort_order; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.artifact_media.sort_order IS 'Display order within the role (0-based). Allows different ordering in gallery vs inline.';


--
-- Name: COLUMN artifact_media.is_primary; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.artifact_media.is_primary IS 'Primary media for artifact (used as thumbnail if set)';


--
-- Name: artifact_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.artifact_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    icon_name text NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE artifact_types; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.artifact_types IS 'Dynamic artifact type system - types can be added, removed, or renamed without code changes';


--
-- Name: artifacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.artifacts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    collection_id uuid,
    user_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    year_acquired integer,
    origin text,
    media_urls text[],
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    transcript text,
    ai_description text,
    image_captions jsonb,
    analysis_status text,
    analysis_error text,
    language_hint text,
    video_summaries jsonb DEFAULT '{}'::jsonb,
    audio_transcripts jsonb DEFAULT '{}'::jsonb,
    audio_summaries jsonb DEFAULT '{}'::jsonb,
    slug text NOT NULL,
    thumbnail_url text,
    type_id uuid,
    media_derivatives jsonb,
    CONSTRAINT artifacts_analysis_status_check CHECK ((analysis_status = ANY (ARRAY['idle'::text, 'queued'::text, 'processing'::text, 'done'::text, 'error'::text])))
);


--
-- Name: COLUMN artifacts.thumbnail_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.artifacts.thumbnail_url IS 'Primary visual media URL used for artifact thumbnail. Auto-populated from first image/video, can be user-selected in future.';


--
-- Name: COLUMN artifacts.type_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.artifacts.type_id IS 'Artifact type - owned by artifact, persists across collection moves';


--
-- Name: COLUMN artifacts.media_derivatives; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.artifacts.media_derivatives IS 'Pre-generated derivative URLs for media. Format: { "original_url": { "thumb": "url", "medium": "url", "large": "url" } }. Enables predictable Cloudinary usage by storing derivatives instead of generating them dynamically.';


--
-- Name: collections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.collections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    cover_image text,
    is_public boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    slug text NOT NULL,
    primary_type_id uuid
);


--
-- Name: COLUMN collections.primary_type_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.collections.primary_type_id IS 'Optional preferred type - used as default when creating artifacts in this collection';


--
-- Name: pending_uploads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pending_uploads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    cloudinary_url text NOT NULL,
    cloudinary_public_id text NOT NULL,
    resource_type text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone DEFAULT (now() + '02:00:00'::interval)
);


--
-- Name: TABLE pending_uploads; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.pending_uploads IS 'Tracks temporary Cloudinary uploads that haven''t been saved to artifacts yet. Used for cleanup of abandoned uploads.';


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    display_name text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    theme_preference text DEFAULT 'light'::text,
    is_admin boolean DEFAULT false,
    view_preference text DEFAULT 'gallery'::text,
    artifacts_view_preference text DEFAULT 'standard'::text,
    CONSTRAINT profiles_artifacts_view_preference_check CHECK ((artifacts_view_preference = ANY (ARRAY['standard'::text, 'compact'::text]))),
    CONSTRAINT profiles_theme_preference_check CHECK ((theme_preference = ANY (ARRAY['light'::text, 'dark'::text]))),
    CONSTRAINT profiles_view_preference_check CHECK ((view_preference = ANY (ARRAY['gallery'::text, 'list'::text])))
);


--
-- Name: user_media; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_media (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    storage_path text NOT NULL,
    public_url text NOT NULL,
    filename text NOT NULL,
    mime_type text NOT NULL,
    file_size_bytes bigint NOT NULL,
    width integer,
    height integer,
    duration_seconds numeric(10,2),
    media_type text NOT NULL,
    upload_source text DEFAULT 'artifact'::text,
    is_processed boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT media_type_check CHECK ((media_type = ANY (ARRAY['image'::text, 'video'::text, 'audio'::text])))
);


--
-- Name: TABLE user_media; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.user_media IS 'Canonical storage for all user-uploaded media. Enables media reuse across artifacts and future media library features.';


--
-- Name: artifact_media artifact_media_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.artifact_media
    ADD CONSTRAINT artifact_media_pkey PRIMARY KEY (id);


--
-- Name: artifact_types artifact_types_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.artifact_types
    ADD CONSTRAINT artifact_types_name_key UNIQUE (name);


--
-- Name: artifact_types artifact_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.artifact_types
    ADD CONSTRAINT artifact_types_pkey PRIMARY KEY (id);


--
-- Name: artifact_types artifact_types_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.artifact_types
    ADD CONSTRAINT artifact_types_slug_key UNIQUE (slug);


--
-- Name: artifacts artifacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.artifacts
    ADD CONSTRAINT artifacts_pkey PRIMARY KEY (id);


--
-- Name: collections collections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collections
    ADD CONSTRAINT collections_pkey PRIMARY KEY (id);


--
-- Name: pending_uploads pending_uploads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pending_uploads
    ADD CONSTRAINT pending_uploads_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: artifact_media unique_artifact_media_order; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.artifact_media
    ADD CONSTRAINT unique_artifact_media_order UNIQUE (artifact_id, role, sort_order);


--
-- Name: user_media user_media_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_media
    ADD CONSTRAINT user_media_pkey PRIMARY KEY (id);


--
-- Name: user_media user_media_public_url_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_media
    ADD CONSTRAINT user_media_public_url_key UNIQUE (public_url);


--
-- Name: artifacts_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX artifacts_slug_key ON public.artifacts USING btree (slug);


--
-- Name: idx_artifact_media_artifact; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_artifact_media_artifact ON public.artifact_media USING btree (artifact_id);


--
-- Name: idx_artifact_media_by_media; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_artifact_media_by_media ON public.artifact_media USING btree (media_id, artifact_id);


--
-- Name: idx_artifact_media_covers; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_artifact_media_covers ON public.artifact_media USING btree (artifact_id, media_id) WHERE (role = 'cover'::text);


--
-- Name: idx_artifact_media_gallery_query; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_artifact_media_gallery_query ON public.artifact_media USING btree (artifact_id, role, sort_order) WHERE (role = 'gallery'::text);


--
-- Name: INDEX idx_artifact_media_gallery_query; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_artifact_media_gallery_query IS 'Optimizes gallery queries: "Get all gallery media for this artifact in display order"';


--
-- Name: idx_artifact_media_inline_blocks; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_artifact_media_inline_blocks ON public.artifact_media USING btree (artifact_id, block_id, sort_order) WHERE ((role = 'inline_block'::text) AND (block_id IS NOT NULL));


--
-- Name: idx_artifact_media_media; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_artifact_media_media ON public.artifact_media USING btree (media_id);


--
-- Name: idx_artifact_media_primary; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_artifact_media_primary ON public.artifact_media USING btree (artifact_id, is_primary) WHERE (is_primary = true);


--
-- Name: idx_artifact_media_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_artifact_media_role ON public.artifact_media USING btree (role);


--
-- Name: idx_artifact_media_sort; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_artifact_media_sort ON public.artifact_media USING btree (artifact_id, role, sort_order);


--
-- Name: idx_artifact_types_active_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_artifact_types_active_order ON public.artifact_types USING btree (is_active, display_order) WHERE (is_active = true);


--
-- Name: idx_artifact_types_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_artifact_types_slug ON public.artifact_types USING btree (slug);


--
-- Name: idx_artifacts_collection_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_artifacts_collection_id ON public.artifacts USING btree (collection_id);


--
-- Name: idx_artifacts_media_derivatives; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_artifacts_media_derivatives ON public.artifacts USING gin (media_derivatives);


--
-- Name: idx_artifacts_type_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_artifacts_type_id ON public.artifacts USING btree (type_id);


--
-- Name: idx_artifacts_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_artifacts_user_id ON public.artifacts USING btree (user_id);


--
-- Name: idx_collections_primary_type_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_collections_primary_type_id ON public.collections USING btree (primary_type_id);


--
-- Name: idx_collections_public; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_collections_public ON public.collections USING btree (is_public) WHERE (is_public = true);


--
-- Name: idx_collections_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_collections_slug ON public.collections USING btree (slug);


--
-- Name: idx_collections_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_collections_user_id ON public.collections USING btree (user_id);


--
-- Name: idx_pending_uploads_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pending_uploads_expires_at ON public.pending_uploads USING btree (expires_at);


--
-- Name: idx_pending_uploads_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pending_uploads_user_id ON public.pending_uploads USING btree (user_id);


--
-- Name: idx_profiles_theme; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_theme ON public.profiles USING btree (theme_preference);


--
-- Name: idx_user_media_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_media_created ON public.user_media USING btree (created_at DESC);


--
-- Name: idx_user_media_public_url; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_media_public_url ON public.user_media USING btree (public_url);


--
-- Name: idx_user_media_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_media_type ON public.user_media USING btree (media_type);


--
-- Name: idx_user_media_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_media_user_id ON public.user_media USING btree (user_id);


--
-- Name: idx_user_media_user_type_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_media_user_type_date ON public.user_media USING btree (user_id, media_type, created_at DESC);


--
-- Name: INDEX idx_user_media_user_type_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_user_media_user_type_date IS 'Optimizes media library queries: "Show me all my images/videos/audio sorted by date"';


--
-- Name: artifact_media artifact_media_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER artifact_media_updated_at_trigger BEFORE UPDATE ON public.artifact_media FOR EACH ROW EXECUTE FUNCTION public.update_artifact_media_updated_at();


--
-- Name: user_media user_media_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER user_media_updated_at_trigger BEFORE UPDATE ON public.user_media FOR EACH ROW EXECUTE FUNCTION public.update_user_media_updated_at();


--
-- Name: artifact_media artifact_media_artifact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.artifact_media
    ADD CONSTRAINT artifact_media_artifact_id_fkey FOREIGN KEY (artifact_id) REFERENCES public.artifacts(id) ON DELETE CASCADE;


--
-- Name: artifact_media artifact_media_media_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.artifact_media
    ADD CONSTRAINT artifact_media_media_id_fkey FOREIGN KEY (media_id) REFERENCES public.user_media(id) ON DELETE CASCADE;


--
-- Name: artifacts artifacts_collection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.artifacts
    ADD CONSTRAINT artifacts_collection_id_fkey FOREIGN KEY (collection_id) REFERENCES public.collections(id) ON DELETE CASCADE;


--
-- Name: artifacts artifacts_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.artifacts
    ADD CONSTRAINT artifacts_type_id_fkey FOREIGN KEY (type_id) REFERENCES public.artifact_types(id) ON DELETE SET NULL;


--
-- Name: artifacts artifacts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.artifacts
    ADD CONSTRAINT artifacts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: collections collections_primary_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collections
    ADD CONSTRAINT collections_primary_type_id_fkey FOREIGN KEY (primary_type_id) REFERENCES public.artifact_types(id) ON DELETE SET NULL;


--
-- Name: collections collections_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collections
    ADD CONSTRAINT collections_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: pending_uploads pending_uploads_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pending_uploads
    ADD CONSTRAINT pending_uploads_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_media user_media_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_media
    ADD CONSTRAINT user_media_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_media Allow public read for media linked to artifacts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read for media linked to artifacts" ON public.user_media FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.artifact_media
  WHERE (artifact_media.media_id = user_media.id))));


--
-- Name: artifact_types Anyone can view active artifact types; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active artifact types" ON public.artifact_types FOR SELECT USING ((is_active = true));


--
-- Name: artifact_types Only admins can manage artifact types; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can manage artifact types" ON public.artifact_types USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.is_admin = true)))));


--
-- Name: profiles Profiles are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);


--
-- Name: artifacts Users can delete own artifacts or admin can delete all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own artifacts or admin can delete all" ON public.artifacts FOR DELETE USING ((public.is_admin_user() OR (auth.uid() = user_id)));


--
-- Name: collections Users can delete own collections or admin can delete all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own collections or admin can delete all" ON public.collections FOR DELETE USING ((public.is_admin_user() OR (auth.uid() = user_id)));


--
-- Name: pending_uploads Users can delete their own pending uploads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own pending uploads" ON public.pending_uploads FOR DELETE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: artifacts Users can insert own artifacts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own artifacts" ON public.artifacts FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: collections Users can insert own collections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own collections" ON public.collections FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: pending_uploads Users can insert their own pending uploads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own pending uploads" ON public.pending_uploads FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles Users can insert their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = id));


--
-- Name: artifacts Users can update own artifacts or admin can update all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own artifacts or admin can update all" ON public.artifacts FOR UPDATE USING ((public.is_admin_user() OR (auth.uid() = user_id)));


--
-- Name: collections Users can update own collections or admin can update all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own collections or admin can update all" ON public.collections FOR UPDATE USING ((public.is_admin_user() OR (auth.uid() = user_id)));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: artifacts Users can view own artifacts or admin can view all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own artifacts or admin can view all" ON public.artifacts FOR SELECT USING ((public.is_admin_user() OR (auth.uid() = user_id) OR (EXISTS ( SELECT 1
   FROM public.collections
  WHERE ((collections.id = artifacts.collection_id) AND (collections.is_public = true))))));


--
-- Name: collections Users can view own collections or admin can view all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own collections or admin can view all" ON public.collections FOR SELECT USING ((public.is_admin_user() OR (auth.uid() = user_id) OR (is_public = true)));


--
-- Name: pending_uploads Users can view their own pending uploads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own pending uploads" ON public.pending_uploads FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: artifact_media; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.artifact_media ENABLE ROW LEVEL SECURITY;

--
-- Name: artifact_media artifact_media_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY artifact_media_delete ON public.artifact_media FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.artifacts
  WHERE ((artifacts.id = artifact_media.artifact_id) AND (artifacts.user_id = auth.uid())))));


--
-- Name: artifact_media artifact_media_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY artifact_media_insert ON public.artifact_media FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.artifacts
  WHERE ((artifacts.id = artifact_media.artifact_id) AND (artifacts.user_id = auth.uid())))));


--
-- Name: artifact_media artifact_media_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY artifact_media_select ON public.artifact_media FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.artifacts a
     LEFT JOIN public.collections c ON ((a.collection_id = c.id)))
  WHERE ((a.id = artifact_media.artifact_id) AND ((c.is_public = true) OR (a.user_id = auth.uid()) OR (c.user_id = auth.uid()))))));


--
-- Name: artifact_media artifact_media_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY artifact_media_update ON public.artifact_media FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.artifacts
  WHERE ((artifacts.id = artifact_media.artifact_id) AND (artifacts.user_id = auth.uid())))));


--
-- Name: artifact_types; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.artifact_types ENABLE ROW LEVEL SECURITY;

--
-- Name: artifacts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.artifacts ENABLE ROW LEVEL SECURITY;

--
-- Name: collections; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

--
-- Name: pending_uploads; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pending_uploads ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: user_media; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_media ENABLE ROW LEVEL SECURITY;

--
-- Name: user_media user_media_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_media_delete_own ON public.user_media FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: user_media user_media_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_media_insert_own ON public.user_media FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_media user_media_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_media_select_own ON public.user_media FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_media user_media_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_media_update_own ON public.user_media FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: supabase_realtime; Type: PUBLICATION; Schema: -; Owner: -
--

CREATE PUBLICATION supabase_realtime WITH (publish = 'insert, update, delete, truncate');


--
-- Name: issue_graphql_placeholder; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_graphql_placeholder ON sql_drop
         WHEN TAG IN ('DROP EXTENSION')
   EXECUTE FUNCTION extensions.set_graphql_placeholder();


--
-- Name: issue_pg_cron_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_pg_cron_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_cron_access();


--
-- Name: issue_pg_graphql_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_pg_graphql_access ON ddl_command_end
         WHEN TAG IN ('CREATE FUNCTION')
   EXECUTE FUNCTION extensions.grant_pg_graphql_access();


--
-- Name: issue_pg_net_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_pg_net_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_net_access();


--
-- Name: pgrst_ddl_watch; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER pgrst_ddl_watch ON ddl_command_end
   EXECUTE FUNCTION extensions.pgrst_ddl_watch();


--
-- Name: pgrst_drop_watch; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER pgrst_drop_watch ON sql_drop
   EXECUTE FUNCTION extensions.pgrst_drop_watch();


--
-- PostgreSQL database dump complete
--

\unrestrict P6VajzkMlw68Cy1aBHfst5BtbyDthCbdjEl4xPGuYwWzsDSF8mLySN2IUcYS9e8

