<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Receives uncaught JavaScript errors from the game so problems that only
 * happen on real devices show up in storage/logs/client.log.
 */
class ClientErrorController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $data = $request->validate([
            'message' => ['required', 'string', 'max:500'],
            'source' => ['nullable', 'string', 'max:300'],
            'line' => ['nullable', 'integer', 'min:0'],
            'column' => ['nullable', 'integer', 'min:0'],
            'stack' => ['nullable', 'string', 'max:3000'],
            'kind' => ['nullable', 'in:error,rejection'],
            'state' => ['nullable', 'array:deck,level,rules,daily,moves,pairs'],
        ]);

        Log::channel('client')->warning(Str::limit($data['message'], 200), [
            ...$data,
            'page' => Str::limit((string) $request->headers->get('referer'), 300),
            'agent' => Str::limit((string) $request->userAgent(), 300),
        ]);

        return response()->noContent();
    }
}
