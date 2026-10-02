import type { FastifyRequest } from 'fastify';

export type OAuthOriginRequest = Pick<
  FastifyRequest,
  'headers' | 'host' | 'protocol'
>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function apiGatewayDomain(
  request: OAuthOriginRequest,
  isLambdaRuntime: boolean,
): string | undefined {
  if (!isLambdaRuntime) return undefined;

  const serializedEvent = request.headers['x-apigateway-event'];
  if (typeof serializedEvent !== 'string') return undefined;

  let event: unknown;
  try {
    event = JSON.parse(decodeURIComponent(serializedEvent));
  } catch {
    return undefined;
  }

  if (!isRecord(event) || event.version !== '2.0') return undefined;

  const requestContext = event.requestContext;
  if (!isRecord(requestContext) || !isRecord(requestContext.http)) {
    return undefined;
  }

  return typeof requestContext.domainName === 'string' &&
    requestContext.domainName.length > 0
    ? requestContext.domainName.toLowerCase()
    : undefined;
}

export function oauthRequestOrigin(
  request: OAuthOriginRequest,
  configuredRedirectUri: string,
  isLambdaRuntime = false,
): string {
  const configuredOrigin = new URL(configuredRedirectUri);
  const trustedGatewayDomain = apiGatewayDomain(request, isLambdaRuntime);

  // The Lambda adapter strips client-supplied copies of its reserved event
  // header before serializing the real event. The Fastify instance marker keeps
  // direct HTTP execution from ever trusting that header.
  if (trustedGatewayDomain === configuredOrigin.host.toLowerCase()) {
    return configuredOrigin.origin;
  }

  return `${request.protocol}://${request.host}`;
}
