export type StatisticsParams = { id: string };

export type StatisticsQuery = {
  from?: string;
  to?: string;
  granularity?: 'hour' | 'day' | 'week';
};

export const statisticsSchema = {
  params: {
    type: 'object',
    required: ['id'],
    additionalProperties: false,
    properties: { id: { type: 'string', minLength: 1 } },
  },
  querystring: {
    type: 'object',
    additionalProperties: false,
    properties: {
      from: { type: 'string', format: 'date-time' },
      to: { type: 'string', format: 'date-time' },
      granularity: { type: 'string', enum: ['hour', 'day', 'week'], default: 'day' },
    },
  },
};
