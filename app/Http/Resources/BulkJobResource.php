<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BulkJobResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'status' => $this->status,
            'step' => $this->step,
            'filename' => $this->filename,
            'mapped_column' => $this->mapped_column,
            'row_count' => $this->row_count,
        ];
    }
}
