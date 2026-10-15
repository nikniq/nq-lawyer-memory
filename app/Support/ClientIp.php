<?php

namespace App\Support;

use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\IpUtils;

/**
 * The visitor's address, for rate limiting.
 *
 * The production host puts a reverse proxy in front of PHP and passes the
 * visitor's address in X-Real-IP rather than X-Forwarded-For, so Laravel's
 * own $request->ip() sees only the proxy. Without this, every player would
 * share one rate-limit bucket. The header is trusted only when the request
 * itself comes from a private or loopback address, i.e. from that proxy;
 * a client talking to PHP directly cannot spoof it.
 */
class ClientIp
{
    public const PRIVATE_RANGES = ['127.0.0.0/8', '10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16', '::1/128', 'fc00::/7'];

    public static function of(Request $request): string
    {
        $remote = (string) $request->server('REMOTE_ADDR', '');
        $real = trim((string) $request->headers->get('X-Real-IP', ''));

        if ($real !== '' && filter_var($real, FILTER_VALIDATE_IP) && IpUtils::checkIp($remote, self::PRIVATE_RANGES)) {
            return $real;
        }

        return $request->ip() ?? $remote;
    }
}
