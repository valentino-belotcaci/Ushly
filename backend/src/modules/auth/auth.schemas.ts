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

export const loginSchema = {
  body: {
    ...registerSchema.body,
    properties: {
      email: registerSchema.body.properties.email,
      // Login verifies existing credentials rather than reapplying signup policy.
      password: { type: 'string', minLength: 1, maxLength: 128 },
    },
  },
  response: {
    200: {
      type: 'object',
      additionalProperties: false,
      required: ['accessToken', 'user'],
      properties: {
        accessToken: { type: 'string' },
        user: registerSchema.response[201],
      },
    },
  },
};
