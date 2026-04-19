const API_BASE = 'https://pretika-api-1.onrender.com';

export function getMediaUrl(path) {
  if (!path) return '';
  
  if (!path.startsWith('http://') && !path.startsWith('https://')) {
    return `${API_BASE}${path}`;
  }
  
  try {
    const url = new URL(path);
    const isSelfHosted = url.hostname === 'localhost' || 
                         url.hostname.includes('onrender.com') || 
                         url.hostname.includes('hauntedvoice.in');
                         
    if (isSelfHosted) {
      return `${API_BASE}${url.pathname}${url.search}`;
    }
  } catch (e) {
    // ignore
  }
  
  return path;
}
