import { net } from 'electron';

// All outgoing HTTP(S) requests go through Chromium's network stack (net.fetch) instead of
// Node's built-in fetch. It trusts the certificates of the operating system (company or
// firewall CAs, intermediates fetched on demand), follows the system proxy settings and
// handles IPv4/IPv6 like a browser does; Node's fetch only knows its own bundled CA list
// and ignores the system proxy, which fails on some Windows Server setups ("fetch failed").
export function httpFetch(url, options) {
  return net.fetch(url, options);
}
