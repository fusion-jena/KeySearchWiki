import Connection from './getWikidataIDThrottled';


import 'cross-fetch/polyfill';

/**
 * provide a common connection to wikipedia Mediawiki (for getting ids, since they are done in parallel )
 * so we do not flood endpoint with our requests
 */
export default Connection();
