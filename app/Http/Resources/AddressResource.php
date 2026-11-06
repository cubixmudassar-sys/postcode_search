<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AddressResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'postcode' => $this->postcode,
            'building' => $this->building,
            'line1' => $this->line1,
            'locality' => $this->locality,
            'post_town' => $this->post_town,
            'uprn' => $this->uprn,
            'latitude' => $this->latitude,
            'longitude' => $this->longitude,
            'precision' => $this->precision,
        ];
    }
}
