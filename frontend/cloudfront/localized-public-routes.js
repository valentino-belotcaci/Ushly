// CloudFront Function, Viewer Request event.
// Keep this allowlist aligned with the localized public pages emitted by prerender.mjs.
var localizedPublicRoutes = {
  'url-shortener': true,
  'qr-codes': true,
  analytics: true,
  features: true,
  'privacy-policy': true,
  'cookie-policy': true,
  'terms-of-service': true,
};

function handler(event) {
  var request = event.request;
  var match = request.uri.match(/^\/(en|it)(?:\/([^/]+))?\/?$/);

  if (!match) return request;

  var locale = match[1];
  var route = match[2];

  if (!route) {
    request.uri = '/' + locale + '/index.html';
    return request;
  }

  if (localizedPublicRoutes[route] === true) {
    request.uri = '/' + locale + '/' + route + '/index.html';
  }

  return request;
}

// Referenced by the CloudFront Functions runtime.
void handler;
