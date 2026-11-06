<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

class OptionalApiOrSanctum
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->bearerToken();

        if (! $token) {
            return $next($request);
        }

        if (preg_match('/^pp_(test|live)_/', $token)) {
            $middleware = app(AuthenticateApiOrSanctum::class);

            return $middleware->handle($request, $next);
        }

        $accessToken = PersonalAccessToken::findToken($token);
        $user = $accessToken?->tokenable;
        if ($user instanceof User) {
            Auth::guard('sanctum')->setUser($user);
            $request->setUserResolver(static fn () => $user);
            AuthenticateApiOrSanctum::attachOrganisation($request, $user);
        }

        return $next($request);
    }
}
