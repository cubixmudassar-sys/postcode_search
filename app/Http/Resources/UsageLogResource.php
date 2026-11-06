<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UsageLogResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'postcode' => $this->postcode,
            'location' => $this->location,
            'project' => $this->whenLoaded('project', fn () => $this->project?->name),
            'project_id' => $this->project_id,
            'endpoint' => $this->endpoint,
            'status' => $this->status,
            'outcome' => $this->outcome,
            'cost' => $this->cost,
            'latency_ms' => $this->latency_ms,
            'request_id' => $this->request_id,
            'environment' => $this->environment,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
