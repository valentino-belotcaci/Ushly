import { createHmac } from 'node:crypto';// import the createHmac function from the 'crypto' module in Node.js
//Hash-based Message Authentication Code

// This function takes an IP address and a secret key(from .env file) as input and returns a 
// pseudonymized version of the IP address using HMAC with SHA-256 hashing algorithm.

//take 200.0.113.40, use sha256 with the 'secret' to create a hash, then use
//the ipAddress as the input to the hash function, and return the resulting hash as a hexadecimal string.
export function pseudonymizeIp(ipAddress: string, secret: string): string {
  return createHmac('sha256', secret).update(ipAddress, 'utf8').digest('hex');
}
