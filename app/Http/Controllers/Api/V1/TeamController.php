<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreTeamMemberRequest;
use App\Http\Resources\TeamMemberResource;
use App\Models\User;
use App\Support\RequestContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class TeamController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $organisation = RequestContext::organisation($request);

        if (! $organisation) {
            return response()->json(['message' => 'Organisation context required.'], 422);
        }

        $members = $organisation->users()->orderBy('name')->get();

        return response()->json([
            'data' => TeamMemberResource::collection($members)->resolve(),
        ]);
    }

    public function store(StoreTeamMemberRequest $request): JsonResponse
    {
        $organisation = RequestContext::organisation($request);

        if (! $organisation) {
            return response()->json(['message' => 'Organisation context required.'], 422);
        }

        $data = $request->validated();
        $email = Str::lower($data['email']);

        $existingMember = $organisation->users()->where('email', $email)->first();

        if ($existingMember) {
            return response()->json(['message' => 'This user is already a member of the organisation.'], 422);
        }

        $user = User::query()->where('email', $email)->first();

        if (! $user) {
            $parts = preg_split('/\s+/', trim($data['name']), 2) ?: [];
            $firstName = $parts[0] ?? $data['name'];
            $lastName = $parts[1] ?? '';

            $user = User::query()->create([
                'name' => $data['name'],
                'first_name' => $firstName,
                'last_name' => $lastName,
                'email' => $email,
                'password' => $data['password'],
            ]);
        }

        $organisation->users()->attach($user->id, ['role' => $data['role']]);

        $member = $organisation->users()->where('users.id', $user->id)->first();

        return response()->json([
            'data' => new TeamMemberResource($member),
        ], 201);
    }
}
