<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AuditLogResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'action' => $this->action,
            'meta' => $this->meta,
            'user' => $this->whenLoaded('user', fn () => $this->user?->name),
            'organisation' => $this->whenLoaded('organisation', fn () => $this->organisation?->name),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
