<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PostcodeResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'postcode' => $this->postcode,
            'outward' => $this->outward,
            'inward' => $this->inward,
            'area' => $this->area,
            'post_town' => $this->post_town,
            'country' => $this->country,
            'region' => $this->region,
            'admin_district' => $this->admin_district,
            'constituency' => $this->constituency,
            'nhs_region' => $this->nhs_region,
            'ceremonial_county' => $this->ceremonial_county,
            'local_authority' => $this->local_authority,
            'latitude' => $this->latitude,
            'longitude' => $this->longitude,
            'eastings' => $this->eastings,
            'northings' => $this->northings,
            'quality' => $this->quality,
            'status' => $this->status,
            'source' => $this->source,
            'record_updated' => $this->record_updated?->toDateString(),
            'coordinates' => [
                'latitude' => $this->latitude,
                'longitude' => $this->longitude,
                'precision' => 'postcode_centroid',
            ],
        ];
    }
}
