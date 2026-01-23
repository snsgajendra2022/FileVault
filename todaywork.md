Worked on PhotoStudio project.

Added perAlbumPrice, perPhotoPrice, and isPublic fields to album creation and editing functionality in PhotoStudioAlbum.tsx.

Updated create album mutation to accept perAlbumPrice, perPhotoPrice, and isPublic parameters and send them to POST /api/albums endpoint.

Updated update album mutation to accept perAlbumPrice, perPhotoPrice, and isPublic parameters and send them to PUT /api/albums/{id}/images endpoint.

Added Album Price (₹) input field to create album modal with validation for positive numeric values.

Added Price Per Photo (₹) input field to create album modal with validation for positive numeric values.

Added Make album public checkbox to create album modal for toggling album visibility.

Added Album Price (₹) input field to edit album modal that pre-populates existing perAlbumPrice value.

Added Price Per Photo (₹) input field to edit album modal that pre-populates existing perPhotoPrice value.

Added Make album public checkbox to edit album modal that pre-populates existing isPublic value.

Updated handleCreateAlbum function to parse and validate price inputs before sending to API.










Updated handleEditAlbum function to load existing perAlbumPrice, perPhotoPrice, and isPublic values when opening edit modal.

Updated handleUpdateAlbum function to parse and validate price inputs before sending to API.

Updated Album interface to include perAlbumPrice, perPhotoPrice, and isPublic fields.

Added state variables for new album fields: newAlbumPrice, newPerPhotoPrice, newAlbumIsPublic.

Added state variables for edit album fields: editAlbumPrice, editPerPhotoPrice, editAlbumIsPublic.

Updated toggleAlbum function in StudioCheckout.tsx to allow only one album selection at a time.

Modified album selection logic to automatically deselect previously selected album when selecting a new one.

Added disabled state logic to disable checkboxes for non-selected albums when one album is already selected.

Updated checkbox button styling to show disabled state with gray background and cursor-not-allowed.

Added visual feedback with reduced opacity (50%) on album cards when their checkbox is disabled.

Updated all form reset handlers to clear new pricing and public fields on modal close or cancel.
