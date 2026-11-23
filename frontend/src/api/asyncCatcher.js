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
 */
export const asyncCatcher = async (request) => {
  try {
    const response = await request();
    const { data, message } = response.data;
    return { data, message, error: null };
  } catch (err) {
    const body = err.response?.data;

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
