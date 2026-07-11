export const saveSetting = async (key, value) => {
  try {
    await window.api.config.set(key, value);
    return true;
  } catch (error) {
    console.error('Failed to save setting:', error);
    return false;
  }
};

export const getSetting = async (key, defaultValue = '') => {
  try {
    return await window.api.config.get(key, defaultValue);
  } catch (error) {
    console.error('Failed to read setting:', error);
    return defaultValue;
  }
};
