/** Consistent success envelope: { success, message?, data, meta? } */
export function sendSuccess(res, { data = null, message, meta, status = 200 } = {}) {
  const body = { success: true };
  if (message) body.message = message;
  body.data = data;
  if (meta) body.meta = meta;
  return res.status(status).json(body);
}

export const sendCreated = (res, data, message = 'Created successfully') =>
  sendSuccess(res, { data, message, status: 201 });
