// src/hooks/useExtension.js
import { useMemo } from 'react';

/**
 * A reusable hook to clean file titles by removing extensions.
 * Handles edge cases like hidden files (.env), files with no extension,
 * and complex names with multiple dots (app.config.prod.json).
 * 
 * @param {string} title - The original filename/title
 * @returns {object} Cleaned title and extracted extension
 */
export const useExtension = (title) => {
  const result = useMemo(() => {
    if (!title || typeof title !== 'string') {
      return { cleanTitle: '', extension: '' };
    }

    // Handle hidden files or files without extensions
    // e.g., ".gitignore", "README", "Makefile"
    if (!title.includes('.')) {
      return { cleanTitle: title, extension: '' };
    }

    // Split only on the LAST dot to handle names like "archive.tar.gz"
    const lastDotIndex = title.lastIndexOf('.');
    
    // If the dot is at the start (hidden file) and there are no other dots
    if (lastDotIndex === 0 && title.indexOf('.', 1) === -1) {
      return { cleanTitle: title, extension: '' };
    }

    const cleanTitle = title.substring(0, lastDotIndex);
    const extension = title.substring(lastDotIndex + 1).toUpperCase();

    return { cleanTitle, extension };
  }, [title]);

  return result;
};

export default useExtension;