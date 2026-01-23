/**
 * Utility to block browser inspect/developer tools
 * Can be enabled/disabled via REACT_APP_BLOCK_INSPECT environment variable
 */

// Get setting from environment variable
// Set REACT_APP_BLOCK_INSPECT=false in .env to disable
// Default: true (blocking enabled)
const BLOCK_INSPECT = process.env.REACT_APP_BLOCK_INSPECT === undefined 
  ? true 
  : process.env.REACT_APP_BLOCK_INSPECT === 'true';
// const BLOCK_INSPECT = process.env.REACT_APP_BLOCK_INSPECT === undefined 
//   ? true 
//   : process.env.REACT_APP_BLOCK_INSPECT === 'true';

export const enableInspectBlock = () => {
  if (!BLOCK_INSPECT) {
    console.log('Inspect blocking is disabled');
    return;
  }

  // Disable right-click context menu
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    return false;
  });

  // Disable F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U, Ctrl+S
  document.addEventListener('keydown', (e) => {
    // F12
    if (e.key === 'F12') {
      e.preventDefault();
      return false;
    }

    // Ctrl+Shift+I (Chrome DevTools)
    if (e.ctrlKey && e.shiftKey && e.key === 'I') {
      e.preventDefault();
      return false;
    }

    // Ctrl+Shift+J (Chrome Console)
    if (e.ctrlKey && e.shiftKey && e.key === 'J') {
      e.preventDefault();
      return false;
    }

    // Ctrl+Shift+C (Chrome Inspect Element)
    if (e.ctrlKey && e.shiftKey && e.key === 'C') {
      e.preventDefault();
      return false;
    }

    // Ctrl+U (View Source)
    if (e.ctrlKey && e.key === 'U') {
      e.preventDefault();
      return false;
    }

    // Ctrl+S (Save Page)
    if (e.ctrlKey && e.key === 'S') {
      e.preventDefault();
      return false;
    }

    // Ctrl+P (Print - can reveal source)
    if (e.ctrlKey && e.key === 'P') {
      e.preventDefault();
      return false;
    }

    // Ctrl+Shift+K (Firefox Console)
    if (e.ctrlKey && e.shiftKey && e.key === 'K') {
      e.preventDefault();
      return false;
    }
  });

  // Detect if dev tools are opened by checking console
  let devtools = { open: false, orientation: null as string | null };
  const threshold = 160;

  setInterval(() => {
    if (window.outerHeight - window.innerHeight > threshold || 
        window.outerWidth - window.innerWidth > threshold) {
      if (!devtools.open) {
        devtools.open = true;
        // Redirect or show warning when dev tools detected
        console.clear();
        console.log('%cStop!', 'color: red; font-size: 50px; font-weight: bold;');
        console.log('%cThis is a browser feature intended for developers.', 'font-size: 16px;');
        console.log('%cIf someone told you to copy-paste something here, it is a scam.', 'font-size: 16px;');
        
        // Optional: Redirect or disable functionality
        // window.location.href = '/';
      }
    } else {
      devtools.open = false;
    }
  }, 500);

  // Disable text selection (optional - can be removed if needed)
  document.addEventListener('selectstart', (e) => {
    // Allow selection in input/textarea elements
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return true;
    }
    e.preventDefault();
    return false;
  });

  // Disable drag and drop
  document.addEventListener('dragstart', (e) => {
    e.preventDefault();
    return false;
  });

  console.log('Inspect blocking enabled');
};

// export const enableInspectBlock = () => {
//   // Remove all event listeners would require storing references
//   // For now, just log that it's disabled
//   console.log('Inspect blocking disabled');
// };

// Note: enableInspectBlock() is called from App.tsx
// This allows dynamic control via environment variable

