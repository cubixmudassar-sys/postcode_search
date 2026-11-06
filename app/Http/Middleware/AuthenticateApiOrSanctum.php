<?php

namespace App\Http\Middleware;

use App\Models\ApiKey;
use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateApiOrSanctum
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->bearerToken();

        if ($token && preg_match('/^pp_(test|live)_/', $token)) {
            $prefix = substr($token, 0, 16);
            $candidates = ApiKey::query()
                ->where('key_prefix', $prefix)
                ->whereNull('revoked_at')
                ->get();

            foreach ($candidates as $apiKey) {
                if ($apiKey->verify($token)) {
                    $apiKey->forceFill(['last_used_at' => now()])->save();
                    $request->attributes->set('api_key', $apiKey);
                    $request->attributes->set('organisation', $apiKey->organisation);
                    $request->attributes->set('project', $apiKey->project);
                    $request->attributes->set('environment', $apiKey->environment);

                    return $next($request);
                }
            }

            return response()->json(['message' => 'Invalid API key.'], 401);
        }

        if ($token) {
            $accessToken = PersonalAccessToken::findToken($token);
            $user = $accessToken?->tokenable;

            if ($user instanceof User) {
                Auth::guard('sanctum')->setUser($user);
                $request->setUserResolver(static fn () => $user);
                self::attachOrganisation($request, $user);
                self::attachDefaultApiKey($request);

                return $next($request);
            }

            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        return response()->json(['message' => 'Unauthenticated.'], 401);
    }

    public static function attachOrganisation(Request $request, User $user): void
    {
        $organisationId = $request->header('X-Organisation-Id');
        $organisation = null;

        if ($organisationId) {
            $organisation = $user->organisations()->where('organisations.id', $organisationId)->first();
        }

        $organisation ??= $user->primaryOrganisation();
        $request->attributes->set('organisation', $organisation);
        $request->attributes->set('environment', $request->header('X-Environment', 'Live'));
    }

    public static function attachDefaultApiKey(Request $request): void
    {
        if ($request->attributes->get('api_key')) {
            return;
        }

        $organisation = $request->attributes->get('organisation');
        if (! $organisation) {
            return;
        }

        $environment = $request->attributes->get('environment', 'Live');

        $apiKey = ApiKey::query()
            ->where('organisation_id', $organisation->id)
            ->whereNull('revoked_at')
            ->where('environment', $environment)
            ->orderByDesc('id')
            ->first()
            ?? ApiKey::query()
                ->where('organisation_id', $organisation->id)
                ->whereNull('revoked_at')
                ->orderByDesc('id')
                ->first();

        if ($apiKey) {
            $request->attributes->set('api_key', $apiKey);
            if (! $request->attributes->get('project') && $apiKey->project_id) {
                $request->attributes->set('project', $apiKey->project);
            }
        }
    }
}
