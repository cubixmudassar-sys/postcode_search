<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Postcode extends Model
{
    protected $fillable = [
        'postcode',
        'outward',
        'inward',
        'area',
        'post_town',
        'country',
        'region',
        'admin_district',
        'constituency',
        'nhs_region',
        'ceremonial_county',
        'local_authority',
        'latitude',
        'longitude',
        'eastings',
        'northings',
        'quality',
        'status',
        'source',
        'record_updated',
    ];

    protected function casts(): array
    {
        return [
            'latitude' => 'decimal:7',
            'longitude' => 'decimal:7',
            'record_updated' => 'date',
        ];
    }

    public function addresses(): HasMany
    {
        return $this->hasMany(Address::class, 'postcode', 'postcode');
    }
}
