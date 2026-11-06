<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\LoginRequest;
use App\Http\Requests\Api\V1\RegisterRequest;
use App\Http\Requests\Api\V1\UpdateProfileRequest;
use App\Http\Resources\OrganisationResource;
use App\Http\Resources\UserResource;
use App\Models\Organisation;
use App\Models\Project;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function register(RegisterRequest $request): JsonResponse
    {
        $data = $request->validated();

        $user = User::query()->create([
            'first_name' => $data['first_name'],
            'last_name' => $data['last_name'],
            'name' => trim($data['first_name'].' '.$data['last_name']),
            'email' => $data['email'],
            'password' => $data['password'],
            'use_case' => $data['use_case'] ?? null,
        ]);

        $organisation = Organisation::query()->create([
            'name' => $data['organisation_name'],
        ]);

        $organisation->users()->attach($user->id, ['role' => 'Owner']);

        Project::query()->create([
            'organisation_id' => $organisation->id,
            'name' => $data['project_name'],
            'environment' => 'Test',
        ]);

        $token = $user->createToken('auth')->plainTextToken;

        return response()->json([
            'data' => [
                'token' => $token,
                'user' => new UserResource($user),
                'organisation' => new OrganisationResource($organisation),
            ],
        ], 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::query()->where('email', $request->validated('email'))->first();

        if (! $user || ! Hash::check($request->validated('password'), $user->password)) {
            return response()->json(['message' => 'Invalid credentials.'], 422);
        }

        $demoEmails = [
            'emma@northstar.demo',
            'alex@northstar.demo',
            'priya@northstar.demo',
            'admin@postcodepulse.demo',
        ];

        if (in_array(strtolower($user->email), $demoEmails, true)) {
            return response()->json(['message' => 'Invalid credentials.'], 422);
        }

        if (! $user->is_active) {
            return response()->json(['message' => 'This account has been disabled.'], 422);
        }

        $organisation = $user->primaryOrganisation();

        if ($organisation && ! $organisation->is_active) {
            return response()->json(['message' => 'This organisation has been disabled.'], 422);
        }

        $token = $user->createToken('auth')->plainTextToken;

        return response()->json([
            'data' => [
                'token' => $token,
                'user' => new UserResource($user),
                'organisation' => $organisation ? new OrganisationResource($organisation) : null,
            ],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()?->currentAccessToken()?->delete();

        return response()->json(['data' => ['message' => 'Logged out.']]);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();
        $organisation = $user?->primaryOrganisation();

        return response()->json([
            'data' => [
                'user' => new UserResource($user),
                'organisation' => $organisation ? new OrganisationResource($organisation) : null,
            ],
        ]);
    }

    public function updateProfile(UpdateProfileRequest $request): JsonResponse
    {
        $user = $request->user();
        $data = $request->validated();

        $user->fill([
            'first_name' => $data['first_name'],
            'last_name' => $data['last_name'],
            'name' => trim($data['first_name'].' '.$data['last_name']),
            'email' => $data['email'],
        ]);

        if (! empty($data['password'])) {
            $user->password = $data['password'];
        }

        $user->save();

        $organisation = $user->primaryOrganisation();

        if ($organisation && ! empty($data['organisation_name'])) {
            $organisation->update(['name' => $data['organisation_name']]);
            $organisation->refresh();
        }

        return response()->json([
            'data' => [
                'user' => new UserResource($user->fresh()),
                'organisation' => $organisation ? new OrganisationResource($organisation) : null,
            ],
        ]);
    }
}
