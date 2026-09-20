export type AdminPageQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  role?: 'USER' | 'ADMIN';
  disabled?: boolean;
  status?: 'active' | 'disabled' | 'expired';
  userId?: string;
};

export type AdminIdParams = { id: string };
export type AdminRoleBody = { role: 'USER' | 'ADMIN' };

export const adminPageSchema = {
  querystring: {
    type: 'object',
    additionalProperties: false,
    properties: {
      page: { type: 'integer', minimum: 1, default: 1 },
      pageSize: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
      search: { type: 'string', maxLength: 200 },
      role: { type: 'string', enum: ['USER', 'ADMIN'] },
      disabled: { type: 'boolean' },
      status: { type: 'string', enum: ['active', 'disabled', 'expired'] },
      userId: { type: 'string', maxLength: 64 },
    },
  },
};

export const adminIdSchema = {
  params: {
    type: 'object',
    required: ['id'],
    additionalProperties: false,
    properties: { id: { type: 'string', minLength: 1, maxLength: 64 } },
  },
};
export const adminRoleSchema = {
  ...adminIdSchema,
  body: {
    type: 'object',
    required: ['role'],
    additionalProperties: false,
    properties: { role: { type: 'string', enum: ['USER', 'ADMIN'] } },
  },
};
