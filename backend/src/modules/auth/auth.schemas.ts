// a registration request body must have an email and password  
export type RegisterBody = { email: string; password: string };

//is the schema of the endpoint POST/register
export const registerSchema = {
  body: {
    type: 'object', //body must be a json object
    required: ['email', 'password'], // email and password are required
    additionalProperties: false,  //rejects any additional properties in the body
    properties: { //describes every field in the body
      email: { type: 'string', format: 'email', maxLength: 254 },
      password: { type: 'string', minLength: 8, maxLength: 128 },
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

//is the schema of the endpoint POST/login
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
      required: ['accessToken', 'user', 'googleLinkAvailable'],
      properties: {
        accessToken: { type: 'string' },
        googleLinkAvailable: { type: 'boolean' },
        user: registerSchema.response[201],
      },
    },
  },
};
