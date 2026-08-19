# Work status — 5 Aug 2026

Fixed Add Images to Album modal: photos and video posters now show (eager thumbs, reliable URLs) instead of filenames / “MP4” only.
Raised album modal z-index so it sits above the header; selection and add-to-album flow still work.
Studio Flipbook: left page thumbnails now match the main canvas (same crop, zoom, and frames).
Fixed polaroid / padded frames collapsing photos into thin strips; shared frame chrome for canvas, thumbs, and preview.
Box resize/move commits cleanly; width/height save to the API and reload correctly after Save.
Flipbook preview remounts with latest layout so edited box sizes show in Flipbook view, not a stale book.
Pages panel UI polished (selection, spacing); CropImageDisplay matches DraggableCropImage fill so thumbs/PDF stay WYSIWYG.
