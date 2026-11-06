<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Address extends Model
{
    protected $fillable = [
        'postcode',
        'building',
        'line1',
        'locality',
        'post_town',
        'uprn',
        'latitude',
        'longitude',
        'precision',
    ];

    protected function casts(): array
    {
        return [
            'latitude' => 'decimal:7',
            'longitude' => 'decimal:7',
        ];
    }

    public function postcodeRecord(): BelongsTo
    {
        return $this->belongsTo(Postcode::class, 'postcode', 'postcode');
    }
}
