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

export type UpdateLinkBody = {
  url?: string;
  title?: string | null;
  expiresAt?: string | null;
};

export type LinkParams = { id: string };
export type LinkQuery = { page?: number; pageSize?: number };

export const linkResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'shortCode', 'destinationUrl', 'title', 'expiresAt', 'status', 'createdAt'],
  properties: {
    id: { type: 'string' }, shortCode: { type: 'string' },
    destinationUrl: { type: 'string' }, title: { type: ['string', 'null'] },
    expiresAt: { type: ['string', 'null'], format: 'date-time' },
    status: { type: 'string', enum: ['active', 'disabled', 'expired'] },
    createdAt: { type: 'string', format: 'date-time' },
  },
};

export const ownerLinkParamsSchema = {
  params: { type: 'object', required: ['id'], additionalProperties: false, properties: { id: { type: 'string', minLength: 1 } } },
};

export const updateLinkSchema = {
  ...ownerLinkParamsSchema,
  body: {
    type: 'object', minProperties: 1, additionalProperties: false,
    properties: {
      url: { type: 'string', minLength: 1, maxLength: 2048 },
      title: { type: ['string', 'null'], maxLength: 200 },
      expiresAt: { type: ['string', 'null'], format: 'date-time' },
    },
  },
  response: { 200: linkResponseSchema },
};

export const ownerLinkResponseSchema = { ...ownerLinkParamsSchema, response: { 200: linkResponseSchema } };
export const ownerLinkListSchema = {
  querystring: {
    type: 'object', additionalProperties: false,
    properties: { page: { type: 'integer', minimum: 1, default: 1 }, pageSize: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
  },
  response: { 200: { type: 'object', additionalProperties: false, required: ['items', 'page', 'pageSize', 'total'], properties: { items: { type: 'array', items: linkResponseSchema }, page: { type: 'integer' }, pageSize: { type: 'integer' }, total: { type: 'integer' } } } },
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
