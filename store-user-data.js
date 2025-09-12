// Script to store user data in localStorage
// Run this in browser console to store the user data

const userData = {
  username: "SnsGajendraTest",
  email: "snssystem.SnsGajendraTest@gmail.com",
  firstName: "Gajendra",
  lastName: "Rawat",
  accountType: "FREE",
  hasFamilyAccess: true,
  lastLoginAt: "2025-09-10T12:55:27.920352",
  status: "ACTIVE",
  familyRelationships: [
    {
      inviterId: 35,
      inviterApiToken: "4dd946e3-2ca1-4ece-9e9f-2cf10999183f",
      inviterUsername: "piyushjain",
      inviterFirstName: "Piyush",
      inviterLastName: "Jain",
      relationshipType: "BROTHER",
      relationshipNotes: "hiiiii",
      canViewImages: true,
      canUploadImages: true,
      canDeleteImages: false,
      canManageAlbums: true
    },
    {
      inviterId: 36,
      inviterApiToken: "acca20ee-62a7-47e9-9c32-96fd32cd3e09",
      inviterUsername: "snsuser",
      inviterFirstName: "sns",
      inviterLastName: "system",
      relationshipType: "FATHER",
      relationshipNotes: "gdfbhdfbdf",
      canViewImages: true,
      canUploadImages: true,
      canDeleteImages: false,
      canManageAlbums: false
    },
    {
      inviterId: 37,
      inviterApiToken: "b44ef487-10f7-4961-9886-4f5da975b233",
      inviterFirstName: "Test",
      inviterLastName: "User",
      relationshipType: "FRIEND",
      relationshipNotes: "Test relationship",
      canViewImages: true,
      canUploadImages: false,
      canDeleteImages: false,
      canManageAlbums: false
    }
  ]
};

// Store in localStorage
localStorage.setItem('userData', JSON.stringify(userData));
localStorage.setItem('token', 'your-api-token-here'); // Replace with actual token

// console.log('User data stored in localStorage:', userData);
console.log('You can now refresh the page to see the family members in ImagesPage');
