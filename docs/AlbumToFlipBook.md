Create a production-ready premium Studio Album Flipbook Layout System for wedding, anniversary, birthday, engagement, party, family function, and event albums.

The flipbook pages must look like real professional photo studio albums, not like a basic image gallery. The design reference is professional Indian wedding album design, where pages include full-width cinematic photos, couple highlight circles, blended backgrounds, decorative borders, elegant typography, overlays, frame masks, collage layouts, and luxury event-style page compositions.

Main Objective:

When a user selects an album and creates a flipbook, the system should automatically generate beautiful studio-style album pages from the selected photos. The inner pages must look like real printed album designs used by wedding photography studios.

Do not create simple grids only. Build a complete layout engine with premium designer page templates.

Core Requirement:

The flipbook must support multiple event categories:

* Wedding
* Engagement
* Anniversary
* Birthday
* Party
* Reception
* Baby shower
* Family function
* Corporate event
* General photo album

Each event type should have matching themes, colors, decorative elements, and page layout styles.

1. Studio Album Page Design Style

Create inner flipbook pages with premium visual composition:

* Full-bleed photo background pages
* Couple-focused cover-style pages
* Large hero photo with small circular portrait overlays
* Blended photo collage pages
* Soft gradient background with photo frames
* Decorative wedding borders
* Golden ornamental frame patterns
* Floral corners
* Transparent photo overlays
* Magazine-style title placement
* Dark cinematic pages
* Light elegant pages
* Traditional Indian wedding red/gold themes
* Modern white luxury themes
* Black-gold premium themes
* Pastel anniversary themes
* Colorful party/birthday themes

Pages must feel like professionally designed albums from a photography studio.

2. Auto Layout Generation

When an album has many images, for example 40 images, the system should automatically arrange them into multiple flipbook pages.

The layout engine should:

* Detect total image count
* Detect image orientation: portrait, landscape, square
* Detect aspect ratio
* Select best page template automatically
* Place images in visually balanced positions
* Avoid simple repeated grid layouts
* Avoid awkward cropping
* Avoid empty spaces
* Avoid duplicate images on generated pages
* Feature important-looking images as hero images
* Create designer-style page variety

For 40 images, the output should create multiple studio album pages such as:

* Cover page
* Couple highlight page
* Ceremony page
* Family/group page
* Detail/moment page
* Candid collage page
* Full image spread page
* Multi-photo designer collage page
* Closing page

3. Required Page Templates

Create a library of professional studio album templates.

Template examples:

A. Wedding Story Cover Layout

* One large cinematic background image
* Couple name/title area
* Circular portrait overlay
* Soft dark/light gradient
* Elegant text area
* Optional wedding date

B. Hero Image With Circular Highlights

* One large main image
* Two or three circular/oval image frames
* One faded grayscale image on side
* Elegant “Wedding Story” or custom title text
* Decorative divider

C. Double Spread Couple Layout

* One wide landscape image across the full page
* Soft vignette overlay
* Small inset portrait frames
* Text/caption area

D. Three Image Premium Collage

* One large hero image
* Two smaller supporting images
* Soft shadows
* Rounded image frames
* Decorative background texture

E. Four Image Studio Grid

* Four photos arranged with premium spacing
* Different frame sizes, not plain equal grid only
* Optional caption label

F. Full-Bleed Ceremony Page

* One full-page image
* Minimal text overlay
* Soft gradient for readability
* Optional page title

G. Traditional Wedding Red/Gold Page

* Red/maroon/gold background
* Decorative borders
* Floral or mandap-inspired corner elements
* Photos placed in designer frames

H. Modern Luxury White Page

* White or cream background
* Thin gold lines
* Large photo with two small detail photos
* Clean premium typography

I. Black Cinematic Page

* Black/dark background
* One large dramatic image
* Golden title text
* Small side portraits

J. Anniversary Romantic Layout

* Soft pastel background
* Heart/floral accents
* Couple photo highlight
* Elegant caption placement

K. Birthday / Party Layout

* Colorful gradient background
* Fun photo collage
* Confetti or celebration elements
* Large title text area

L. Family Function Layout

* Group photo hero section
* Small family moment photos
* Warm background and soft frames

M. Closing / Thank You Page

* One beautiful final image
* Thank-you message
* Date/event name
* Elegant minimal design

4. Dynamic Template Selection Logic

The system should select page layouts based on the images available.

Rules:

* Landscape images should be used for full-width hero/background layouts.
* Portrait images should be used in vertical frames, circular frames, and side highlights.
* Square images should work well in collage templates.
* High-resolution images should be preferred for full-bleed and hero sections.
* Multiple similar images should be grouped into collage pages.
* Important images should be selected for cover and hero pages.
* If image metadata/facial detection is available, couple/people-focused images should be used for cover and hero templates.
* If metadata is not available, use image dimensions, order, and quality score.

5. Page Composition Quality

Every generated page should follow design-quality rules:

* Maintain visual hierarchy
* Use one clear hero image per important page
* Keep enough spacing between image frames
* Use consistent margins
* Use proper alignment
* Use premium border radius and shadows
* Use object-fit carefully
* Avoid cutting faces badly
* Avoid stretching images
* Avoid placing text over busy image areas without overlay
* Use readable typography
* Keep background and images balanced
* Keep each page unique, not repetitive

6. Image Masks and Frames

Add support for professional album-style image frames:

* Rectangle frames
* Rounded rectangle frames
* Circle frames
* Oval frames
* Polaroid-style frames
* Border frame
* Golden frame
* Soft shadow frame
* Full-bleed mask
* Diagonal/angled frame
* Overlapping collage frame
* Transparent blended frame
* Grayscale faded background image frame

The user should be able to change the frame style manually in the builder.

7. Background System

Each flipbook page should support dynamic backgrounds:

* Solid color
* Gradient background
* Image background
* Blurred image background
* Pattern background
* Wedding ornamental background
* Floral background
* Soft paper texture
* Dark cinematic background
* Light luxury background

Background settings must be saved in the database, not temporary state.

8. Text and Title System

Support professional album text elements:

* Event title
* Couple name
* Album title
* Date
* Venue
* Page caption
* Quote
* Thank-you text
* Custom text block

Text styling options:

* Font family
* Font size
* Font weight
* Color
* Shadow
* Letter spacing
* Alignment
* Position
* Rotation
* Decorative divider

Text should be editable and saved permanently.

9. Manual Customization in Builder

After auto-generation, the user must be able to customize every page.

Allow user to:

* Change page template
* Change background
* Replace any image
* Drag image position
* Resize image
* Crop image
* Change fit mode: cover, contain, fill
* Change frame/mask style
* Add circular photo overlays
* Add/remove text
* Move images between pages
* Reorder pages
* Add new page
* Delete page
* Duplicate page
* Reset current page layout
* Regenerate whole flipbook after confirmation

10. Flipbook Builder UI

Create a professional designer-like builder interface.

Left Panel:

* Page thumbnails
* Page reorder
* Add page
* Duplicate page
* Delete page

Center:

* Live page canvas
* Editable album page design
* Select image/text elements
* Drag and resize elements
* Zoom in/out
* Previous/next page

Right Panel:

* Template selector
* Theme selector
* Background controls
* Image frame controls
* Crop/fit controls
* Text controls
* Layer controls
* Page settings

Top Bar:

* Back to Albums
* Flipbook title
* Auto-save status
* Save Draft
* Preview
* Publish

11. Theme System

Create ready-made themes:

Wedding Royal:

* Maroon, gold, cream, dark red
* Ornamental borders
* Traditional Indian wedding feel

Wedding Modern:

* White, beige, champagne, gold
* Minimal luxury look

Cinematic Black:

* Black, charcoal, gold
* Dramatic studio look

Anniversary Romantic:

* Rose, cream, soft pink, gold
* Romantic soft styling

Birthday Party:

* Bright colors, gradients, celebration accents
* Fun, modern layout

Family Classic:

* Warm neutral colors
* Simple elegant frames

Each theme should control:

* Background color
* Accent color
* Border style
* Font style
* Decorative elements
* Default page templates

12. Production Data Structure

Use real database storage for all flipbook layouts.

Recommended entities:

flipbooks

* id
* album_id
* user_id
* title
* event_type
* theme
* status
* cover_image_id
* settings_json
* created_at
* updated_at

flipbook_pages

* id
* flipbook_id
* page_number
* page_type
* layout_type
* background_type
* background_value
* theme_variant
* settings_json
* created_at
* updated_at

flipbook_page_elements

* id
* flipbook_page_id
* element_type: image/text/shape/decorative
* album_image_id
* content
* x
* y
* width
* height
* rotation
* z_index
* opacity
* mask_type
* frame_type
* fit_mode
* crop_x
* crop_y
* crop_width
* crop_height
* style_json
* created_at
* updated_at

album_images

* id
* album_id
* image_url
* thumbnail_url
* width
* height
* aspect_ratio
* orientation
* quality_score
* sort_order
* metadata_json
* created_at
* updated_at

13. API Requirements

Create real production APIs:

GET /albums
GET /albums/{albumId}
GET /albums/{albumId}/images


* Publish final flipbook

14. Important Production Rules

* Do not use dummy images.
* Do not use temporary hardcoded layout data.
* Do not create only frontend fake preview.
* Do not store customization only in local state.
* Do not modify original album images directly.
* Save all flipbook page layouts, image positions, text, crop, masks, and styles permanently in the database.
* Keep album data and flipbook design data separate.
* Same album should support multiple flipbooks.
* Every action must use real APIs.
* Apply authentication and ownership checks.
* Validate every request on backend.
* Add loading, error, empty, permission denied, and save-failed states.
* Use thumbnails for builder and full images only for preview/viewer.
* Lazy-load images.
* Keep the code clean, modular, typed, and production-ready.

15. Final Expected Output

The final flipbook should look like a professional studio album.

For a wedding album:

* First page should look like a premium wedding story cover.
* Inner pages should include couple highlight layouts, ceremony pages, family collage pages, full-bleed photo pages, and designer collage pages.
* User should feel that the album was designed by a professional wedding studio.
* The flipbook should support page-turn animation and responsive viewing.

For anniversary or party albums:

* Layouts and theme should change according to the event type.
* Pages should still look premium and designer-made.

This system must be production-ready, dynamic, beautiful, customizable, scalable, and suitable for real studio album flipbooks.
Create a production-ready, pixel-perfect Studio Album Flipbook Page Layout System with professional wedding studio album quality.

The main focus is perfect visual layout: exact page size, image size, font size, padding, margin, border, border-radius, spacing, width, height, alignment, and responsive scaling. The final flipbook pages must look clean, premium, balanced, and professionally designed. Do not create congested layouts, oversized elements, uneven spacing, random image sizes, or messy alignment.

This feature must be built on top of the existing album and album image system. Do not create or modify album APIs, album image APIs, upload logic, or existing album data structure. Use existing album images only as the source.

Main Visual Goal:

The flipbook pages should look like real studio-designed albums for:

* Wedding
* Engagement
* Anniversary
* Birthday
* Party
* Reception
* Baby shower
* Family function
* Corporate event
* General photo album

The layout should feel like a premium printed photo album, not a normal gallery.

1. Page Size and Canvas Rules

Use a fixed design canvas ratio for each flipbook page so every layout remains consistent.

Recommended design canvas:

* Landscape album page ratio: 16:10 or 4:3
* Standard internal design size: 1600px × 1000px
* Alternative square design size if required: 1200px × 1200px
* All element positions should be calculated as percentages or normalized values so layouts scale perfectly on mobile, tablet, and desktop.

Rules:

* Do not use random page sizes.
* Do not let pages stretch differently on different screens.
* Maintain the same design ratio everywhere.
* Use object-fit correctly for all photos.
* Keep all images inside safe boundaries unless the layout intentionally uses full-bleed design.
* Do not allow horizontal overflow.
* Do not allow cropped text.
* Do not allow distorted photos.

2. Safe Area, Padding, and Margins

Every page must follow a strict spacing system.

Canvas spacing rules:

* Outer safe margin: 4% to 6% of canvas width.
* Inner gap between images: 1.5% to 2.5% of canvas width.
* Text-to-image spacing: minimum 24px on desktop design canvas.
* Decorative border inset: 24px to 48px depending on theme.
* Never place text or important face areas too close to the page edge.
* Keep visual breathing space on every page.

Do not make pages too crowded.
Do not fill every empty space unnecessarily.
Do not create cramped collage pages.

3. Image Size Rules

Each layout template must define exact image slots.

Every image slot must include:

* x position
* y position
* width
* height
* border radius
* frame style
* object-fit mode
* z-index
* crop behavior
* shadow style
* alignment behavior

Image rules:

* Hero image should usually occupy 50% to 80% of the page depending on template.
* Supporting images should usually occupy 15% to 35% of the page.
* Circular portrait overlays should usually be 12% to 22% of page width.
* Small decorative photos should not be too tiny.
* Do not use more than 4 to 6 images on premium studio pages unless the user selects compact/archive layout.
* For wedding/studio layout, prefer 1 to 4 images per page for premium feel.
* Do not stretch portrait images into landscape frames.
* Do not stretch landscape images into portrait frames.
* Use cover, contain, and crop behavior carefully.
* Face-focused images should not be badly cropped.

4. Font Size and Typography Rules

Use a professional typography scale.

Recommended desktop design canvas font sizes:

* Main album title: 48px to 72px
* Couple/event name: 56px to 90px depending on design
* Page heading: 32px to 48px
* Caption: 18px to 26px
* Date/venue text: 16px to 22px
* Small decorative label: 14px to 18px

Rules:

* Do not use too many font sizes on one page.
* Maximum 2 font families per theme.
* Use elegant serif/script font only for title or couple name.
* Use clean sans-serif font for captions and readable text.
* Text must never overlap photos unless there is a readable overlay.
* Text over image must use gradient, shadow, or semi-transparent background.
* Maintain readable contrast.
* Do not place text randomly.
* Text alignment must match the page composition.

5. Border and Radius Rules

Use premium, consistent image styling.

Image frame options:

* No border for full-bleed hero image
* 1px subtle white border for clean image cards
* 2px gold border for wedding luxury layouts
* 6px to 12px white photo frame for studio collage
* 12px to 28px border-radius for modern layouts
* 50% radius for circular portraits
* Oval frame for couple highlight portraits

Rules:

* Border radius must be consistent inside each template.
* Do not mix too many frame styles on the same page.
* Use soft shadows, not harsh shadows.
* Use decorative borders only where theme requires.
* Wedding Royal may use gold borders and ornamental corners.
* Modern Luxury should use thin gold lines and clean radius.
* Cinematic Black should use sharp or slightly rounded frames.

6. Layout Density Rules

Each page must have controlled visual density.

Premium studio layout:

* 1 hero image + 1 to 3 supporting images.
* Enough whitespace or negative space.
* Clear visual hierarchy.
* Balanced image sizes.
* Clean text placement.

Avoid:

* Too many images on one page.
* Tiny photos.
* Text squeezed between images.
* Overlapping elements without design purpose.
* Randomly placed circles.
* Unequal gaps.
* Unbalanced empty corners.
* Congested collage.

7. Required Page Templates With Exact Layout Behavior

Create reusable templates with fixed slot definitions.

Template 1: Wedding Story Cover

* Full-page background hero image.
* Dark/soft gradient overlay from bottom or side.
* Title area inside safe margin.
* Couple/event name large and elegant.
* Optional circular portrait overlay 16% to 20% of page width.
* Text must not cover faces.

Template 2: Hero With Circular Highlights

* Main hero image: 60% to 70% page width.
* Two circular portraits: 14% to 18% page width each.
* One title block: 25% to 35% page width.
* Decorative divider under title.
* Gaps must be equal and aligned.

Template 3: Modern Luxury White Gold

* Background: white/cream.
* Main image: 55% to 65% page width.
* Two supporting images stacked or aligned.
* Thin gold divider lines.
* Border radius: 18px to 28px.
* Padding: clean and spacious.

Template 4: Three Image Premium Collage

* One large image: 55% to 65% page area.
* Two small images: each 18% to 25% page area.
* Equal image gaps.
* Soft shadow.
* Optional small caption.

Template 5: Four Image Studio Grid

* Four images arranged asymmetrically, not plain boring grid.
* Keep equal spacing.
* Use one slightly larger featured photo.
* No image should be smaller than 18% page width.
* Add optional title/caption only if space is available.

Template 6: Full-Bleed Ceremony Page

* One photo covers full canvas.
* Gradient overlay for text.
* Small title/date at bottom or side.
* No extra clutter.

Template 7: Royal Wedding Red Gold

* Maroon/red/dark gold theme.
* Decorative border inside canvas.
* Main image with gold frame.
* Two supporting portraits/circles.
* Typography must look elegant and readable.
* Avoid too many ornaments.

Template 8: Cinematic Black Gold

* Dark/black background.
* One large dramatic image.
* Gold title or caption.
* Minimal supporting image.
* Strong contrast but not harsh.

Template 9: Anniversary Romantic

* Soft pink/cream/rose background.
* Couple photo as hero.
* Rounded frames.
* Heart/floral accents used subtly.
* Soft typography.

Template 10: Birthday Party

* Bright but controlled colors.
* Confetti/decorative elements should not cover images.
* Fun title area.
* Collage with balanced spacing.

Template 11: Family Classic

* Warm neutral background.
* Group photo as hero.
* Smaller family moment photos.
* Simple border and soft shadow.

Template 12: Closing Thank You Page

* One clean final image.
* Thank-you text.
* Date/event name.
* Minimal, elegant layout.
* Plenty of negative space.

8. Auto Layout Engine Precision

The layout engine must choose templates based on image orientation and count.

Rules:

* Landscape images should be used for full-width hero/background pages.
* Portrait images should be used for vertical frames or circular/oval overlays.
* Square images should be used in collage slots.
* High-resolution images should be used for hero/full-bleed sections.
* Do not place portrait images into wide hero slots unless crop is safe.
* Do not repeat the same layout continuously.
* Do not repeat the same image.
* Do not create empty-looking pages.
* Do not place text over faces.
* Keep all page elements aligned to a layout grid.

9. Layout Grid System

Use a hidden grid system for every page.

Recommended grid:

* 12-column layout grid.
* 8px base spacing system.
* All x/y/width/height values should align to the grid.
* Use consistent spacing tokens:

  * xs: 8px
  * sm: 12px
  * md: 16px
  * lg: 24px
  * xl: 32px
  * 2xl: 48px
  * 3xl: 64px

Do not use random pixel values.
Do not create inconsistent margins between templates.

10. Responsive Scaling

The flipbook must scale perfectly.

Desktop:

* Show full page with side controls.
* Maintain design ratio.
* Use high-quality preview.

Tablet:

* Keep same page ratio.
* Reduce side panels or make them collapsible.
* Maintain readable controls.

Mobile:

* Page viewer should use swipe.
* Builder controls should use bottom sheet/drawer.
* Do not show congested side panels.
* Text must scale down proportionally.
* Images must preserve aspect ratio.
* No overflow or clipped content.

11. Builder UI Precision

Builder interface must be clean and professional.

Left Panel:

* Width: 260px to 320px desktop.
* Page thumbnail ratio same as page canvas.
* Thumbnail gap: 12px to 16px.
* Selected thumbnail border: 2px accent color.
* Do not make thumbnail list congested.

Center Canvas:

* Canvas should be centered.
* Use neutral workspace background.
* Provide enough padding around canvas.
* Selected element should show clean handles.
* Drag/resize handles should not cover too much image area.

Right Panel:

* Width: 300px to 360px desktop.
* Controls grouped into sections.
* Section padding: 16px to 20px.
* Form controls should be aligned.
* No crowded controls.
* Use collapsible sections if too many options.

Top Bar:

* Height: 64px to 72px.
* Buttons aligned properly.
* Save status visible.
* Back, Preview, Publish actions clear.

12. Image Editing Precision

When user selects an image:

* Show exact crop/fit controls.
* Show position and size controls if needed.
* Allow reset crop.
* Allow change frame/radius/shadow.
* Maintain image boundaries.
* Prevent image from being dragged accidentally outside canvas unless allowed.
* Snap movement to grid optionally.
* Keep resize handles smooth and accurate.

13. Text Editing Precision

When user selects text:

* Show font size, color, weight, alignment, letter spacing.
* Text boxes should not overflow.
* Auto-fit text or show overflow warning.
* Support line-height control.
* Use readable default line-height:

  * Heading: 1.1 to 1.2
  * Caption/body: 1.4 to 1.6

14. Save and Persistence

Every visual detail must be saved permanently:

* page size
* layout type
* x/y position
* width/height
* border radius
* border style
* shadow
* image crop
* image fit mode
* mask type
* frame type
* background
* font size
* font family
* text color
* text position
* z-index
* opacity
* theme
* decorative elements

Do not store these only in frontend state.
Do not lose layout after refresh.
Do not use dummy or temporary layout data.

15. Quality Checklist

Before finalizing, verify:

* All images are aligned.
* No text overlaps unexpectedly.
* No image is stretched.
* No page looks congested.
* No page has random spacing.
* No element goes outside canvas.
* No important face is badly cropped where avoidable.
* Borders and radius are consistent.
* Fonts are readable.
* Margins and padding are balanced.
* Page looks premium on desktop, tablet, and mobile.
* Flipbook feels like a real studio album.

16. Strict Final Rule

Do not create a basic gallery.
Do not create simple grid-only pages.
Do not use random sizes.
Do not use random padding or margin.
Do not make crowded layouts.
Do not leave visual mistakes.
Do not create temporary or demo UI.

Create a clean, elegant, pixel-perfect, studio-quality flipbook page layout system where every page has professional image sizing, typography, border, radius, spacing, padding, margin, width, height, and responsive behavior.



Use for tracking the JOB

curl -X GET "http://127.0.0.1:8000/jobs/<JOB_ID>"
Generate the client access key for your project

curl -X POST "http://127.0.0.1:8000/api/v1/admin/tenant/token/issue" \
     -H "Authorization: Bearer <ADMIN_JWT_TOKEN>" \
     -H "Content-Type: application/json" \
     -d '{
       "tenant_id": "tenant_alpha",
       "name": "External App Token",
       "scopes": ["read", "write"]
     }'
Retrieves all recognized profiles inside the tenant partition.

curl -X GET "http://127.0.0.1:8000/api/people?page=1&per_page=40" \
     -H "Authorization: Bearer <CLIENT_TOKEN>"
Get Person Details & Photo filenames

curl -X GET "http://127.0.0.1:8000/api/person/Person_1" \
     -H "Authorization: Bearer <CLIENT_TOKEN>"
Ankit Jha, 9 min
, Edited
Display/Fetch Thumbnails

curl -X GET "http://127.0.0.1:8000/api/album/photo/Person_1/thumbs/image_name.webp" \
     -H "Authorization: Bearer <CLIENT_TOKEN>" \
     --output thumb.webp

Display/Fetch Original Photo
curl -X GET "http://127.0.0.1:8000/api/album/photo/Person_1/image_name.jpg" \
     -H "Authorization: Bearer <CLIENT_TOKEN>" \
     --output original.jpg

 Search Database by Face
curl -X POST "http://127.0.0.1:8000/api/search/face?top_k=5" \
     -H "Authorization: Bearer <CLIENT_TOKEN>" \
     -F "file=@/path/to/search_face.jpg"
Rename Identified Profile

curl -X POST "http://127.0.0.1:8000/api/person/rename" \
     -H "Authorization: Bearer <CLIENT_TOKEN>" \
     -H "Content-Type: application/json" \
     -d '{
       "person_id": "Person_1",
       "name": "Jane Doe"
     }'
Merge Profiles

curl -X POST "http://127.0.0.1:8000/api/person/merge" \
     -H "Authorization: Bearer <CLIENT_TOKEN>" \
     -H "Content-Type: application/json" \
     -d '{
       "source": "Person_2",
       "target": "Jane Doe",
       "preview_only": false,
       "force": true
     }'
