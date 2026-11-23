/**
 * Wraps an axios call and never throws. Always resolves to { data, message, error }.
 *
 *   const res = await getDocuments();
 *   if (res.error) { // show error if needed
 *     return;
 *   }
 *   // use res.data
 *
 * error is null on success, otherwise { code, details, status }.
 * File downloads (responseType: 'blob') resolve with data = { blob, filename }.
 */

// Reads the name from `Content-Disposition: attachment; filename="a.pdf"; filename*=UTF-8''a.pdf`
const filenameFrom = (header = '') => {
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (utf8) {
    try {
      return decodeURIComponent(utf8[1]);
    } catch {
      // fall back to the plain name
    }
  }
  return /filename="?([^";]+)"?/i.exec(header)?.[1] || 'download';
};

// Error bodies of blob requests arrive as a Blob too: read the JSON envelope out of it
const readErrorBody = async (data) => {
  if (!(data instanceof Blob)) return data;
  try {
    return JSON.parse(await data.text());
  } catch {
    return null;
  }
};

export const asyncCatcher = async (request) => {
  try {
    const response = await request();

    if (response.data instanceof Blob) {
      return {
        data: { blob: response.data, filename: filenameFrom(response.headers['content-disposition']) },
        message: 'Download ready',
        error: null,
      };
    }

    const { data, message } = response.data;
    return { data, message, error: null };
  } catch (err) {
    const body = await readErrorBody(err.response?.data);

    if (body && typeof body === 'object' && 'error' in body) {
      return {
        data: null,
        message: body.message || 'Something went wrong',
        error: { ...body.error, status: body.status ?? err.response.status },
      };
    }

    const isNetwork = !err.response;
    return {
      data: null,
      message: isNetwork ? 'Cannot reach the server. Check your connection and try again.' : 'Something went wrong',
      error: { code: isNetwork ? 'NETWORK_ERROR' : 'UNKNOWN_ERROR', details: null, status: err.response?.status ?? 0 },
    };
  }
};
