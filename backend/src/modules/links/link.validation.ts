import { AppError } from '../../errors/app-error.js';

export const MAX_DESTINATION_URL_LENGTH = 2048;

/** Validates a destination without normalizing the value persisted by the caller. */
export function validateDestinationUrl(value: string): string {
  //if the url is unsupported or too long, throw an error
  if (
    value.length > MAX_DESTINATION_URL_LENGTH ||
    !isSupportedDestinationUrl(value)
  ) {
    throw new AppError('invalid_destination_url', 'The destination URL is invalid', 422);
  }

  return value;
}

function isSupportedDestinationUrl(value: string): boolean {
  //use a try catch, user may be passing in a non-url string, 
  // which will throw an error when trying to parse it
  try {
    //i decided to use the URL constructor instead of regex because it is more robust and handles edge cases better
    const parsed = new URL(value);

    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    
  } catch {
    return false;
  }
}
