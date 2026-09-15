// This file contains the schema definitions for the link module, 
// including the request and response schemas for creating a link.

// The CreateLinkBody schema defines the expected structure of the request body when creating a new link.
export type CreateLinkBody = {
  url: string;
  title?: string;
  expiresAt?: string;
};

// The CreateLinkResponse schema defines the structure of the response returned after successfully creating a link.
export type CreateLinkResponse = {
  id: string;
  shortCode: string;
  destinationUrl: string;
  title: string | null;
  expiresAt: string | null;
  status: 'active';
  createdAt: string;
};

// The createLinkSchema object defines the validation rules for the request body and response when creating a link.
export const createLinkSchema = {
  body: {
    type: 'object',
    required: ['url'],
    additionalProperties: false,
    properties: {
      url: { type: 'string', minLength: 1, maxLength: 2048 },
      title: { type: 'string', minLength: 1, maxLength: 200 },
      expiresAt: { type: 'string', format: 'date-time' },
    },
  },
  response: {
    201: {
      type: 'object',
      additionalProperties: false,
      required: [
        'id',
        'shortCode',
        'destinationUrl',
        'title',
        'expiresAt',
        'status',
        'createdAt',
      ],
      properties: {
        id: { type: 'string' },
        shortCode: { type: 'string' },
        destinationUrl: { type: 'string' },
        title: { type: ['string', 'null'] },
        expiresAt: { type: ['string', 'null'], format: 'date-time' },
        status: { const: 'active' },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
  },
};
