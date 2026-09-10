export type RegisterBody = { email: string; password: string };

export const registerSchema = {
  body: {
    type: 'object',
    required: ['email', 'password'],
    additionalProperties: false,
    properties: {
      email: { type: 'string', format: 'email', maxLength: 254 },
      password: { type: 'string', minLength: 15, maxLength: 128 },
    },
  },
  response: {
    201: {
      type: 'object',
      additionalProperties: false,
      required: ['id', 'email', 'createdAt'],
      properties: {
        id: { type: 'string' },
        email: { type: 'string' },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
  },
};
