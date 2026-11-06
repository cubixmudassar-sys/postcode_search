<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ApiKeyResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'type' => $this->type,
            'environment' => $this->environment,
            'key_prefix' => $this->key_prefix.'••••',
            'project_id' => $this->project_id,
            'project' => $this->whenLoaded('project', fn () => $this->project?->name),
            'last_used_at' => $this->last_used_at?->toIso8601String(),
            'revoked_at' => $this->revoked_at?->toIso8601String(),
            'plain_key' => $this->when(isset($this->plain_key), $this->plain_key ?? null),
        ];
    }
}
