import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import {
  FaceSyncShell,
  FaceSyncUpload,
  FaceSyncPeople,
  FaceSyncPhotos,
  FaceSyncPersonDetail,
  FaceSyncSuggestions,
} from '../../components/FilterImages';

const FilterImagesPage: React.FC = () => (
  <Routes>
    <Route element={<FaceSyncShell />}>
      <Route index element={<Navigate to="people" replace />} />
      <Route path="upload" element={<FaceSyncUpload />} />
      <Route path="photos" element={<FaceSyncPhotos />} />
      <Route path="people" element={<FaceSyncPeople />} />
      <Route path="people/:personId" element={<FaceSyncPersonDetail />} />
      <Route path="suggestions" element={<FaceSyncSuggestions />} />
    </Route>
  </Routes>
);

export default FilterImagesPage;
