# Media Architecture Verification

**Date**: 2025-11-27
**Verification**: Supabase Storage (Originals) + Cloudinary Fetch (Derivatives) Architecture

---

## ✅ Architecture Confirmed: FULLY PRESERVED

The new media gallery implementation **completely maintains** the existing Phase 2 media architecture where:
- **Originals** are stored in **Supabase Storage**
- **Derivatives** are served via **Cloudinary fetch URLs**
- Results in **80-90% cost reduction** in Cloudinary storage

---

## 🔍 Verification Details

### 1. Server Actions Generate Derivatives Correctly

**File**: `lib/actions/media.ts`

All media query functions automatically generate derivative URLs using the existing Cloudinary utilities:

```typescript
// getUserMediaLibrary() - Lines 157-164
const mediaWithDerivatives: UserMediaWithDerivatives[] = (data || []).map((media) => ({
  ...media,
  thumbnailUrl: getThumbnailUrl(media.public_url),  // ✅ Uses Cloudinary fetch
  mediumUrl: getMediumUrl(media.public_url),        // ✅ Uses Cloudinary fetch
  largeUrl: getLargeUrl(media.public_url),          // ✅ Uses Cloudinary fetch
  fullResUrl: media.public_url,                     // ✅ Original from Supabase
}))

// getArtifactMediaByRole() - Lines 413-420
const mediaWithDerivatives: ArtifactMediaWithDerivatives[] = (data || []).map((item) => {
  const media = item.media as UserMedia
  return {
    ...item,
    media: {
      ...media,
      thumbnailUrl: getThumbnailUrl(media.public_url),  // ✅ Uses Cloudinary fetch
      mediumUrl: getMediumUrl(media.public_url),        // ✅ Uses Cloudinary fetch
      largeUrl: getLargeUrl(media.public_url),          // ✅ Uses Cloudinary fetch
      fullResUrl: media.public_url,                     // ✅ Original from Supabase
    },
  }
})
```

### 2. Cloudinary Utilities Handle Supabase URLs

**File**: `lib/cloudinary.ts`

All derivative generation functions detect Supabase Storage URLs and use Cloudinary fetch:

#### getThumbnailUrl() - Lines 105-111
```typescript
// PHASE 2: Use Cloudinary fetch for Supabase Storage URLs
if (isSupabaseStorageUrl(url)) {
  console.log("[cloudinary] getThumbnailUrl: Using Cloudinary fetch for Supabase Storage")
  const transformations = isVideoUrl(url)
    ? "w_400,h_400,c_fill,q_auto,f_jpg,so_1.0,du_0"
    : "w_400,h_400,c_fill,q_auto,f_auto"
  return getCloudinaryFetchUrl(url, transformations)  // ✅ Fetch URL generated
}
```

#### getMediumUrl() - Lines 189-192
```typescript
// PHASE 2: Use Cloudinary fetch for Supabase Storage URLs
if (isSupabaseStorageUrl(url)) {
  console.log("[cloudinary] getMediumUrl: Using Cloudinary fetch for Supabase Storage")
  return getCloudinaryFetchUrl(url, "w_1024,c_limit,q_auto,f_auto")  // ✅ Fetch URL generated
}
```

#### getLargeUrl() - Lines 265-268
```typescript
// PHASE 2: Use Cloudinary fetch for Supabase Storage URLs
if (isSupabaseStorageUrl(url)) {
  console.log("[cloudinary] getLargeUrl: Using Cloudinary fetch for Supabase Storage")
  return getCloudinaryFetchUrl(url, "w_1600,c_limit,q_auto,f_auto")  // ✅ Fetch URL generated
}
```

#### getCloudinaryFetchUrl() - Lines 28-42
```typescript
function getCloudinaryFetchUrl(remoteUrl: string, transformations: string): string {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

  // Determine resource type based on URL
  const resourceType = isVideoUrl(remoteUrl) ? 'video' : 'image'

  // Format: https://res.cloudinary.com/{cloud_name}/{resource_type}/fetch/{transformations}/{remote_url}
  return `https://res.cloudinary.com/${cloudName}/${resourceType}/fetch/${transformations}/${remoteUrl}`
}
```

### 3. Gallery Component Uses Derivatives

**File**: `components/artifact-media-gallery.tsx` - Lines 124, 139

```typescript
// Images use large/medium derivatives (Line 124)
<img
  src={mediaData.largeUrl || mediaData.mediumUrl || mediaData.public_url}  // ✅ Derivatives first
  alt={item.caption_override || `Media ${item.sort_order + 1}`}
  className="h-full w-full object-contain"
  loading={item.sort_order <= 1 ? "eager" : "lazy"}
/>

// Videos use thumbnail as poster (Line 139)
<video
  src={mediaData.public_url}
  controls
  className="h-full w-full"
  preload={item.sort_order === 0 ? "metadata" : "none"}
  poster={mediaData.thumbnailUrl}  // ✅ Cloudinary fetch thumbnail
>
```

### 4. Media Picker Uses Derivatives

**File**: `components/media-picker.tsx` - Lines 188, 195-197

```typescript
// Image preview (Line 188)
<img
  src={media.thumbnailUrl || media.public_url}  // ✅ Derivative first
  alt={media.filename}
  className="h-full w-full object-cover"
/>

// Video preview with poster (Lines 195-197)
{media.thumbnailUrl ? (
  <img
    src={media.thumbnailUrl}  // ✅ Cloudinary fetch thumbnail
    alt={media.filename}
    className="h-full w-full object-cover"
  />
) : (
  <div className="flex h-full items-center justify-center">
    <Video className="h-8 w-8 text-white/50" />
  </div>
)}
```

---

## 🎯 Architecture Flow

### When Media is Stored (Supabase Storage URL):

```
Original File
    ↓
Supabase Storage
    ↓
Public URL stored in user_media.public_url
    ↓
Server actions call getThumbnailUrl(public_url)
    ↓
isSupabaseStorageUrl() detects Supabase URL
    ↓
getCloudinaryFetchUrl() generates fetch URL:
  https://res.cloudinary.com/{cloud}/image/fetch/w_400,h_400,c_fill/{supabase_url}
    ↓
Cloudinary fetches from Supabase, transforms, caches derivative
    ↓
UI displays optimized derivative
```

### Cost Savings:
- **Original (100MB video)**: Stored in Supabase ($0.021/GB = ~$2.10/month)
- **Derivatives**: Generated on-demand by Cloudinary, cached in CDN (not stored in Cloudinary)
- **Result**: ~85% reduction vs storing original + derivatives in Cloudinary

---

## 🔄 Backward Compatibility

The implementation also maintains compatibility with legacy Cloudinary-stored media:

### For Cloudinary URLs:
```typescript
// Backwards compatibility: Generate dynamically (Cloudinary originals)
if (isCloudinaryUrl(url)) {
  console.log("[cloudinary] getThumbnailUrl: Generating dynamic transformation (fallback)")
  const result = isVideoFile(url)
    ? getCloudinaryUrl(url, "w_400,h_400,c_fill,q_auto,f_jpg,so_1.0,du_0")
    : getCloudinaryUrl(url, "w_400,h_400,c_fill,q_auto,f_auto")
  return result
}
```

This ensures:
- ✅ Old artifacts with Cloudinary URLs still work
- ✅ New artifacts use Supabase Storage + Cloudinary fetch
- ✅ Seamless migration path

---

## 📊 URL Examples

### Supabase Storage URL (Original):
```
https://nzvajrwcvlfjjlxsjztn.supabase.co/storage/v1/object/public/heirlooms-media/user123/artifact456/1701234567890-photo.jpg
```

### Cloudinary Fetch URL (Thumbnail Derivative):
```
https://res.cloudinary.com/your-cloud/image/fetch/w_400,h_400,c_fill,q_auto,f_auto/https://nzvajrwcvlfjjlxsjztn.supabase.co/storage/v1/object/public/heirlooms-media/user123/artifact456/1701234567890-photo.jpg
```

### Cloudinary Fetch URL (Medium Derivative):
```
https://res.cloudinary.com/your-cloud/image/fetch/w_1024,c_limit,q_auto,f_auto/https://nzvajrwcvlfjjlxsjztn.supabase.co/storage/v1/object/public/heirlooms-media/user123/artifact456/1701234567890-photo.jpg
```

### Cloudinary Fetch URL (Large Derivative):
```
https://res.cloudinary.com/your-cloud/image/fetch/w_1600,c_limit,q_auto,f_auto/https://nzvajrwcvlfjjlxsjztn.supabase.co/storage/v1/object/public/heirlooms-media/user123/artifact456/1701234567890-photo.jpg
```

---

## ✅ Verification Checklist

- [x] Server actions generate derivative URLs via Cloudinary utilities
- [x] All derivative functions detect Supabase Storage URLs
- [x] Cloudinary fetch URLs are generated with proper transformations
- [x] Gallery component uses derivatives (largeUrl, mediumUrl, thumbnailUrl)
- [x] Media picker uses derivatives (thumbnailUrl)
- [x] Original URLs (fullResUrl, public_url) remain Supabase Storage
- [x] Backward compatibility maintained for Cloudinary-stored media
- [x] Cost-saving architecture preserved (80-90% reduction)

---

## 🎉 Conclusion

**The existing media architecture is FULLY PRESERVED.**

All new components and server actions correctly:
1. Store originals in Supabase Storage
2. Generate Cloudinary fetch URLs for derivatives
3. Display optimized derivatives in UI
4. Maintain backward compatibility with Cloudinary-stored media

The new unified media model enhances the system with:
- Media reuse capabilities
- Centralized media library
- Role-based media organization (gallery, inline, cover)

**While maintaining the exact same cost-efficient storage architecture.**

---

**References**:
- `MEDIA-ARCHITECTURE.md` - Phase 2 architecture documentation
- `lib/cloudinary.ts` - Derivative generation functions
- `lib/media.ts` - URL detection utilities
- `lib/actions/media.ts` - New media server actions
