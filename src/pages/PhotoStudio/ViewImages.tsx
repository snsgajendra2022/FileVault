import { FiDownload } from "react-icons/fi";

// const ViewImages = ( { image }: { image: string }  { closeLightbox }: { closeLightbox: () => void }  { handleDownload }: { handleDownload: () => void }  ) => {

//   return (
//     <div
//     className="fixed inset-0 z-50 bg-black"
//     role="dialog"
//     aria-modal="true"
//     aria-label="Image preview"
//   >
//     {/* Overlay controls */}
//     <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-3 pointer-events-none">
//       <h3 className="text-sm font-medium text-white/90 truncate max-w-[50%] drop-shadow-lg">
//         {selectedImage.filename}
//       </h3>
//       <div className="flex items-center gap-1 pointer-events-auto">
//         <button
//           type="button"
//           onClick={() => handleDownload(selectedImage)}
//           className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
//           aria-label="Download"
//         >
//           <FiDownload className="h-5 w-5" />
//         </button>
//         <button
//           type="button"
//           onClick={closeLightbox}
//           className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
//           aria-label="Close"
//         >
//           <FaTimes className="h-5 w-5" />
//         </button>
//       </div>
//     </div>
//     <div className="absolute inset-0 pt-14">
//         {isImageType(selectedImage.fileType) ? (
//           (() => {
//             const thumbUrl = selectedImage.thumbnailUrl || selectedImage.previewUrl;
//             const previewUrl = selectedImage.previewUrl;
//             const hasDistinctPreview =
//               !!previewUrl &&
//               previewUrl !== thumbUrl &&
//               lightboxPreviewReady &&
//               !lightboxPreviewFailed;
//             const showingPreviewOverlay = hasDistinctPreview && lightboxPreviewVisible;
//             const isLoadingPreview =
//               !!previewUrl &&
//               previewUrl !== thumbUrl &&
//               !lightboxPreviewReady &&
//               !lightboxPreviewFailed;
//             const isZoomed = lightboxZoom > 1;
//             return (
//               <div
//                 ref={lightboxZoomContainerRef}
//                 className="relative flex justify-center items-center w-full h-full overflow-hidden select-none"
//                 style={{ cursor: lightboxIsPanning ? 'grabbing' : isZoomed ? 'grab' : 'default' }}
//                 onWheel={handleLightboxWheel}
//                 onMouseDown={handleLightboxMouseDown}
//                 onDoubleClick={handleLightboxDoubleClick}
//                 role="presentation"
//               >
//                 <div
//                   className="absolute flex justify-center items-center w-full h-full"
//                   style={{
//                     transform: `translate(50%, 50%) translate(${lightboxPan.x}px, ${lightboxPan.y}px) scale(${lightboxZoom}) translate(-50%, -50%)`,
//                     transition: lightboxIsPanning ? 'none' : 'transform 0.1s ease-out',
//                   }}
//                 >
//                   {selectedImage.fileType !== 'unknown' && (
//                     <>
//                       {/* Thumbnail as loading background - always visible until preview loads */}
//                       <img
//                         src={thumbUrl}
//                         alt={selectedImage.filename}
//                         className={`w-full h-full object-contain transition-opacity duration-300 ${
//                           showingPreviewOverlay ? 'opacity-0' : 'opacity-100'
//                         }`}
//                         onLoad={() => setLightboxImageLoaded(true)}
//                         draggable={false}
//                       />
//                       {/* Loading overlay on top of thumbnail - thumbnail stays visible as background */}
//                       {isLoadingPreview && (
//                         <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30">
//                           <LoadingSpinner size="lg" />
//                           <span className="mt-2 text-sm text-white">Loading...</span>
//                         </div>
//                       )}
//                     </>
//                   )}
//                   {/* Full preview displayed when loading complete */}
//                   {hasDistinctPreview && selectedImage.fileType !== 'unknown' && (
//                     <img
//                       src={previewUrl}
//                       alt={selectedImage.filename}
//                       className={`absolute w-full h-full object-contain transition-opacity duration-300 ${
//                         lightboxPreviewVisible ? 'opacity-100' : 'opacity-0'
//                       }`}
//                       style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
//                       draggable={false}
//                     />
//                   )}
//                 </div>
//                 {isZoomed && (
//                   <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-white/70 bg-black/50 px-3 py-1.5 rounded">
//                     Scroll to zoom · Drag to pan · Double-click to reset
//                   </p>
//                 )}
//                 {selectedImage.fileType === 'unknown' && (
//                   <video
//                     src={selectedImage.previewUrl}
//                     className="w-full h-full object-contain"
//                     controls
//                     muted
//                     playsInline
//                     preload="auto"
//                   />
//                 )}
//               </div>
//             );
//           })()
//         ) : isVideoType(selectedImage.fileType, selectedImage.filename) ? (
//           <div className="relative flex justify-center items-center w-full h-full">
//             <video
//               src={selectedImage.previewUrl}
//               className="w-full h-full object-contain"
//               controls
//               muted
//               playsInline
//               preload="auto"
//             />
//           </div>
//         ) : (
//           <div className="flex items-center justify-center w-full h-full bg-gray-900">
//             <div className={`${getFileTypeColor(selectedImage.fileType, selectedImage.filename)} text-white rounded-xl p-8 text-6xl`}>
//               {getFileTypeIcon(selectedImage.fileType, selectedImage.filename)}
//             </div>
//           </div>
//         )}
//     </div>
//   </div>
    
//   );
// };

// export default ViewImages;


//         <div
//           className="fixed inset-0 z-50 flex justify-center p-4 bg-black/70 backdrop-blur-sm"
//           role="dialog"
//           aria-modal="true"
//           aria-label="Image preview"
//           onClick={(e) => e.target === e.currentTarget && closeLightbox()}
//           <div
//             className="relative rounded-xl shadow-2xl max-w-4xl w-full max-h-[100%]] overflow-auto"
//             onClick={(e) => e.stopPropagation()}
//           >
//             <div className="sticky top-0 flex justify-between p-1 z-10">
//               <h3 className="text-lg font-medium text-gray-900 truncate pr-8">
//                 {selectedImage.filename}
//               </h3>
//               <button
//                 type="button"
//                 onClick={() => handleDownload(selectedImage)}
//                 className="absolute top-4 right-16 p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
//                 aria-label="Close"
//                 <FiDownload className="h-6 w-6" />
//               </button>
//               <button
//                 type="button"
//                 onClick={closeLightbox}
//                 className="absolute top-4 right-4 p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
//                 aria-label="Close"
//               >
//                 <FaTimes className="h-6 w-6" />
//               </button>
//             </div>
//             <div className="p-1">
//               {isImageType(selectedImage.fileType) ? (
//                 (() => {
//                   const thumbUrl = selectedImage.thumbnailUrl || selectedImage.previewUrl;
//                   const previewUrl = selectedImage.previewUrl;
//                   const hasDistinctPreview =
//                     !!previewUrl &&
//                     previewUrl !== thumbUrl &&
//                     lightboxPreviewReady &&
//                     !lightboxPreviewFailed;
//                   const showingPreviewOverlay = hasDistinctPreview && lightboxPreviewVisible;
//                   const isLoadingPreview =
//                     !!previewUrl &&
//                     previewUrl !== thumbUrl &&
//                     !lightboxPreviewReady &&
//                     !lightboxPreviewFailed;
//                   const isZoomed = lightboxZoom > 1;
//                   return (
//                     <div
//                       ref={lightboxZoomContainerRef}
//                       className="relative flex justify-center items-center w-full rounded-lg overflow-hidden select-none"
//                       style={{ minHeight: '70vh', cursor: lightboxIsPanning ? 'grabbing' : isZoomed ? 'grab' : 'default' }}
//                       onWheel={handleLightboxWheel}
//                       onMouseDown={handleLightboxMouseDown}
//                       onDoubleClick={handleLightboxDoubleClick}
//                       role="presentation"
//                     >
//                       <div
//                         className="absolute flex justify-center items-center w-full h-full"
//                         style={{
//                           transform: `translate(50%, 50%) translate(${lightboxPan.x}px, ${lightboxPan.y}px) scale(${lightboxZoom}) translate(-50%, -50%)`,
//                           transition: lightboxIsPanning ? 'none' : 'transform 0.1s ease-out',
//                         }}
//                       >
//                         {selectedImage.fileType !== 'unknown' && (
//                           <>
//                             {/* Thumbnail as loading background - always visible until preview loads */}
//                             <img
//                               src={thumbUrl}
//                               alt={selectedImage.filename}
//                               className={`max-w-full max-h-[100%] w-[100%] mx-auto rounded-lg object-contain transition-opacity duration-300 ${
//                                 showingPreviewOverlay ? 'opacity-0' : 'opacity-100'
//                               }`}
//                               onLoad={() => setLightboxImageLoaded(true)}
//                               draggable={false}
//                             />
//                             {/* Loading overlay on top of thumbnail - thumbnail stays visible as background */}
//                             {isLoadingPreview && (
//                               <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg bg-black/30">
//                                 <LoadingSpinner size="lg" />
//                                 <span className="mt-2 text-sm text-white">Loading...</span>
//                               </div>
//                             )}
//                           </>
//                         )}
//                         {/* Full preview displayed when loading complete */}
//                         {hasDistinctPreview && selectedImage.fileType !== 'unknown' && (
//                           <img
//                             src={previewUrl}
//                             alt={selectedImage.filename}
//                             className={`absolute max-w-full max-h-[100%] w-[100%] rounded-lg object-contain transition-opacity duration-300 ${
//                               lightboxPreviewVisible ? 'opacity-100' : 'opacity-0'
//                             }`}
//                             style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
//                             draggable={false}
//                           />
//                         )}
//                       </div>
//                       {isZoomed && (
//                         <p className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-white/80 bg-black/50 px-2 py-1 rounded">
//                           Scroll to zoom · Drag to pan · Double-click to reset
//                         </p>
//                       )}
//                       {selectedImage.fileType === 'unknown' && (
//                         <video
//                           src={selectedImage.previewUrl}
//                           className="max-w-full max-h-[70vh] w-full rounded-lg object-contain"
//                           controls
//                           muted
//                           playsInline
//                           preload="auto"
//                         />
//                       )}
//                     </div>
//                   );
//                 })()
//               ) : isVideoType(selectedImage.fileType, selectedImage.filename) ? (
//                   className="relative flex justify-center items-center w-full rounded-lg overflow-hidden"
//                   style={{ minHeight: '70vh' }}
//                     className="max-w-full max-h-[70vh] w-full rounded-lg object-contain"
//                 </div>
//               ) : (
//                 <div className="flex items-center justify-center h-64 bg-gray-100 rounded-xl">
//                   <div className={`${getFileTypeColor(selectedImage.fileType, selectedImage.filename)} text-white rounded-xl p-8 text-6xl`} >
//                     {getFileTypeIcon(selectedImage.fileType, selectedImage.filename)}
//                   </div>
//                 </div>
//               )}
//               <p className="mt-4 text-sm text-gray-500 text-center">
//                 {isVideoType(selectedImage.fileType, selectedImage.filename) ? 'VIDEO' : selectedImage.fileType.toUpperCase()} · {formatDate(selectedImage.uploadTime)}
//               </p>
//               {/* {Object.keys(selectedImage.enabledServices).length > 0 && (
//                 <div className="mt-4 flex flex-wrap gap-2 justify-center">
//                   {Object.entries(selectedImage.enabledServices).map(([service]) => (
//                     <span
//                       key={service}
//                       className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800"
//                     >
//                       <FaCloud className="h-3 w-3 mr-1" />
//                       {service}
//                     </span>
//                   ))}
//                 </div>
//               )} */}
//               {/* <div className="mt-6 flex justify-center gap-4"> */}
  
//                 {/* {viewMode === 'my' && (
//                   <button
//                     type="button"
//                     onClick={() => handleDelete(selectedImage)}
//                     className="inline-flex items-center px-4 py-2 border border-red-300 text-red-700 font-medium rounded-lg hover:bg-red-50 transition-colors"
//                   >
//                     <FiTrash2 className="mr-2 h-4 w-4" />
//                     Delete
//                   </button>
//                 )} */}
//               {/* </div> */}
//         </div>
const ViewImages = () => {
    return (
      <div>
        <h1>View Images</h1>
      </div>
    );
  };
  
  export default ViewImages;