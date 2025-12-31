Below is a **Cloudinary Media Policy** you can adopt directly for your project.
It is written as an internal engineering guideline and is optimized for **feed-based social apps**, **free-tier safety**, and **long-term scalability**.

---

## Cloudinary Media Policy

### 1. Media Storage Rules

* All media assets **must be stored only in Cloudinary**.
* The backend **must never download, process, or re-serve media files**.
* The backend stores **only references**, not files:

  * `public_id`
  * `resource_type` (`image` or `video`)
  * Optional metadata (owner, post_id, timestamps).

---

### 2. Media Delivery Rules

* All media must be delivered via **Cloudinary CDN URLs**.
* Media URLs are generated dynamically using transformations.
* Direct access to original assets (`/upload/<public_id>`) is **not allowed** in production.

---

### 3. Mandatory Optimization Parameters

Every media URL **must include**:

* `f_auto` – automatic format (WebP/AVIF where supported)
* `q_auto` – automatic quality optimization

Failure to include these parameters is considered a policy violation.

---

### 4. Standardized Image Sizes

Media must be resized according to context to prevent oversized delivery:

| Context        | Width  | Notes                          |
| -------------- | ------ | ------------------------------ |
| Avatar         | 96px   | Square crop                    |
| Feed image     | 800px  | `c_limit`                      |
| Mobile feed    | 480px  | Default for small screens      |
| Modal / Detail | 1200px | Only when explicitly requested |

* Arbitrary sizes are not allowed.
* All image URLs must use `c_limit` unless a crop is required.

---

### 5. Responsive Images

* Use `<img>` tags with `srcset` and `sizes` where possible.
* Background images are allowed **only for decorative UI elements**, not primary content.
* Responsive delivery is preferred over serving multiple fixed images.

---

### 6. Lazy Loading Policy

* All images below the fold must use:

  * `loading="lazy"`
* All videos must use:

  * `preload="metadata"`
* Autoplay videos in feeds are discouraged unless muted and preview-only.

---

### 7. Video Optimization Rules

* All videos must include:

  * `f_auto`
  * `q_auto`
  * `vc_auto`
* Feed videos should use:

  * Short preview clips where possible
  * No full-length auto-download in feeds

---

### 8. Transformation Strategy

* **Eager transformations are not allowed**.
* All transformations must be:

  * URL-based
  * Generated on demand
  * Cached by Cloudinary CDN
* Transformation count must be minimized by reusing standard sizes.

---

### 9. Caching & Reuse

* One transformation URL per context should be reused everywhere.
* Do not generate new URLs with random widths or parameters.
* High cache hit rate is a priority.

---

### 10. Asset Lifecycle Management

* Unused or orphaned assets must be deleted regularly.
* Deleting assets frees storage and helps maintain free-tier limits.
* Media cleanup jobs should run periodically (manual or scheduled).

---

### 11. Free Plan Protection Rules

* No original-size deliveries.
* No backend proxying of media.
* No duplicate uploads of the same asset.
* No unnecessary derived assets.
* Always delete unused media.

---

### 12. Security & Access

* Use HTTPS (`secure=True`) for all URLs.
* Avoid exposing admin API keys to frontend.
* Optional: use signed URLs for private or sensitive content.

---

### 13. Compliance Checklist (Quick Audit)

Before deploying any feature involving media:

* [ ] Uses CDN URL only
* [ ] Includes `f_auto,q_auto`
* [ ] Width constrained
* [ ] Lazy loaded
* [ ] No backend media handling
* [ ] Uses standard sizes


