<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Admin\UpdateCustomerRequest;
use App\Http\Requests\Api\V1\Admin\UpdateCustomerStatusRequest;
use App\Http\Requests\Api\V1\Admin\UpdateCustomerUserRequest;
use App\Http\Resources\OrganisationResource;
use App\Models\Organisation;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Organisation::query()
            ->with(['users' => fn ($q) => $q->orderByRaw("CASE WHEN organisation_user.role = 'Owner' THEN 0 ELSE 1 END")->orderBy('users.id')])
            ->withCount('users')
            ->orderBy('name');

        if ($search = $request->query('query')) {
            $query->where(function ($builder) use ($search): void {
                $builder->where('name', 'like', '%'.$search.'%')
                    ->orWhereHas('users', function ($users) use ($search): void {
                        $users->where('email', 'like', '%'.$search.'%')
                            ->orWhere('name', 'like', '%'.$search.'%');
                    });
            });
        }

        if ($request->query('status') === 'active') {
            $query->where('is_active', true);
        } elseif ($request->query('status') === 'disabled') {
            $query->where('is_active', false);
        }

        $organisations = $query->paginate(25);

        return OrganisationResource::collection($organisations)->response();
    }

    public function show(Organisation $organisation): JsonResponse
    {
        $organisation->load(['users' => fn ($q) => $q->orderBy('name')]);
        $organisation->loadCount('users');

        return response()->json([
            'data' => new OrganisationResource($organisation),
        ]);
    }

    public function update(UpdateCustomerRequest $request, Organisation $organisation): JsonResponse
    {
        $data = $request->validated();
        $organisation->fill($data);
        $organisation->save();
        $organisation->load(['users' => fn ($q) => $q->orderBy('name')]);
        $organisation->loadCount('users');

        return response()->json([
            'data' => new OrganisationResource($organisation),
        ]);
    }

    public function updateStatus(UpdateCustomerStatusRequest $request, Organisation $organisation): JsonResponse
    {
        $organisation->is_active = $request->boolean('is_active');
        $organisation->save();
        $organisation->load(['users' => fn ($q) => $q->orderBy('organisation_user.id')]);
        $organisation->loadCount('users');

        return response()->json([
            'data' => new OrganisationResource($organisation),
        ]);
    }

    public function users(Organisation $organisation): JsonResponse
    {
        $members = $organisation->users()->orderBy('name')->get()->map(fn (User $user) => [
            'id' => $user->id,
            'name' => $user->name,
            'first_name' => $user->first_name,
            'last_name' => $user->last_name,
            'email' => $user->email,
            'role' => $user->pivot->role,
            'is_active' => (bool) $user->is_active,
        ])->values();

        return response()->json([
            'data' => $members,
        ]);
    }

    public function updateUser(UpdateCustomerUserRequest $request, Organisation $organisation, User $user): JsonResponse
    {
        if (! $organisation->users()->where('users.id', $user->id)->exists()) {
            return response()->json(['message' => 'User is not a member of this organisation.'], 404);
        }

        if ($user->is_staff) {
            return response()->json(['message' => 'Staff accounts cannot be edited from customer credentials.'], 422);
        }

        $data = $request->validated();

        if (isset($data['first_name']) || isset($data['last_name'])) {
            $first = $data['first_name'] ?? $user->first_name;
            $last = $data['last_name'] ?? $user->last_name;
            $user->first_name = $first;
            $user->last_name = $last;
            $user->name = trim(($first ?? '').' '.($last ?? ''));
        }

        if (array_key_exists('email', $data)) {
            $user->email = $data['email'];
        }

        if (! empty($data['password'])) {
            $user->password = $data['password'];
        }

        if (array_key_exists('is_active', $data)) {
            $user->is_active = $data['is_active'];
        }

        $user->save();

        if (array_key_exists('role', $data)) {
            $organisation->users()->updateExistingPivot($user->id, ['role' => $data['role']]);
        }

        $member = $organisation->users()->where('users.id', $user->id)->first();

        return response()->json([
            'data' => [
                'id' => $member->id,
                'name' => $member->name,
                'first_name' => $member->first_name,
                'last_name' => $member->last_name,
                'email' => $member->email,
                'role' => $member->pivot->role,
                'is_active' => (bool) $member->is_active,
            ],
        ]);
    }
}
