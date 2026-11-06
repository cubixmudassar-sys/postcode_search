<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreSupportTicketRequest;
use App\Http\Resources\SupportTicketResource;
use App\Support\RequestContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SupportTicketController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $organisation = RequestContext::organisation($request);

        if (! $organisation) {
            return response()->json(['message' => 'Organisation context required.'], 422);
        }

        $tickets = $organisation->supportTickets()
            ->with('user')
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'data' => SupportTicketResource::collection($tickets)->resolve(),
        ]);
    }

    public function store(StoreSupportTicketRequest $request): JsonResponse
    {
        $organisation = RequestContext::organisation($request);
        $user = $request->user();

        if (! $organisation || ! $user) {
            return response()->json(['message' => 'Organisation context required.'], 422);
        }

        $ticket = $organisation->supportTickets()->create([
            'user_id' => $user->id,
            'subject' => $request->validated('subject'),
            'body' => $request->validated('body'),
            'status' => 'open',
        ]);

        $ticket->load('user');

        return response()->json([
            'data' => new SupportTicketResource($ticket),
        ], 201);
    }
}
